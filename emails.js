// ═══════════════════════════════════════════
//  SHUI THREAD — Transactional email templates
//  Table layout + inline styles: email clients ignore most modern CSS and
//  web fonts, so the logo is an image and type falls back to Georgia.
// ═══════════════════════════════════════════

const DEFAULT_SITE = 'https://shuithread.com';
const CONTACT = 'hello@shuithread.com';
const SELLER = 'CARBONKITE LTD';
const SELLER_ADDRESS = '28 Tersha Street, Richmond, TW9 2LY, United Kingdom';

const C = {
  cream: '#F7F3ED', parchment: '#EDE7DC', white: '#FFFFFF',
  ink: '#0D0D0D', soft: '#2A2A2A', muted: '#6B6558',
  orange: '#D94E1F', teal: '#0A6464', line: '#E2DBCF',
};
const SERIF = "Georgia, 'Times New Roman', 'Songti SC', serif";
const MONO = "'Courier New', Courier, monospace";

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function gbp(pence) {
  return '£' + (pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2));
}

// '/imgs/butterfly.png' → '<site>/imgs/email/butterfly.jpg'
function thumb(img, site) {
  if (!img) return '';
  const name = img.split('/').pop().replace(/\.[a-z]+$/i, '');
  return `${site}/imgs/email/${name}.jpg`;
}

function addressLines(a) {
  if (!a) return [];
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country === 'GB' ? 'United Kingdom' : a.country]
    .filter(Boolean);
}

function label(text) {
  return `<div style="font-family:${MONO};font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:${C.muted};">${text}</div>`;
}

function totalRow(name, value, color) {
  return `<tr>
    <td style="padding:5px 0;font-family:${SERIF};font-size:14px;color:${color || C.muted};">${name}</td>
    <td align="right" style="padding:5px 0;font-family:${SERIF};font-size:14px;color:${color || C.soft};">${value}</td>
  </tr>`;
}

function itemRows(order, site) {
  return order.items.map(i => `
    <tr>
      <td width="84" valign="top" style="padding:16px 16px 16px 0;border-bottom:1px solid ${C.line};">
        ${i.img ? `<img src="${esc(thumb(i.img, site))}" width="84" alt="${esc(i.name)}" style="display:block;width:84px;height:auto;border:0;border-radius:2px;">` : ''}
      </td>
      <td valign="top" style="padding:16px 0;border-bottom:1px solid ${C.line};">
        <div style="font-family:${SERIF};font-size:17px;line-height:1.3;color:${C.ink};">${esc(i.name)}</div>
        ${i.nameZh ? `<div style="font-family:${SERIF};font-size:13px;line-height:1.6;color:${C.muted};">${esc(i.nameZh)}</div>` : ''}
        ${i.qty > 1 ? `<div style="font-family:${MONO};font-size:12px;color:${C.muted};padding-top:4px;">Qty ${esc(i.qty)}</div>` : ''}
      </td>
      <td width="70" align="right" valign="top" style="padding:16px 0;border-bottom:1px solid ${C.line};font-family:${SERIF};font-size:16px;color:${C.ink};">${gbp(i.amountPence)}</td>
    </tr>`).join('');
}

function totals(order) {
  return [
    totalRow('Subtotal', gbp(order.subtotalPence)),
    order.discountPence > 0
      ? totalRow(`Voucher${order.voucher ? ' · ' + esc(order.voucher) : ''}`, '−' + gbp(order.discountPence), C.teal)
      : '',
    totalRow('UK shipping', order.shippingPence > 0 ? gbp(order.shippingPence) : 'Free'),
  ].join('');
}

const ORDER_FOOTER = `You're receiving this because you placed an order at shuithread.com. Shui Thread is operated by ${SELLER}, ${SELLER_ADDRESS}, the seller of your order and the name you may see on your card statement.`;

