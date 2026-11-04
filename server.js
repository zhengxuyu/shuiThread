require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { resolveVoucher, VoucherError } = require('./voucher');
const {
  sessionMetadata, getSoldIds, handleCheckoutCompleted, verifyResendSignature, forwardInbound,
  listOrders, shipOrder, setRelisted, publicOrderView, requestRefund, emailOrderLinks, OrderError,
} = require('./orders');
const { adminLogin, adminLogout, requireAdmin, clientKey } = require('./admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Keep the raw bytes: webhook signatures are computed over them.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.static(path.join(__dirname, 'public')));

// Products catalog
const products = [
  {
    id: 'p001',
    name: 'Butterfly Frame',
    nameZh: '蝴蝶马尾绣相框',
    priceGBP: 85,
    description: 'A butterfly rendered in vivid orange and teal silk thread over horsetail hair, set on midnight-black fabric. The butterfly is a Shui symbol of transformation and beauty. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/butterfly.png',
    stock: 1
  },
  {
    id: 'p002',
    name: 'Whale Frame',
    nameZh: '鲸鱼马尾绣相框',
    priceGBP: 85,
    description: 'An orange whale breaches the surface, its spray forming delicate scrolling fronds in cream silk. A rare Shui maritime motif — vitality and the abundance of the natural world. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/whale.png',
    stock: 1
  },
  {
    id: 'p003',
    name: 'Pomegranate Medallion Frame',
    nameZh: '石榴花纹马尾绣相框',
    priceGBP: 85,
    description: 'A stacked pomegranate medallion in burnt orange and teal silk, a Shui symbol of fertility and abundance. The layered geometry reflects centuries-old cosmological motifs. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/pomegranate-2.png',
    stock: 1
  },
  {
    id: 'p004',
    name: 'Bird in Flight Frame',
    nameZh: '飞鸟马尾绣相框',
    priceGBP: 85,
    description: 'A bird soars across midnight-black fabric, wings spread in teal and amber silk thread over horsetail hair. Freedom, good fortune, and the open sky — one of the most beloved Shui embroidery motifs. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/bird-1.png',
    stock: 1
  },
  {
    id: 'p005',
    name: 'Pomegranate Frame',
    nameZh: '石榴马尾绣相框',
    priceGBP: 85,
    description: 'Two pomegranate blossoms intertwine in teal and crimson silk, their stems curling outward in traditional Shui scrollwork. A classic motif of fertility and celebration. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/pomegranate-1.png',
    stock: 1
  },
  {
    id: 'p006',
    name: 'Phoenix Bird Frame',
    nameZh: '凤鸟马尾绣相框',
    priceGBP: 85,
    description: 'An elegant phoenix-bird rendered in flowing teal and gold silk thread over horsetail hair. The graceful curving form is a hallmark of Shui embroidery — each stroke of silk a single continuous thread. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/bird-2.png',
    stock: 1
  },
  {
    id: 'p007',
    name: 'Dragon Fish Frame',
    nameZh: '鱼龙马尾绣相框',
    priceGBP: 85,
    description: 'A mythic dragon-fish leaps from the dark fabric, outlined in silver-white horsetail thread with bursts of coral and saffron silk. Scattered dot accents evoke stars and the spirit world. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/fish-dragon-1.png',
    stock: 1
  },
  {
    id: 'p008',
    name: 'Water Dragon Frame',
    nameZh: '水龙马尾绣相框',
    priceGBP: 85,
    description: 'A sinuous water dragon descends in teal and amber silk, its flowing limbs and ornate body a masterwork of Shui horsetail embroidery technique. One of the most intricate motifs in the tradition. Framed and ready to hang. 12 × 12 × 3 cm.',
    category: 'frame',
    img: '/imgs/fish-dragon-2.png',
    stock: 1
  }
];

// API routes
function stripeClient() {
  return stripeConfigured() ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
}

// A failed lookup must not take the shop down: show everything as available
// and rely on the check at checkout.
async function soldIdsOrEmpty() {
  try {
    return await getSoldIds(stripeClient());
  } catch (err) {
    console.error('Sold lookup error:', err.message);
    return new Set();
  }
}

const withSold = (p, sold) => ({ ...p, sold: sold.has(p.id) });

app.get('/api/products', async (req, res) => {
  const sold = await soldIdsOrEmpty();
  res.json(products.map(p => withSold(p, sold)));
});

app.get('/api/products/:id', async (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(withSold(product, await soldIdsOrEmpty()));
});

// Build Stripe line items from the catalog — never trust client prices.
function buildLineItems(items, req) {
  if (!Array.isArray(items) || items.length === 0) return { error: 'No items in cart' };
  const lineItems = [];
  const quantities = [];
  let subtotalPence = 0;
  for (const { id, qty } of items) {
    const product = products.find(p => p.id === id);
    if (!product) return { error: `Unknown product ${id}` };
    const quantity = Math.max(1, Math.min(parseInt(qty, 10) || 1, product.stock || 1));
    const unit = Math.round(product.priceGBP * 100);
    subtotalPence += unit * quantity;
    quantities.push({ id, qty: quantity });
    lineItems.push({
      price_data: {
        currency: 'gbp',
        unit_amount: unit,
        product_data: {
          name: product.name,
          description: product.nameZh,
          images: product.img ? [`${req.protocol}://${req.get('host')}${product.img}`] : []
        }
      },
      quantity
    });
  }
  return { lineItems, subtotalPence, quantities, ids: quantities.map(q => q.id) };
}

function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_stripe');
}

