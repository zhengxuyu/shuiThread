// ═══════════════════════════════════════════
//  SHUI THREAD — Cart Module
// ═══════════════════════════════════════════

const Cart = (() => {
  const STORAGE_KEY = 'shui_cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }

  function addItem(product, qty = 1) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === product.id);
    if (idx >= 0) {
      cart[idx].qty = Math.min(cart[idx].qty + qty, product.stock || 99);
    } else {
      cart.push({ ...product, qty });
    }
    saveCart(cart);
    showToast(`Added: ${product.name}`);
    bumpCartCount();
    return cart;
  }

  function removeItem(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
    return cart;
  }

  function updateQty(id, qty) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx >= 0) {
      if (qty <= 0) return removeItem(id);
      cart[idx].qty = qty;
      saveCart(cart);
    }
    return cart;
  }

  function clearCart() {
    saveCart([]);
  }

  function getTotal() {
    return getCart().reduce((sum, i) => sum + (i.priceGBP || 0) * i.qty, 0);
  }

  function getCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
  }

  return { getCart, addItem, removeItem, updateQty, clearCart, getTotal, getCount };
})();

// ─── Toast ───
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── Cart count badge ───
function bumpCartCount() {
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  badge.classList.remove('bump');
  void badge.offsetWidth; // reflow
  badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 400);
}

// ─── Update all cart count badges ───
function updateCartBadge() {
  const count = Cart.getCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ─── Cart Panel ───
function initCartPanel() {
  const overlay = document.querySelector('.cart-overlay');
  const panel = document.querySelector('.cart-panel');
  if (!overlay || !panel) return;

  // Open/close
  document.querySelectorAll('[data-cart-open]').forEach(btn => {
    btn.addEventListener('click', () => openCartPanel());
  });
  overlay.addEventListener('click', closeCartPanel);
  panel.querySelector('.cart-close')?.addEventListener('click', closeCartPanel);

  window.addEventListener('cartUpdated', renderCartPanel);
  renderCartPanel();
}

function openCartPanel() {
  document.querySelector('.cart-overlay')?.classList.add('open');
  document.querySelector('.cart-panel')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartPanel() {
  document.querySelector('.cart-overlay')?.classList.remove('open');
  document.querySelector('.cart-panel')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartPanel() {
  const itemsEl = document.querySelector('.cart-items');
  if (!itemsEl) return;

  const cart = Cart.getCart();
  updateCartBadge();

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">◎</div>
        <div class="cart-empty-text">Your cart is empty</div>
        <div class="cart-empty-sub">购物车空空如也</div>
      </div>`;
    updatePanelFooter(0);
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-img">
        ${item.img ? `<img src="${item.img}" alt="${item.name}" onerror="this.parentElement.style.background='var(--teal)'">` : ''}
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-name-zh">${item.nameZh || ''}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${item.id}', ${item.qty - 1})">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', ${item.qty + 1})">+</button>
        </div>
        <a class="cart-item-remove" onclick="removeCartItem('${item.id}')">Remove</a>
      </div>
      <div>
        <div class="cart-item-price">£${(item.priceGBP * item.qty)}</div>
      </div>
    </div>
  `).join('');

  updatePanelFooter(Cart.getTotal());
}

function updatePanelFooter(total) {
  const amountEl = document.querySelector('.cart-subtotal-amount');
  if (amountEl) amountEl.textContent = `£${total}`;
}

function changeQty(id, qty) {
  Cart.updateQty(id, qty);
  renderCartPanel();
}

function removeCartItem(id) {
  Cart.removeItem(id);
  renderCartPanel();
}

// ─── Custom cursor ───
function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;
  if (window.matchMedia('(pointer: coarse)').matches) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    return;
  }
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
    ring.style.transform = `translate(${mx - 16}px, ${my - 16}px)`;
  });
  document.querySelectorAll('a, button, [role="button"]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '52px'; ring.style.height = '52px';
      ring.style.borderColor = 'var(--teal)';
      ring.style.opacity = '1';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '32px'; ring.style.height = '32px';
      ring.style.borderColor = 'var(--orange)';
      ring.style.opacity = '0.6';
    });
  });
}

// ─── Scroll reveal ───
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ─── Nav scroll ───
function initNavScroll() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ─── Loading screen ───
function dismissLoading() {
  const ls = document.querySelector('.loading-screen');
  if (!ls) return;
  setTimeout(() => {
    ls.classList.add('done');
    setTimeout(() => ls.remove(), 700);
  }, 1400);
}

// ─── Init on DOM ready ───
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initCartPanel();
  initScrollReveal();
  initNavScroll();
  updateCartBadge();
  dismissLoading();
});