function sellerFooter(site, note = ORDER_FOOTER) {
  return `  <tr><td class="pad" style="padding:26px 44px 30px;background:${C.ink};">
    <div style="font-family:${SERIF};font-size:18px;color:${C.white};">Shui Thread</div>
    <div style="padding-top:8px;font-family:${SERIF};font-size:13px;line-height:1.6;color:#B9B2A5;">
      Horsetail hair embroidery from the Shui people of Guizhou, China.
    </div>
    <div style="padding-top:14px;font-family:${MONO};font-size:12px;line-height:1.8;color:#B9B2A5;">
      <a href="${site}" style="color:#F7F3ED;">shuithread.com</a> &nbsp;·&nbsp; <a href="mailto:${CONTACT}" style="color:#F7F3ED;">${CONTACT}</a><br><a href="${site}/returns.html" style="color:#F7F3ED;">Returns &amp; after-sales</a>
    </div>
    <div style="padding-top:12px;font-family:${SERIF};font-size:12px;line-height:1.6;color:#8D8678;">
      ${note}
    </div>
  </td></tr>`;
}

function button(href, text) {
  return `<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;background:${C.ink};color:${C.white};font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-radius:2px;">${text}</a>`;
}

// ─── Customer: order confirmation ───────────────────────────
function customerConfirmation(order, site = DEFAULT_SITE) {
  const first = (order.customerName || '').trim().split(/\s+/)[0];
  const subject = `Your Shui Thread order is confirmed · ${order.ref}`;
  const preheader = 'Thank you. Your handmade piece is being prepared in Sandu, Guizhou.';
  const addr = addressLines(order.address);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  :root { color-scheme: light only; }
  @media (max-width: 620px) {
    .pad { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 36px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.parchment};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">

  <tr><td class="pad" style="padding:30px 44px 26px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/imgs/email/logo.png" width="172" alt="Shui Thread · 水丝线马尾绣" style="display:block;width:172px;height:auto;border:0;"></a>
  </td></tr>

  <tr><td>
    <img src="${site}/imgs/email/hero.jpg" width="600" alt="Shui horsetail hair embroidery, close up" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
  </td></tr>

  <tr><td class="pad" style="padding:42px 44px 8px;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:${C.orange};padding-bottom:14px;">Order confirmed · 订单确认</div>
    <h1 class="h1" style="margin:0;font-family:${SERIF};font-weight:normal;font-size:42px;line-height:1.08;letter-spacing:-0.5px;color:${C.ink};">Thank you${first ? ', ' + esc(first) : ''}.</h1>
    <p style="margin:18px 0 0;font-family:${SERIF};font-size:16px;line-height:1.7;color:${C.soft};">
      Your order is with us. Each piece is stitched by hand by Shui artisans using horsetail hair wrapped in silk, a tradition passed down through generations in Sandu, Guizhou.
    </p>
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.muted};">感谢您的支持。每一件作品都由水族绣娘亲手完成。</p>
  </td></tr>

  <tr><td class="pad" style="padding:30px 44px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-bottom:12px;border-bottom:1px solid ${C.ink};">${label('Your order')}</td>
        <td align="right" style="padding-bottom:12px;border-bottom:1px solid ${C.ink};font-family:${MONO};font-size:12px;letter-spacing:1px;color:${C.muted};">${esc(order.ref)}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows(order, site)}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      ${totals(order)}
      <tr>
        <td style="padding:14px 0 0;font-family:${SERIF};font-size:22px;color:${C.ink};">Total paid</td>
        <td align="right" style="padding:14px 0 0;font-family:${SERIF};font-size:22px;color:${C.ink};">${gbp(order.totalPence)}</td>
      </tr>
    </table>
  </td></tr>

  <tr><td class="pad" style="padding:34px 44px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
      <tr><td style="padding:22px 24px;">
        ${label('Shipping to')}
        <div style="padding-top:10px;font-family:${SERIF};font-size:15px;line-height:1.6;color:${C.ink};">
          ${esc(order.customerName)}<br>${addr.map(esc).join('<br>')}
        </div>
      </td></tr>
    </table>
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:13px;line-height:1.6;color:${C.muted};">
      Something not right? Let us know before it ships: <a href="mailto:${CONTACT}" style="color:${C.teal};">${CONTACT}</a>
    </p>
  </td></tr>

  <tr><td class="pad" style="padding:34px 44px 0;">
    ${label('What happens next')}
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:15px;line-height:1.7;color:${C.soft};">
      Your piece will be prepared in our Sandu studio and shipped within 7–21 days. We'll write again as soon as it leaves the studio.
    </p>
  </td></tr>

  <tr><td class="pad" style="padding:34px 44px 0;">
    ${label('Changed your mind?')}
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.soft};">
      You can cancel within 14 days of receiving your piece, and you pay the return postage. ${order.orderUrl ? 'You can request a refund from your order page. ' : ''}Your cancellation rights and form are in the attached PDF.
    </p>
  </td></tr>

  <tr><td class="pad" align="left" style="padding:30px 44px 42px;">
    ${order.orderUrl ? button(order.orderUrl, 'View your order →') : button(`${site}/about.html`, 'Discover the craft →')}
  </td></tr>

