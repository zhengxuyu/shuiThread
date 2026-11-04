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
    window.location.href = '/collection.html';
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

  const subtotalPence = Math.round(Cart.getTotal() * 100);
  const discount = Cart.getDiscountPence();
  const v = Cart.getVoucher();
  document.querySelector('.summary-subtotal').textContent = formatPence(subtotalPence);
  document.querySelector('.summary-total').textContent = formatPence(subtotalPence - discount);

  let line = document.querySelector('.summary-discount-line');
  if (v && discount > 0) {
    if (!line) {
      line = document.createElement('div');
      line.className = 'summary-line summary-discount-line';
      const totalLine = document.querySelector('.summary-line.total');
      totalLine.parentNode.insertBefore(line, totalLine);
    }
    line.innerHTML = `<span>Voucher · ${escapeHTML(v.code)} (${escapeHTML(v.label)})</span><span>−${formatPence(discount)}</span>`;
  } else if (line) {
    line.remove();
  }
}

window.addEventListener('cartUpdated', () => {
  if (document.querySelector('.summary-items')) renderCheckoutSummary();
});

async function payWithStripe() {
  const btn = document.getElementById('pay-btn');
  const cart = Cart.getCart();
  if (cart.length === 0) { window.location.href = '/collection.html'; return; }

  btn.disabled = true;
  btn.textContent = 'Redirecting to Stripe…';

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(i => ({ id: i.id, qty: i.qty })),
        voucher: Cart.getDiscountPence() > 0 ? Cart.getVoucher().code : undefined
      })
    });
    const data = await res.json();

    if (res.status === 409 && Array.isArray(data.soldIds)) {
      data.soldIds.forEach(id => Cart.removeItem(id));
      btn.disabled = false;
      btn.textContent = 'Pay with Stripe · 安全支付';
      showToast(data.error);
      if (Cart.getCount() === 0) setTimeout(() => { window.location.href = '/collection.html'; }, 2500);
      return;
    }

    if (data.voucherInvalid) {
      Cart.clearVoucher();
      btn.disabled = false;
      btn.textContent = 'Pay with Stripe · 安全支付';
      showToast(data.error + ' — voucher removed');
      return;
    }

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
