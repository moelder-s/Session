// Optional dependency-free checks: node checks.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const shop = require("./dist/script.js");
let checks = 0;
function check(name, run) {
  run();
  checks += 1;
  console.log("PASS " + name);
}

check("All six cakes are present and category filters select the right products", () => {
  assert.equal(shop.CAKES.length, 6);
  assert.equal(new Set(shop.CAKES.map(cake => cake.id)).size, 6);
  assert.equal(shop.getFilteredCakes("all").length, 6);
  assert.deepEqual(shop.getFilteredCakes("classics").map(cake => cake.id), ["chocolate", "vanilla", "red-velvet"]);
  assert.deepEqual(shop.getFilteredCakes("fruit").map(cake => cake.id), ["strawberry"]);
  assert.deepEqual(shop.getFilteredCakes("celebrations").map(cake => cake.id), ["birthday", "wedding"]);
});

check("Add, increase, decrease, remove, and quantity limits are correct", () => {
  let cart = shop.changeQuantity([], "chocolate", 1);
  assert.deepEqual(cart, [{ id: "chocolate", quantity: 1 }]);
  cart = shop.changeQuantity(cart, "chocolate", 2);
  cart = shop.changeQuantity(cart, "vanilla", 1);
  assert.equal(shop.getSubtotal(cart), 18600);
  const previous = JSON.stringify(cart);
  const reduced = shop.changeQuantity(cart, "chocolate", -1);
  assert.equal(JSON.stringify(cart), previous);
  assert.equal(shop.getSubtotal(reduced), 13800);
  assert.equal(shop.changeQuantity(reduced, "chocolate", 100)[0].quantity, 20);
  assert.deepEqual(shop.changeQuantity([{ id: "chocolate", quantity: 1 }], "chocolate", -1), []);
  assert.equal(shop.getSubtotal([]), 0);
});

check("Corrupted saved carts and untrusted stored prices cannot change totals", () => {
  const dirty = [null, {id: "unknown", quantity: 1}, {id: "chocolate", quantity: -5}, {id: "vanilla", quantity: "3"}, {id: "chocolate", quantity: 1.5}, {id: "vanilla", quantity: 2, price: 1}, {id: "vanilla", quantity: 1}, {id: "birthday", quantity: Infinity}];
  assert.deepEqual(shop.cleanCart(dirty), [{ id: "vanilla", quantity: 3 }]);
  assert.equal(shop.getSubtotal(dirty), 12600);
  assert.deepEqual(shop.cleanCart({ quantity: 9 }), []);
  assert.deepEqual(shop.cleanCart("not a cart"), []);
});

check("Cart enquiries contain all selected products, quantities, weights, and subtotal", () => {
  const message = shop.buildCartMessage([{id: "chocolate", quantity: 2}, {id: "strawberry", quantity: 1}]);
  assert.ok(message.includes("2 × Chocolate Truffle (1 kg) — Rs. 9,600"));
  assert.ok(message.includes("1 × Strawberry Kiss (1 kg) — Rs. 5,500"));
  assert.ok(message.includes("Subtotal: Rs. 15,100"));
  assert.ok(message.includes("confirm availability"));
});

check("WhatsApp placeholders are blocked and message characters survive URL encoding", () => {
  assert.equal(shop.getWhatsAppUrl("[WHATSAPP_NUMBER]", "Hello"), null);
  assert.equal(shop.getWhatsAppUrl("", "Hello"), null);
  assert.equal(shop.getWhatsAppUrl("+94 77 123 4567", "Hello"), null);
  assert.equal(shop.getWhatsAppUrl("0771234567", "Hello"), null);
  const message = "Birthday & cake\nAmaya's ♥ <3 = Rs. 5,800";
  const url = new URL(shop.getWhatsAppUrl("94770000000", message));
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/94770000000");
  assert.equal(url.searchParams.get("text"), message);
});

check("Past dates, empty dates, and impossible dates are rejected", () => {
  assert.equal(shop.isValidRequestedDate("2026-10-13", "2026-10-14"), false);
  assert.equal(shop.isValidRequestedDate("2026-10-14", "2026-10-14"), true);
  assert.equal(shop.isValidRequestedDate("2027-01-01", "2026-10-14"), true);
  assert.equal(shop.isValidRequestedDate("", "2026-10-14"), false);
  assert.equal(shop.isValidRequestedDate("2027-02-30", "2026-10-14"), false);
  assert.equal(shop.isValidRequestedDate("2028-02-29", "2026-10-14"), true);
});

check("Custom enquiries include every supplied field and preserve literal message text", () => {
  const details = { flavour: "Vanilla", size: "1 kg", occasion: "Birthday", date: "2026-12-01", message: "Happy birthday <3 & lots of love!" };
  const message = shop.buildCustomMessage(details);
  Object.values(details).forEach(value => assert.ok(message.includes(value)));
  assert.ok(shop.buildCustomMessage({...details, message: "  "}).includes("No message requested"));
  assert.equal(shop.escapeHTML('<script>"&\'</script>'), "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;");
});

check("All local image and page assets exist; CSS and JavaScript are separate", () => {
  const root = path.join(__dirname, "dist");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const js = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.ok(!/\sstyle\s*=/i.test(html));
  assert.ok(!/<style[\s>]/i.test(html));
  assert.ok(html.includes('<link rel="stylesheet" href="styles.css">'));
  assert.ok(html.includes('<script src="script.js" defer></script>'));
  const assets = new Set(shop.CAKES.map(cake => cake.image));
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^\"]+)"/g)) assets.add(match[1]);
  for (const asset of assets) assert.ok(fs.statSync(path.join(root, asset)).size > 0, asset);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML ids must be unique");
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), "Missing anchor: " + match[1]);
  for (const match of js.matchAll(/getElementById\("([^"]+)"\)/g)) assert.ok(ids.includes(match[1]), "Missing element: " + match[1]);
  for (const match of html.matchAll(/<(?:label)\s[^>]*for="([^"]+)"/g)) assert.ok(ids.includes(match[1]), "Missing form field: " + match[1]);
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("max-width: 640px"));
  assert.ok(html.includes("aria-expanded=\"false\""));
  assert.ok(html.includes('id="configuration-notice"'));
});

console.log("\n" + checks + " check groups passed. Browser layout and interaction testing is separate.");