${sellerFooter(site)}
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Thank you${first ? ', ' + first : ''}. Your Shui Thread order is confirmed.`,
    `Order ${order.ref}`,
    '',
    ...order.items.map(i => `${i.name}${i.qty > 1 ? ' x' + i.qty : ''}  ${gbp(i.amountPence)}`),
    '',
    `Subtotal: ${gbp(order.subtotalPence)}`,
    ...(order.discountPence > 0 ? [`Voucher${order.voucher ? ' ' + order.voucher : ''}: -${gbp(order.discountPence)}`] : []),
    `UK shipping: ${order.shippingPence > 0 ? gbp(order.shippingPence) : 'Free'}`,
    `Total paid: ${gbp(order.totalPence)}`,
    '',
    ...(order.orderUrl ? [`View your order: ${order.orderUrl}`, ''] : []),
    'Shipping to:',
    order.customerName,
    ...addr,
    '',
    "Your piece will be prepared in our Sandu studio and shipped within 7-21 days. We'll write again as soon as it leaves the studio.",
    '',
    'Changed your mind? You can cancel within 14 days of receiving your piece, and you pay the return postage. Your cancellation rights and form are in the attached PDF.',
    '',
    `Returns & after-sales: ${site}/returns.html`,
    `Seller: ${SELLER}, ${SELLER_ADDRESS}`,
    `Questions? ${CONTACT}`,
    site,
  ].join('\n');

  return { subject, html, text };
}

// ─── Customer: dispatch notice ──────────────────────────────
function customerShipped(order, shipment, site = DEFAULT_SITE) {
  const first = (order.customerName || '').trim().split(/\s+/)[0];
  const subject = `Your Shui Thread piece is on its way · ${order.ref}`;
  const addr = addressLines(order.address);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  :root { color-scheme: light only; }
  @media (max-width: 620px) {
    .pad { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 36px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.parchment};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your handmade piece has left the studio. Tracking: ${esc(shipment.tracking)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td class="pad" style="padding:30px 44px 26px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/imgs/email/logo.png" width="172" alt="Shui Thread · 水丝线马尾绣" style="display:block;width:172px;height:auto;border:0;"></a>
  </td></tr>
  <tr><td><img src="${site}/imgs/email/hero.jpg" width="600" alt="Shui horsetail hair embroidery, close up" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
  <tr><td class="pad" style="padding:42px 44px 8px;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:${C.orange};padding-bottom:14px;">Shipped · 已发货</div>
    <h1 class="h1" style="margin:0;font-family:${SERIF};font-weight:normal;font-size:42px;line-height:1.08;letter-spacing:-0.5px;color:${C.ink};">On its way${first ? ', ' + esc(first) : ''}.</h1>
    <p style="margin:18px 0 0;font-family:${SERIF};font-size:16px;line-height:1.7;color:${C.soft};">Your piece has left the studio and should reach you in 3–7 business days.</p>
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.muted};">您的作品已经寄出，预计 3–7 个工作日送达。</p>
  </td></tr>
  <tr><td class="pad" style="padding:30px 44px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
      <tr><td style="padding:22px 24px;">
        ${label(esc(shipment.carrierName) + ' tracking number')}
        <div style="padding-top:10px;font-family:${MONO};font-size:20px;letter-spacing:1px;color:${C.ink};">${esc(shipment.tracking)}</div>
        <div style="padding-top:18px;">${button(shipment.trackingUrl, 'Track your parcel →')}</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td class="pad" style="padding:30px 44px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding-bottom:12px;border-bottom:1px solid ${C.ink};">${label('Your order')}</td>
      <td align="right" style="padding-bottom:12px;border-bottom:1px solid ${C.ink};font-family:${MONO};font-size:12px;letter-spacing:1px;color:${C.muted};">${esc(order.ref)}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows(order, site)}</table>
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 0;">
    ${label('Shipping to')}
    <div style="padding-top:10px;font-family:${SERIF};font-size:15px;line-height:1.6;color:${C.ink};">${esc(order.customerName)}<br>${addr.map(esc).join('<br>')}</div>
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 42px;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.muted};">
    ${order.orderUrl ? `<a href="${esc(order.orderUrl)}" style="color:${C.teal};">View your order</a> &nbsp;·&nbsp; ` : ''}<a href="${site}/returns.html" style="color:${C.teal};">Returns &amp; after-sales</a>
  </td></tr>
${sellerFooter(site)}
</table>
</td></tr>
</table>
</body>
</html>`;
  const text = [
    `Your Shui Thread piece is on its way${first ? ', ' + first : ''}.`, `Order ${order.ref}`, '',
    `${shipment.carrierName} tracking number: ${shipment.tracking}`, `Track your parcel: ${shipment.trackingUrl}`, '',
    ...order.items.map(i => `${i.name}${i.qty > 1 ? ' x' + i.qty : ''}`), '',
    'Shipping to:', order.customerName, ...addr, '',
    ...(order.orderUrl ? [`View your order: ${order.orderUrl}`] : []),
    `Returns & after-sales: ${site}/returns.html`, `Questions? ${CONTACT}`,
  ].join('\n');
  return { subject, html, text };
}

