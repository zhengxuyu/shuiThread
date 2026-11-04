// ═══════════════════════════════════════════
//  SHUI THREAD — Coupons in the back office
//  A code here is a Stripe Coupon plus a Promotion Code. The Stripe account is
//  shared, so only promotion codes tagged metadata.site = SITE_TAG are shown or
//  changed. Stripe won't change a discount, limit or expiry after creation, so
//  an edit swaps in a new promotion code with the same code, and only while the
//  old one is unused: otherwise its redemption count would reset to zero.
// ═══════════════════════════════════════════
const crypto = require('crypto');
const { SITE_TAG, OrderError, sendEmail } = require('./orders');
const { customerVoucher } = require('./emails');
const { formatGBP } = require('./voucher');

const REPLACED_TAG = `${SITE_TAG}_replaced`;
const CODE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTE_MAX = 200;
const MESSAGE_MAX = 500;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const label = c => (c.percent_off ? `${c.percent_off}% off` : `${formatGBP(c.amount_off)} off`);

function londonDate(seconds) {
  return new Date(seconds * 1000).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

// The last second of a London calendar day, as a Unix timestamp.
function endOfDayLondon(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) throw new OrderError(400, '到期日期格式不正确');
  let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59);
  if (new Date(ms).toISOString().slice(0, 10) !== ymd) throw new OrderError(400, '到期日期格式不正确');
  if (new Date(ms).toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }) !== '23') ms -= 3600 * 1000;
  return Math.floor(ms / 1000);
}

function view(p) {
  const c = p.coupon;
  const meta = p.metadata || {};
  const redeemed = p.times_redeemed || 0;
  const expired = Boolean(p.expires_at && p.expires_at * 1000 < Date.now());
  const usedUp = Boolean(p.max_redemptions && redeemed >= p.max_redemptions);
  return {
    id: p.id, code: p.code, label: label(c), kind: c.percent_off ? 'percent' : 'amount',
    value: c.percent_off || c.amount_off / 100,
    active: p.active, expired, usedUp, sendable: p.active && c.valid !== false && !expired && !usedUp,
    maxRedemptions: p.max_redemptions || null, timesRedeemed: redeemed,
    expiresOn: p.expires_at ? londonDate(p.expires_at) : '',
    note: meta.note || '', sentCount: parseInt(meta.sent_count, 10) || 0,
    lastSentTo: meta.last_sent_to || '', lastSentAt: meta.last_sent_at || '',
  };
}

// Field checks shared by create and edit. Returns normalised values.
function parseFields({ kind, value, maxRedemptions, expiresOn, note } = {}) {
  const n = Number(value);
  let discount;
  if (kind === 'percent') {
    if (!(n > 0 && n <= 100)) throw new OrderError(400, '折扣比例要在 0 到 100 之间');
    discount = { percent_off: n };
  } else if (kind === 'amount') {
    const pence = Math.round(n * 100);
    if (!(pence >= 1 && pence <= 10000000)) throw new OrderError(400, '优惠金额不正确');
    discount = { amount_off: pence, currency: 'gbp' };
  } else {
    throw new OrderError(400, '请选择优惠类型');
  }
  let max = null;
  if (maxRedemptions !== '' && maxRedemptions != null) {
    max = Number(maxRedemptions);
    if (!Number.isInteger(max) || max < 1) throw new OrderError(400, '可用次数要是正整数，留空表示不限');
  }
  let expiresAt = null;
  if (expiresOn) {
    expiresAt = endOfDayLondon(expiresOn);
    if (expiresAt * 1000 <= Date.now()) throw new OrderError(400, '到期日期要晚于今天');
  }
  return { kind, value: n, discount, max, expiresOn: expiresOn || '', expiresAt, note: String(note || '').trim().slice(0, NOTE_MAX) };
}

// Stripe's own refusals (for example a code already in use) go back to the seller.
async function stripeCall(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.type === 'StripeInvalidRequestError') throw new OrderError(400, `Stripe 拒绝了这个操作：${err.message}`);
    throw err;
  }
}

async function createPromotion(stripe, code, f, { active = true, metadata = {} } = {}) {
  const coupon = await stripeCall(() => stripe.coupons.create({
    ...f.discount, duration: 'once', name: `Shui Thread ${label(f.discount)}`, metadata: { site: SITE_TAG },
  }));
  return stripeCall(() => stripe.promotionCodes.create({
    coupon: coupon.id, code, active,
    ...(f.max ? { max_redemptions: f.max } : {}),
    ...(f.expiresAt ? { expires_at: f.expiresAt } : {}),
    metadata: { ...metadata, site: SITE_TAG, note: f.note },
  }));
}

function generateCode() {
  let s = 'SHUI-';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return s;
}

