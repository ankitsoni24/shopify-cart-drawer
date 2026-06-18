/**
 * ECD Cart Drawer — Storefront JS
 * Production-ready, zero-dependency, theme-agnostic
 */
(function () {
  "use strict";

  const CFG = window.__ECD__ || {};
  const SETTINGS = CFG.settings || {};
  const PROXY = CFG.proxyUrl || "/apps/cart-drawer";
  const CURRENCY = CFG.currency || "USD";

  /* ── Utilities ── */
  function $(id) { return document.getElementById(id); }
  function formatMoney(cents) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 }).format(cents / 100);
    } catch { return "$" + (cents / 100).toFixed(2); }
  }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

  /* ── Theme ── */
  function applyTheme() {
    const root = document.documentElement;
    if (SETTINGS.accentColor) root.style.setProperty("--ecd-accent", SETTINGS.accentColor);
    if (SETTINGS.buttonTextColor) root.style.setProperty("--ecd-accent-text", SETTINGS.buttonTextColor);
  }

  /* ── Cart API ── */
  const Cart = {
    _cache: null,
    async fetch(force = false) {
      if (this._cache && !force) return this._cache;
      const res = await fetch("/cart.js", { credentials: "same-origin" });
      this._cache = await res.json();
      return this._cache;
    },
    async add(variantId, quantity = 1, properties = {}) {
      const res = await fetch("/cart/add.js", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ id: variantId, quantity, properties }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.description || "Could not add item"); }
      this._cache = null;
      return this.fetch(true);
    },
    async change(key, quantity) {
      const res = await fetch("/cart/change.js", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ id: key, quantity }),
      });
      this._cache = await res.json();
      return this._cache;
    },
    async update(updates) {
      const res = await fetch("/cart/update.js", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify(updates),
      });
      this._cache = await res.json();
      return this._cache;
    },
  };

  /* ── Upsells ── */
  const Upsells = {
    _products: null,
    async fetch(shop) {
      if (this._products !== null) return this._products;
      try {
        const res = await fetch(`${PROXY}?endpoint=upsells&shop=${encodeURIComponent(shop)}`, { credentials: "same-origin" });
        const data = await res.json();
        this._products = data.products || [];
      } catch { this._products = []; }
      return this._products;
    },
  };

  /* ── Remote Settings ── */
  const RemoteSettings = {
    _data: null,
    async fetch(shop) {
      if (this._data) return this._data;
      try {
        const res = await fetch(`${PROXY}?endpoint=settings&shop=${encodeURIComponent(shop)}`, { credentials: "same-origin" });
        this._data = await res.json();
        Object.assign(SETTINGS, this._data);
      } catch {}
      return SETTINGS;
    },
  };

  /* ── Countdown ── */
  const Countdown = {
    _interval: null, _endTime: null,
    start(minutes) {
      if (this._interval) return;
      this._endTime = Date.now() + minutes * 60 * 1000;
      this._tick();
      this._interval = setInterval(() => this._tick(), 1000);
    },
    stop() { clearInterval(this._interval); this._interval = null; },
    _tick() {
      const remaining = Math.max(0, this._endTime - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      const template = SETTINGS.countdownText || "Cart reserved for {time}";
      const el = $("ecd-countdown-text");
      if (el) el.textContent = template.replace("{time}", label);
      if (remaining === 0) this.stop();
    },
  };

  /* ── Focus Trap ── */
  const FocusTrap = {
    _prev: null, _drawer: null,
    trap(drawer) {
      this._drawer = drawer;
      this._prev = document.activeElement;
      const focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length) focusable[0].focus();
      this._bound = this._handler.bind(this);
      drawer.addEventListener("keydown", this._bound);
    },
    release() {
      if (this._drawer) this._drawer.removeEventListener("keydown", this._bound);
      if (this._prev) this._prev.focus();
    },
    _handler(e) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(this._drawer?.querySelectorAll('button:not(:disabled), [href], input, select, textarea') || []).filter(el => !el.closest("[hidden]"));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    },
  };

  /* ── Drawer ── */
  const Drawer = {
    isOpen: false,
    open() {
      const drawer = $("ecd-drawer"), overlay = $("ecd-overlay");
      if (!drawer || this.isOpen) return;
      this.isOpen = true;
      drawer.classList.add("ecd-drawer--open");
      overlay.classList.add("ecd-overlay--active");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      FocusTrap.trap(drawer);
      if (SETTINGS.enableCountdown && SETTINGS.countdownMinutes) Countdown.start(SETTINGS.countdownMinutes);
    },
    close() {
      const drawer = $("ecd-drawer"), overlay = $("ecd-overlay");
      if (!drawer || !this.isOpen) return;
      this.isOpen = false;
      drawer.classList.remove("ecd-drawer--open");
      overlay.classList.remove("ecd-overlay--active");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      FocusTrap.release();
    },
    toggle() { this.isOpen ? this.close() : this.open(); },
  };

  /* ── Render ── */
  const Render = {
    async update(cart, openDrawer = false) {
      this.renderShippingBar(cart);
      this.renderCountdown();
      this.renderItems(cart);
      this.renderFooter(cart);
      this.renderSubtotal(cart);
      this.renderItemCount(cart);
      if (SETTINGS.enableUpsells) await this.renderUpsells(cart);
      if (openDrawer) Drawer.open();
    },
    renderItemCount(cart) {
      const el = $("ecd-item-count");
      if (!el) return;
      const count = cart.item_count || 0;
      el.textContent = count;
      el.style.display = count > 0 ? "inline-flex" : "none";
    },
    renderShippingBar(cart) {
      const bar = $("ecd-shipping-bar");
      if (!bar || !SETTINGS.enableShippingBar) return hide(bar);
      const threshold = SETTINGS.freeShippingThreshold || 0;
      if (!threshold) return hide(bar);
      show(bar);
      const total = cart.total_price || 0;
      const remaining = Math.max(0, threshold - total);
      const pct = Math.min(100, (total / threshold) * 100);
      const fill = $("ecd-shipping-fill"), text = $("ecd-shipping-text");
      if (fill) fill.style.width = pct + "%";
      if (remaining <= 0) {
        bar.classList.add("ecd-shipping-bar--unlocked");
        if (text) text.textContent = SETTINGS.shippingUnlockedText || "You've unlocked FREE shipping!";
      } else {
        bar.classList.remove("ecd-shipping-bar--unlocked");
        const template = SETTINGS.shippingBarText || "Spend {amount} more for FREE shipping!";
        if (text) text.textContent = template.replace("{amount}", formatMoney(remaining));
      }
    },
    renderCountdown() {
      const el = $("ecd-countdown");
      if (!el) return;
      SETTINGS.enableCountdown ? show(el) : hide(el);
    },
    renderItems(cart) {
      const container = $("ecd-items"), empty = $("ecd-empty");
      const footer = $("ecd-footer"), noteSection = $("ecd-note-section");
      if (!container) return;

      if (!cart.items || cart.items.length === 0) {
        show(empty); hide(footer); hide(noteSection);
        container.innerHTML = "";
        const msg = $("ecd-empty-message"), btn = $("ecd-empty-btn");
        if (msg) msg.textContent = SETTINGS.emptyCartMessage || "Your cart is empty";
        if (btn) { btn.textContent = SETTINGS.emptyCartButtonText || "Continue Shopping"; btn.href = SETTINGS.emptyCartButtonUrl || "/"; }
        return;
      }

      hide(empty); show(footer);
      if (SETTINGS.noteEnabled && noteSection) {
        show(noteSection);
        const label = $("ecd-note-label");
        if (label) label.textContent = SETTINGS.noteLabel || "Order note";
      }

      container.innerHTML = cart.items.map(item => {
        const hasCompare = item.compare_at_price && item.compare_at_price > item.price;
        const savings = hasCompare ? `<span class="ecd-item__savings">Save ${formatMoney((item.compare_at_price - item.price) * item.quantity)}</span>` : "";
        const compareHtml = hasCompare ? `<span class="ecd-item__compare">${formatMoney(item.compare_at_price * item.quantity)}</span>` : "";
        return `
          <div class="ecd-item" data-key="${item.key}" role="listitem">
            <div class="ecd-item__img-wrap">
              <a href="${item.url}" tabindex="-1">
                <img class="ecd-item__img" src="${item.image ? item.image.replace("_small","_medium") : ""}" alt="${item.title}" loading="lazy" width="80" height="80"/>
              </a>
            </div>
            <div class="ecd-item__details">
              <a href="${item.url}" class="ecd-item__title">${item.product_title}</a>
              ${item.variant_title && item.variant_title !== "Default Title" ? `<span class="ecd-item__variant">${item.variant_title}</span>` : ""}
              <div class="ecd-item__price-row">
                <span class="ecd-item__price">${formatMoney(item.final_line_price)}</span>
                ${compareHtml}${savings}
              </div>
              <div class="ecd-item__qty">
                <button class="ecd-item__qty-btn" data-action="decrease" data-key="${item.key}" data-qty="${item.quantity}" aria-label="Decrease quantity">−</button>
                <span class="ecd-item__qty-num">${item.quantity}</span>
                <button class="ecd-item__qty-btn" data-action="increase" data-key="${item.key}" data-qty="${item.quantity}" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button class="ecd-item__remove" data-key="${item.key}" aria-label="Remove ${item.product_title}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>`;
      }).join("");

      container.querySelectorAll(".ecd-item__qty-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const key = btn.dataset.key, current = parseInt(btn.dataset.qty);
          const newQty = btn.dataset.action === "increase" ? current + 1 : current - 1;
          const itemEl = container.querySelector(`[data-key="${key}"]`);
          if (itemEl) itemEl.classList.add("ecd-item--loading");
          const cart = await Cart.change(key, Math.max(0, newQty));
          await Render.update(cart);
        });
      });

      container.querySelectorAll(".ecd-item__remove").forEach(btn => {
        btn.addEventListener("click", async () => {
          const key = btn.dataset.key;
          const itemEl = container.querySelector(`[data-key="${key}"]`);
          if (itemEl) { itemEl.style.transition = "opacity 0.2s, transform 0.2s"; itemEl.style.opacity = "0"; itemEl.style.transform = "translateX(20px)"; }
          await new Promise(r => setTimeout(r, 200));
          const cart = await Cart.change(key, 0);
          await Render.update(cart);
        });
      });
    },
    renderSubtotal(cart) {
      const el = $("ecd-subtotal");
      if (el) el.textContent = formatMoney(cart.total_price || 0);
    },
    renderFooter(cart) {
      if (!cart.items?.length) return;
      const discountSection = $("ecd-discount-section"), checkoutText = $("ecd-checkout-text");
      if (discountSection) {
        SETTINGS.enableDiscountField ? show(discountSection) : hide(discountSection);
        const input = $("ecd-discount-input");
        if (input) input.placeholder = SETTINGS.discountPlaceholder || "Discount code";
      }
      if (checkoutText) checkoutText.textContent = SETTINGS.checkoutButtonText || "Checkout";
    },
    async renderUpsells(cart) {
      const container = $("ecd-upsells"), track = $("ecd-upsells-track"), title = $("ecd-upsells-title");
      if (!container || !track) return;
      const cartProductIds = cart.items.map(i => i.product_id);
      const allProducts = await Upsells.fetch(CFG.shop);
      const filtered = allProducts.filter(p => !cartProductIds.includes(parseInt(p.numericId)));
      if (!filtered.length) return hide(container);
      show(container);
      if (title) title.textContent = SETTINGS.upsellTitle || "You might also like";
      track.innerHTML = filtered.map(p => `
        <div class="ecd-upsell-card" data-variant-id="${p.numericVariantId}">
          <img class="ecd-upsell-card__img" src="${p.image}" alt="${p.imageAlt}" loading="lazy" width="140" height="100"/>
          <div class="ecd-upsell-card__body">
            <p class="ecd-upsell-card__title">${p.title}</p>
            <p class="ecd-upsell-card__price">${formatMoney(p.price * 100)}</p>
            <button class="ecd-upsell-card__btn" data-variant-id="${p.numericVariantId}" type="button">Add to cart</button>
          </div>
        </div>`).join("");
      track.querySelectorAll(".ecd-upsell-card__btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          btn.disabled = true; btn.textContent = "Adding…";
          try {
            const cart = await Cart.add(btn.dataset.variantId, 1);
            await Render.update(cart);
            btn.textContent = "✓ Added";
            setTimeout(() => { btn.disabled = false; btn.textContent = "Add to cart"; }, 2000);
          } catch { btn.disabled = false; btn.textContent = "Add to cart"; }
        });
      });
    },
  };

  /* ── Discount ── */
  function initDiscount() {
    const applyBtn = $("ecd-discount-apply"), input = $("ecd-discount-input"), feedback = $("ecd-discount-feedback");
    if (!applyBtn || !input) return;
    applyBtn.addEventListener("click", async () => {
      const code = input.value.trim();
      if (!code) return;
      applyBtn.disabled = true; applyBtn.textContent = "Applying…";
      if (feedback) { feedback.textContent = ""; hide(feedback); }
      try {
        await Cart.update({ attributes: { discount_code: code } });
        if (feedback) { show(feedback); feedback.className = "ecd-discount__feedback ecd-discount__feedback--success"; feedback.textContent = "✓ Code applied! Redirecting…"; }
        setTimeout(() => { window.location.href = `/checkout?discount=${encodeURIComponent(code)}`; }, 800);
      } catch {
        if (feedback) { show(feedback); feedback.className = "ecd-discount__feedback ecd-discount__feedback--error"; feedback.textContent = "Invalid code."; }
        applyBtn.disabled = false; applyBtn.textContent = "Apply";
      }
    });
    input.addEventListener("keydown", e => { if (e.key === "Enter") applyBtn.click(); });
  }

  /* ── Order Note ── */
  function initNote() {
    const textarea = $("ecd-note-input");
    if (!textarea) return;
    const save = debounce(async () => { await Cart.update({ note: textarea.value }); }, 600);
    textarea.addEventListener("input", save);
  }

  /* ── Sticky ATC ── */
  function initStickyAtc() {
    if (!SETTINGS.enableStickyAtc || !CFG.isProductPage) return;
    const bar = $("ecd-sticky-atc"), btn = $("ecd-sticky-btn");
    if (!bar || !btn) return;

    let productData = null;
    const productJson = document.querySelector('[data-product-json],[type="application/json"][data-product]');
    if (productJson) { try { productData = JSON.parse(productJson.textContent); } catch {} }
    if (!productData && window.ShopifyAnalytics?.meta?.product) productData = window.ShopifyAnalytics.meta.product;
    if (!productData) return;

    const img = $("ecd-sticky-img"), titleEl = $("ecd-sticky-title"), priceEl = $("ecd-sticky-price");
    if (img) { img.src = productData.featured_image || ""; img.alt = productData.title || ""; }
    if (titleEl) titleEl.textContent = productData.title || "";

    const firstVariant = productData.variants?.[0];
    const updatePrice = v => { if (v && priceEl) priceEl.textContent = formatMoney(v.price); };
    if (firstVariant) updatePrice(firstVariant);
    document.addEventListener("variant:change", e => updatePrice(e.detail?.variant));

    const nativeBtn = document.querySelector('[name="add"],.product-form__submit,[data-add-to-cart]');
    if (nativeBtn) {
      const observer = new IntersectionObserver(([entry]) => { bar.classList.toggle("ecd-sticky-atc--visible", !entry.isIntersecting); show(bar); }, { threshold: 0 });
      observer.observe(nativeBtn);
    } else { show(bar); bar.classList.add("ecd-sticky-atc--visible"); }

    btn.textContent = SETTINGS.stickyAtcText || "Add to Cart";
    btn.addEventListener("click", async () => {
      const variantInput = document.querySelector('[name="id"]:not([form]),select[name="id"],[data-product-select]');
      const variantId = variantInput?.value || firstVariant?.id;
      if (!variantId) return;
      btn.disabled = true; btn.textContent = "Adding…";
      try {
        const cart = await Cart.add(variantId, 1);
        await Render.update(cart, true);
        btn.textContent = "✓ Added!";
        setTimeout(() => { btn.disabled = false; btn.textContent = SETTINGS.stickyAtcText || "Add to Cart"; }, 2000);
      } catch (err) {
        btn.disabled = false; btn.textContent = SETTINGS.stickyAtcText || "Add to Cart";
        alert(err.message || "Could not add to cart");
      }
    });
  }

  /* ── ATC Form Interception ── */
  function interceptAtcForms() {
    document.addEventListener("submit", async e => {
      const form = e.target;
      if (!form || form.dataset.ecdIgnore) return;
      const isAtcForm = form.action?.includes("/cart/add") || form.dataset.productForm !== undefined || form.dataset.type === "add-to-cart";
      if (!isAtcForm) return;
      e.preventDefault(); e.stopPropagation();

      const variantId = form.querySelector('[name="id"]')?.value;
      const quantity = parseInt(form.querySelector('[name="quantity"]')?.value || "1");
      if (!variantId) return;

      const properties = {};
      form.querySelectorAll('[name^="properties"]').forEach(input => {
        const key = input.name.replace(/^properties\[(.+)\]$/, "$1");
        if (key) properties[key] = input.value;
      });

      const submitBtn = form.querySelector('[type="submit"],[name="add"]');
      const originalText = submitBtn?.textContent;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Adding…"; }
      try {
        const cart = await Cart.add(variantId, quantity, properties);
        await Render.update(cart, true);
      } catch (err) {
        alert(err.message || "Item could not be added");
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
      }
    }, true);

    document.addEventListener("cart:add", async e => {
      const { variantId, quantity = 1 } = e.detail || {};
      if (!variantId) return;
      const cart = await Cart.add(variantId, quantity);
      await Render.update(cart, true);
    });
  }

  /* ── Cart badge sync ── */
  function updateCartBadges(count) {
    [".cart-count",".cart__count","[data-cart-count]",".header__cart-count","#CartCount"].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => { el.textContent = count; el.style.display = count > 0 ? "" : "none"; });
    });
  }

  /* ── Cart link interception ── */
  function interceptCartLinks() {
    document.addEventListener("click", e => {
      const link = e.target.closest('a[href="/cart"], a[href="/cart/"]');
      if (!link || link.dataset.ecdIgnore) return;
      e.preventDefault();
      Drawer.toggle();
    });
  }

  /* ── Events ── */
  function bindEvents() {
    $("ecd-close")?.addEventListener("click", () => Drawer.close());
    $("ecd-overlay")?.addEventListener("click", () => Drawer.close());
    $("ecd-continue-btn")?.addEventListener("click", () => Drawer.close());
    document.addEventListener("keydown", e => { if (e.key === "Escape" && Drawer.isOpen) Drawer.close(); });
  }

  /* ── Public API ── */
  window.ECD = {
    open: () => Drawer.open(),
    close: () => Drawer.close(),
    toggle: () => Drawer.toggle(),
    refresh: async () => { const cart = await Cart.fetch(true); await Render.update(cart); },
    addItem: async (variantId, quantity = 1, properties = {}) => { const cart = await Cart.add(variantId, quantity, properties); await Render.update(cart, true); return cart; },
  };

  /* ── Boot ── */
  async function boot() {
    applyTheme();
    bindEvents();
    interceptAtcForms();
    interceptCartLinks();
    initDiscount();
    initNote();
    if (CFG.shop) { await RemoteSettings.fetch(CFG.shop); applyTheme(); }
    const cart = await Cart.fetch();
    const origUpdate = Render.update.bind(Render);
    Render.update = async (cart, openDrawer = false) => { await origUpdate(cart, openDrawer); updateCartBadges(cart.item_count || 0); };
    await Render.update(cart);
    initStickyAtc();
    document.dispatchEvent(new CustomEvent("ecd:ready", { detail: { cart, api: window.ECD } }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
