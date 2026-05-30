require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
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
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Stripe Checkout Session — server resolves prices from catalog, never trusts client
app.post('/api/create-checkout-session', async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  const lineItems = [];
  for (const { id, qty } of items) {
    const product = products.find(p => p.id === id);
    if (!product) return res.status(400).json({ error: `Unknown product ${id}` });
    const quantity = Math.max(1, Math.min(parseInt(qty, 10) || 1, product.stock || 1));
    lineItems.push({
      price_data: {
        currency: 'gbp',
        unit_amount: Math.round(product.priceGBP * 100),
        product_data: {
          name: product.name,
          description: product.nameZh,
          images: product.img ? [`${req.protocol}://${req.get('host')}${product.img}`] : []
        }
      },
      quantity
    });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
    return res.json({ demo: true, message: 'Demo mode: STRIPE_SECRET_KEY not configured' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['GB'] },
      shipping_options: [
        { shipping_rate_data: { display_name: 'UK Standard Delivery', type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'gbp' }, delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 7 } } } }
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
