// ═══════════════════════════════════════════
//  SHUI THREAD — Orders: sold state, order emails, inbound forwarding
//  No database: Stripe Checkout Sessions tagged metadata.site = SITE_TAG are
//  the record of what sold. The Stripe account is shared, so anything without
//  that tag is ignored.
// ═══════════════════════════════════════════
const crypto = require('crypto');
const { customerConfirmation, ownerNotification } = require('./emails');

const SITE_TAG = 'shuithread';
const RESEND_API = 'https://api.resend.com';
const FROM_ORDERS = 'Shui Thread <noreply@shuithread.com>';
const FROM_FORWARD = 'Shui Thread Inbox <noreply@shuithread.com>';
const REPLY_TO = 'hello@shuithread.com';
const SHOP_DOMAIN = 'shuithread.com';
const DEFAULT_NOTIFY = 'xinru.niu@carbonkites.com';
// Tagged sessions can't exist before this feature shipped; bounds the listing.
const SOLD_SINCE = Math.floor(Date.UTC(2026, 10, 1) / 1000);
const SOLD_CACHE_MS = 60 * 1000;

const notifyAddress = () => process.env.ORDER_NOTIFY_EMAIL || DEFAULT_NOTIFY;

// ─── Session metadata ───────────────────────────────────────
function sessionMetadata(items, voucher) {
  const meta = {
    site: SITE_TAG,
    items: items.map(i => `${i.id}:${i.qty}`).join(','),
  };
  if (voucher) meta.voucher = String(voucher).slice(0, 64);
  return meta;
}

function parseItems(str) {
  return String(str || '').split(',').filter(Boolean).map(part => {
    const [id, qty] = part.split(':');
    return { id, qty: parseInt(qty, 10) || 1 };
  });
}

// ─── Sold state ─────────────────────────────────────────────
let soldCache = { at: 0, ids: null };

