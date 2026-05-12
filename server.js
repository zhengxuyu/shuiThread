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
    description: 'A butterfly rendered in vivid orange and teal silk thread over horsetail hair, set on midnight-black fabric. The butterfly is a Shui symbol of transformation and beauty. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/butterfly.png',
    stock: 1
  },
  {
    id: 'p002',
    name: 'Whale Frame',
    nameZh: '鲸鱼马尾绣相框',
    priceGBP: 85,
    description: 'An orange whale breaches the surface, its spray forming delicate scrolling fronds in cream silk. A rare Shui maritime motif — vitality and the abundance of the natural world. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/whale.png',
    stock: 1
  },
  {
    id: 'p003',
    name: 'Pomegranate Medallion Frame',
    nameZh: '石榴花纹马尾绣相框',
    priceGBP: 85,
    description: 'A stacked pomegranate medallion in burnt orange and teal silk, a Shui symbol of fertility and abundance. The layered geometry reflects centuries-old cosmological motifs. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/pomegranate-2.png',
    stock: 1
  },
  {
    id: 'p004',
    name: 'Bird in Flight Frame',
    nameZh: '飞鸟马尾绣相框',
    priceGBP: 85,
    description: 'A bird soars across midnight-black fabric, wings spread in teal and amber silk thread over horsetail hair. Freedom, good fortune, and the open sky — one of the most beloved Shui embroidery motifs. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/bird-1.png',
    stock: 1
  },
  {
    id: 'p005',
    name: 'Twin Pomegranate Frame',
    nameZh: '双石榴马尾绣相框',
    priceGBP: 85,
    description: 'Two pomegranate blossoms intertwine in teal and crimson silk, their stems curling outward in traditional Shui scrollwork. A classic motif of fertility and celebration. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/pomegranate-1.png',
    stock: 1
  },
  {
    id: 'p006',
    name: 'Phoenix Bird Frame',
    nameZh: '凤鸟马尾绣相框',
    priceGBP: 85,
    description: 'An elegant phoenix-bird rendered in flowing teal and gold silk thread over horsetail hair. The graceful curving form is a hallmark of Shui embroidery — each stroke of silk a single continuous thread. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/bird-2.png',
    stock: 1
  },
  {
    id: 'p007',
    name: 'Dragon Fish Frame',
    nameZh: '鱼龙马尾绣相框',
    priceGBP: 85,
    description: 'A mythic dragon-fish leaps from the dark fabric, outlined in silver-white horsetail thread with bursts of coral and saffron silk. Scattered dot accents evoke stars and the spirit world. Framed and ready to hang. 10cm × 10cm.',
    category: 'frame',
    img: '/imgs/fish-dragon-1.png',
    stock: 1
  },
  {
    id: 'p008',
    name: 'Water Dragon Frame',
    nameZh: '水龙马尾绣相框',
    priceGBP: 85,
    description: 'A sinuous water dragon descends in teal and amber silk, its flowing limbs and ornate body a masterwork of Shui horsetail embroidery technique. One of the most intricate motifs in the tradition. Framed and ready to hang. 10cm × 10cm.',
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

// Payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency = 'cny', items } = req.body;

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
    // Return mock payment for demo mode
    return res.json({
      demo: true,
      clientSecret: 'demo_secret_' + Date.now(),
      message: 'Demo mode: No Stripe keys configured'
    });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents/fen
      currency,
      metadata: {
        items: JSON.stringify(items)
      }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
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