// Check a voucher against the current cart (used by the cart panel).
app.post('/api/validate-voucher', async (req, res) => {
  const { code, items } = req.body || {};
  const built = buildLineItems(items, req);
  if (built.error) return res.status(400).json({ error: built.error });
  if (!stripeConfigured()) return res.status(503).json({ error: 'Vouchers are unavailable right now' });

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const v = await resolveVoucher(stripe, code, built.subtotalPence);
    res.json({
      code: v.code, label: v.label,
      percentOff: v.percentOff, amountOffPence: v.amountOffPence, minimumPence: v.minimumPence,
      discountPence: v.discountPence
    });
  } catch (err) {
    if (err instanceof VoucherError) return res.status(400).json({ error: err.message });
    console.error('Voucher lookup error:', err.message);
    res.status(500).json({ error: 'Could not check this voucher, please try again' });
  }
});

// Stripe Checkout Session — server resolves prices from catalog, never trusts client
app.post('/api/create-checkout-session', async (req, res) => {
  const { items, voucher } = req.body || {};
  const built = buildLineItems(items, req);
  if (built.error) return res.status(400).json({ error: built.error });

  if (!stripeConfigured()) {
    return res.json({ demo: true, message: 'Demo mode: STRIPE_SECRET_KEY not configured' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    let sold = new Set();
    try {
      sold = await getSoldIds(stripe, { fresh: true });
    } catch (err) {
      console.error('Sold lookup error at checkout:', err.message);
    }
    const unavailable = built.ids.filter(id => sold.has(id));
    if (unavailable.length) {
      const names = unavailable.map(id => products.find(p => p.id === id).name).join(', ');
      return res.status(409).json({ error: `Sorry, this piece has just sold: ${names}`, soldIds: unavailable });
    }

    let discounts;
    if (voucher) {
      try {
        const v = await resolveVoucher(stripe, voucher, built.subtotalPence);
        discounts = [{ promotion_code: v.promotionCodeId }];
      } catch (err) {
        if (err instanceof VoucherError) return res.status(400).json({ error: err.message, voucherInvalid: true });
        throw err;
      }
    }
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Payment methods come from a Shui Thread–specific Stripe payment
      // method configuration (Dashboard → Settings → Payment methods) with
      // Onelink/Link turned off: Link's saved-details view hides the shipping
      // address. The Stripe account is shared, so we don't change the
      // account default. Fallback when unset: card only.
      ...(process.env.STRIPE_PAYMENT_METHOD_CONFIG
        ? { payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIG }
        : { payment_method_types: ['card'] }),
      line_items: built.lineItems,
      metadata: sessionMetadata(built.quantities, discounts ? voucher : undefined),
      ...(discounts ? { discounts } : {}),
      shipping_address_collection: { allowed_countries: ['GB'] },
      shipping_options: [
        { shipping_rate_data: { display_name: 'UK Standard Delivery', type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'gbp' }, // Ships within 7–21 days, then 3–7 business days in transit.
          delivery_estimate: { minimum: { unit: 'business_day', value: 8 }, maximum: { unit: 'business_day', value: 22 } } } }
      ],
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe → payment finished. A non-2xx makes Stripe retry, which is what we
// want if email sending failed; idempotency keys prevent double sends.
app.post('/api/stripe-webhook', async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripeConfigured()) return res.status(503).json({ error: 'Webhook not configured' });

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return res.json({ received: true });
  }
  try {
    await handleCheckoutCompleted(event.data.object, products);
    res.json({ received: true });
  } catch (err) {
    console.error('Order handling error:', err.message);
    res.status(500).json({ error: 'Order handling failed' });
  }
});

// Resend → mail arrived at @shuithread.com; forward it to the real inbox.
app.post('/api/resend-inbound', async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Webhook not configured' });
  if (!verifyResendSignature(req.rawBody && req.rawBody.toString('utf8'), req.headers, secret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  if (req.body?.type !== 'email.received') return res.json({ received: true });
  try {
    await forwardInbound(req.body.data || {});
    res.json({ received: true });
  } catch (err) {
    console.error('Inbound forward error:', err.message);
    res.status(500).json({ error: 'Forward failed' });
  }
});

// ─── Seller back office ─────────────────────────────────────
function orderErrorResponse(res, err, what) {
  if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
  console.error(`${what} error:`, err.message);
  res.status(500).json({ error: '操作失败，请重试' });
}

app.post('/api/admin/login', adminLogin);
app.post('/api/admin/logout', adminLogout);

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await listOrders(stripeClient(), products);
    res.set('Cache-Control', 'no-store').json({ orders, carriers: [
      { id: 'royal_mail', name: 'Royal Mail' }, { id: 'dpd', name: 'DPD' },
    ] });
  } catch (err) { orderErrorResponse(res, err, 'Order list'); }
});