// ─── Shop: new order notification ───────────────────────────
function ownerNotification(order, site = DEFAULT_SITE) {
  const subject = `New order ${gbp(order.totalPence)} · ${order.items.map(i => i.name).join(', ')}`;
  const addr = addressLines(order.address);
  const row = (k, v) => `<tr>
    <td valign="top" style="padding:6px 16px 6px 0;font-family:${MONO};font-size:12px;color:${C.muted};white-space:nowrap;">${k}</td>
    <td style="padding:6px 0;font-family:${SERIF};font-size:15px;line-height:1.5;color:${C.ink};">${v}</td>
  </tr>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:${C.parchment};">
<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td style="padding:28px 32px 8px;">
    <img src="${site}/imgs/email/logo.png" width="140" alt="Shui Thread" style="display:block;width:140px;height:auto;border:0;">
  </td></tr>
  <tr><td style="padding:16px 32px 0;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:${C.orange};">New order · 新订单</div>
    <div style="padding-top:6px;font-family:${SERIF};font-size:30px;color:${C.ink};">${gbp(order.totalPence)}</div>
  </td></tr>
  <tr><td style="padding:16px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows(order, site)}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">${totals(order)}</table>
  </td></tr>
  <tr><td style="padding:18px 32px 30px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      ${row('Order', esc(order.ref))}
      ${row('Name', esc(order.customerName))}
      ${row('Email', `<a href="mailto:${esc(order.email)}" style="color:${C.teal};">${esc(order.email)}</a>`)}
      ${row('Phone', esc(order.phone || '—'))}
      ${row('Ship to', addr.map(esc).join('<br>'))}
      ${order.stripeUrl ? row('Stripe', `<a href="${esc(order.stripeUrl)}" style="color:${C.teal};">View payment</a>`) : ''}
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `New order ${gbp(order.totalPence)} (${order.ref})`,
    ...order.items.map(i => `- ${i.name}${i.qty > 1 ? ' x' + i.qty : ''}: ${gbp(i.amountPence)}`),
    ...(order.discountPence > 0 ? [`Voucher${order.voucher ? ' ' + order.voucher : ''}: -${gbp(order.discountPence)}`] : []),
    '',
    `Name: ${order.customerName}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone || '-'}`,
    `Ship to: ${addr.join(', ')}`,
    ...(order.stripeUrl ? [`Stripe: ${order.stripeUrl}`] : []),
  ].join('\n');

  return { subject, html, text };
}

// ─── Refund requests ────────────────────────────────────────
function refundDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
}

// What the buyer should do next depends on the reason and on whether it shipped.
function refundNextSteps(request, shipped) {
  if (request.reason === 'faulty') {
    return [
      "We're sorry. Please reply to this email with a photo of the problem.",
      "We'll tell you what happens next. If the piece needs to come back, we pay the return postage.",
    ];
  }
  if (!shipped) {
    return [
      "Your piece hasn't shipped yet, so there is nothing to send back.",
      "We'll confirm by email and refund what you paid to your original payment method within 14 days of your request.",
    ];
  }
  return [
    "We'll reply with the return address. Please send your piece back within 14 days of your request, well packed and with its certificate of authenticity, using a tracked and insured service. You pay the return postage.",
    "We'll refund what you paid to your original payment method within 14 days of receiving the piece, or proof you sent it, whichever is sooner. We may reduce the refund for any loss in value caused by handling beyond what was needed to establish the nature, characteristics and functioning of the piece.",
  ];
}

function customerRefundRequested(order, request, shipped, site = DEFAULT_SITE) {
  const subject = `We've received your refund request · ${order.ref}`;
  const when = refundDate(request.requestedAt);
  const steps = refundNextSteps(request, shipped);
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.parchment};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td class="pad" style="padding:30px 44px 8px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/imgs/email/logo.png" width="172" alt="Shui Thread · 水丝线马尾绣" style="display:block;width:172px;height:auto;border:0;"></a>
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 0;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:${C.orange};padding-bottom:14px;">Refund request · 退款申请</div>
    <h1 style="margin:0;font-family:${SERIF};font-weight:normal;font-size:34px;line-height:1.1;color:${C.ink};">Request received.</h1>
    <p style="margin:16px 0 0;font-family:${SERIF};font-size:15px;line-height:1.7;color:${C.soft};">We received your request on ${esc(when)} for order ${esc(order.ref)}: ${order.items.map(i => esc(i.name)).join(', ')}.</p>
    ${steps.map(p => `<p style="margin:12px 0 0;font-family:${SERIF};font-size:15px;line-height:1.7;color:${C.soft};">${esc(p)}</p>`).join('')}
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 34px;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.muted};">
    ${order.orderUrl ? `<a href="${esc(order.orderUrl)}" style="color:${C.teal};">View your order</a> &nbsp;·&nbsp; ` : ''}<a href="${site}/returns.html" style="color:${C.teal};">Returns &amp; after-sales</a>
  </td></tr>
