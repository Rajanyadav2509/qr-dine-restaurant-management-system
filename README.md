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

## Shared database (Supabase) — live on all devices

Orders, tables, menu and settings now live in a **Supabase** project
(`qr-dine-db`, Mumbai region), not in the browser. The owner dashboard
updates live on every device through Supabase Realtime — no refresh.

- **Customer scans a table QR → orders** → the order is saved in Supabase →
  the dashboard on any device shows that table **Occupied** instantly.
- **Owner settles the bill (Print & Settle)** → the order becomes Paid → the
  table turns **Available** on all devices instantly.
- **Owner login:** the dashboard is behind a Supabase Auth login (email +
  password). The customer menu never asks for a login.

### First-time setup (Supabase dashboard)

1. **Create the tables:** Supabase Dashboard → SQL Editor → New query →
   paste `supabase-schema.sql` and Run. It creates `qrdine_tables`,
   `qrdine_menu`, `qrdine_orders`, `qrdine_settings`, enables Row Level
   Security (demo-grade open policies — see the comment at the top of the
   SQL file), enables Realtime on all four tables, and seeds the 16 menu
   items, 11 tables with PINs, and the Bhukhad Bachelors settings row.
2. **Create the owner user:** Authentication → Users → Add user → enter the
   owner's email and a password. That is the login for the dashboard.
   (Confirm the user if email confirmation is on.)
3. **Confirm Realtime:** Database → Replication → check that
   `qrdine_tables`, `qrdine_orders`, `qrdine_menu` and `qrdine_settings`
   are listed under the `supabase_realtime` publication.
4. Deploy the files (same as before — Vercel / Netlify / static host). No
   build step. The app's Supabase URL and anon key are in `app.js`
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

### Offline fallback

If the Supabase library or project cannot be reached (no internet, CDN
blocked), the app still works in **offline demo mode**: it uses the local
demo data stored in the browser, shows a visible amber banner
("Offline — demo data, not shared across devices"), and the owner login
screen offers a "Continue in offline demo" button. Offline orders are
**not** shared with other devices and are **not** uploaded later — they
stay in that one browser. Reconnect and reload to use the shared database.

### Security notes

- The key in `app.js` is the **anon (publishable) key** — safe to embed in
  a static site. Data is protected by Row Level Security. **Never** put the
  `service_role` (secret) key in the website code.
- The RLS policies in `supabase-schema.sql` are **demo-grade** (anon can
  read/write everything, so login-free customer ordering works). Before real
  production use, tighten them: anon INSERT-only on `qrdine_orders`, SELECT
  on menu/tables, and authenticated-owner-only UPDATE/DELETE.
- The database password was set with Supabase's generator at project
  creation and is not stored anywhere in this repo — reset it in Supabase
  Dashboard → Project Settings → Database if needed.

**Easiest:** double-click `index.html` — it opens in the browser.

**Better (recommended, so QR links work as real URLs):**
```bash
cd qr-dine
python3 -m http.server 8000
```
Then open http://localhost:8000 — dashboard in one tab, customer menu in
another tab (`http://localhost:8000/?table=1`).

## Demo data

- Restaurant: **Bhukhad Bachelors, Bokaro**
- Tables 1–10, PINs **936, 937, 938 … 945** (Table 1 = 936, Table 2 = 937, and
  so on). Lounge Room PIN is **950**.
- Menu: "Tandoor Se" (Roti ₹15, Butter Roti ₹20, naans, Tandoori Chicken) and
  "Chinese Special" (Crispy Baby Corn Chilli ₹180 — Chef's Special, Crispy
  Chilli Mushroom ₹200, noodles, rice, Manchurian).
- Payment QR uses the restaurant's real UPI ID **`yaduvanshirajan228@axl`**.
  The Bill QR encodes the exact bill amount — the customer only confirms the
  payment in their UPI app. QR Dine never touches money — the customer's
  UPI app handles the payment.

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
   Bill QR (it encodes `upi://pay?pa=yaduvanshirajan228@axl&...&am=373`) →
   **Print & Settle**. Table 1 becomes Available again and Analytics shows
   ₹373 revenue. (On the shared database, the Occupied/Available change
   appears on every device instantly; in offline demo mode it only shows in
   that browser.)

## Deploy free

- **Netlify Drop:** unzip, drag the folder onto https://app.netlify.com/drop
- **Vercel / GitHub Pages / Cloudflare Pages:** upload these files with
  `index.html` at the root. No build step.

## Honest limits

- **Shared sync needs the Supabase tables created** (see above). Until the
  schema is run, the app runs in offline demo mode (per-browser data only).
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