app.post('/api/admin/orders/:id/ship', requireAdmin, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await shipOrder(stripeClient(), req.params.id, req.body, products));
  } catch (err) { orderErrorResponse(res, err, 'Ship order'); }
});

app.post('/api/admin/orders/:id/relist', requireAdmin, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await setRelisted(stripeClient(), req.params.id, req.body?.relisted !== false, products));
  } catch (err) { orderErrorResponse(res, err, 'Relist'); }
});

// "Find your order": same answer and similar timing whether or not the address has orders.
const LOOKUP_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOOKUP_MIN_MS = 1500;
const LOOKUP_MAX = 5;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
const lookups = new Map(); // Best effort: per serverless instance.

function lookupAllowed(key, now = Date.now()) {
  const rec = lookups.get(key);
  if (!rec || now - rec.first > LOOKUP_WINDOW_MS) { lookups.set(key, { first: now, count: 1 }); return true; }
  rec.count += 1;
  return rec.count <= LOOKUP_MAX;
}

app.post('/api/orders/lookup', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = req.body?.email;
  if (typeof email !== 'string' || email.length > 254 || !LOOKUP_EMAIL.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (!lookupAllowed(clientKey(req))) return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  const started = Date.now();
  try {
    if (stripeConfigured()) await emailOrderLinks(stripeClient(), email, products);
  } catch (err) {
    console.error('Order lookup error:', err.message); // Same answer: a failure here must not reveal a match.
  }
  await new Promise(done => setTimeout(done, Math.max(0, LOOKUP_MIN_MS - (Date.now() - started))));
  res.json({ ok: true });
});

// Buyer's order page, reached through the signed link in their email.
app.get('/api/orders/:id', async (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  if (!stripeConfigured()) return res.status(404).json({ error: 'Order not found' });
  try {
    res.json(await publicOrderView(stripeClient(), req.params.id, req.query.t, products));
  } catch (err) { orderErrorResponse(res, err, 'Order view'); }
});

app.post('/api/orders/:id/refund-request', async (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  if (!stripeConfigured()) return res.status(404).json({ error: 'Order not found' });
  try {
    res.json(await requestRefund(stripeClient(), req.params.id, req.body, products));
  } catch (err) { orderErrorResponse(res, err, 'Refund request'); }
});

// SPA fallback - serve index for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║   水·丝线  SHUI THREAD               ║`);
    console.log(`  ║   Running at http://localhost:${PORT}    ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
  });
}

module.exports = app;
