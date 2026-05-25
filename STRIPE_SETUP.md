# Stripe Setup

This site uses **Stripe Checkout (hosted session)**. The server creates a session from the cart and redirects the customer to Stripe; Stripe handles card / Apple Pay / Google Pay, shipping address, receipts, and refunds.

## 1. Create a Stripe account

1. Sign up at https://dashboard.stripe.com/register
2. Fill in the basic business profile (you can do test-mode payments before activation)

## 2. Grab your API keys

Dashboard → **Developers → API keys**

- **Test mode** (toggle top-right): `sk_test_...` — use this first
- **Live mode**: `sk_live_...` — only after you've tested end-to-end

Only the *Secret key* is needed for this site (Checkout Session is server-side).

## 3. Local development

Create `.env` in the project root:

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxx
```

Then:

```
npm install
npm run dev
# open http://localhost:3000
```

Add a product to cart → /checkout.html → click **Pay with Stripe** → you'll land on Stripe Checkout. Use test card:

- Number: `4242 4242 4242 4242`
- Expiry: any future date · CVC: any 3 digits · ZIP: any

Stripe will redirect back to `/success.html?session_id=...`.

If the env var isn't set, the API returns `{ demo: true }` and the button shows a "demo mode" toast — no charge happens.

## 4. Deploy to Vercel

1. Vercel project → **Settings → Environment Variables**
2. Add `STRIPE_SECRET_KEY` for **Production** (and **Preview** if you want test deploys to charge in test mode)
3. Redeploy

Production should use `sk_live_...`. Preview/Development can stay on `sk_test_...`.

## 5. Webhook (optional, recommended later)

Right now the site relies on Stripe's success redirect. If a customer closes the tab before the redirect, the cart still clears (good UX) but you'd miss the fulfillment trigger.

To handle that robustly:

1. Dashboard → **Developers → Webhooks** → "Add endpoint"
2. URL: `https://shuithread.com/api/stripe-webhook`
3. Event: `checkout.session.completed`
4. Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` on Vercel
5. Implement the endpoint to email yourself / mark stock sold

Skip until volume justifies it.

## 6. Going live checklist

- [ ] Activate Stripe account (business details, bank account)
- [ ] Switch Vercel env var to `sk_live_...`
- [ ] Place one real £1 test order on yourself, confirm receipt + payout schedule
- [ ] Update `STRIPE_SECRET_KEY` rotation policy (rotate yearly via Dashboard → API keys → Roll key)