async function listCoupons(stripe) {
  const out = [];
  for await (const p of stripe.promotionCodes.list({ limit: 100 })) {
    if (p.metadata?.site === SITE_TAG) out.push(view(p));
  }
  return out.sort((a, b) => Number(b.active) - Number(a.active));
}

async function createCoupon(stripe, body = {}) {
  const f = parseFields(body);
  const code = String(body.code || '').trim().toUpperCase() || generateCode();
  if (!CODE.test(code)) throw new OrderError(400, '券码要 3 到 32 位，只能用大写字母、数字和横线');
  return view(await createPromotion(stripe, code, f));
}

async function getCoupon(stripe, id) {
  if (!/^promo_[A-Za-z0-9]+$/.test(String(id))) throw new OrderError(404, '找不到这张优惠券');
  let p;
  try { p = await stripe.promotionCodes.retrieve(id); } catch { throw new OrderError(404, '找不到这张优惠券'); }
  if (p.metadata?.site !== SITE_TAG) throw new OrderError(404, '找不到这张优惠券');
  return p;
}

async function setCouponActive(stripe, id, active) {
  await getCoupon(stripe, id);
  return view(await stripeCall(() => stripe.promotionCodes.update(id, { active: Boolean(active) })));
}

async function editCoupon(stripe, id, body = {}) {
  const old = await getCoupon(stripe, id);
  const before = view(old);
  const f = parseFields(body);
  const same = before.kind === f.kind && before.value === f.value
    && before.maxRedemptions === f.max && before.expiresOn === f.expiresOn;

  if (same) {
    return view(await stripeCall(() => stripe.promotionCodes.update(id, { metadata: { note: f.note } })));
  }
  if (before.timesRedeemed > 0) {
    throw new OrderError(409, '这张券已经被用过，不能改面额、次数或到期日。可以停用它，再新建一张。');
  }

  // The code stays the same, so the old one must stop being active first.
  if (old.active) await stripeCall(() => stripe.promotionCodes.update(id, { active: false }));
  let fresh;
  try {
    const { site, ...keep } = old.metadata;
    fresh = await createPromotion(stripe, old.code, f, { active: old.active, metadata: keep });
  } catch (err) {
    if (old.active) await stripe.promotionCodes.update(id, { active: true });
    throw err;
  }
  try {
    await stripe.promotionCodes.update(id, { metadata: { site: REPLACED_TAG, replaced_by: fresh.id } });
  } catch (err) {
    console.error('Coupon replace cleanup error:', err.message);
  }
  return view(fresh);
}

// Bring a code made in the Stripe Dashboard into the back office.
async function importCoupon(stripe, rawCode) {
  const code = String(rawCode || '').trim();
  if (!code || code.length > 64) throw new OrderError(400, '请输入券码');
  const { data } = await stripe.promotionCodes.list({ code, limit: 10 });
  const p = data.find(x => x.active) || data[0];
  if (!p) throw new OrderError(404, '在 Stripe 里没有找到这个券码');
  if (p.metadata?.site === REPLACED_TAG) throw new OrderError(409, '这是已被替换的旧券');
  return view(await stripeCall(() => stripe.promotionCodes.update(p.id, { metadata: { site: SITE_TAG } })));
}

async function sendCoupon(stripe, id, { email, message } = {}) {
  const to = String(email || '').trim();
  if (to.length > 254 || !EMAIL.test(to)) throw new OrderError(400, '邮箱格式不正确');
  const p = await getCoupon(stripe, id);
  const v = view(p);
  if (!v.sendable) throw new OrderError(409, '这张券已停用、过期或用完，不能发送');

  const m = customerVoucher({
    code: v.code, label: v.label, expiresOn: v.expiresOn, maxRedemptions: v.maxRedemptions,
    message: String(message || '').trim().slice(0, MESSAGE_MAX),
  });
  const minute = Math.floor(Date.now() / 60000);
  const who = crypto.createHash('sha256').update(to.toLowerCase()).digest('hex').slice(0, 32);
  await sendEmail({
    from: 'Shui Thread <noreply@shuithread.com>', to: [to], reply_to: 'hello@shuithread.com',
    subject: m.subject, html: m.html, text: m.text,
  }, `voucher-send/${id}/${who}/${minute}`); // A double click can't send twice.

  const metadata = { sent_count: String(v.sentCount + 1), last_sent_to: to, last_sent_at: new Date().toISOString() };
  try {
    await stripe.promotionCodes.update(id, { metadata });
  } catch (err) {
    console.error('Coupon send record error:', err.message); // The email did go out.
    return { ...v, sendRecorded: false };
  }
  return { ...v, sentCount: v.sentCount + 1, lastSentTo: to, lastSentAt: metadata.last_sent_at, sendRecorded: true };
}

module.exports = { listCoupons, createCoupon, setCouponActive, editCoupon, importCoupon, sendCoupon };
