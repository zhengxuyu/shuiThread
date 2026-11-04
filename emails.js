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

function sellerFooter(site) {
  return `  <tr><td class="pad" style="padding:26px 44px 30px;background:${C.ink};">
    <div style="font-family:${SERIF};font-size:18px;color:${C.white};">Shui Thread</div>
    <div style="padding-top:8px;font-family:${SERIF};font-size:13px;line-height:1.6;color:#B9B2A5;">
      Horsetail hair embroidery from the Shui people of Guizhou, China.
    </div>
    <div style="padding-top:14px;font-family:${MONO};font-size:12px;line-height:1.8;color:#B9B2A5;">
      <a href="${site}" style="color:#F7F3ED;">shuithread.com</a> &nbsp;·&nbsp; <a href="mailto:${CONTACT}" style="color:#F7F3ED;">${CONTACT}</a><br><a href="${site}/returns.html" style="color:#F7F3ED;">Returns &amp; after-sales</a>
    </div>
    <div style="padding-top:12px;font-family:${SERIF};font-size:12px;line-height:1.6;color:#8D8678;">
      You're receiving this because you placed an order at shuithread.com. Shui Thread is operated by ${SELLER}, ${SELLER_ADDRESS}, the seller of your order and the name you may see on your card statement.
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
    ${label('Your right to cancel')}
    <p style="margin:12px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.soft};">
      You may cancel this contract without giving a reason within 14 days of the day you, or someone you name, receive the goods. To cancel, tell ${SELLER} (${SELLER_ADDRESS}; <a href="mailto:${CONTACT}" style="color:${C.teal};">${CONTACT}</a>) with a clear statement. You may use the form below, but it is not required. To meet the deadline, you only need to send your notice before the 14 days end.
    </p>
    <p style="margin:10px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.soft};">
      If you cancel, send the goods back without undue delay and within 14 days of telling us. <b>You pay the direct cost of returning them.</b> We'll refund all payments received, using your original payment method, within 14 days of receiving the goods or proof that you sent them, whichever is sooner. We may reduce the refund for any loss in value caused by handling beyond what was needed to establish the nature, characteristics and functioning of the goods.
    </p>
    <p style="margin:10px 0 0;font-family:${SERIF};font-size:14px;line-height:1.7;color:${C.soft};">
      This doesn't affect your rights if a piece is faulty or not as described; in that case we pay for the return. Full details: <a href="${site}/returns.html" style="color:${C.teal};">Returns &amp; after-sales</a>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;background:${C.parchment};">
      <tr><td style="padding:18px 20px;font-family:${SERIF};font-size:13px;line-height:1.7;color:${C.soft};">
        <b>Cancellation form</b> (complete and return only if you wish to cancel)<br>
        To: ${SELLER}, ${SELLER_ADDRESS}, ${CONTACT}<br>
        I/We hereby give notice that I/We cancel my/our contract of sale of the following goods:<br>
        Ordered on / received on:<br>
        Name of consumer(s):<br>
        Address of consumer(s):<br>
        Signature of consumer(s) (only if this form is sent on paper):<br>
        Date:
      </td></tr>
    </table>
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
    'YOUR RIGHT TO CANCEL',
    `You may cancel this contract without giving a reason within 14 days of the day you, or someone you name, receive the goods. To cancel, tell ${SELLER} (${SELLER_ADDRESS}; ${CONTACT}) with a clear statement. To meet the deadline, you only need to send your notice before the 14 days end.`,
    'If you cancel, send the goods back without undue delay and within 14 days of telling us. You pay the direct cost of returning them. We will refund all payments received, using your original payment method, within 14 days of receiving the goods or proof that you sent them, whichever is sooner. We may reduce the refund for any loss in value caused by handling beyond what was needed to establish the nature, characteristics and functioning of the goods.',
    'This does not affect your rights if a piece is faulty or not as described; in that case we pay for the return.',
    '',
    'CANCELLATION FORM (complete and return only if you wish to cancel)',
    `To: ${SELLER}, ${SELLER_ADDRESS}, ${CONTACT}`,
    'I/We hereby give notice that I/We cancel my/our contract of sale of the following goods:',
    'Ordered on / received on:',
    'Name of consumer(s):',
    'Address of consumer(s):',
    'Signature of consumer(s) (only if this form is sent on paper):',
    'Date:',
    '',
    `Full details: ${site}/returns.html`,
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

module.exports = { customerConfirmation, customerShipped, ownerNotification, gbp };