${sellerFooter(site)}
</table>
</td></tr>
</table>
</body></html>`;
  const text = [
    `We received your refund request on ${when} for order ${order.ref}: ${order.items.map(i => i.name).join(', ')}.`, '',
    ...steps.flatMap(p => [p, '']),
    ...(order.orderUrl ? [`View your order: ${order.orderUrl}`] : []),
    `Returns & after-sales: ${site}/returns.html`, `Questions? ${CONTACT}`,
  ].join('\n');
  return { subject, html, text };
}

function ownerRefundRequest(order, request, shipment, site = DEFAULT_SITE) {
  const reason = request.reason === 'faulty' ? '有瑕疵、损坏或与描述不符' : '无理由退货';
  const status = shipment ? `已发货（${shipment.carrierName} ${shipment.tracking}）` : '尚未发货，请不要再寄出';
  const action = request.reason === 'faulty'
    ? '请回复买家，并根据照片决定如何处理。需要退回时运费由我们承担。'
    : shipment ? '请回复买家告知退货地址。收到作品或寄件凭证后，14 天内在 Stripe 退款。' : '请回复买家确认取消，并在申请日起 14 天内在 Stripe 退款。';
  const when = new Date(request.requestedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
  const subject = `退款申请 · ${order.ref} · ${order.items.map(i => i.name).join(', ')}`;
  const row = (k, v) => `<tr><td valign="top" style="padding:6px 16px 6px 0;font-size:13px;color:${C.muted};white-space:nowrap;">${k}</td><td style="padding:6px 0;font-size:15px;line-height:1.5;color:${C.ink};">${v}</td></tr>`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:${C.parchment};font-family:${SERIF};">
<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td style="padding:28px 32px 0;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.2px;color:${C.orange};">REFUND REQUEST · 退款申请</div>
    <div style="padding-top:8px;font-size:26px;color:${C.ink};">${esc(order.items.map(i => i.name).join('，'))}</div>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:${C.soft};">${esc(action)}</p>
  </td></tr>
  <tr><td style="padding:18px 32px 30px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      ${row('订单', esc(order.ref))}
      ${row('申请时间', `${esc(when)}（英国时间）`)}
      ${row('原因', esc(reason))}
      ${request.note ? row('买家留言', esc(request.note).replace(/\n/g, '<br>')) : ''}
      ${row('发货状态', esc(status))}
      ${row('实付', gbp(order.totalPence))}
      ${row('买家', `${esc(order.customerName)}<br><a href="mailto:${esc(order.email)}" style="color:${C.teal};">${esc(order.email)}</a>`)}
      ${order.stripeUrl ? row('Stripe', `<a href="${esc(order.stripeUrl)}" style="color:${C.teal};">查看付款并退款</a>`) : ''}
    </table>
    <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:${C.muted};">直接回复这封邮件即可联系买家。系统不会自动退款。</p>
  </td></tr>
</table>
</body></html>`;
  const text = [
    `退款申请 ${order.ref}`, action, '',
    `作品：${order.items.map(i => i.name).join('，')}`, `申请时间：${when}（英国时间）`, `原因：${reason}`,
    ...(request.note ? [`买家留言：${request.note}`] : []),
    `发货状态：${status}`, `实付：${gbp(order.totalPence)}`, `买家：${order.customerName} ${order.email}`,
    ...(order.stripeUrl ? [`Stripe：${order.stripeUrl}`] : []), '', '系统不会自动退款。',
  ].join('\n');
  return { subject, html, text };
}

