"use strict";

// STEP 1: Replace these placeholders with your real business details.
// WhatsApp: use the country code and number, e.g. 94 followed by your
// Sri Lankan mobile number WITHOUT its first 0. Do not use + or spaces.
const CONFIG = {
  whatsappNumber: "[WHATSAPP_NUMBER]",
  instagramUrl: "[INSTAGRAM_URL]",
  openingHours: "[OPENING_HOURS]",
  pickupLocation: "[PICKUP_LOCATION]",
  deliveryAreas: "[DELIVERY_AREAS]"
};

// STEP 2: Edit the sample cakes here. Prices are in Sri Lankan rupees.
// Images live in the assets folder. Each id must stay unique.
const CAKES = [
  {
    id: "chocolate", name: "Chocolate Truffle", category: "classics", tag: "Chocolate",
    description: "Rich cocoa sponge, silky ganache & dark chocolate curls.",
    weight: "1 kg", price: 4800, image: "assets/chocolate.webp",
    alt: "Chocolate cake with ganache, piped rosettes, and dark chocolate curls"
  },
  {
    id: "vanilla", name: "Vanilla Cloud", category: "classics", tag: "Vanilla",
    description: "Soft vanilla sponge with a delicate vanilla bean buttercream.",
    weight: "1 kg", price: 4200, image: "assets/vanilla.webp",
    alt: "Ivory vanilla bean cake with buttercream swirls and delicate cream flowers"
  },
  {
    id: "red-velvet", name: "Red Velvet", category: "classics", tag: "Red velvet",
    description: "Velvety red layers, a hint of cocoa & cream cheese frosting.",
    weight: "1 kg", price: 5200, image: "assets/red-velvet.webp",
    alt: "Red velvet layer cake with cream cheese frosting and a slice beside it"
  },
  {
    id: "strawberry", name: "Strawberry Kiss", category: "fruit", tag: "Strawberry",
    description: "Vanilla layers, blush buttercream & a crown of strawberries.",
    weight: "1 kg", price: 5500, image: "assets/strawberry.webp",
    alt: "Strawberry cake with ivory frosting, pink piping, and fresh strawberries"
  },
  {
    id: "birthday", name: "Birthday Confetti", category: "celebrations", tag: "Birthday",
    description: "Vanilla cake, playful sprinkles & a little birthday magic.",
    weight: "1 kg", price: 5800, image: "assets/birthday.webp",
    alt: "Pink birthday cake with pastel sprinkles and five lit candles"
  },
  {
    id: "wedding", name: "The Wedding Edit", category: "celebrations", tag: "Wedding",
    description: "Two elegant tiers, ivory buttercream & soft floral details.",
    weight: "2.5 kg", price: 16000, image: "assets/wedding.webp",
    alt: "Two-tier ivory wedding cake with blush roses and soft green leaves"
  }
];

const STORAGE_KEY = "sweet-crumbs-cart-v1";
const MAX_QUANTITY = 20;
let cart = [];
let toastTimer;

// These small functions keep prices, filtering, and order messages consistent.
function formatPrice(amount) {
  return "Rs. " + amount.toLocaleString("en-LK");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return replacements[character];
  });
}

function getCake(id) {
  return CAKES.find(function (cake) { return cake.id === id; });
}

function getFilteredCakes(category) {
  return CAKES.filter(function (cake) {
    return category === "all" || cake.category === category;
  });
}

// Stored prices are never trusted. Only a known cake id and quantity are used.
function cleanCart(items) {
  if (!Array.isArray(items)) return [];
  const cleaned = [];
  items.forEach(function (item) {
    if (!item || !getCake(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1) return;
    const existing = cleaned.find(function (entry) { return entry.id === item.id; });
    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + item.quantity);
    } else {
      cleaned.push({ id: item.id, quantity: Math.min(MAX_QUANTITY, item.quantity) });
    }
  });
  return cleaned;
}

function getSubtotal(items) {
  return cleanCart(items).reduce(function (total, item) {
    return total + getCake(item.id).price * item.quantity;
  }, 0);
}

