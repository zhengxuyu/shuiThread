// ═══════════════════════════════════════════
//  SHUI THREAD — Vouchers (Stripe Promotion Codes)
//  Codes are created/managed in the Stripe Dashboard:
//  Products → Coupons → (coupon) → Add promotion code.
// ═══════════════════════════════════════════

// Pure: discount in pence for a coupon shape against a subtotal in pence.
function computeDiscountPence(v, subtotalPence) {
  if (!v || subtotalPence <= 0) return 0;
  if (v.minimumPence && subtotalPence < v.minimumPence) return 0;
  let d = 0;
  if (v.percentOff) d = Math.round(subtotalPence * v.percentOff / 100);
  else if (v.amountOffPence) d = v.amountOffPence;
  return Math.max(0, Math.min(d, subtotalPence));
}

function formatGBP(pence) {
  return '£' + (pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2));
}

class VoucherError extends Error {}

// Look up an active promotion code in Stripe and check it against the cart.
// Returns { promotionCodeId, code, label, percentOff, amountOffPence, minimumPence, discountPence }.
async function resolveVoucher(stripe, rawCode, subtotalPence) {
  const code = String(rawCode || '').trim();
  if (!code || code.length > 64) throw new VoucherError('Please enter a voucher code');

  // Stripe matches `code` case-insensitively.
  const { data } = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  const promo = data[0];
  const coupon = promo && promo.coupon;
  if (!promo || !coupon || !coupon.valid) throw new VoucherError('This voucher code is not valid');
  if (promo.expires_at && promo.expires_at * 1000 < Date.now()) throw new VoucherError('This voucher has expired');
  if (coupon.amount_off && coupon.currency !== 'gbp') throw new VoucherError('This voucher cannot be used in this shop');

  const r = promo.restrictions || {};
  const minimumPence = r.minimum_amount && (r.minimum_amount_currency || 'gbp') === 'gbp' ? r.minimum_amount : 0;
  if (minimumPence && subtotalPence < minimumPence) {
    throw new VoucherError(`This voucher needs a minimum spend of ${formatGBP(minimumPence)}`);
  }

  const v = {
    promotionCodeId: promo.id,
    code: promo.code,
    percentOff: coupon.percent_off || 0,
    amountOffPence: coupon.amount_off || 0,
    minimumPence,
  };
  v.label = v.percentOff ? `${v.percentOff}% off` : `${formatGBP(v.amountOffPence)} off`;
  v.discountPence = computeDiscountPence(v, subtotalPence);
  return v;
}

module.exports = { computeDiscountPence, formatGBP, resolveVoucher, VoucherError };