// ─── Customer: "find my order" links ────────────────────────
function customerOrderLinks(orders, site = DEFAULT_SITE) {
  const subject = orders.length > 1 ? 'Your Shui Thread order links' : `Your Shui Thread order link · ${orders[0].ref}`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.parchment};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td class="pad" style="padding:30px 44px 8px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/imgs/email/logo.png" width="172" alt="Shui Thread · 水丝线马尾绣" style="display:block;width:172px;height:auto;border:0;"></a>
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 0;">
    <h1 style="margin:0;font-family:${SERIF};font-weight:normal;font-size:34px;line-height:1.1;color:${C.ink};">Your order${orders.length > 1 ? 's' : ''}.</h1>
    <p style="margin:14px 0 0;font-family:${SERIF};font-size:15px;line-height:1.7;color:${C.soft};">Here ${orders.length > 1 ? 'are the links' : 'is the link'} you asked for. Please keep this email private: anyone with a link can see that order and request a refund.</p>
  </td></tr>
  ${orders.map(o => `<tr><td class="pad" style="padding:24px 44px 0;">
    <div style="padding-bottom:10px;border-bottom:1px solid ${C.line};font-family:${MONO};font-size:12px;letter-spacing:1px;color:${C.muted};">${esc(o.ref)}</div>
    <div style="padding:12px 0 14px;font-family:${SERIF};font-size:16px;line-height:1.5;color:${C.ink};">${o.items.map(i => esc(i.name)).join(', ')}</div>
    ${button(o.orderUrl, 'View your order →')}
  </td></tr>`).join('')}
  <tr><td class="pad" style="padding:26px 44px 34px;font-family:${SERIF};font-size:13px;line-height:1.7;color:${C.muted};">If you didn't ask for this, you can ignore this email.</td></tr>