function manualSoldIds() {
  return (process.env.SOLD_PRODUCT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
}

async function getSoldIds(stripe, { fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && soldCache.ids && now - soldCache.at < SOLD_CACHE_MS) return soldCache.ids;

  const ids = new Set(manualSoldIds());
  if (stripe) {
    const sessions = stripe.checkout.sessions.list({ limit: 100, created: { gte: SOLD_SINCE } });
    for await (const s of sessions) {
      if (s.metadata?.site !== SITE_TAG || s.payment_status !== 'paid') continue;
      parseItems(s.metadata.items).forEach(i => ids.add(i.id));
    }
  }
  soldCache = { at: now, ids };
  return ids;
}

function resetSoldCache() { soldCache = { at: 0, ids: null }; }

// ─── Build an order from a paid session ─────────────────────
function buildOrder(session, products) {
  const details = session.customer_details || {};
  // API versions differ on where the shipping address lives.
  const shipping = session.shipping_details || session.collected_information?.shipping_details || {};
  const items = parseItems(session.metadata?.items).map(({ id, qty }) => {
    const p = products.find(x => x.id === id) || { name: id };
    return {
      name: p.name, nameZh: p.nameZh, img: p.img, qty,
      amountPence: Math.round((p.priceGBP || 0) * 100) * qty,
    };
  });
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  return {
    ref: session.id.slice(-12).toUpperCase(),
    customerName: shipping.name || details.name || '',
    email: details.email || session.customer_email || '',
    phone: details.phone || '',
    address: shipping.address || details.address || null,
    items,
    subtotalPence: session.amount_subtotal || 0,
    discountPence: session.total_details?.amount_discount || 0,
    shippingPence: session.total_details?.amount_shipping || 0,
    totalPence: session.amount_total || 0,
    voucher: session.metadata?.voucher || '',
    stripeUrl: pi ? `https://dashboard.stripe.com/payments/${pi}` : '',
  };
}

// ─── Resend ─────────────────────────────────────────────────
async function resendFetch(path, { method = 'GET', body, idempotencyKey } = {}) {
  const res = await fetch(RESEND_API + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${method} ${path} ${res.status}: ${data.message || 'failed'}`);
  return data;
}

function sendEmail(message, idempotencyKey) {
  return resendFetch('/emails', { method: 'POST', body: message, idempotencyKey });
}

// Idempotency keys make Stripe's webhook retries safe: a retry can't double-send.
async function sendOrderEmails(order, sessionId) {
  const tasks = [];
  if (order.email) {
    const c = customerConfirmation(order);
    tasks.push(sendEmail({
      from: FROM_ORDERS, to: [order.email], reply_to: REPLY_TO,
      subject: c.subject, html: c.html, text: c.text,
    }, `order-customer/${sessionId}`));
  }
  const o = ownerNotification(order);
  tasks.push(sendEmail({
    from: FROM_ORDERS, to: [notifyAddress()], reply_to: order.email || REPLY_TO,
    subject: o.subject, html: o.html, text: o.text,
  }, `order-owner/${sessionId}`));
  await Promise.all(tasks);
}

// Returns true if this session belongs to the shop and emails went out.
async function handleCheckoutCompleted(session, products) {
  if (session.metadata?.site !== SITE_TAG) return false;
  if (session.payment_status !== 'paid') return false;
  resetSoldCache();
  await sendOrderEmails(buildOrder(session, products), session.id);
  return true;
}

// ─── Resend webhook signature (Svix scheme) ─────────────────
function verifyResendSignature(rawBody, headers, secret, nowSeconds = Date.now() / 1000) {
  const id = headers['svix-id'];
  const ts = headers['svix-timestamp'];
  const sig = headers['svix-signature'];
  if (!id || !ts || !sig || !secret || !rawBody) return false;
  if (Math.abs(nowSeconds - Number(ts)) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest();
  return sig.split(' ').some(part => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

// ─── Inbound forwarding ─────────────────────────────────────
function senderAddress(from) {
  const m = String(from || '').match(/<([^>]+)>/);
  return (m ? m[1] : String(from || '')).trim().toLowerCase();
}

function escapeHTML(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Forward a received message to the shop's real inbox. Resend only sends a
// metadata webhook, so the body and attachment links are fetched separately.
async function forwardInbound(data) {
  const sender = senderAddress(data.from);
  // Loop guard: never re-forward mail sent from our own domain.
  if (!sender || sender.endsWith('@' + SHOP_DOMAIN)) return false;

  const id = data.email_id;
  const email = await resendFetch(`/emails/receiving/${encodeURIComponent(id)}`);
  const hasAttachments = (data.attachments || email.attachments || []).length > 0;
  let attachments = [];
  if (hasAttachments) {
    const list = await resendFetch(`/emails/receiving/${encodeURIComponent(id)}/attachments`);
    attachments = (list.data || []).map(a => ({ filename: a.filename, path: a.download_url }));
  }

  const to = (data.to || email.to || []).join(', ');
  const banner = `<div style="font:13px/1.5 Arial,sans-serif;color:#6B6558;border-bottom:1px solid #E2DBCF;padding:0 0 10px;margin:0 0 16px;">`
    + `Forwarded from ${escapeHTML(to)} · From: ${escapeHTML(data.from)}</div>`;
  const textBanner = `Forwarded from ${to}\nFrom: ${data.from}\n\n`;

  await sendEmail({
    from: FROM_FORWARD,
    to: [notifyAddress()],
    reply_to: sender,
    subject: data.subject || email.subject || '(no subject)',
    html: banner + (email.html || `<pre style="white-space:pre-wrap">${escapeHTML(email.text || '')}</pre>`),
    text: textBanner + (email.text || ''),
    ...(attachments.length ? { attachments } : {}),
  }, `inbound-forward/${id}`);
  return true;
}

module.exports = {
  SITE_TAG, sessionMetadata, parseItems, getSoldIds, resetSoldCache, buildOrder,
  handleCheckoutCompleted, verifyResendSignature, forwardInbound, senderAddress,
};
