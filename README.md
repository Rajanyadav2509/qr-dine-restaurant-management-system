# QR Dine — Restaurant QR Ordering

A fresh, working restaurant QR ordering system inspired by the QR Mitr demo video
Raj shared — **not** a copy of QR Mitr's code or brand. Built with vanilla
HTML/CSS/JS only. No build step, no framework, no account needed.

## What it does

- **Owner dashboard** — table grid (10 tables + Lounge Room) with live status
  (Available / Occupied / NEW) and each table's 3-digit PIN on its card, plus a
  live incoming-orders feed.
- **Customer QR menu** — scan a table's QR code (or open `index.html?table=1`),
  browse the menu, add dishes, and order. The order is blocked until the
  correct **Table PIN** is entered.
- **Orders** — live list, statuses New → Preparing → Served → Paid.
- **Billing** — pick an occupied table, apply discount (% or ₹) and extra
  charges, choose Cash / UPI / Card, get a **Bill QR** (UPI deep link), then
  Download, send on WhatsApp, or **Print & Settle** (thermal-style receipt via
  the browser print dialog; settling marks the order Paid and frees the table).
- **Analytics** — today's revenue, orders, average bill, top-selling items and
  table occupancy, all computed from the real stored orders.
- **QR Codes** — one printable QR stand per table.
- **Settings** — restaurant name, address, UPI ID, currency. **Reset demo data**
  restores the original demo.

## How to run

**Easiest:** double-click `index.html` — it opens in the browser.

**Better (recommended, so QR links work as real URLs):**
```bash
cd qr-dine
python3 -m http.server 8000
```
Then open http://localhost:8000 — dashboard in one tab, customer menu in
another tab (`http://localhost:8000/?table=1`).

## Demo data

- Restaurant: **Hotel Annapurna, Bokaro**
- Tables 1–10, PINs **936, 937, 938 … 945** (Table 1 = 936, Table 2 = 937, and
  so on). Lounge Room PIN is **950**.
- Menu: "Tandoor Se" (Roti ₹15, Butter Roti ₹20, naans, Tandoori Chicken) and
  "Chinese Special" (Crispy Baby Corn Chilli ₹180 — Chef's Special, Crispy
  Chilli Mushroom ₹200, noodles, rice, Manchurian).
- Payment QR uses the clearly-demo UPI ID **`qrdine@okaxis`**. Replace it in
  Settings with the restaurant's real UPI ID before taking real payments.
  QR Dine never touches money — the customer's UPI app handles the payment.

## Try the full flow

1. Open the dashboard, then open `?table=1` in a second tab (or use the
   "Open Customer View" button and pick Table 1).
2. Add dishes to the cart — try Roti (₹15) + Butter Roti (₹20) + Crispy Baby
   Corn Chilli (₹180) + Crispy Chilli Mushroom (₹200) = ₹415.
3. In the cart, enter a name, then try a **wrong PIN** (e.g. 111) — the order
   is rejected with a clear error.
4. Enter the correct PIN **936** and Confirm Order. Watch the dashboard in
   the other tab: Table 1 turns Occupied and the order appears — no refresh.
5. Billing → pick Table 1 → apply a 10% discount (₹415 → ₹373) → scan the
   Bill QR (it encodes `upi://pay?pa=qrdine@okaxis&...&am=373`) → **Print &
   Settle**. Table 1 becomes Available again and Analytics shows ₹373 revenue.

## Deploy free

- **Netlify Drop:** unzip, drag the folder onto https://app.netlify.com/drop
- **Vercel / GitHub Pages / Cloudflare Pages:** upload these files with
  `index.html` at the root. No build step.

## Honest limits

- **Live sync works across tabs of the same browser** (localStorage +
  `storage` events). It does **not** sync across different devices or
  phones. For a real restaurant with a phone, a tablet and a laptop, the app
  needs a small server version (shared database + live updates) — the data
  model here (tables, menu, orders, statuses) is ready for that step.
- The QR library (qrcodejs, MIT licence) is vendored as `qrcode.min.js`, so QR
  codes work fully offline. (The cdnjs CDN loads fine from the shell but is
  blocked inside this environment's browser, so the local copy is used.)
  If the library ever fails to load, QR spots show a text fallback with the
  link instead.
- WhatsApp bill sharing opens `wa.me` with the bill text — the owner sends it
  from their own WhatsApp; no automatic sending without a WhatsApp Business
  API setup.
- The thermal receipt uses the browser's print dialog — connect a thermal
  printer to the billing computer and choose it in the dialog.