function changeQuantity(items, id, change) {
  const updated = cleanCart(items);
  if (!getCake(id) || !Number.isInteger(change)) return updated;
  const item = updated.find(function (entry) { return entry.id === id; });
  if (item) item.quantity = Math.min(MAX_QUANTITY, item.quantity + change);
  else if (change > 0) updated.push({ id: id, quantity: Math.min(MAX_QUANTITY, change) });
  return updated.filter(function (entry) { return entry.quantity > 0; });
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function isValidRequestedDate(value, today = getLocalDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00");
  return !Number.isNaN(date.getTime()) && getLocalDate(date) === value && value >= today;
}

function getWhatsAppUrl(number, message) {
  // A placeholder or invalid number never opens a broken WhatsApp link.
  const digits = String(number).trim();
  if (!/^[1-9]\d{6,14}$/.test(digits)) return null;
  return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
}

function buildCartMessage(items) {
  const cleaned = cleanCart(items);
  const lines = ["Hello Sweet Crumbs! I'd like to enquire about these cakes:", ""];
  cleaned.forEach(function (item) {
    const cake = getCake(item.id);
    lines.push(item.quantity + " × " + cake.name + " (" + cake.weight + ") — " + formatPrice(cake.price * item.quantity));
  });
  lines.push("", "Subtotal: " + formatPrice(getSubtotal(cleaned)), "", "Requested date: please discuss with me.", "Pickup or delivery: please discuss with me.", "Please confirm availability, any delivery charges, and the final total. Thank you!");
  return lines.join("\n");
}

function buildCustomMessage(details) {
  return [
    "Hello Sweet Crumbs! I'd like to enquire about a custom cake:", "",
    "Flavour: " + details.flavour,
    "Size: " + details.size,
    "Occasion: " + details.occasion,
    "Requested date: " + details.date,
    "Message on the cake: " + (details.message.trim() || "No message requested"), "",
    "Please confirm availability, the price, and pickup or delivery options. Thank you!"
  ].join("\n");
}

function readSavedCart() {
  try { return cleanCart(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return []; } // The cart still works if browser storage is unavailable.
}

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
  catch { /* Private browsing can restrict local storage. Keep the in-memory cart. */ }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 3200);
}

function renderCakes(category = "all") {
  const cakes = getFilteredCakes(category);
  document.getElementById("cake-grid").innerHTML = cakes.map(function (cake) {
    return `
      <article class="cake-card" data-cake="${escapeHTML(cake.id)}">
        <div class="cake-card-photo">
          <img src="${escapeHTML(cake.image)}" alt="${escapeHTML(cake.alt)}" width="1024" height="1024" loading="lazy">
          <span class="cake-tag">${escapeHTML(cake.tag)}</span>
        </div>
        <div class="cake-card-body">
          <div class="cake-title-row"><h3>${escapeHTML(cake.name)}</h3><span class="cake-weight">${escapeHTML(cake.weight)}</span></div>
          <p class="cake-description">${escapeHTML(cake.description)}</p>
          <div class="cake-card-bottom">
            <span class="cake-price">${formatPrice(cake.price)}</span>
            <button class="add-button" type="button" data-add="${escapeHTML(cake.id)}" aria-label="Add ${escapeHTML(cake.name)} to cart">Add to cart <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>
          </div>
        </div>
      </article>`;
  }).join("");
  document.getElementById("filter-status").textContent = cakes.length + (cakes.length === 1 ? " cake" : " cakes") + " shown.";
}

function renderCart() {
  const quantity = cart.reduce(function (total, item) { return total + item.quantity; }, 0);
  document.getElementById("cart-count").textContent = quantity;
  document.getElementById("cart-toggle").setAttribute("aria-label", "Open cart, " + quantity + (quantity === 1 ? " item" : " items"));
  document.getElementById("cart-subtotal").textContent = formatPrice(getSubtotal(cart));
  document.getElementById("cart-summary").hidden = cart.length === 0;
  document.getElementById("cart-checkout").disabled = cart.length === 0;
  const container = document.getElementById("cart-items");

  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-cart"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8ZM8 9V6a4 4 0 0 1 8 0v3"/></svg><h3>A little room for cake.</h3><p>Your box is empty. Let's find something sweet to put in it.</p><button class="button button-primary" type="button" data-browse>Explore cakes <span aria-hidden="true">↗</span></button></div>`;
    return;
  }

  container.innerHTML = cart.map(function (item) {
    const cake = getCake(item.id);
    return `<article class="cart-item">
      <img src="${escapeHTML(cake.image)}" alt="${escapeHTML(cake.alt)}" width="78" height="88">
      <div><h3>${escapeHTML(cake.name)}</h3><p class="cart-item-meta">${escapeHTML(cake.weight)} · ${formatPrice(cake.price)} each</p>
        <div class="cart-item-controls"><div class="quantity-control" role="group" aria-label="${escapeHTML(cake.name)} quantity">
          <button type="button" data-quantity="${escapeHTML(item.id)}" data-change="-1" aria-label="Decrease ${escapeHTML(cake.name)} quantity" ${item.quantity === 1 ? "disabled" : ""}>−</button>
          <output aria-label="Quantity">${item.quantity}</output>
          <button type="button" data-quantity="${escapeHTML(item.id)}" data-change="1" aria-label="Increase ${escapeHTML(cake.name)} quantity" ${item.quantity === MAX_QUANTITY ? "disabled" : ""}>+</button>
        </div><button class="remove-item" type="button" data-remove="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(cake.name)} from cart">Remove</button></div>
        <strong class="cart-item-total">${formatPrice(cake.price * item.quantity)}</strong>
      </div></article>`;
  }).join("");
}

