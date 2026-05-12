// ═══════════════════════════════════════════
//  SHUI THREAD — Checkout Module
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutSummary();
  initPaymentToggle();
  initCheckoutForm();
});

function renderCheckoutSummary() {
  const cart = Cart.getCart();
  const container = document.querySelector('.summary-items');
  if (!container) return;

  if (cart.length === 0) {
    window.location.href = '/';
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
      <div class="summary-item-price">¥${(item.price * item.qty).toLocaleString()}</div>
    </div>
  `).join('');

  const subtotal = Cart.getTotal();
  const shipping = subtotal > 2000 ? 0 : 68;
  const total = subtotal + shipping;

  document.querySelector('.summary-subtotal').textContent = `¥${subtotal.toLocaleString()}`;
  document.querySelector('.summary-shipping').textContent = shipping === 0 ? 'Free' : `¥${shipping}`;
  document.querySelector('.summary-total').textContent = `¥${total.toLocaleString()}`;
}

function initPaymentToggle() {
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.dataset.method;
      document.querySelectorAll('.payment-fields').forEach(el => el.classList.add('hidden'));
      document.querySelector(`.payment-fields[data-method="${method}"]`)?.classList.remove('hidden');
    });
  });
}

function initCheckoutForm() {
  const form = document.querySelector('.checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn-place-order');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const cart = Cart.getCart();
    const subtotal = Cart.getTotal();
    const shipping = subtotal > 2000 ? 0 : 68;
    const total = subtotal + shipping;

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'cny',
          items: cart.map(i => ({ id: i.id, qty: i.qty }))
        })
      });

      const data = await res.json();

      if (data.demo) {
        // Demo mode — simulate success
        simulatePaymentSuccess(total);
        return;
      }

      if (data.clientSecret) {
        // Real Stripe flow would go here
        // stripe.confirmPayment({ clientSecret: data.clientSecret, ... })
        simulatePaymentSuccess(total);
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Place Order';
      showToast('Error: ' + err.message);
    }
  });
}

function simulatePaymentSuccess(amount) {
  // Short loading animation
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:var(--teal);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:1.5rem;
    opacity:0;transition:opacity 0.5s;
    font-family:var(--font-display);color:white;text-align:center;
  `;
  overlay.innerHTML = `
    <div style="font-size:clamp(3rem,8vw,5rem);letter-spacing:-0.02em;line-height:1">
      Order<br><em style="color:var(--orange);font-style:italic">Confirmed</em>
    </div>
    <div style="font-family:var(--font-body);font-size:0.85rem;letter-spacing:0.3em;opacity:0.6">
      订单确认
    </div>
    <div style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.15em;
      background:rgba(255,255,255,0.1);padding:0.6rem 1.5rem;border-radius:2px;margin-top:1rem">
      ORDER #ST${Date.now().toString().slice(-6)} · ¥${amount.toLocaleString()}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = 1; });

  Cart.clearCart();
  updateCartBadge();

  setTimeout(() => {
    window.location.href = '/';
  }, 3000);
}
