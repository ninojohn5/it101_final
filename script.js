/* script.js
   Rose Bakeshop (Frontend-only E-Commerce UI)
   - Menu slider init (only runs if elements exist)
   - Cart logic uses localStorage (no backend)
   - Mobile nav (hamburger) opens a RIGHT-to-LEFT drawer
*/

(function () {
  "use strict";

  /* =========================
     Helpers
     ========================= */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function formatPHP(amount) {
    return "₱" + Number(amount).toFixed(2);
  }

  function safeParse(jsonStr, fallback) {
    try { return JSON.parse(jsonStr); } catch (e) { return fallback; }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================
     Mobile Nav (Hamburger)
     ========================= */
  function initMobileNav() {
    var header = qs(".main-header");
    var btn = qs(".nav-toggle");
    var nav = qs("#primaryNav");
    if (!header || !btn || !nav) return;

    // Create backdrop if not present
    var backdrop = qs(".nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      document.body.appendChild(backdrop);
    }

    function isOpen() {
      return header.classList.contains("nav-open");
    }

    function setOpen(open) {
      header.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      backdrop.classList.toggle("show", open);

      // Prevent page scroll when menu open
      document.body.classList.toggle("no-scroll", open);
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // Close when clicking backdrop
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });

    // Close when clicking a nav link
    nav.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "A") setOpen(false);
    });

    // Close on ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    // If switched to desktop, force close
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) setOpen(false);
    });
  }

  /* =========================
     Cart (localStorage)
     ========================= */
  var CART_KEY = "rb_cart_v1";

  function getCart() {
    var raw = localStorage.getItem(CART_KEY);
    var cart = safeParse(raw, []);
    if (!Array.isArray(cart)) return [];
    return cart;
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function addToCart(productId, qty) {
    qty = Number(qty || 1);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;

    var cart = getCart();
    var found = cart.find(function (i) { return i.id === productId; });
    if (found) found.qty += qty;
    else cart.push({ id: productId, qty: qty });

    saveCart(cart);
    toast("Added to cart.");
  }

  function updateQty(productId, qty) {
    qty = Number(qty);
    if (!Number.isFinite(qty)) return;

    var cart = getCart();
    var item = cart.find(function (i) { return i.id === productId; });
    if (!item) return;

    if (qty <= 0) {
      cart = cart.filter(function (i) { return i.id !== productId; });
    } else {
      item.qty = qty;
    }
    saveCart(cart);
  }

  function removeFromCart(productId) {
    var cart = getCart().filter(function (i) { return i.id !== productId; });
    saveCart(cart);
    toast("Removed from cart.");
  }

  function clearCart() {
    saveCart([]);
  }

  function getCartCount() {
    return getCart().reduce(function (sum, i) { return sum + (Number(i.qty) || 0); }, 0);
  }

  function getProductById(id) {
    var list = (window.PRODUCTS || []);
    return list.find(function (p) { return p.id === id; }) || null;
  }

  function cartToLines() {
    var cart = getCart();
    return cart
      .map(function (i) {
        var p = getProductById(i.id);
        if (!p) return null;
        var qty = Number(i.qty) || 0;
        return {
          id: i.id,
          name: p.name,
          price: p.price,
          qty: qty,
          subtotal: p.price * qty,
          image: p.image
        };
      })
      .filter(Boolean);
  }

  function calcTotals(lines) {
    var subtotal = lines.reduce(function (sum, l) { return sum + l.subtotal; }, 0);
    var shipping = subtotal > 0 ? 50 : 0;
    var total = subtotal + shipping;
    return { subtotal: subtotal, shipping: shipping, total: total };
  }

  function updateCartBadge() {
    var badgeEls = qsa("[data-cart-count]");
    var count = getCartCount();
    badgeEls.forEach(function (el) {
      el.textContent = String(count);
      el.style.display = count > 0 ? "inline-flex" : "none";
    });
  }

  /* =========================
     Toast feedback
     ========================= */
  function ensureToastEl() {
    var el = qs("#toast");
    if (el) return el;

    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  }

  var toastTimer = null;
  function toast(message) {
    var el = ensureToastEl();
    el.textContent = message;
    el.classList.add("show");

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("show");
    }, 2200);
  }

  /* =========================
     Products page
     ========================= */
  function renderProductsPage() {
    var grid = qs("[data-products-grid]");
    if (!grid) return;

    var products = window.PRODUCTS || [];
    var search = qs("[data-products-search]");
    var filter = qs("[data-products-filter]");

    function buildCard(p) {
      var card = document.createElement("article");
      card.className = "product-card";

      card.innerHTML =
        '<a class="product-card__img" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy" />' +
        '</a>' +
        '<div class="product-card__body">' +
          '<h3 class="product-card__title">' + escapeHtml(p.name) + '</h3>' +
          '<p class="product-card__meta">' + escapeHtml(p.category) + '</p>' +
          '<div class="product-card__row">' +
            '<span class="product-card__price">' + formatPHP(p.price) + '</span>' +
            '<div class="product-card__actions">' +
              '<a class="btn-mini" href="product.html?id=' + encodeURIComponent(p.id) + '">View</a>' +
              '<button class="btn-mini btn-mini--solid" type="button" data-add="' + escapeHtml(p.id) + '">Add</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      return card;
    }

    function applyFilters() {
      var term = (search && search.value || "").trim().toLowerCase();
      var cat = (filter && filter.value || "all");

      var filtered = products.filter(function (p) {
        var okCat = (cat === "all") || (p.category === cat);
        var okTerm =
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term);
        return okCat && okTerm;
      });

      grid.innerHTML = "";
      if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-state">No products found. Try a different search.</p>';
        return;
      }

      filtered.forEach(function (p) { grid.appendChild(buildCard(p)); });

      qsa("[data-add]", grid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          addToCart(btn.getAttribute("data-add"), 1);
        });
      });
    }

    if (filter) {
      var categories = Array.from(new Set(products.map(function (p) { return p.category; })));
      categories.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        filter.appendChild(opt);
      });
    }

    if (search) search.addEventListener("input", applyFilters);
    if (filter) filter.addEventListener("change", applyFilters);

    applyFilters();
  }

  /* =========================
     Product details page
     ========================= */
  function renderProductDetailsPage() {
    var wrap = qs("[data-product-details]");
    if (!wrap) return;

    var id = new URLSearchParams(window.location.search).get("id");
    var product = id ? getProductById(id) : null;

    if (!product) {
      wrap.innerHTML =
        '<div class="empty-state">' +
          '<h2>Product not found</h2>' +
          '<p>Please go back to Products and choose an item.</p>' +
          '<a class="btn-solid-brown" href="products.html">Back to Products</a>' +
        '</div>';
      return;
    }

    wrap.innerHTML =
      '<div class="product-details">' +
        '<div class="product-details__img">' +
          '<img src="' + product.image + '" alt="' + escapeHtml(product.name) + '" />' +
        '</div>' +
        '<div class="product-details__info">' +
          '<p class="breadcrumb"><a href="products.html">Products</a> / <span>' + escapeHtml(product.category) + '</span></p>' +
          '<h1 class="product-details__title">' + escapeHtml(product.name) + '</h1>' +
          '<p class="product-details__desc">' + escapeHtml(product.description) + '</p>' +
          '<div class="product-details__buy">' +
            '<div class="product-details__price">' + formatPHP(product.price) + '</div>' +
            '<div class="qty-row">' +
              '<label for="qty">Qty</label>' +
              '<input id="qty" type="number" min="1" value="1" inputmode="numeric" />' +
            '</div>' +
            '<button class="btn-solid-brown" type="button" data-add-to-cart>Add to cart</button>' +
            '<p class="hint">Tip: You can update quantities later in the cart.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var qtyEl = qs("#qty", wrap);
    var btn = qs("[data-add-to-cart]", wrap);
    btn.addEventListener("click", function () {
      var qty = Number(qtyEl.value);
      if (!Number.isFinite(qty) || qty < 1) {
        qtyEl.value = "1";
        toast("Quantity must be at least 1.");
        qtyEl.focus();
        return;
      }
      addToCart(product.id, qty);
    });
  }

  /* =========================
     Cart page
     ========================= */
  function renderCartPage() {
    var table = qs("[data-cart-table]");
    if (!table) return;

    var body = qs("[data-cart-body]");
    var summary = qs("[data-cart-summary]");

    function renderSummary(t, empty) {
      return (
        '<div class="summary-card">' +
          '<h3>Order Summary</h3>' +
          '<div class="summary-row"><span>Subtotal</span><span>' + formatPHP(t.subtotal) + '</span></div>' +
          '<div class="summary-row"><span>Shipping</span><span>' + formatPHP(t.shipping) + '</span></div>' +
          '<div class="summary-row total"><span>Total</span><span>' + formatPHP(t.total) + '</span></div>' +
          '<div class="summary-actions">' +
            (empty
              ? '<a class="btn-solid-brown" href="products.html">Shop now</a>'
              : '<a class="btn-solid-brown" href="checkout.html">Proceed to checkout</a>') +
            (!empty ? '<button class="btn-outline" type="button" data-clear>Clear cart</button>' : '') +
          '</div>' +
        '</div>'
      );
    }

    function draw() {
      var lines = cartToLines();
      var totals = calcTotals(lines);

      body.innerHTML = "";

      if (lines.length === 0) {
        body.innerHTML =
          '<tr><td colspan="5">' +
            '<div class="empty-state">' +
              '<h2>Your cart is empty</h2>' +
              '<p>Add items from the Products page.</p>' +
              '<a class="btn-solid-brown" href="products.html">Go to Products</a>' +
            '</div>' +
          '</td></tr>';

        if (summary) summary.innerHTML = renderSummary(totals, true);
        return;
      }

      lines.forEach(function (l) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="cart-item">' +
            '<img class="cart-thumb" src="' + l.image + '" alt="' + escapeHtml(l.name) + '" />' +
            '<div>' +
              '<div class="cart-name">' + escapeHtml(l.name) + '</div>' +
              '<div class="cart-sub">' + formatPHP(l.price) + '</div>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<input class="qty-input" type="number" min="1" value="' + l.qty + '" data-qty="' + escapeHtml(l.id) + '" />' +
          '</td>' +
          '<td class="right">' + formatPHP(l.subtotal) + '</td>' +
          '<td class="right">' +
            '<button class="link-btn" type="button" data-remove="' + escapeHtml(l.id) + '">Remove</button>' +
          '</td>';

        body.appendChild(tr);
      });

      qsa("[data-qty]", body).forEach(function (input) {
        input.addEventListener("input", function () {
          var id = input.getAttribute("data-qty");
          var qty = Number(input.value);
          if (!Number.isFinite(qty) || qty < 1) return;
          updateQty(id, qty);
          draw();
        });
      });

      qsa("[data-remove]", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          removeFromCart(btn.getAttribute("data-remove"));
          draw();
        });
      });

      if (summary) summary.innerHTML = renderSummary(totals, false);
    }

    draw();

    document.addEventListener("click", function (e) {
      var target = e.target;
      if (target && target.matches("[data-clear]")) {
        clearCart();
        toast("Cart cleared.");
        renderCartPage();
      }
    });
  }

  /* =========================
     Checkout page
     ========================= */
  function renderCheckoutPage() {
    var wrap = qs("[data-checkout]");
    if (!wrap) return;

    var orderBox = qs("[data-checkout-summary]");
    var form = qs("[data-checkout-form]");

    function drawSummary() {
      var lines = cartToLines();
      var totals = calcTotals(lines);

      if (!orderBox) return;

      if (lines.length === 0) {
        orderBox.innerHTML =
          '<div class="summary-card">' +
            '<h3>Order Summary</h3>' +
            '<p class="empty-note">Your cart is empty.</p>' +
            '<a class="btn-solid-brown" href="products.html">Go to Products</a>' +
          '</div>';
        return;
      }

      var itemsHtml = lines.map(function (l) {
        return '<div class="summary-item">' +
          '<span>' + escapeHtml(l.name) + ' x' + l.qty + '</span>' +
          '<span>' + formatPHP(l.subtotal) + '</span>' +
        '</div>';
      }).join("");

      orderBox.innerHTML =
        '<div class="summary-card">' +
          '<h3>Order Summary</h3>' +
          itemsHtml +
          '<div class="summary-row"><span>Subtotal</span><span>' + formatPHP(totals.subtotal) + '</span></div>' +
          '<div class="summary-row"><span>Shipping</span><span>' + formatPHP(totals.shipping) + '</span></div>' +
          '<div class="summary-row total"><span>Total</span><span>' + formatPHP(totals.total) + '</span></div>' +
        '</div>';
    }

    function setFormDisabled(disabled) {
      if (!form) return;
      qsa("input, button, select, textarea", form).forEach(function (el) {
        el.disabled = disabled;
      });
    }

    drawSummary();

    var linesNow = cartToLines();
    if (linesNow.length === 0) {
      setFormDisabled(true);
      return;
    }

    var placeBtn = qs("[data-place-order]");
    var requiredFields = qsa("[data-required]", form);

    function validate() {
      var ok = true;
      requiredFields.forEach(function (field) {
        var msg = qs('[data-error-for="' + field.id + '"]', form);
        var value = (field.value || "").trim();

        if (!value) {
          ok = false;
          field.classList.add("is-invalid");
          if (msg) msg.textContent = "This field is required.";
        } else {
          field.classList.remove("is-invalid");
          if (msg) msg.textContent = "";
        }
      });

      if (placeBtn) placeBtn.disabled = !ok;
      return ok;
    }

    requiredFields.forEach(function (f) {
      f.addEventListener("input", validate);
      f.addEventListener("blur", validate);
    });

    validate();

    if (placeBtn) {
      placeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (!validate()) {
          toast("Please complete the required fields.");
          return;
        }
        clearCart();
        updateCartBadge();
        toast("Order placed. Thank you!");
        wrap.innerHTML =
          '<div class="empty-state">' +
            '<h2>Order Confirmed</h2>' +
            '<p>This is a frontend-only demo. No payment was processed.</p>' +
            '<a class="btn-solid-brown" href="index.html">Back to Home</a>' +
            '<a class="btn-outline" href="products.html">Continue shopping</a>' +
          '</div>';
      });
    }
  }

  /* =========================
     Menu slider (only if elements exist)
     ========================= */
  function initMenuSlider() {
    var slides = qsa(".menu-slide");
    var dots = qsa(".dot");
    if (slides.length === 0 || dots.length === 0) return;

    var slideIndex = 1;

    function showSlides(n) {
      if (n > slides.length) slideIndex = 1;
      if (n < 1) slideIndex = slides.length;

      slides.forEach(function (s) { s.classList.remove("active"); });
      dots.forEach(function (d) { d.className = d.className.replace(" active", ""); });

      slides[slideIndex - 1].classList.add("active");
      dots[slideIndex - 1].className += " active";
    }

    window.plusSlides = function (n) { showSlides(slideIndex += n); };
    window.currentSlide = function (n) { showSlides(slideIndex = n); };

    showSlides(slideIndex);

    window.setInterval(function () {
      showSlides(slideIndex += 1);
    }, 8000);
  }

  /* =========================
     Init
     ========================= */
  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    initMobileNav();
    initMenuSlider();
    renderProductsPage();
    renderProductDetailsPage();
    renderCartPage();
    renderCheckoutPage();
  });

  // Expose
  window.RB = {
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    updateQty: updateQty,
    clearCart: clearCart,
    getCart: getCart
  };
})();