${sellerFooter(site)}
</table>
</td></tr>
</table>
</body></html>`;
  const text = [
    'Here are your Shui Thread order links. Please keep this email private: anyone with a link can see that order and request a refund.', '',
    ...orders.flatMap(o => [`${o.ref}: ${o.items.map(i => i.name).join(', ')}`, o.orderUrl, '']),
    "If you didn't ask for this, you can ignore this email.", `Questions? ${CONTACT}`,
  ].join('\n');
  return { subject, html, text };
}

// ─── Customer: voucher ──────────────────────────────────────
function customerVoucher({ code, label: offer, expiresOn, maxRedemptions, message }, site = DEFAULT_SITE) {
  const subject = `A gift from Shui Thread: ${offer}`;
  const expiry = expiresOn ? new Date(`${expiresOn}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  const terms = [
    maxRedemptions === 1 ? 'This code can be used once.' : '',
    expiry ? `It expires on ${expiry}.` : '',
    'Each piece is one of a kind, so availability is limited.',
  ].filter(Boolean).join(' ');
  const stop = 'To stop receiving offers from us, reply to this email and tell us.';
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.parchment};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};">
  <tr><td class="pad" style="padding:30px 44px 26px;">
    <a href="${site}" style="text-decoration:none;"><img src="${site}/imgs/email/logo.png" width="172" alt="Shui Thread · 水丝线马尾绣" style="display:block;width:172px;height:auto;border:0;"></a>
  </td></tr>
  <tr><td><img src="${site}/imgs/email/hero.jpg" width="600" alt="Shui horsetail hair embroidery, close up" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
  <tr><td class="pad" style="padding:42px 44px 0;">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:${C.orange};padding-bottom:14px;">A gift for you · 专属优惠</div>
    <h1 style="margin:0;font-family:${SERIF};font-weight:normal;font-size:42px;line-height:1.08;letter-spacing:-0.5px;color:${C.ink};">${esc(offer)} your next piece.</h1>
    ${message ? `<p style="margin:18px 0 0;font-family:${SERIF};font-size:16px;line-height:1.7;color:${C.soft};">${esc(message).replace(/\n/g, '<br>')}</p>` : ''}
  </td></tr>
  <tr><td class="pad" style="padding:28px 44px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};">
      <tr><td align="center" style="padding:24px;">
        ${label('Your code')}
        <div style="padding-top:10px;font-family:${MONO};font-size:26px;letter-spacing:2px;color:${C.ink};">${esc(code)}</div>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;font-family:${SERIF};font-size:15px;line-height:1.7;color:${C.soft};">Enter it in your cart before checkout. ${esc(terms)}</p>
  </td></tr>
  <tr><td class="pad" style="padding:26px 44px 42px;">${button(`${site}/collection.html`, 'See the collection →')}</td></tr>
${sellerFooter(site, `You're receiving this offer from Shui Thread. ${stop} Shui Thread is operated by ${SELLER}, ${SELLER_ADDRESS}.`)}
</table>
</td></tr>
</table>
</body></html>`;
  const text = [
    `${offer} your next piece from Shui Thread.`, '',
    ...(message ? [message, ''] : []),
    `Your code: ${code}`, `Enter it in your cart before checkout. ${terms}`, '',
    `See the collection: ${site}/collection.html`, '',
    stop, `Shui Thread is operated by ${SELLER}, ${SELLER_ADDRESS}.`,
  ].join('\n');
  return { subject, html, text };
}

module.exports = { customerConfirmation, customerShipped, ownerNotification, customerRefundRequested, ownerRefundRequest, customerOrderLinks, customerVoucher, gbp };
