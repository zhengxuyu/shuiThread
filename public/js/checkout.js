// ═══════════════════════════════════════════
//  SHUI THREAD — Checkout (Stripe redirect)
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutSummary();
  document.getElementById('pay-btn')?.addEventListener('click', payWithStripe);
});

function renderCheckoutSummary() {
  const cart = Cart.getCart();
  const container = document.querySelector('.summary-items');
  if (!container) return;

  if (cart.length === 0) {
    window.location.href = '/shop.html';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item-img">
        ${item.img ? `<img src="${item.img}" alt="${item.name}" onerror="this.parentElement.style.background='var(--teal)'">` : ''}
      </div>
      <div class="summary-item-info">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-qty">Qty: ${item.qty}</div>
      </div>
      <div class="summary-item-price">£${(item.priceGBP * item.qty)}</div>
    </div>
  `).join('');

  const subtotal = Cart.getTotal();
  document.querySelector('.summary-subtotal').textContent = `£${subtotal}`;
  document.querySelector('.summary-total').textContent = `£${subtotal}`;
}

async function payWithStripe() {
  const btn = document.getElementById('pay-btn');
  const cart = Cart.getCart();
  if (cart.length === 0) { window.location.href = '/shop.html'; return; }

  btn.disabled = true;
  btn.textContent = 'Redirecting to Stripe…';

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(i => ({ id: i.id, qty: i.qty })) })
    });
    const data = await res.json();

    if (data.demo) {
      showToast('Demo mode — Stripe not configured yet. See STRIPE_SETUP.md');
      btn.disabled = false;
      btn.textContent = 'Pay with Stripe · 安全支付';
      return;
    }
    if (!data.url) throw new Error(data.error || 'No checkout URL returned');
    window.location.href = data.url;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Pay with Stripe · 安全支付';
    showToast('Error: ' + err.message);
  }
}
