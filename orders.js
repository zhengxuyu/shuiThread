// ═══════════════════════════════════════════
//  SHUI THREAD — Orders: sold state, order emails, inbound forwarding
//  No database: Stripe Checkout Sessions tagged metadata.site = SITE_TAG are
//  the record of what sold. The Stripe account is shared, so anything without
//  that tag is ignored.
// ═══════════════════════════════════════════
const crypto = require('crypto');
const { customerConfirmation, customerShipped, ownerNotification, customerRefundRequested, ownerRefundRequest, customerOrderLinks } = require('./emails');

const SITE_TAG = 'shuithread';
const SITE_URL = 'https://shuithread.com';
const SESSION_ID = /^cs_(live|test)_[A-Za-z0-9]+$/;
const CARRIERS = {
  royal_mail: { name: 'Royal Mail', url: t => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(t)}` },
  dpd: { name: 'DPD', url: () => 'https://track.dpd.co.uk/' },
};
const RESEND_API = 'https://api.resend.com';
const FROM_ORDERS = 'Shui Thread <noreply@shuithread.com>';
const FROM_FORWARD = 'Shui Thread Inbox <noreply@shuithread.com>';
const REPLY_TO = 'hello@shuithread.com';
const SHOP_DOMAIN = 'shuithread.com';
const DEFAULT_NOTIFY = 'xinru.niu@carbonkites.com';
// Tagged sessions can't exist before this feature shipped; bounds the listing.
const SOLD_SINCE = Math.floor(Date.UTC(2026, 10, 1) / 1000);
const SOLD_CACHE_MS = 60 * 1000;
// Legally required cancellation notice. A link alone isn't a durable medium, so it travels as a PDF.
const CANCELLATION_PDF = { filename: 'Shui-Thread-cancellation-notice.pdf', path: `${SITE_URL}/legal/cancellation-notice.pdf` };
const REFUND_REASONS = ['change_of_mind', 'faulty'];
const REFUND_NOTE_MAX = 500; // Stripe's limit for one metadata value

const notifyAddress = () => process.env.ORDER_NOTIFY_EMAIL || DEFAULT_NOTIFY;

// A voucher covering the whole order completes as 'no_payment_required'.
const isFulfillable = s => s.payment_status === 'paid' || s.payment_status === 'no_payment_required';

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
      if (s.metadata?.site !== SITE_TAG || !isFulfillable(s) || s.metadata.relisted === '1') continue;
      parseItems(s.metadata.items).forEach(i => ids.add(i.id));
    }
  }
  soldCache = { at: now, ids };
  return ids;
}

function resetSoldCache() { soldCache = { at: 0, ids: null }; }

// ─── Signed customer order links ────────────────────────────
function orderToken(sessionId) {
  const secret = process.env.ORDER_LINK_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`order:${sessionId}`).digest('base64url');
}

function verifyOrderToken(sessionId, token) {
  const expected = orderToken(sessionId);
  if (!expected || typeof token !== 'string') return false;
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function orderUrl(sessionId) {
  const t = orderToken(sessionId);
  return t ? `${SITE_URL}/order.html?id=${encodeURIComponent(sessionId)}&t=${t}` : '';
}

function shipmentFrom(meta = {}) {
  if (!meta.ship_tracking) return null;
  const c = CARRIERS[meta.ship_carrier] || { name: meta.ship_carrier, url: () => '' };
  return {
    carrier: meta.ship_carrier, carrierName: c.name, tracking: meta.ship_tracking,
    trackingUrl: c.url(meta.ship_tracking), shippedAt: meta.shipped_at || '',
    emailSent: meta.ship_email_sent === '1',
  };
}

function refundFrom(meta = {}) {
  if (!meta.refund_requested_at) return null;
  return {
    requestedAt: meta.refund_requested_at, reason: meta.refund_reason, note: meta.refund_note || '',
    emailSent: meta.refund_email_sent === '1',
  };
}

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
    orderUrl: orderUrl(session.id),
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
      subject: c.subject, html: c.html, text: c.text, attachments: [CANCELLATION_PDF],
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
  if (!isFulfillable(session)) return false;
  resetSoldCache();
  await sendOrderEmails(buildOrder(session, products), session.id);
  return true;
}

// ─── Seller back office ─────────────────────────────────────
// The SDK version in use has no sessions.update, so call the API directly.
async function updateSessionMetadata(id, metadata) {
  const body = new URLSearchParams();
  Object.entries(metadata).forEach(([k, v]) => body.append(`metadata[${k}]`, v));
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe metadata update ${res.status}: ${data.error?.message || 'failed'}`);
  return data;
}