function setMenuOpen(open) {
  document.getElementById("main-nav").classList.toggle("is-open", open);
  const toggle = document.getElementById("menu-toggle");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}

function openDialog(id) {
  setMenuOpen(false);
  document.querySelectorAll("dialog[open]").forEach(function (dialog) { dialog.close(); });
  const dialog = document.getElementById(id);
  dialog.showModal();
  document.body.classList.add("has-dialog");
  dialog.querySelector("[autofocus]").focus();
}

function showOrder(message) {
  document.getElementById("order-message").value = message;
  document.getElementById("copy-status").textContent = "";
  const url = getWhatsAppUrl(CONFIG.whatsappNumber, message);
  const link = document.getElementById("whatsapp-link");
  link.hidden = !url;
  document.getElementById("configuration-notice").hidden = Boolean(url);
  if (url) link.href = url;
  else link.removeAttribute("href");
  openDialog("order-dialog");
}

async function copyOrderMessage() {
  const field = document.getElementById("order-message");
  const status = document.getElementById("copy-status");
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(field.value);
    status.textContent = "Enquiry copied. Paste it into your WhatsApp conversation.";
  } catch {
    // Selecting the message also supports opening index.html directly from disk.
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = Boolean(document.execCommand && document.execCommand("copy")); }
    catch { /* The selected text remains available for a manual copy. */ }
    status.textContent = copied ? "Enquiry copied. Paste it into WhatsApp." : "Your message is selected. Use Copy or press Ctrl+C (Command+C on Mac).";
  }
}

function setupContactDetails() {
  document.getElementById("contact-number").textContent = CONFIG.whatsappNumber;
  document.getElementById("opening-hours").textContent = CONFIG.openingHours;
  document.getElementById("pickup-location").textContent = CONFIG.pickupLocation;
  document.getElementById("delivery-areas").textContent = CONFIG.deliveryAreas;
  document.getElementById("year").textContent = new Date().getFullYear();
  const instagram = document.getElementById("instagram-link");
  if (/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(CONFIG.instagramUrl)) {
    instagram.href = CONFIG.instagramUrl;
    instagram.textContent = "Find us on Instagram ↗";
    instagram.target = "_blank";
    instagram.rel = "noopener noreferrer";
  } else {
    instagram.addEventListener("click", function (event) {
      event.preventDefault();
      showToast("Our Instagram details will be added soon.");
    });
  }
}

