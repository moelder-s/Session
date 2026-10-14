# Sweet Crumbs

A responsive cake-shop homepage made with plain HTML, CSS, and JavaScript. No framework, build step, npm installation, database, or API key is needed.

## Open the website

1. Extract the downloaded ZIP.
2. Open the `dist` folder.
3. Double-click `index.html` to open the website in your browser.

Keep `index.html`, `styles.css`, `script.js`, and the `assets` folder together. Images and fonts do not require an internet connection. WhatsApp and Instagram require internet access.

If you prefer VS Code, open the project folder and open `dist/index.html` with the Live Server extension. Alternatively, with Python installed, run `python -m http.server 8000 --directory dist` from the project folder, then visit `http://localhost:8000`.

## Add your real contact details

Open `dist/script.js`. At the top, find the `CONFIG` object:

```javascript
const CONFIG = {
  whatsappNumber: "[WHATSAPP_NUMBER]",
  instagramUrl: "[INSTAGRAM_URL]",
  openingHours: "[OPENING_HOURS]",
  pickupLocation: "[PICKUP_LOCATION]",
  deliveryAreas: "[DELIVERY_AREAS]"
};
```

Replace the values inside quotation marks with your business details, then save and refresh the page.

- **WhatsApp:** use your actual WhatsApp-enabled number with the country code, digits only. For a Sri Lankan mobile number, replace the leading `0` with `94`. Do not include `+`, spaces, brackets, or hyphens. The number is intentionally not configured in the delivered project.
- **Instagram:** use your full profile URL, in the format `https://www.instagram.com/your_username/`.
- **Opening hours, pickup, and delivery:** enter your actual hours, address, and delivery areas. These details appear in the footer.

When no valid WhatsApp number is configured, the website still prepares the complete enquiry and offers a Copy button. It explains that the number has not been added, and it does not open an invalid link. Once a real number is configured, the preview also shows **Continue to WhatsApp**.

Opening WhatsApp prepares a message. The customer must press Send in WhatsApp. An enquiry does not automatically confirm an order or take a payment.

## Change the cakes and prices

The `CAKES` array directly below `CONFIG` in `dist/script.js` contains all six products. Change the following fields:

| Field | What it controls |
| --- | --- |
| `id` | Unique identifier used by the cart; keep it stable for an existing cake. |
| `name` | Cake name shown in the collection and order. |
| `category` | `classics`, `fruit`, or `celebrations`; used by the category filters. |
| `tag` | Small label over the photograph. |
| `description` | Short description on the card. |
| `weight` | Cake weight, such as `1 kg`. |
| `price` | Number in LKR, without `Rs.`, commas, or quotation marks. |
| `image` | Relative path to the photograph, such as `assets/chocolate.webp`. |
| `alt` | Plain description of the photo for screen readers. |

The listed products and prices are examples. Verify your real descriptions, weights, prices, availability, and delivery terms before accepting orders. The generated cake photographs are illustrative; replace them with photos of your real products when available.

## Edit the design and content

- **Text and sections:** edit `dist/index.html`. The About section contains a comment showing where to insert your own introduction.
- **Colours and fonts:** edit the variables at the top of `dist/styles.css`.
- **Spacing and responsive layout:** edit the named CSS sections and the media queries near the bottom of `styles.css`.
- **Images:** replace the corresponding files inside `dist/assets`, or update their paths in `index.html` and `script.js`.
- **Logo:** the wordmark and small cupcake mark are in `index.html`. The browser-tab icon is `assets/favicon.svg`.

All CSS is in `styles.css`. There are no inline styles, external font requests, tracking scripts, or third-party JavaScript dependencies.

## How the interactions work

- Category buttons filter the product array and announce the result count.
- Add to cart updates the cart badge and saves the cart in this browser, when local storage is available.
- The drawer includes quantity controls, Remove buttons, line totals, and a subtotal. Quantities are limited to 20 per cake; larger requests can use the custom enquiry.
- Product prices always come from the current product list. Invalid or corrupted saved-cart entries are ignored.
- The custom form requires flavour, size, occasion, and a valid date of today or later in the visitor's local timezone. The cake message is optional, with a 100-character limit.
- Both order flows show a message preview. WhatsApp text is URL-encoded to preserve spaces, symbols, and line breaks.
- The page has a keyboard skip link, visible focus, screen-reader labels, native dialogs, reduced-motion support, and a mobile menu.

This is a static enquiry website. It does not process payments, reserve dates, maintain live stock, or store customer enquiries on a server. The bakery confirms the final details in WhatsApp.

## Optional checks

With Node.js installed, run the following from the project folder:

```bash
node checks.cjs
```

The checks cover filtering, quantity changes, subtotals, invalid saved carts, WhatsApp URL construction, date validation, message content, and local asset references. They do not launch a browser. Browser layout and interaction QA was not available in the build environment.

## Files

- `dist/index.html` — page structure and text.
- `dist/styles.css` — all styling and responsive layouts.
- `dist/script.js` — editable configuration, products, cart, filters, and order forms.
- `dist/assets/` — six local cake photographs and the favicon.
- `checks.cjs` — optional dependency-free logic and source checks.
- `ASSETS.md` — image generation details and prompts.

To host elsewhere, upload the contents of `dist` to a static website host. Keep the filenames and folder structure intact. Your current hosted version is private; changing downloaded files does not automatically update that hosted version.