function adminOrderView(session, products) {
  const o = buildOrder(session, products);
  return {
    id: session.id, ref: o.ref, createdAt: session.created, customerName: o.customerName, email: o.email, phone: o.phone,
    address: o.address, items: o.items, subtotalPence: o.subtotalPence, discountPence: o.discountPence, totalPence: o.totalPence,
    voucher: o.voucher, stripeUrl: o.stripeUrl, orderUrl: o.orderUrl, relisted: session.metadata?.relisted === '1',
    shipment: shipmentFrom(session.metadata), refund: refundFrom(session.metadata),
  };
}

async function listOrders(stripe, products) {
  const out = [];
  for await (const s of stripe.checkout.sessions.list({ limit: 100, created: { gte: SOLD_SINCE } })) {
    if (s.metadata?.site === SITE_TAG && isFulfillable(s)) out.push(adminOrderView(s, products));
  }
  return out;
}

class OrderError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function getShopSession(stripe, id) {
  if (!SESSION_ID.test(String(id))) throw new OrderError(404, 'Order not found');
  let s;
  try { s = await stripe.checkout.sessions.retrieve(id); } catch { throw new OrderError(404, 'Order not found'); }
  if (s.metadata?.site !== SITE_TAG || !isFulfillable(s)) throw new OrderError(404, 'Order not found');
  return s;
}

async function shipOrder(stripe, id, { carrier, tracking } = {}, products) {
  const c = CARRIERS[carrier];
  const num = String(tracking || '').trim().replace(/\s+/g, ' ');
  if (!c) throw new OrderError(400, '请选择快递公司');
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(num)) throw new OrderError(400, '快递单号格式不正确');

  const session = await getShopSession(stripe, id);
  const prev = shipmentFrom(session.metadata);
  if (prev && prev.emailSent && prev.carrier === carrier && prev.tracking === num) {
    throw new OrderError(409, '这个单号已经发过邮件了');
  }

  const shippedAt = session.metadata.shipped_at || new Date().toISOString();
  // Record first: the tracking number must never be lost to a mail failure.
  const updated = await updateSessionMetadata(id, {
    ship_carrier: carrier, ship_tracking: num, shipped_at: shippedAt, ship_email_sent: '0',
  });
  const merged = { ...session, metadata: { ...session.metadata, ...(updated.metadata || {}) } };
  const order = buildOrder(merged, products);
  const m = customerShipped(order, shipmentFrom(merged.metadata));
  if (order.email) {
    await sendEmail({
      from: FROM_ORDERS, to: [order.email], reply_to: REPLY_TO,
      subject: m.subject, html: m.html, text: m.text,
    }, `order-shipped/${id}/${carrier}/${num.replace(/[^A-Za-z0-9-]/g, '')}`);
  }
  await updateSessionMetadata(id, { ship_email_sent: '1' });
  merged.metadata.ship_email_sent = '1';
  return adminOrderView(merged, products);
}

async function setRelisted(stripe, id, relisted, products) {
  const session = await getShopSession(stripe, id);
  await updateSessionMetadata(id, { relisted: relisted ? '1' : '' });
  resetSoldCache();
  const meta = { ...session.metadata };
  if (relisted) meta.relisted = '1'; else delete meta.relisted;
  return adminOrderView({ ...session, metadata: meta }, products);
}