function setupEvents() {
  document.querySelectorAll("[data-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("[data-filter]").forEach(function (filter) {
        filter.classList.toggle("is-active", filter === button);
        filter.setAttribute("aria-pressed", String(filter === button));
      });
      renderCakes(button.dataset.filter);
    });
  });

  document.getElementById("cake-grid").addEventListener("click", function (event) {
    const button = event.target.closest("[data-add]");
    if (!button) return;
    const id = button.dataset.add;
    const existing = cart.find(function (item) { return item.id === id; });
    if (existing && existing.quantity >= MAX_QUANTITY) {
      showToast("For more than 20 of one cake, please send a custom enquiry.");
      return;
    }
    cart = changeQuantity(cart, id, 1);
    saveCart();
    renderCart();
    showToast(getCake(id).name + " added to your cake box.");
  });

  document.getElementById("cart-toggle").addEventListener("click", function () { openDialog("cart-dialog"); });
  document.getElementById("cart-items").addEventListener("click", function (event) {
    const quantityButton = event.target.closest("[data-quantity]");
    const removeButton = event.target.closest("[data-remove]");
    if (quantityButton) {
      const id = quantityButton.dataset.quantity;
      const change = Number(quantityButton.dataset.change);
      cart = changeQuantity(cart, id, change);
      saveCart();
      renderCart();
      const currentItem = cart.find(function (item) { return item.id === id; });
      document.getElementById("cart-status").textContent = getCake(id).name + ": quantity " + currentItem.quantity + ". Subtotal " + formatPrice(getSubtotal(cart)) + ".";
      // Restore keyboard focus after replacing the cart's HTML.
      const buttons = Array.from(document.querySelectorAll("[data-quantity]"));
      const nextFocus = buttons.find(function (button) { return button.dataset.quantity === id && Number(button.dataset.change) === change && !button.disabled; }) || buttons.find(function (button) { return button.dataset.quantity === id && !button.disabled; });
      if (nextFocus) nextFocus.focus();
    }
    if (removeButton) {
      const removedName = getCake(removeButton.dataset.remove).name;
      cart = cart.filter(function (item) { return item.id !== removeButton.dataset.remove; });
      saveCart();
      renderCart();
      const nextFocus = document.querySelector("[data-remove], [data-browse]");
      if (nextFocus) nextFocus.focus();
      document.getElementById("cart-status").textContent = removedName + " removed. Subtotal " + formatPrice(getSubtotal(cart)) + ".";
    }
    if (event.target.closest("[data-browse]")) {
      document.getElementById("cart-dialog").close();
      document.getElementById("cakes").scrollIntoView();
      document.querySelector("[data-filter]").focus({ preventScroll: true });
    }
  });

  document.getElementById("cart-checkout").addEventListener("click", function () {
    if (cart.length) showOrder(buildCartMessage(cart));
  });

  document.getElementById("custom-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const dateInput = document.getElementById("requested-date");
    dateInput.min = getLocalDate();
    dateInput.setCustomValidity("");
    if (!isValidRequestedDate(dateInput.value)) dateInput.setCustomValidity("Please select today or a future date.");
    if (!event.currentTarget.reportValidity()) return;
    const fields = new FormData(event.currentTarget);
    showOrder(buildCustomMessage({
      flavour: fields.get("flavour"), size: fields.get("size"), occasion: fields.get("occasion"),
      date: fields.get("date"), message: fields.get("message") || ""
    }));
  });
  document.getElementById("requested-date").addEventListener("input", function (event) { event.target.setCustomValidity(""); });

  document.getElementById("copy-message").addEventListener("click", copyOrderMessage);
  document.getElementById("contact-whatsapp").addEventListener("click", function () { showOrder("Hello Sweet Crumbs! I'd love to know more about your cakes, availability, and pickup or delivery options."); });

  document.querySelectorAll("[data-close]").forEach(function (button) {
    button.addEventListener("click", function () { document.getElementById(button.dataset.close).close(); });
  });
  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("close", function () { document.body.classList.toggle("has-dialog", Boolean(document.querySelector("dialog[open]"))); });
    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  });

  document.getElementById("menu-toggle").addEventListener("click", function (event) {
    setMenuOpen(event.currentTarget.getAttribute("aria-expanded") !== "true");
  });
  document.querySelectorAll(".nav-link").forEach(function (link) { link.addEventListener("click", function () { setMenuOpen(false); }); });
  document.addEventListener("click", function (event) { if (!event.target.closest(".site-header")) setMenuOpen(false); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.getElementById("menu-toggle").getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      document.getElementById("menu-toggle").focus();
    }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) setMenuOpen(false); });
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY || event.key === null) { cart = readSavedCart(); renderCart(); }
  });
}

function startShop() {
  cart = readSavedCart();
  renderCakes();
  renderCart();
  setupContactDetails();
  document.getElementById("requested-date").min = getLocalDate();
  document.querySelector('[data-filter="all"] span').textContent = CAKES.length;
  setupEvents();
}

// The script is deferred in index.html, so the page is ready before this runs.
if (typeof document !== "undefined") startShop();

// Allow the optional Node.js checks to verify the same functions as the shop.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG, CAKES, MAX_QUANTITY, formatPrice, escapeHTML, getFilteredCakes, cleanCart, changeQuantity, getSubtotal, getLocalDate, isValidRequestedDate, getWhatsAppUrl, buildCartMessage, buildCustomMessage };
}