// What the buyer sees through their signed link. No email or phone.
function buyerOrderView(session, products) {
  const o = buildOrder(session, products);
  const ship = shipmentFrom(session.metadata);
  const refund = refundFrom(session.metadata);
  return {
    ref: o.ref, createdAt: session.created, status: ship ? 'shipped' : 'confirmed',
    customerName: o.customerName, address: o.address,
    items: o.items.map(i => ({ name: i.name, nameZh: i.nameZh, img: i.img, qty: i.qty, amountPence: i.amountPence })),
    subtotalPence: o.subtotalPence, discountPence: o.discountPence, shippingPence: o.shippingPence, totalPence: o.totalPence, voucher: o.voucher,
    shipment: ship && { carrierName: ship.carrierName, tracking: ship.tracking, trackingUrl: ship.trackingUrl, shippedAt: ship.shippedAt },
    refundRequest: refund && { requestedAt: refund.requestedAt, reason: refund.reason },
  };
}

async function publicOrderView(stripe, id, token, products) {
  if (!verifyOrderToken(id, token)) throw new OrderError(404, 'Order not found');
  return buyerOrderView(await getShopSession(stripe, id), products);
}

// Records the request and tells both sides. It never moves money: the seller
// refunds in Stripe. Repeat submits are safe, and the first answer is the one kept.
async function requestRefund(stripe, id, { t, reason, note } = {}, products) {
  if (!verifyOrderToken(id, t)) throw new OrderError(404, 'Order not found');
  if (!REFUND_REASONS.includes(reason)) throw new OrderError(400, 'Please choose a reason');

  const session = await getShopSession(stripe, id);
  const meta = { ...session.metadata };
  if (meta.refund_email_sent === '1') return buyerOrderView(session, products);

  if (!meta.refund_requested_at) {
    // Record first: the time of the request must never be lost to a mail failure.
    const fields = {
      refund_requested_at: new Date().toISOString(), refund_reason: reason,
      refund_note: String(note || '').trim().slice(0, REFUND_NOTE_MAX), refund_email_sent: '0',
    };
    await updateSessionMetadata(id, fields);
    Object.assign(meta, fields);
  }

  const merged = { ...session, metadata: meta };
  const order = buildOrder(merged, products);
  const request = refundFrom(meta);
  const shipment = shipmentFrom(meta);
  const owner = ownerRefundRequest(order, request, shipment);
  const tasks = [sendEmail({
    from: FROM_ORDERS, to: [notifyAddress()], reply_to: order.email || REPLY_TO,
    subject: owner.subject, html: owner.html, text: owner.text,
  }, `refund-owner/${id}`)];
  if (order.email) {
    const c = customerRefundRequested(order, request, Boolean(shipment));
    tasks.push(sendEmail({
      from: FROM_ORDERS, to: [order.email], reply_to: REPLY_TO,
      subject: c.subject, html: c.html, text: c.text,
    }, `refund-customer/${id}`));
  }
  await Promise.all(tasks);
  await updateSessionMetadata(id, { refund_email_sent: '1' });
  meta.refund_email_sent = '1';
  return buyerOrderView(merged, products);
}

// Emails a buyer the links to their orders. The result never says whether the
// address has orders. The key allows one identical email per hour, across
// instances, so the form can't be used to flood someone's inbox.
async function emailOrderLinks(stripe, email, products) {
  const wanted = String(email).trim().toLowerCase();
  const found = [];
  for await (const s of stripe.checkout.sessions.list({ limit: 100, created: { gte: SOLD_SINCE } })) {
    if (s.metadata?.site !== SITE_TAG || !isFulfillable(s)) continue;
    const o = buildOrder(s, products);
    if (o.orderUrl && o.email && o.email.toLowerCase() === wanted) found.push({ ...o, id: s.id });
  }
  if (!found.length) return false;
  const hour = Math.floor(Date.now() / 3600000);
  const key = crypto.createHash('sha256').update(`${wanted}|${found.map(o => o.id).join(',')}|${hour}`).digest('hex');
  const m = customerOrderLinks(found);
  await sendEmail({
    from: FROM_ORDERS, to: [found[0].email], reply_to: REPLY_TO,
    subject: m.subject, html: m.html, text: m.text,
  }, `order-lookup/${key}`);
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
  listOrders, shipOrder, setRelisted, publicOrderView, requestRefund, emailOrderLinks, verifyOrderToken, orderToken, OrderError, CARRIERS,
};
