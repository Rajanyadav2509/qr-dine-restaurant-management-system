/* QR Dine — restaurant QR ordering. Vanilla JS. Shared database: Supabase
   project "qr-dine-db" (Realtime). Data lives in Supabase; localStorage
   (key qrdine-v1) is only an offline cache/fallback. UPI payments go to the
   restaurant's real UPI ID. Owner dashboard is behind a Supabase Auth login;
   the customer menu never asks for a login. */
'use strict';

/* ---------------- Supabase config ----------------
   The anon key below is a client-side (publishable) key: it is safe to embed
   in this static site. Data is protected by Row Level Security (see
   supabase-schema.sql). NEVER put the service_role (secret) key here. */
const SUPABASE_URL = 'https://qpybzvfycamzosidytjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweWJ6dmZ5Y2Ftem9zaWR5dGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MDY2NTcsImV4cCI6MjExMTI4MjY1N30.1vyFLzF5ctFKt0sQpW-X0Ch57jvdCuTM0nOFPBsXPb4';

const LS_KEY = 'qrdine-v1';
const RESTAURANT_UPI = 'yaduvanshirajan228@axl';
const OLD_DEMO_UPI = 'qrdine@okaxis';

/* Stock food photos (Unsplash, each URL verified HTTP 200). These are
   starter photos — the owner replaces any of them with his real dish photo
   via the Photo URL field in Menu Management. */
const U = (id) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=800&q=80';

/* ---------------- seed data (offline cache + reset) ---------------- */
function seedState() {
  const menu = [
    { id: 'm1', name: 'Roti', price: 15, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1546833999-b9f581a1996d'), spicy: 'None', tags: '' },
    { id: 'm2', name: 'Butter Roti', price: 20, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1626777552726-4a6b54c97e46'), spicy: 'None', tags: '' },
    { id: 'm3', name: 'Plain Naan', price: 25, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1617692855027-33b14f061079'), spicy: 'None', tags: '' },
    { id: 'm4', name: 'Butter Naan', price: 35, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1617692855027-33b14f061079'), spicy: 'None', tags: 'Bestseller' },
    { id: 'm5', name: 'Garlic Naan', price: 40, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1509440159596-0249088772ff'), spicy: 'Mild', tags: '' },
    { id: 'm6', name: 'Tandoori Roti', price: 18, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1546833999-b9f581a1996d'), spicy: 'None', tags: '' },
    { id: 'm7', name: 'Missi Roti', price: 30, veg: true, category: 'Tandoor Se', special: false, available: true, image: U('photo-1626132647523-66f5bf380027'), spicy: 'Mild', tags: '' },
    { id: 'm8', name: 'Tandoori Chicken (Half)', price: 260, veg: false, category: 'Tandoor Se', special: false, available: true, image: U('photo-1626074353765-517a681e40be'), spicy: 'Medium', tags: 'Bestseller' },
    { id: 'm9', name: 'Crispy Baby Corn Chilli', price: 180, veg: true, category: 'Chinese Special', special: true, available: true, image: U('photo-1546069901-ba9599a7e63c'), spicy: 'Hot', tags: 'Bestseller' },
    { id: 'm10', name: 'Crispy Chilli Mushroom', price: 200, veg: true, category: 'Chinese Special', special: false, available: true, image: U('photo-1596797038530-2c107229654b'), spicy: 'Hot', tags: '' },
    { id: 'm11', name: 'Veg Hakka Noodles', price: 160, veg: true, category: 'Chinese Special', special: false, available: true, image: U('photo-1585032226651-759b368d7246'), spicy: 'Medium', tags: '' },
    { id: 'm12', name: 'Chilli Paneer', price: 190, veg: true, category: 'Chinese Special', special: false, available: true, image: U('photo-1618449840665-9ed506d73a34'), spicy: 'Hot', tags: 'Bestseller' },
    { id: 'm13', name: 'Veg Fried Rice', price: 150, veg: true, category: 'Chinese Special', special: false, available: true, image: U('photo-1603133872878-684f208fb84b'), spicy: 'Mild', tags: '' },
    { id: 'm14', name: 'Schezwan Noodles', price: 170, veg: true, category: 'Chinese Special', special: false, available: true, image: U('photo-1552611052-33e04de081de'), spicy: 'Hot', tags: '' },
    { id: 'm15', name: 'Chicken Manchurian', price: 220, veg: false, category: 'Chinese Special', special: false, available: true, image: U('photo-1525755662778-989d0524087e'), spicy: 'Medium', tags: '' },
    { id: 'm16', name: 'Chilli Chicken', price: 240, veg: false, category: 'Chinese Special', special: false, available: true, image: U('photo-1626082927389-6cd097cdc6ec'), spicy: 'Hot', tags: 'Bestseller' },
    { id: 'm17', name: 'Veg Manchurian', price: 150, veg: true, category: 'Starters', special: false, available: true, image: U('photo-1590301157890-4810ed352733'), spicy: 'Medium', tags: 'Bestseller' },
    { id: 'm18', name: 'Paneer Tikka', price: 210, veg: true, category: 'Starters', special: false, available: true, image: U('photo-1599487488170-d11ec9c172f0'), spicy: 'Medium', tags: "Chef's Special" },
    { id: 'm19', name: 'Chicken 65', price: 220, veg: false, category: 'Starters', special: false, available: true, image: U('photo-1569058242253-92a9c755a0ec'), spicy: 'Hot', tags: '' },
    { id: 'm20', name: 'Veg Samosa (2 pc)', price: 60, veg: true, category: 'Starters', special: false, available: true, image: U('photo-1601050690117-94f5f6fa8bd7'), spicy: 'Mild', tags: '' },
    { id: 'm21', name: 'Chicken Momos (8 pc)', price: 160, veg: false, category: 'Starters', special: false, available: true, image: U('photo-1496116218417-1a781b1c416c'), spicy: 'Mild', tags: 'Bestseller' },
    { id: 'm22', name: 'Paneer Butter Masala', price: 220, veg: true, category: 'Main Course', special: false, available: true, image: U('photo-1631452180519-c014fe946bc7'), spicy: 'Medium', tags: 'Bestseller' },
    { id: 'm23', name: 'Dal Makhani', price: 180, veg: true, category: 'Main Course', special: false, available: true, image: U('photo-1585937421612-70a008356fbe'), spicy: 'Mild', tags: '' },
    { id: 'm24', name: 'Butter Chicken', price: 280, veg: false, category: 'Main Course', special: false, available: true, image: U('photo-1603894584373-5ac82b2ae398'), spicy: 'Medium', tags: "Chef's Special, Bestseller" },
    { id: 'm25', name: 'Veg Kolhapuri', price: 200, veg: true, category: 'Main Course', special: false, available: true, image: U('photo-1606491956689-2ea866880c84'), spicy: 'Hot', tags: '' },
    { id: 'm26', name: 'Chicken Curry', price: 260, veg: false, category: 'Main Course', special: false, available: true, image: U('photo-1598103442097-8b74394b95c6'), spicy: 'Medium', tags: '' },
    { id: 'm27', name: 'Veg Biryani', price: 180, veg: true, category: 'Rice & Biryani', special: false, available: true, image: U('photo-1563379091339-03b21ab4a4f8'), spicy: 'Medium', tags: '' },
    { id: 'm28', name: 'Chicken Biryani', price: 240, veg: false, category: 'Rice & Biryani', special: false, available: true, image: U('photo-1631515243349-e0cb75fb8d3a'), spicy: 'Medium', tags: 'Bestseller' },
    { id: 'm29', name: 'Jeera Rice', price: 140, veg: true, category: 'Rice & Biryani', special: false, available: true, image: U('photo-1603133872878-684f208fb84b'), spicy: 'None', tags: '' },
    { id: 'm30', name: 'Mutton Biryani', price: 290, veg: false, category: 'Rice & Biryani', special: false, available: true, image: U('photo-1512058564366-18510be2db19'), spicy: 'Hot', tags: "Chef's Special" },
    { id: 'm31', name: 'Gulab Jamun (2 pc)', price: 60, veg: true, category: 'Desserts', special: false, available: true, image: U('photo-1589119908995-c6837fa14848'), spicy: 'None', tags: 'Bestseller' },
    { id: 'm32', name: 'Rasmalai', price: 90, veg: true, category: 'Desserts', special: false, available: true, image: U('photo-1488477181946-6428a0291777'), spicy: 'None', tags: '' },
    { id: 'm33', name: 'Chocolate Brownie with Ice Cream', price: 140, veg: true, category: 'Desserts', special: false, available: true, image: U('photo-1578985545062-69928b1d9587'), spicy: 'None', tags: '' },
    { id: 'm34', name: 'Vanilla Ice Cream', price: 70, veg: true, category: 'Desserts', special: false, available: true, image: U('photo-1560008581-09826d1de69e'), spicy: 'None', tags: '' },
    { id: 'm35', name: 'Masala Chai', price: 30, veg: true, category: 'Drinks & Beverages', special: false, available: true, image: U('photo-1594631252845-29fc4cc8cde9'), spicy: 'None', tags: '' },
    { id: 'm36', name: 'Sweet Lassi', price: 60, veg: true, category: 'Drinks & Beverages', special: false, available: true, image: U('photo-1553530666-ba11a7da3888'), spicy: 'None', tags: 'Bestseller' },
    { id: 'm37', name: 'Mango Lassi', price: 80, veg: true, category: 'Drinks & Beverages', special: false, available: true, image: U('photo-1600271886742-f049cd451bba'), spicy: 'None', tags: '' },
    { id: 'm38', name: 'Cold Coffee', price: 90, veg: true, category: 'Drinks & Beverages', special: false, available: true, image: U('photo-1553787499-6f9133860278'), spicy: 'None', tags: '' },
    { id: 'm39', name: 'Fresh Lime Soda', price: 50, veg: true, category: 'Drinks & Beverages', special: false, available: true, image: U('photo-1581636625402-29b2a704ef13'), spicy: 'None', tags: '' },
  ];
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    tables.push({ id: 't' + i, name: 'Table ' + i, pin: String(935 + i), type: 'table', status: 'Available' });
  }
  tables.push({ id: 't11', name: 'Lounge Room', pin: '950', type: 'room', status: 'Available' });
  return {
    v: 1,
    settings: { name: 'Bhukhad Bachelors', address: 'Market, Royal Garden Park, Bokaro', upiId: RESTAURANT_UPI, currency: '₹' },
    menu, tables,
    orders: [],
    requests: [],
    messages: [], // owner ↔ customer in-app chat, per order number
    reviews: [],  // customer reviews, one per order number (after bill settled)
    msgSeen: {},  // order number -> ISO time the owner last opened its chat
    activity: [], // live activity feed — session history, local only (no DB table)
    nextOrderNo: 1001,
  };
}

/* ---------------- local cache (offline fallback only) ---------------- */
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { const s = seedState(); localStorage.setItem(LS_KEY, JSON.stringify(s)); return s; }
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !Array.isArray(s.menu) || !Array.isArray(s.tables)) return seedState();
    if (s.settings && s.settings.upiId === OLD_DEMO_UPI) { s.settings.upiId = RESTAURANT_UPI; try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {} }
    if (!Array.isArray(s.requests)) s.requests = [];
    if (!Array.isArray(s.messages)) s.messages = [];
    if (!Array.isArray(s.reviews)) s.reviews = [];
    if (!s.msgSeen || typeof s.msgSeen !== 'object') s.msgSeen = {};
    if (!Array.isArray(s.activity)) s.activity = [];
    s.menu.forEach(m => {
      if (m.available === undefined) m.available = true;
      if (typeof m.image !== 'string') m.image = '';
      if (!['None', 'Mild', 'Medium', 'Hot'].includes(m.spicy)) m.spicy = 'None';
      if (typeof m.tags !== 'string') m.tags = '';
    });
    return s;
  } catch (e) { return seedState(); }
}
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

let state = loadLocal();
/* save() keeps the offline cache fresh; Supabase writes happen via persist*(). */
function save() { saveLocal(); }

/* Live activity feed (session history, local only — no new DB table) and
   the new-order spotlight. feedReady flips on once the first data load has
   finished, so the initial load never floods the feed with old rows.
   prevStatNums remembers the last KPI numbers for the count-up animation. */
let feedReady = false;
let spotlightTimer = null;
let lastActivityId = null;
const prevStatNums = {};

/* ---------------- helpers ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => state.settings.currency + Number(n || 0).toLocaleString('en-IN');
const tableById = (id) => state.tables.find(t => t.id === id);
const itemById = (id) => state.menu.find(m => m.id === id);
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function newUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const orderItemsTotal = (o) => o.items.reduce((s, it) => s + it.price * it.qty, 0);
const openOrdersFor = (tableId) => state.orders.filter(o => o.tableId === tableId && o.status !== 'Paid' && o.status !== 'Cancelled');
const tableHasNew = (tableId) => state.orders.some(o => o.tableId === tableId && o.status === 'New');
function refreshTableStatus(tableId) {
  const t = tableById(tableId); if (!t) return;
  const next = openOrdersFor(tableId).length ? 'Occupied' : 'Available';
  if (t.status !== next) { t.status = next; persistTable(t); }
}
function categories() {
  const cats = [];
  state.menu.forEach(m => { if (!cats.includes(m.category)) cats.push(m.category); });
  return cats;
}
function upiLink(amount) {
  const p = new URLSearchParams({ pa: state.settings.upiId, pn: state.settings.name, am: String(Math.max(0, Math.round(amount))), cu: 'INR' });
  return 'upi://pay?' + p.toString();
}
function menuUrlFor(tableId) {
  const n = tableId.replace(/^t/, '');
  return location.origin + location.pathname + '?table=' + n;
}
/* WhatsApp: digits only; a 10-digit Indian number gets the 91 prefix. */
function waDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  return d;
}
/* wa.me link to message the customer about their order; '' when no number. */
function waCustomerLink(o) {
  const d = waDigits(o.phone);
  if (!d) return '';
  const msg = 'Hi ' + (o.customerName || 'there') + ', your order ' + o.number + ' at ' + state.settings.name + ' is ' + o.status + '.';
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg);
}
/* Split a total into n whole-rupee shares that add up exactly to the total. */
function splitShares(total, n) {
  const base = Math.floor(total / n);
  const rem = total - base * n;
  const shares = [];
  for (let i = 0; i < n; i++) shares.push(base + (i < rem ? 1 : 0));
  return shares;
}
function deriveNextOrderNo() {
  let max = 1000;
  state.orders.forEach(o => {
    const m = /ORD-(\d+)/.exec(o.number || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  state.nextOrderNo = max + 1;
}

/* ---------------- live activity feed + new-order spotlight ---------------- */
/* Every event carries a key; the same event arriving twice (local action +
   its Realtime echo, or a storage event after the other tab already saved
   the entry) is logged once. Feed is newest first, capped at 20. */
function logActivity(kind, key, text) {
  if (!Array.isArray(state.activity)) state.activity = [];
  if (state.activity.some(a => a.key === key)) return;
  const entry = { id: uid('a'), kind, key, text, at: new Date().toISOString() };
  state.activity.unshift(entry);
  state.activity = state.activity.slice(0, 20);
  lastActivityId = entry.id;
  saveLocal();
  if (!customerMode) renderAll();
}
function activityTextOrder(o) {
  const t = tableById(o.tableId);
  return 'New order ' + o.number + ' · ' + (t ? t.name : '') + ' · ' + o.items.map(i => i.name + ' ×' + i.qty).join(', ') + ' — ' + fmt(orderItemsTotal(o));
}
function activityTextStatus(o) {
  const t = tableById(o.tableId);
  return o.number + ' → ' + o.status + ' · ' + (t ? t.name : '');
}
function activityTextRequest(r, done) {
  const t = tableById(r.tableId);
  return r.type + (done ? ' done' : ' requested') + ' · ' + (t ? t.name : '');
}
/* Merge a realtime order row and log what actually changed. Returns the
   merged order. Local actions log themselves; the Realtime echo of our own
   write finds the row already in state, so nothing is logged twice. */
function noteOrderRow(r) {
  const prev = state.orders.find(x => x.id === r.id);
  const o = rowToOrder(r);
  applyOrderRow(r);
  if (!feedReady) return o;
  if (!prev) { logActivity('order', 'order-new:' + o.id, activityTextOrder(o)); showSpotlight(o); }
  else if (prev.status !== o.status) { logActivity('status', 'order-status:' + o.id + ':' + o.status, activityTextStatus(o)); }
  return o;
}
function noteRequestRow(r) {
  const prev = state.requests.find(x => x.id === r.id);
  const q = rowToRequest(r);
  applyRequestRow(r);
  if (!feedReady) return q;
  if (!prev) logActivity('request', 'req-new:' + q.id, activityTextRequest(q, false));
  else if (prev.status !== q.status && q.status === 'Done') logActivity('request', 'req-done:' + q.id, activityTextRequest(q, true));
  return q;
}
function showSpotlight(o) {
  if (customerMode) return;
  const el = $('#spotlight'); if (!el) return;
  const t = tableById(o.tableId);
  el.innerHTML = '<span class="spot-dot"></span><span class="grow"><strong>New order</strong> — ' + esc(t ? t.name : '') + ' · ' + esc(o.number) + ' · <strong>' + fmt(orderItemsTotal(o)) + '</strong></span><button class="spot-close" aria-label="Dismiss">✕</button>';
  el.hidden = false;
  const closeBtn = $('.spot-close', el);
  if (closeBtn) closeBtn.addEventListener('click', () => { el.hidden = true; });
  if (spotlightTimer) clearTimeout(spotlightTimer);
  spotlightTimer = setTimeout(() => { el.hidden = true; }, 6000);
}
/* Today's orders, excluding cancelled ones — the shared base for the
   dashboard highlights and the Analytics "today" sections. */
function todaysOrders() {
  return state.orders.filter(o => isToday(o.createdAt) && o.status !== 'Cancelled');
}

/* QR rendering (qrcodejs vendored — works offline; text fallback if it fails) */
function renderQR(el, text, size) {
  el.innerHTML = '';
  if (window.QRCode) {
    try { new QRCode(el, { text, width: size || 160, height: size || 160, correctLevel: QRCode.CorrectLevel.M }); return true; }
    catch (e) { /* fall through */ }
  }
  el.innerHTML = '<div class="qr-fallback">QR code could not be drawn (QR library offline).<br>Open this link instead:<br>' + esc(text) + '</div>';
  return false;
}

/* ---------------- row <-> local mapping (snake_case DB, camelCase app) ---------------- */
function rowToOrder(r) {
  return {
    id: r.id, number: r.number, tableId: r.table_id,
    items: Array.isArray(r.items) ? r.items : [],
    customerName: r.customer_name || '', phone: r.phone || '', instructions: r.notes || '',
    status: r.status, createdAt: r.created_at,
    paymentMode: r.payment_mode || undefined,
    finalTotal: r.final_total != null ? Number(r.final_total) : undefined,
    settledAt: r.settled_at || undefined,
    /* Tracking timestamps — added by a later schema migration. Rows written
       before the columns exist have no value here; callers keep any locally
       observed time instead (see applyOrderRow / loadFromSupabase). */
    preparingAt: r.preparing_at || undefined,
    servedAt: r.served_at || undefined,
  };
}
function orderToRow(o) {
  const total = orderItemsTotal(o);
  return {
    id: o.id, number: o.number, table_id: o.tableId,
    customer_name: o.customerName, phone: o.phone || null, notes: o.instructions || null,
    status: o.status, items: o.items,
    payment_mode: o.paymentMode || null,
    subtotal: total, discount: 0, extra: 0, grand: total,
    final_total: o.finalTotal != null ? o.finalTotal : null,
    created_at: o.createdAt, settled_at: o.settledAt || null,
    preparing_at: o.preparingAt || null, served_at: o.servedAt || null,
  };
}
function rowToMenu(r) {
  const spicy = ['None', 'Mild', 'Medium', 'Hot'].includes(r.spicy) ? r.spicy : 'None';
  return { id: r.id, name: r.name, price: Number(r.price), veg: !!r.veg, category: r.category, special: !!r.special, available: r.available !== false, image: r.image || '', spicy, tags: r.tags || '' };
}
function menuToRow(m) {
  return { id: m.id, name: m.name, price: m.price, veg: !!m.veg, category: m.category, special: !!m.special, available: m.available !== false, image: m.image || null, spicy: m.spicy || 'None', tags: m.tags || null };
}
/* Dish photo / spicy / tags presentation. A photo that fails to load hides
   itself (and its frame) so a broken-image icon never shows. */
function dishPhotoHtml(m, cls, frameCls) {
  if (!m.image) return '';
  const onErr = frameCls
    ? "this.closest('." + frameCls + "').style.display='none'"
    : 'this.remove()';
  return '<img class="' + cls + '" src="' + esc(m.image) + '" alt="' + esc(m.name) + '" onerror="' + onErr + '">';
}
const SPICY_LABEL = { None: 'No spice', Mild: 'Mild', Medium: 'Medium', Hot: 'Hot' };
function spicyPillHtml(m) {
  const level = ['None', 'Mild', 'Medium', 'Hot'].includes(m.spicy) ? m.spicy : 'None';
  return '<span class="spicy-pill spicy-' + level.toLowerCase() + '">' + SPICY_LABEL[level] + '</span>';
}
function tagsPillsHtml(m) {
  return String(m.tags || '').split(',').map(t => t.trim()).filter(Boolean)
    .map(t => '<span class="tag-pill">' + esc(t) + '</span>').join('');
}
function rowToTable(r) {
  return { id: r.id, name: r.name, pin: r.pin, type: r.type, status: r.status };
}
function tableToRow(t) {
  return { id: t.id, name: t.name, pin: t.pin, type: t.type, status: t.status };
}
function rowToSettings(r) {
  return { name: r.restaurant_name, address: r.address || '', upiId: r.upi_id, currency: r.currency || '₹' };
}
function rowToRequest(r) {
  return { id: r.id, tableId: r.table_id, type: r.type, status: r.status, createdAt: r.created_at, doneAt: r.done_at || null };
}
function requestToRow(r) {
  return { id: r.id, table_id: r.tableId, type: r.type, status: r.status, created_at: r.createdAt, done_at: r.doneAt || null };
}
/* In-app chat messages (owner ↔ customer), keyed by order number. */
function rowToMessage(r) {
  return { id: r.id, orderNumber: r.order_number, tableId: r.table_id, sender: r.sender, text: r.text, createdAt: r.created_at };
}
function messageToRow(m) {
  return { id: m.id, order_number: m.orderNumber, table_id: m.tableId, sender: m.sender, text: m.text, created_at: m.createdAt };
}
/* Customer reviews — one per order number, given after the bill is settled. */
function rowToReview(r) {
  return { id: r.id, orderNumber: r.order_number, tableId: r.table_id, customerName: r.customer_name || '', rating: Number(r.rating), comment: r.comment || '', createdAt: r.created_at };
}
function reviewToRow(r) {
  return { id: r.id, order_number: r.orderNumber, table_id: r.tableId, customer_name: r.customerName || null, rating: r.rating, comment: r.comment || null, created_at: r.createdAt };
}
function reviewFor(number) {
  return (state.reviews || []).find(r => r.orderNumber === number) || null;
}
/* Star display: filled gold stars for the rating, empty ones after it. */
function starsHtml(rating) {
  let out = '';
  for (let i = 1; i <= 5; i++) out += '<span class="star' + (i <= rating ? ' on' : '') + '">★</span>';
  return '<span class="stars" aria-label="' + rating + ' out of 5 stars">' + out + '</span>';
}
function messagesFor(number) {
  return (state.messages || []).filter(m => m.orderNumber === number)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
/* Customer messages the owner has not opened yet (per order). */
function unreadMsgCount(number) {
  const seen = (state.msgSeen && state.msgSeen[number]) || '';
  return (state.messages || []).filter(m => m.orderNumber === number && m.sender === 'customer' &&
    (!seen || new Date(m.createdAt) > new Date(seen))).length;
}
function settingsToRow() {
  return { id: 1, restaurant_name: state.settings.name, address: state.settings.address, upi_id: state.settings.upiId, currency: state.settings.currency };
}

/* ---------------- Supabase data layer ---------------- */
let sb = null;          // Supabase client (null when offline)
let online = false;     // true once the shared database answered
let liveSubscribed = false;
let ownerSession = null;
let offlineDemo = false; // owner chose "Continue in offline demo"
let soundOn = true;     // alert chime for new orders / service requests (dashboard only)
let audioCtx = null;
let soundArmed = false; // true after the owner's first click/tap in the dashboard
try { soundOn = localStorage.getItem('qrdine-sound') !== 'off'; } catch (e) {}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function initSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('QR Dine: Supabase JS library did not load — offline demo mode.');
    return false;
  }
  try {
    // Raj wants the owner login on EVERY visit: never persist the session.
    // Clear any session saved by older versions, then create the client
    // with in-memory-only sessions (a reload or new visit starts logged out).
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.slice(-11) === '-auth-token') localStorage.removeItem(k);
      }
    } catch (e) {}
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: true },
    });
    // Lightweight probe: if the tables do not exist yet this throws and we
    // fall back to offline demo mode (the parent runs the schema next).
    const { error } = await withTimeout(
      sb.from('qrdine_settings').select('id').limit(1), 8000);
    if (error) throw error;
    online = true;
    return true;
  } catch (e) {
    console.warn('QR Dine: shared database unreachable — offline demo mode.', e && e.message ? e.message : e);
    sb = null;
    online = false;
    return false;
  }
}

async function loadFromSupabase() {
  const [sRes, mRes, tRes, oRes, qRes, gRes, vRes] = await Promise.all([
    sb.from('qrdine_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('qrdine_menu').select('*').order('id'),
    sb.from('qrdine_tables').select('*').order('id'),
    sb.from('qrdine_orders').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('qrdine_requests').select('*').order('created_at', { ascending: true }).limit(500),
    sb.from('qrdine_messages').select('*').order('created_at', { ascending: true }).limit(500),
    sb.from('qrdine_reviews').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  if (sRes.error) throw sRes.error;
  if (mRes.error) throw mRes.error;
  if (tRes.error) throw tRes.error;
  if (oRes.error) throw oRes.error;
  if (sRes.data) state.settings = rowToSettings(sRes.data);
  if (Array.isArray(mRes.data) && mRes.data.length) state.menu = mRes.data.map(rowToMenu);
  if (Array.isArray(tRes.data) && tRes.data.length) state.tables = tRes.data.map(rowToTable);
  /* Keep locally observed tracking times for rows whose Supabase row has
     no preparing_at / served_at yet (columns not migrated yet). */
  const localTimes = new Map(state.orders.map(o => [o.id, { preparingAt: o.preparingAt, servedAt: o.servedAt, settledAt: o.settledAt }]));
  state.orders = (oRes.data || []).map(rowToOrder);
  state.orders.forEach(o => {
    const t = localTimes.get(o.id);
    if (t) { if (!o.preparingAt && t.preparingAt) o.preparingAt = t.preparingAt; if (!o.servedAt && t.servedAt) o.servedAt = t.servedAt; if (!o.settledAt && t.settledAt) o.settledAt = t.settledAt; }
  });
  // The requests table may not exist yet (schema not re-run): keep the
  // local requests instead of failing the whole load.
  if (qRes.error) console.warn('QR Dine: qrdine_requests not available yet — service requests stay local.', qRes.error.message);
  else state.requests = (qRes.data || []).map(rowToRequest);
  // Same for the messages table.
  if (gRes.error) console.warn('QR Dine: qrdine_messages not available yet — chat messages stay local.', gRes.error.message);
  else state.messages = (gRes.data || []).map(rowToMessage);
  // Same for the reviews table.
  if (vRes.error) console.warn('QR Dine: qrdine_reviews not available yet — reviews stay local.', vRes.error.message);
  else state.reviews = (vRes.data || []).map(rowToReview);
  deriveNextOrderNo();
  saveLocal();
}

/* Realtime: every device re-renders live, no refresh. Handlers merge by id,
   so our own writes echoing back never duplicate rows. */
function applyOrderRow(r) {
  const o = rowToOrder(r);
  const prev = state.orders.find(x => x.id === o.id);
  if (prev) {
    /* Fallback when the tracking columns do not exist yet in Supabase:
       keep the locally observed times instead of wiping them with
       undefined from the row. */
    if (!o.preparingAt && prev.preparingAt) o.preparingAt = prev.preparingAt;
    if (!o.servedAt && prev.servedAt) o.servedAt = prev.servedAt;
    if (!o.settledAt && prev.settledAt) o.settledAt = prev.settledAt;
  }
  const i = state.orders.findIndex(x => x.id === o.id);
  if (i >= 0) state.orders[i] = o; else state.orders.push(o);
  deriveNextOrderNo();
  refreshTableStatus(o.tableId);
}
function applyTableRow(r) {
  const t = rowToTable(r);
  const i = state.tables.findIndex(x => x.id === t.id);
  if (i >= 0) state.tables[i] = t; else state.tables.push(t);
}
function applyMenuRow(r) {
  const m = rowToMenu(r);
  const i = state.menu.findIndex(x => x.id === m.id);
  if (i >= 0) state.menu[i] = m; else state.menu.push(m);
}
function applyRequestRow(r) {
  const q = rowToRequest(r);
  const i = state.requests.findIndex(x => x.id === q.id);
  if (i >= 0) state.requests[i] = q; else state.requests.push(q);
}
function applyMessageRow(r) {
  const m = rowToMessage(r);
  if (!Array.isArray(state.messages)) state.messages = [];
  const i = state.messages.findIndex(x => x.id === m.id);
  if (i >= 0) state.messages[i] = m; else state.messages.push(m);
}
function applyReviewRow(r) {
  const v = rowToReview(r);
  if (!Array.isArray(state.reviews)) state.reviews = [];
  const i = state.reviews.findIndex(x => x.id === v.id);
  if (i >= 0) state.reviews[i] = v; else state.reviews.push(v);
}
function subscribeRealtime() {
  if (!sb || liveSubscribed) return;
  liveSubscribed = true;
  sb.channel('qrdine-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_orders' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.orders = state.orders.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { const o = noteOrderRow(payload.new); saveLocal(); renderAll(); if (payload.eventType === 'INSERT') playChime(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_tables' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.tables = state.tables.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { applyTableRow(payload.new); saveLocal(); renderAll(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_menu' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.menu = state.menu.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { applyMenuRow(payload.new); saveLocal(); renderAll(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_settings' }, (payload) => {
      if (payload.new) { state.settings = rowToSettings(payload.new); saveLocal(); renderAll(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_requests' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.requests = state.requests.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { noteRequestRow(payload.new); saveLocal(); renderAll(); if (payload.eventType === 'INSERT') playChime(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_messages' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.messages = state.messages.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { applyMessageRow(payload.new); saveLocal(); renderAll(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_reviews' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.reviews = state.reviews.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { applyReviewRow(payload.new); saveLocal(); renderAll(); }
    })
    .subscribe((status) => { updateSyncBadge(status === 'SUBSCRIBED'); });
}

/* ---------------- persist helpers (no-ops when offline) ---------------- */
/* NOTE: persist helpers take a thunk — the Supabase query must only be built
   when online; evaluating sb.from(...) while sb is null would throw. */
function sbSafe(fn) {
  if (!online || !sb) return Promise.resolve(null);
  let p;
  try { p = fn(); } catch (e) { console.warn('QR Dine: Supabase write failed', e && e.message ? e.message : e); return Promise.resolve(null); }
  return Promise.resolve(p).catch(e => { console.warn('QR Dine: Supabase write failed', e && e.message ? e.message : e); return null; });
}
function stripTrackingCols(row) {
  const r = Object.assign({}, row);
  delete r.preparing_at; delete r.served_at;
  return r;
}
/* If the tracking columns do not exist in Supabase yet, an insert/update
   carrying them fails with "column does not exist" — retry without them so
   the order/status change itself still saves (times stay local only). */
async function persistOrderInsert(o) {
  const res = await sbSafe(() => sb.from('qrdine_orders').insert(orderToRow(o)));
  if (res && res.error && /preparing_at|served_at/.test(res.error.message || '')) {
    await sbSafe(() => sb.from('qrdine_orders').insert(stripTrackingCols(orderToRow(o))));
  }
  return res;
}
async function persistOrderUpdate(o) {
  const res = await sbSafe(() => sb.from('qrdine_orders').update(orderToRow(o)).eq('id', o.id));
  if (res && res.error && /preparing_at|served_at/.test(res.error.message || '')) {
    await sbSafe(() => sb.from('qrdine_orders').update(stripTrackingCols(orderToRow(o))).eq('id', o.id));
  }
  return res;
}
function persistTable(t) { return sbSafe(() => sb.from('qrdine_tables').upsert(tableToRow(t))); }
function persistTableDelete(id) { return sbSafe(() => sb.from('qrdine_tables').delete().eq('id', id)); }
function persistMenu(m) { return sbSafe(() => sb.from('qrdine_menu').upsert(menuToRow(m))); }
function persistMenuDelete(id) { return sbSafe(() => sb.from('qrdine_menu').delete().eq('id', id)); }
function persistSettings() { return sbSafe(() => sb.from('qrdine_settings').upsert(settingsToRow())); }
/* Service requests: if the insert fails (table not created yet) the request
   stays in state/localStorage, so the flow still works in demo mode. */
function persistRequestInsert(r) { return sbSafe(() => sb.from('qrdine_requests').insert(requestToRow(r))); }
function persistRequestUpdate(r) {
  return sbSafe(() => sb.from('qrdine_requests').update(requestToRow(r)).eq('id', r.id));
}
/* Chat messages: same fallback — if the table does not exist yet, the
   message stays in state/localStorage and still arrives on other tabs
   via the storage-event path. */
function persistMessageInsert(m) { return sbSafe(() => sb.from('qrdine_messages').insert(messageToRow(m))); }
/* Customer reviews: same fallback — if the table does not exist yet, the
   review stays in state/localStorage and still shows as submitted. */
function persistReviewInsert(r) { return sbSafe(() => sb.from('qrdine_reviews').insert(reviewToRow(r))); }
async function persistResetDemo() {
  if (!online || !sb) return;
  const seed = seedState();
  await sbSafe(() => sb.from('qrdine_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await sbSafe(() => sb.from('qrdine_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await sbSafe(() => sb.from('qrdine_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await sbSafe(() => sb.from('qrdine_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  await sbSafe(() => sb.from('qrdine_menu').delete().neq('id', ''));
  await sbSafe(() => sb.from('qrdine_tables').delete().neq('id', ''));
  await sbSafe(() => sb.from('qrdine_menu').insert(seed.menu.map(menuToRow)));
  await sbSafe(() => sb.from('qrdine_tables').insert(seed.tables.map(tableToRow)));
  await sbSafe(() => sb.from('qrdine_settings').upsert({ id: 1, restaurant_name: seed.settings.name, address: seed.settings.address, upi_id: seed.settings.upiId, currency: seed.settings.currency }));
}

/* ---------------- owner auth (Supabase Auth; customer view never logs in) ---------------- */
async function checkAuth() {
  if (!online || !sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    ownerSession = data && data.session ? data.session : null;
  } catch (e) { ownerSession = null; }
  return ownerSession;
}
function showLoginScreen() {
  $('#login-shell').hidden = false;
  $('#admin-shell').hidden = true;
  $('#offline-banner').hidden = !(!online);
  $('#login-offline-note').hidden = online;
  $('#btn-offline-demo').hidden = online;
  $('#login-error').hidden = true;
  updateSyncBadge(false);
}
function showAdminShell() {
  $('#login-shell').hidden = true;
  $('#admin-shell').hidden = false;
  $('#offline-banner').hidden = online;
  updateSyncBadge(online && liveSubscribed);
}
function updateSyncBadge(live) {
  const dot = $('.live-dot');
  const label = $('#sync-label');
  if (!dot || !label) return;
  dot.classList.remove('live-on', 'live-connecting', 'live-off');
  if (online && live) {
    dot.classList.add('live-on');
    label.textContent = 'Live · Shared DB';
  } else if (online) {
    dot.classList.add('live-connecting');
    label.textContent = 'Shared DB · connecting…';
  } else {
    dot.classList.add('live-off');
    label.textContent = 'Offline demo';
  }
}

/* ---------------- sound alerts (dashboard only, WebAudio chime) ---------------- */
/* Browsers block sound before any user gesture: the chime is armed on the
   owner's first click/tap inside the dashboard, and only plays after that.
   The customer menu never arms audio, so it stays silent. No audio file,
   no new dependency — a two-note oscillator chime. */
function armSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    soundArmed = true;
  } catch (e) { /* audio unavailable — stay silent */ }
}
function playChime() {
  if (!soundOn || !soundArmed || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.16 + 0.35);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0 + i * 0.16); osc.stop(t0 + i * 0.16 + 0.4);
    });
  } catch (e) { /* ignore audio errors */ }
}

/* ---------------- navigation ---------------- */
const VIEW_TITLES = { dashboard: 'Dashboard', menu: 'Menu Management', tables: 'Tables', orders: 'Orders', kitchen: 'Kitchen', billing: 'Billing', analytics: 'Analytics', reviews: 'Reviews', qrcodes: 'QR Codes', settings: 'Settings' };
let currentView = 'dashboard';
function showView(name) {
  currentView = name;
  $$('#main-nav button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $('#view-title').textContent = VIEW_TITLES[name] || name;
  renderView(name);
}
function renderView(name) {
  ({ dashboard: renderDashboard, menu: renderMenuAdmin, tables: renderTablesAdmin,
     orders: renderOrders, kitchen: renderKitchen, billing: renderBilling, analytics: renderAnalytics,
     reviews: renderReviews, qrcodes: renderQrStands, settings: renderSettings }[name] || (() => {}))();
}
function renderAll() {
  $('#side-rest-name').textContent = state.settings.name;
  $('#side-rest-addr').textContent = state.settings.address;
  const newCount = state.orders.filter(o => o.status === 'New').length;
  const badge = $('#orders-badge');
  badge.hidden = newCount === 0; badge.textContent = newCount;
  const openReqCount = state.requests.filter(r => r.status === 'New').length;
  const reqBadge = $('#requests-badge');
  reqBadge.hidden = openReqCount === 0; reqBadge.textContent = openReqCount;
  renderView(currentView);
  if (customerMode) renderCustomer();
}
window.addEventListener('storage', (e) => {
  // Same-browser tabs only matter in offline mode; online mode uses Realtime.
  if (!online && e.key === LS_KEY) {
    const prevOrders = state.orders.slice();
    const prevOrderIds = new Set(prevOrders.map(o => o.id));
    const prevStatus = new Map(prevOrders.map(o => [o.id, o.status]));
    const prevReqs = state.requests.slice();
    const prevReqIds = new Set(prevReqs.filter(r => r.status === 'New').map(r => r.id));
    const prevReqStatus = new Map(prevReqs.map(r => [r.id, r.status]));
    state = loadLocal(); renderAll();
    let chimed = false;
    state.orders.forEach(o => {
      if (!prevOrderIds.has(o.id)) {
        if (feedReady) { logActivity('order', 'order-new:' + o.id, activityTextOrder(o)); showSpotlight(o); }
        playChime(); chimed = true;
      } else if (feedReady && prevStatus.get(o.id) !== o.status) {
        logActivity('status', 'order-status:' + o.id + ':' + o.status, activityTextStatus(o));
      }
    });
    state.requests.forEach(r => {
      if (r.status === 'New' && !prevReqIds.has(r.id)) {
        if (feedReady) logActivity('request', 'req-new:' + r.id, activityTextRequest(r, false));
        if (!chimed) { playChime(); chimed = true; }
      } else if (feedReady && prevReqStatus.get(r.id) === 'New' && r.status === 'Done') {
        logActivity('request', 'req-done:' + r.id, activityTextRequest(r, true));
      }
    });
  }
});

/* ---------------- dashboard ---------------- */
function renderDashboard() {
  const occupied = state.tables.filter(t => t.status === 'Occupied').length;
  const newOrders = state.orders.filter(o => o.status === 'New');
  const revenueToday = state.orders.filter(o => o.status === 'Paid' && o.settledAt && isToday(o.settledAt))
    .reduce((s, o) => s + (o.finalTotal || 0), 0);
  $('#dash-stats').innerHTML =
    statCard('Tables Occupied', occupied + ' / ' + state.tables.length, occupied, 'tables', String(state.tables.length)) +
    statCard('New Orders', String(newOrders.length), newOrders.length, 'int') +
    statCard("Today's Revenue", fmt(revenueToday), revenueToday, 'money') +
    statCard('Total Orders', String(state.orders.length), state.orders.length, 'int');
  animateStatValues();
  renderHighlights();

  $('#table-grid').innerHTML = state.tables.map(t => {
    const open = openOrdersFor(t.id);
    const bill = open.reduce((s, o) => s + orderItemsTotal(o), 0);
    const hasNew = tableHasNew(t.id);
    const cls = t.status === 'Occupied' ? 'occupied' : 'available';
    return '<button class="table-card" data-table="' + t.id + '">' +
      '<h3>' + esc(t.name) + (t.type === 'room' ? ' <span class="muted">· ' + fmt(1000) + '</span>' : '') + '</h3>' +
      '<div class="pin">PIN: <b>' + esc(t.pin) + '</b></div>' +
      (bill ? '<div class="bill">Open bill: ' + fmt(bill) + '</div>' : '<div class="bill">No open orders</div>') +
      '<span class="status ' + cls + '">' + t.status.toUpperCase() + '</span>' +
      (hasNew ? ' <span class="status new">NEW ORDER</span>' : '') +
      '</button>';
  }).join('');
  $$('#table-grid .table-card').forEach(c => c.addEventListener('click', () => {
    const t = tableById(c.dataset.table);
    if (t && t.status === 'Occupied') { $('#bill-table').value = t.id; showView('billing'); }
    else openTablePickerFor(t.id);
  }));

  const feed = state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  $('#orders-feed').innerHTML = feed.length ? feed.map(o => {
    const t = tableById(o.tableId);
    const unread = unreadMsgCount(o.number);
    return '<div class="feed-item"><div><strong>' + esc(o.number) + '</strong> · ' + esc(t ? t.name : '') +
      ' · ' + esc(o.customerName) + ' · ' + o.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ') +
      '</div><div><span class="status ' + o.status.toLowerCase() + '">' + o.status.toUpperCase() + '</span> <strong>' + fmt(orderItemsTotal(o)) + '</strong> ' +
      '<button class="btn btn-sm" data-chat="' + o.id + '">Message' + (unread ? ' <span class="msg-badge">' + unread + '</span>' : '') + '</button></div></div>' +
      (openChatOrder === o.number ? chatThreadHtml(o.number) : '');
  }).join('') : '<p class="muted">No orders yet. Open the customer view and place a test order.</p>';
  $$('#orders-feed [data-chat]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.chat); if (!o) return;
    toggleOrderChat(o.number);
  }));
  wireChatInputs($('#orders-feed'));

  const openReqs = state.requests.filter(r => r.status === 'New').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  $('#requests-feed').innerHTML = openReqs.length ? openReqs.map(r => {
    const t = tableById(r.tableId);
    return '<div class="feed-item req-item"><div><strong>' + esc(r.type) + '</strong> · ' + esc(t ? t.name : '') +
      ' · <span class="muted">' + new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
      '<button class="btn btn-sm btn-primary" data-req-done="' + r.id + '">Done</button></div>';
  }).join('') : '<p class="muted">No service requests waiting.</p>';
  $$('#requests-feed [data-req-done]').forEach(b => b.addEventListener('click', () => markRequestDone(b.dataset.reqDone)));

  const feedEl = $('#activity-feed');
  if (feedEl) {
    const items = (state.activity || []).slice(0, 20);
    feedEl.innerHTML = items.length ? items.map(a => {
      const fresh = lastActivityId === a.id && (Date.now() - new Date(a.at).getTime() < 6000);
      return '<div class="feed-item activity-item act-' + esc(a.kind) + (fresh ? ' fresh' : '') + '"><span class="act-dot"></span><div class="grow">' + esc(a.text) + '</div><span class="muted">' + new Date(a.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '</span></div>';
    }).join('') : '<p class="muted">No activity yet — new orders, status changes and service requests will show up here live.</p>';
  }
}
function highlightCard(label, value, sub) {
  return '<div class="highlight"><div class="hl-label">' + esc(label) + '</div><div class="hl-value">' + esc(value) + '</div><div class="hl-sub">' + esc(sub) + '</div></div>';
}
/* Today's highlights — computed ONLY from today's real orders. */
function renderHighlights() {
  const el = $('#dash-highlights'); if (!el) return;
  const today = todaysOrders();
  if (!today.length) {
    el.innerHTML = '<p class="muted">No orders yet today — highlights will appear here as orders come in.</p>';
    return;
  }
  const dishQty = {};
  const tableCount = {};
  let servedItems = 0;
  let billSum = 0;
  today.forEach(o => {
    o.items.forEach(it => {
      if (!dishQty[it.id]) dishQty[it.id] = { name: it.name, qty: 0 };
      dishQty[it.id].qty += it.qty;
    });
    tableCount[o.tableId] = (tableCount[o.tableId] || 0) + 1;
    billSum += orderItemsTotal(o);
    if (o.status === 'Served' || o.status === 'Paid') servedItems += o.items.reduce((s, it) => s + it.qty, 0);
  });
  const best = Object.values(dishQty).sort((a, b) => b.qty - a.qty)[0];
  const busyEntry = Object.entries(tableCount).sort((a, b) => b[1] - a[1])[0];
  const busyTable = tableById(busyEntry[0]);
  const avg = Math.round(billSum / today.length);
  el.innerHTML =
    highlightCard('Best Seller Today', best.name, best.qty + ' sold') +
    highlightCard('Busiest Table', busyTable ? busyTable.name : busyEntry[0], busyEntry[1] + ' order' + (busyEntry[1] === 1 ? '' : 's')) +
    highlightCard('Average Bill', fmt(avg), today.length + ' order' + (today.length === 1 ? '' : 's') + ' today') +
    highlightCard('Items Served', String(servedItems), 'served today');
}
function markRequestDone(id) {
  const r = state.requests.find(x => x.id === id); if (!r) return;
  r.status = 'Done'; r.doneAt = new Date().toISOString();
  if (feedReady) logActivity('request', 'req-done:' + r.id, activityTextRequest(r, true));
  save(); persistRequestUpdate(r); renderAll();
}
function statCard(label, value, num, fmtKind, total) {
  const attrs = (num !== undefined)
    ? ' data-label="' + esc(label) + '" data-num="' + num + '"' + (fmtKind ? ' data-fmt="' + fmtKind + '"' : '') + (total !== undefined ? ' data-total="' + esc(total) + '"' : '')
    : '';
  return '<div class="stat"' + attrs + '><div class="stat-label">' + esc(label) + '</div><div class="stat-value">' + esc(value) + '</div></div>';
}
/* KPI count-up: when a dashboard number changes, animate from the previous
   value to the new one over ~0.5s. First render shows instantly. */
function animateStatValues() {
  $$('#dash-stats .stat').forEach(el => {
    const label = el.dataset.label;
    const target = Number(el.dataset.num || 0);
    const fmtKind = el.dataset.fmt || 'int';
    const total = el.dataset.total || '';
    const valEl = $('.stat-value', el);
    if (!valEl || label === undefined) return;
    const prev = prevStatNums[label];
    if (prev === undefined || prev === target) { prevStatNums[label] = target; return; }
    const start = prev;
    const t0 = performance.now();
    const dur = 500;
    const format = (v) => fmtKind === 'money' ? fmt(Math.round(v)) : fmtKind === 'tables' ? Math.round(v) + ' / ' + total : String(Math.round(v));
    prevStatNums[label] = target;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 2);
      valEl.textContent = format(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
      else valEl.textContent = format(target);
    };
    requestAnimationFrame(step);
  });
}

/* ---------------- menu management ---------------- */
let editingMenuId = null;
function renderMenuAdmin() {
  const cats = categories();
  $('#mf-category').innerHTML = cats.map(c => '<option>' + esc(c) + '</option>').join('');
  const filter = $('#menu-filter');
  const cur = filter.value;
  filter.innerHTML = '<option value="">All categories</option>' + cats.map(c => '<option>' + esc(c) + '</option>').join('');
  filter.value = cur;
  const list = state.menu.filter(m => !cur || m.category === cur);
  $('#menu-list').innerHTML = list.length ? list.map(m =>
    '<div class="menu-row">' + dishPhotoHtml(m, 'menu-thumb') + '<div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
    '<span class="m-name">' + esc(m.name) + '</span>' + (m.special ? '<span class="special-tag">Chef\'s Special</span>' : '') +
    '<div class="m-sub">' + esc(m.category) + ' · ' + fmt(m.price) + ' · ' + spicyPillHtml(m) + ' ' + tagsPillsHtml(m) + '</div></div>' +
    '<div class="order-actions"><button class="btn btn-sm" data-edit="' + m.id + '">Edit</button>' +
    '<button class="btn btn-sm btn-danger" data-del="' + m.id + '">Delete</button></div></div>'
  ).join('') : '<p class="muted">No items in this category.</p>';
  $$('#menu-list [data-edit]').forEach(b => b.addEventListener('click', () => startMenuEdit(b.dataset.edit)));
  $$('#menu-list [data-del]').forEach(b => b.addEventListener('click', () => {
    const m = itemById(b.dataset.del);
    if (m && confirm('Delete "' + m.name + '" from the menu?')) {
      state.menu = state.menu.filter(x => x.id !== m.id); save(); persistMenuDelete(m.id); renderMenuAdmin();
    }
  }));
}
function startMenuEdit(id) {
  const m = itemById(id); if (!m) return;
  editingMenuId = id;
  $('#mf-name').value = m.name; $('#mf-price').value = m.price;
  $('#mf-category').value = m.category; $('#mf-veg').checked = m.veg; $('#mf-special').checked = !!m.special;
  $('#mf-image').value = m.image || '';
  $('#mf-spicy').value = ['None', 'Mild', 'Medium', 'Hot'].includes(m.spicy) ? m.spicy : 'None';
  $('#mf-tags').value = m.tags || '';
  $('#menu-form-title').textContent = 'Edit Item';
  $('#mf-submit').textContent = 'Save Changes';
  $('#mf-cancel').hidden = false;
  $('#mf-name').focus();
}
function resetMenuForm() {
  editingMenuId = null;
  $('#menu-form').reset(); $('#mf-veg').checked = true;
  $('#menu-form-title').textContent = 'Add Item';
  $('#mf-submit').textContent = 'Add Item';
  $('#mf-cancel').hidden = true;
}

/* ---------------- tables admin ---------------- */
function renderTablesAdmin() {
  $('#tables-list').innerHTML = state.tables.map(t => {
    const open = openOrdersFor(t.id).length;
    return '<div class="table-row"><div><strong>' + esc(t.name) + '</strong>' +
      ' <span class="muted">· ' + (t.type === 'room' ? 'Room / Lounge' : 'Table') + ' · ' + open + ' open order(s)</span></div>' +
      '<div class="order-actions"><label class="muted">PIN <input style="width:80px" value="' + esc(t.pin) + '" data-pin="' + t.id + '" maxlength="3"></label>' +
      '<select data-tstatus="' + t.id + '" style="width:130px"><option' + (t.status === 'Available' ? ' selected' : '') + '>Available</option><option' + (t.status === 'Occupied' ? ' selected' : '') + '>Occupied</option></select>' +
      '<button class="btn btn-sm" data-tsave="' + t.id + '">Save</button>' +
      '<button class="btn btn-sm btn-danger" data-tdel="' + t.id + '">Delete</button></div></div>';
  }).join('');
  $$('#tables-list [data-tsave]').forEach(b => b.addEventListener('click', () => {
    const t = tableById(b.dataset.tsave); if (!t) return;
    const pin = $('[data-pin="' + t.id + '"]').value.trim();
    if (!/^[0-9]{3}$/.test(pin)) { alert('PIN must be exactly 3 digits.'); return; }
    t.pin = pin;
    t.status = $('[data-tstatus="' + t.id + '"]').value;
    save(); persistTable(t); renderTablesAdmin(); renderDashboard();
  }));
  $$('#tables-list [data-tdel]').forEach(b => b.addEventListener('click', () => {
    const t = tableById(b.dataset.tdel); if (!t) return;
    if (openOrdersFor(t.id).length) { alert('This table has open orders. Settle them first.'); return; }
    if (confirm('Delete ' + t.name + '?')) { state.tables = state.tables.filter(x => x.id !== t.id); save(); persistTableDelete(t.id); renderTablesAdmin(); }
  }));
}

/* ---------------- orders ---------------- */
let orderFilter = '';
/* Advance one step along New → Preparing → Served → Paid. Shared by the
   Orders list and the Kitchen view. */
function advanceOrder(o) {
  const from = o.status;
  o.status = { 'New': 'Preparing', 'Preparing': 'Served', 'Served': 'Paid' }[o.status];
  const now = new Date().toISOString();
  if (o.status === 'Preparing' && !o.preparingAt) o.preparingAt = now;
  if (o.status === 'Served' && !o.servedAt) o.servedAt = now;
  if (o.status === 'Paid') { o.finalTotal = orderItemsTotal(o); o.settledAt = new Date().toISOString(); o.paymentMode = o.paymentMode || 'Cash'; }
  if (feedReady && from !== o.status) logActivity('status', 'order-status:' + o.id + ':' + o.status, activityTextStatus(o));
  refreshTableStatus(o.tableId); save(); persistOrderUpdate(o);
}
function renderOrders() {
  $$('[data-ofilter]').forEach(b => b.classList.toggle('active', b.dataset.ofilter === orderFilter));
  const list = state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(o => !orderFilter || o.status === orderFilter);
  $('#orders-list').innerHTML = list.length ? list.map(o => {
    const t = tableById(o.tableId);
    const next = { 'New': 'Preparing', 'Preparing': 'Served', 'Served': 'Paid' }[o.status];
    const wa = waCustomerLink(o);
    const unread = unreadMsgCount(o.number);
    return '<div class="order-row"><div class="order-meta"><span class="o-no">' + esc(o.number) + '</span> · ' + esc(t ? t.name : '') +
      ' · ' + esc(o.customerName) + (o.phone ? ' · ' + esc(o.phone) : '') + '<div class="o-items">' + o.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ') +
      (o.instructions ? '<br>Note: ' + esc(o.instructions) : '') + '</div></div>' +
      '<div><span class="status ' + o.status.toLowerCase() + '">' + o.status.toUpperCase() + '</span> <strong>' + fmt(orderItemsTotal(o)) + '</strong></div>' +
      '<div class="order-actions">' +
      (next ? '<button class="btn btn-sm btn-primary" data-advance="' + o.id + '">' + (next === 'Paid' ? 'Mark Paid' : '→ ' + next) + '</button>' : '') +
      '<button class="btn btn-sm" data-chat="' + o.id + '">Message' + (unread ? ' <span class="msg-badge">' + unread + '</span>' : '') + '</button>' +
      (wa ? '<a class="btn btn-sm" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
      (o.status === 'New' ? '<button class="btn btn-sm btn-danger" data-cancel="' + o.id + '">Cancel</button>' : '') +
      '</div></div>' +
      (openChatOrder === o.number ? chatThreadHtml(o.number) : '');
  }).join('') : '<p class="muted">No orders match this filter.</p>';
  $$('#orders-list [data-chat]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.chat); if (!o) return;
    toggleOrderChat(o.number);
  }));
  wireChatInputs($('#orders-list'));
  $$('#orders-list [data-advance]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.advance); if (!o) return;
    advanceOrder(o); renderAll();
  }));
  $$('#orders-list [data-cancel]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.cancel); if (!o) return;
    if (confirm('Cancel order ' + o.number + '?')) { o.status = 'Cancelled'; if (feedReady) logActivity('status', 'order-status:' + o.id + ':Cancelled', activityTextStatus(o)); refreshTableStatus(o.tableId); save(); persistOrderUpdate(o); renderAll(); }
  }));
}

/* ---------------- kitchen ---------------- */
/* Only New and Preparing orders, as big cards. One big button moves the
   order to the next stage, reusing the same advance logic as Orders. */
function renderKitchen() {
  const list = state.orders.filter(o => o.status === 'New' || o.status === 'Preparing')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  $('#kitchen-list').innerHTML = list.length ? list.map(o => {
    const t = tableById(o.tableId);
    const next = o.status === 'New' ? 'Preparing' : 'Served';
    return '<div class="card kitchen-card k-' + o.status.toLowerCase() + '"><div class="kitchen-head"><div><strong>' + esc(o.number) + '</strong> · ' + esc(t ? t.name : '') +
      ' · ' + esc(o.customerName) + '</div><span class="status ' + o.status.toLowerCase() + '">' + o.status.toUpperCase() + '</span></div>' +
      '<ul class="kitchen-items">' + o.items.map(i => '<li><strong>' + i.qty + '×</strong> ' + esc(i.name) + '</li>').join('') + '</ul>' +
      (o.instructions ? '<p class="muted">Note: ' + esc(o.instructions) + '</p>' : '') +
      '<button class="btn btn-primary btn-block kitchen-advance" data-kadvance="' + o.id + '">→ ' + next + '</button></div>';
  }).join('') : '<p class="muted">No orders in the kitchen right now.</p>';
  $$('#kitchen-list [data-kadvance]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.kadvance); if (!o) return;
    advanceOrder(o); renderAll();
  }));
}

/* ---------------- billing ---------------- */
let billTableId = '';
let billDiscount = { mode: 'percent', value: 0 };
let billExtra = 0;
let billPayMode = 'Cash';
let splitN = 0; // 0 = not splitting; 2–10 people when splitting

function renderBilling() {
  const sel = $('#bill-table');
  const occupied = state.tables.filter(t => t.status === 'Occupied');
  sel.innerHTML = '<option value="">— Select a table —</option>' + occupied.map(t =>
    '<option value="' + t.id + '">' + esc(t.name) + ' (' + openOrdersFor(t.id).length + ' order(s))</option>').join('');
  if (billTableId && occupied.some(t => t.id === billTableId)) sel.value = billTableId;
  else billTableId = '';
  renderBillArea();
}
function billLines(tableId) {
  const agg = {};
  openOrdersFor(tableId).forEach(o => o.items.forEach(it => {
    const k = it.id;
    if (!agg[k]) agg[k] = { id: it.id, name: it.name, price: it.price, qty: 0 };
    agg[k].qty += it.qty;
  }));
  return Object.values(agg);
}
function billTotals(tableId) {
  const sub = billLines(tableId).reduce((s, l) => s + l.price * l.qty, 0);
  const disc = billDiscount.mode === 'percent'
    ? Math.min(sub, Math.round(sub * (billDiscount.value || 0) / 100))
    : Math.min(sub, billDiscount.value || 0);
  const grand = Math.max(0, sub - disc + (billExtra || 0));
  return { sub, disc, extra: billExtra || 0, grand };
}
function renderBillArea() {
  const area = $('#bill-area');
  if (!billTableId) { area.innerHTML = '<p class="muted">Select an occupied table to see its bill.</p>'; return; }
  const t = tableById(billTableId);
  const lines = billLines(billTableId);
  const tot = billTotals(billTableId);
  const upi = upiLink(tot.grand);
  area.innerHTML =
    '<div class="card"><h3>Bill — ' + esc(t.name) + '</h3>' +
    (lines.length ? '<table class="bill-table"><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>' +
      lines.map(l => '<tr><td>' + esc(l.name) + '</td><td class="num">' + l.qty + '</td><td class="num">' + fmt(l.price) + '</td><td class="num">' + fmt(l.price * l.qty) + '</td></tr>').join('') +
      '</table>' : '<p class="muted">No items on this bill.</p>') +
    '<div class="form-grid">' +
      '<label>Discount <span style="display:flex;gap:6px"><select id="bd-mode" style="width:90px"><option value="percent"' + (billDiscount.mode === 'percent' ? ' selected' : '') + '>%</option><option value="amount"' + (billDiscount.mode === 'amount' ? ' selected' : '') + '>₹</option></select><input id="bd-value" type="number" min="0" step="1" value="' + (billDiscount.value || 0) + '"></span></label>' +
      '<label>Extra charges (₹) <input id="bd-extra" type="number" min="0" step="1" value="' + (billExtra || 0) + '"></label>' +
    '</div>' +
    '<table class="bill-table">' +
      '<tr><td>Subtotal</td><td class="num">' + fmt(tot.sub) + '</td></tr>' +
      '<tr><td>Discount</td><td class="num">− ' + fmt(tot.disc) + '</td></tr>' +
      '<tr><td>Extra charges</td><td class="num">+ ' + fmt(tot.extra) + '</td></tr>' +
      '<tr><td class="bill-total">Grand Total</td><td class="num bill-total">' + fmt(tot.grand) + '</td></tr>' +
    '</table>' +
    '<h3>Payment mode</h3><div class="pay-modes">' +
      ['Cash', 'UPI', 'Card'].map(m => '<label><input type="radio" name="paymode" value="' + m + '"' + (billPayMode === m ? ' checked' : '') + '> ' + m + '</label>').join('') +
    '</div>' +
    '<h3 style="margin-top:16px">Bill QR — scan to pay ' + fmt(tot.grand) + ' by UPI</h3>' +
    '<div class="qr-box"><div class="qr-img" id="bill-qr"></div><div class="muted">UPI ID: <code>' + esc(state.settings.upiId) + '</code><br>Pay to: ' + esc(state.settings.name) + '<br><small>Scan to pay the exact bill amount — the amount is fixed in this QR, the customer only confirms the payment.</small></div></div>' +
    '<h3 style="margin-top:16px">Split bill</h3>' +
    '<div class="split-row"><label style="max-width:140px">People <input id="split-n" type="number" min="2" max="10" value="' + (splitN || 2) + '"></label>' +
    '<button class="btn" id="btn-split">Split bill</button>' +
    (splitN ? '<button class="btn" id="btn-split-clear">Clear split</button>' : '') + '</div>' +
    (splitN ? '<p class="muted">Each person pays their share — the shares add up exactly to ' + fmt(tot.grand) + '. Settling still settles the whole table bill at once.</p>' +
      '<div id="split-shares">' + splitShares(tot.grand, splitN).map((s, i) =>
        '<div class="split-share"><div class="qr-img" id="split-qr-' + i + '"></div><div><strong>Person ' + (i + 1) + '</strong><br>' + fmt(s) + '<br><span class="muted">Scan to pay ' + fmt(s) + ' by UPI</span></div></div>').join('') + '</div>' : '') +
    '<div class="bill-actions">' +
      '<button class="btn" id="btn-bill-download">Download Bill</button>' +
      '<button class="btn" id="btn-bill-whatsapp">Send on WhatsApp</button>' +
      '<button class="btn btn-green" id="btn-bill-settle">Print &amp; Settle</button>' +
    '</div></div>';
  renderQR($('#bill-qr'), upi, 160);
  $('#btn-split').addEventListener('click', () => {
    const n = parseInt($('#split-n').value, 10);
    splitN = Math.max(2, Math.min(10, n || 0));
    renderBillArea();
  });
  const splitClear = $('#btn-split-clear');
  if (splitClear) splitClear.addEventListener('click', () => { splitN = 0; renderBillArea(); });
  if (splitN) splitShares(tot.grand, splitN).forEach((s, i) => renderQR($('#split-qr-' + i), upiLink(s), 120));
  $('#bd-mode').addEventListener('change', (e) => { billDiscount.mode = e.target.value; renderBillArea(); });
  $('#bd-value').addEventListener('input', (e) => { billDiscount.value = Math.max(0, Number(e.target.value) || 0); renderBillArea(); });
  $('#bd-extra').addEventListener('input', (e) => { billExtra = Math.max(0, Number(e.target.value) || 0); renderBillArea(); });
  $$('input[name="paymode"]').forEach(r => r.addEventListener('change', () => { billPayMode = r.value; }));
  $('#btn-bill-download').addEventListener('click', () => { printReceipt(buildReceiptHtml(billTableId, tot, 'COPY')); });
  $('#btn-bill-whatsapp').addEventListener('click', () => {
    const text = buildBillText(billTableId, tot);
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  });
  $('#btn-bill-settle').addEventListener('click', () => settleBill(billTableId, tot));
}
function buildBillText(tableId, tot) {
  const t = tableById(tableId);
  const lines = billLines(tableId).map(l => l.name + ' x' + l.qty + ' — ' + fmt(l.price * l.qty)).join('\n');
  return state.settings.name + '\n' + state.settings.address + '\n' + (t ? t.name : '') + '\n----------------\n' +
    lines + '\n----------------\nSubtotal: ' + fmt(tot.sub) + '\nDiscount: -' + fmt(tot.disc) +
    '\nExtra: +' + fmt(tot.extra) + '\nGrand Total: ' + fmt(tot.grand) + '\nPayment: ' + billPayMode +
    '\nThank you, visit again!';
}
function buildReceiptHtml(tableId, tot, copyLabel) {
  const t = tableById(tableId);
  const lines = billLines(tableId).map(l =>
    '<tr><td>' + esc(l.name) + ' x' + l.qty + '</td><td class="num">' + fmt(l.price * l.qty) + '</td></tr>').join('');
  return '<div class="receipt"><h2>' + esc(state.settings.name.toUpperCase()) + '</h2>' +
    '<div class="r-center">' + esc(state.settings.address) + '<br>' + esc(t ? t.name : '') + ' · ' + new Date().toLocaleString('en-IN') + '</div><hr>' +
    '<table>' + lines + '</table><hr>' +
    '<table><tr><td>Subtotal</td><td class="num">' + fmt(tot.sub) + '</td></tr>' +
    '<tr><td>Discount</td><td class="num">-' + fmt(tot.disc) + '</td></tr>' +
    '<tr><td>Extra charges</td><td class="num">' + fmt(tot.extra) + '</td></tr>' +
    '<tr><td><strong>Grand Total</strong></td><td class="num"><strong>' + fmt(tot.grand) + '</strong></td></tr></table>' +
    '<div class="r-center">Payment: ' + esc(billPayMode) + ' · ' + esc(copyLabel || '') + '</div>' +
    '<div class="r-qr" id="receipt-qr"></div>' +
    '<div class="r-center">Thank you, visit again!</div></div>';
}
function printReceipt(html) {
  const r = $('#receipt');
  r.innerHTML = html;
  const qrEl = $('#receipt-qr', r);
  if (qrEl) renderQR(qrEl, upiLink(billTotals(billTableId).grand), 120);
  document.body.classList.add('printing-receipt');
  window.print();
  setTimeout(() => document.body.classList.remove('printing-receipt'), 600);
}
function settleBill(tableId, tot) {
  const orders = openOrdersFor(tableId);
  if (!orders.length) { alert('Nothing to settle on this table.'); return; }
  printReceipt(buildReceiptHtml(tableId, tot, 'PAID'));
  orders.forEach(o => {
    o.status = 'Paid';
    o.finalTotal = o.finalTotal || 0;
    o.paymentMode = billPayMode;
    o.settledAt = new Date().toISOString();
  });
  // split the final total across the table's orders, proportional to their item totals
  const sub = orders.reduce((s, o) => s + orderItemsTotal(o), 0) || 1;
  orders.forEach(o => { o.finalTotal = Math.round(orderItemsTotal(o) / sub * tot.grand); });
  if (feedReady) logActivity('bill', 'bill:' + orders.map(o => o.id).join('+'), 'Bill settled · ' + (tableById(tableId) ? tableById(tableId).name : 'Table') + ' · ' + fmt(tot.grand) + ' (' + billPayMode + ')');
  refreshTableStatus(tableId);
  save();
  orders.forEach(o => persistOrderUpdate(o));
  billTableId = ''; billDiscount = { mode: 'percent', value: 0 }; billExtra = 0; splitN = 0;
  renderAll();
  alert('Bill settled. ' + (tableById(tableId) ? tableById(tableId).name : 'Table') + ' is now Available.');
}

/* ---------------- analytics ---------------- */
function renderAnalytics() {
  const paidToday = state.orders.filter(o => o.status === 'Paid' && o.settledAt && isToday(o.settledAt));
  const revenue = paidToday.reduce((s, o) => s + (o.finalTotal || 0), 0);
  const ordersToday = state.orders.filter(o => isToday(o.createdAt)).length;
  const avg = paidToday.length ? Math.round(revenue / paidToday.length) : 0;
  const occupied = state.tables.filter(t => t.status === 'Occupied').length;
  $('#analytics-stats').innerHTML =
    statCard("Today's Revenue", fmt(revenue)) +
    statCard('Orders Today', String(ordersToday)) +
    statCard('Average Bill', fmt(avg)) +
    statCard('Occupancy', occupied + ' / ' + state.tables.length + ' tables');
  renderHourlyChart();
  renderTopToday();

  const counts = {};
  state.orders.forEach(o => o.items.forEach(it => {
    if (!counts[it.id]) counts[it.id] = { name: it.name, qty: 0, revenue: 0 };
    counts[it.id].qty += it.qty; counts[it.id].revenue += it.price * it.qty;
  }));
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = top.length ? top[0].qty : 1;
  $('#top-items').innerHTML = top.length ? top.map(x =>
    '<div class="bar-row"><span class="bar-label">' + esc(x.name) + '</span><span class="bar"><i style="width:' + Math.round(x.qty / maxQty * 100) + '%"></i></span><span class="bar-val">' + x.qty + ' sold</span></div>'
  ).join('') : '<p class="muted">No sales yet.</p>';

  const perTable = {};
  state.orders.forEach(o => {
    if (!perTable[o.tableId]) perTable[o.tableId] = { n: 0, rev: 0 };
    perTable[o.tableId].n += 1;
    perTable[o.tableId].rev += (o.status === 'Paid' ? (o.finalTotal || 0) : orderItemsTotal(o));
  });
  const pt = Object.entries(perTable).map(([id, v]) => ({ name: tableById(id) ? tableById(id).name : id, ...v }))
    .sort((a, b) => b.n - a.n);
  const maxN = pt.length ? pt[0].n : 1;
  $('#per-table').innerHTML = pt.length ? pt.map(x =>
    '<div class="bar-row"><span class="bar-label">' + esc(x.name) + '</span><span class="bar"><i style="width:' + Math.round(x.n / maxN * 100) + '%"></i></span><span class="bar-val">' + x.n + ' orders</span></div>'
  ).join('') : '<p class="muted">No orders yet.</p>';

  const recent = paidToday.slice().sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt)).slice(0, 10);
  $('#recent-paid').innerHTML = recent.length ? recent.map(o => {
    const t = tableById(o.tableId);
    return '<div class="feed-item"><div><strong>' + esc(o.number) + '</strong> · ' + esc(t ? t.name : '') + ' · ' + esc(o.customerName) +
      '</div><div>' + esc(o.paymentMode || '') + ' · <strong>' + fmt(o.finalTotal || 0) + '</strong></div></div>';
  }).join('') : '<p class="muted">No paid orders today yet.</p>';
}

/* Hourly orders chart (today, real orders only) + top dishes today. */
function renderHourlyChart() {
  const el = $('#hourly-chart'); if (!el) return;
  const today = todaysOrders();
  if (!today.length) {
    el.innerHTML = '<p class="muted">No orders today yet — the chart will fill in as orders come in.</p>';
    return;
  }
  const hours = new Array(24).fill(0);
  today.forEach(o => { hours[new Date(o.createdAt).getHours()]++; });
  const max = Math.max.apply(null, hours.concat([1]));
  el.innerHTML = '<div class="hourly-chart">' + hours.map((c, h) =>
    '<div class="h-col" data-hour="' + h + '" data-count="' + c + '" title="' + h + ':00 — ' + c + ' order' + (c === 1 ? '' : 's') + '">' +
    (c ? '<span class="h-val">' + c + '</span>' : '') +
    '<div class="h-bar"><i style="height:' + Math.round(c / max * 100) + '%"></i></div>' +
    '<span class="h-label">' + ([0, 3, 6, 9, 12, 15, 18, 21].includes(h) ? h : '') + '</span></div>'
  ).join('') + '</div><p class="muted">Orders per hour, today · total ' + today.length + ' orders</p>';
}
function renderTopToday() {
  const el = $('#top-today'); if (!el) return;
  const today = todaysOrders();
  const counts = {};
  today.forEach(o => o.items.forEach(it => {
    if (!counts[it.id]) counts[it.id] = { name: it.name, qty: 0 };
    counts[it.id].qty += it.qty;
  }));
  const top = Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = top.length ? top[0].qty : 1;
  el.innerHTML = top.length ? top.map(x =>
    '<div class="bar-row"><span class="bar-label">' + esc(x.name) + '</span><span class="bar"><i style="width:' + Math.round(x.qty / maxQty * 100) + '%"></i></span><span class="bar-val">' + x.qty + ' sold</span></div>'
  ).join('') : '<p class="muted">No dishes sold today yet.</p>';
}

/* ---------------- owner reviews view ----------------
   All customer reviews, newest first, with a summary computed from real
   reviews only (average rating + total count). */
function renderReviews() {
  const list = (state.reviews || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sumEl = $('#reviews-summary');
  const listEl = $('#reviews-list');
  if (!sumEl || !listEl) return;
  if (!list.length) {
    sumEl.innerHTML = '<p class="muted">No reviews yet — reviews from customers will appear here after their bill is settled.</p>';
    listEl.innerHTML = '';
    return;
  }
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  sumEl.innerHTML = '<div class="stat-row"><div class="stat"><div class="stat-label">Average Rating</div><div class="stat-value">' + avg.toFixed(1) + ' ★</div></div>' +
    '<div class="stat"><div class="stat-label">Total Reviews</div><div class="stat-value">' + list.length + '</div></div></div>';
  listEl.innerHTML = list.map(r => {
    const t = tableById(r.tableId);
    return '<div class="card review-card"><div class="row-between"><div>' + starsHtml(r.rating) +
      ' <strong>' + esc(r.customerName || 'Customer') + '</strong></div>' +
      '<span class="muted">' + new Date(r.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
      (r.comment ? '<p class="review-comment">“' + esc(r.comment) + '”</p>' : '<p class="muted">No comment.</p>') +
      '<p class="muted">' + esc(t ? t.name : '') + ' · ' + esc(r.orderNumber) + '</p></div>';
  }).join('');
}

/* ---------------- QR stands ---------------- */
function renderQrStands() {
  $('#qr-stands').innerHTML = state.tables.map(t =>
    '<div class="qr-stand"><h3>' + esc(state.settings.name) + '</h3><div class="stand-rest">' + esc(state.settings.address) + '</div>' +
    '<div class="stand-qr" data-qr="' + t.id + '"></div>' +
    '<div><strong>' + esc(t.name) + '</strong></div>' +
    '<div class="stand-pin">Scan to see the menu · Table PIN <b>' + esc(t.pin) + '</b></div></div>'
  ).join('');
  $$('#qr-stands [data-qr]').forEach(el => renderQR(el, menuUrlFor(el.dataset.qr), 150));
}
function printStands() {
  const sp = $('#stands-print');
  sp.innerHTML = state.tables.map(t =>
    '<div class="stand-print"><h1>' + esc(state.settings.name) + '</h1><p>' + esc(state.settings.address) + '</p>' +
    '<div class="stand-qr" data-qr="' + t.id + '"></div>' +
    '<h2>' + esc(t.name) + '</h2><p>Scan to see the menu · Table PIN: <strong>' + esc(t.pin) + '</strong></p></div>'
  ).join('');
  $$('#stands-print [data-qr]').forEach(el => renderQR(el, menuUrlFor(el.dataset.qr), 200));
  document.body.classList.add('printing-stands');
  window.print();
  setTimeout(() => document.body.classList.remove('printing-stands'), 600);
}

/* ---------------- settings ---------------- */
function renderSettings() {
  $('#sf-name').value = state.settings.name;
  $('#sf-address').value = state.settings.address;
  $('#sf-upi').value = state.settings.upiId;
  $('#sf-currency').value = state.settings.currency;
}

/* ---------------- customer view (never asks for login) ---------------- */
let customerMode = false;
let customerTable = null;
let cart = {};
let custSearch = '';
let custCat = '';
let pinUnlocked = false; // set once the customer enters the correct Table PIN
let lastServiceNote = '';
const SERVICE_TYPES = ['Call Waiter', 'Water', 'Bill Please', 'Clean Table'];
const SERVICE_CONFIRM = {
  'Call Waiter': 'Waiter called — they will be right with you.',
  'Water': 'Water requested — the waiter will bring it.',
  'Bill Please': 'Bill requested — the waiter will bring your bill.',
  'Clean Table': 'Table cleaning requested.',
};

function customerTableFromUrl() {
  const n = new URLSearchParams(location.search).get('table');
  if (!n) return null;
  const t = state.tables.find(x => x.name.toLowerCase() === ('table ' + n).toLowerCase()) ||
    state.tables.find(x => x.id === 't' + n);
  return t || null;
}
function cartCount() { return Object.values(cart).reduce((s, q) => s + q, 0); }
function cartTotal() {
  return Object.entries(cart).reduce((s, [id, q]) => { const m = itemById(id); return s + (m ? m.price * q : 0); }, 0);
}
/* ---------------- live order tracking (customer) ----------------
   Timeline: Order placed → Preparing → Served → Bill settled.
   Times are real only: placed = createdAt, preparing = preparingAt,
   served = servedAt, settled = settledAt. A step with no known time shows
   no time — never an invented ETA. Updates arrive via Supabase Realtime
   (orders subscription) when online, and via the cross-tab storage-event
   path in offline demo mode; both call renderAll() → renderCustomer() →
   renderTracking(), so the page moves without a refresh. */
const TRACK_STEPS = [
  { key: 'New', label: 'Order placed' },
  { key: 'Preparing', label: 'Preparing' },
  { key: 'Served', label: 'Served' },
  { key: 'Paid', label: 'Bill settled' },
];
const TRACK_STATUS_TEXT = {
  New: 'received — the kitchen will start preparing it.',
  Preparing: 'is being prepared.',
  Served: 'has been served. Enjoy your meal!',
  Paid: 'is settled. Thank you, visit again!',
  Cancelled: 'was cancelled.',
};
function fmtTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return ''; }
}
function trackingTimes(o) { return [o.createdAt, o.preparingAt, o.servedAt, o.settledAt]; }
function renderTracking() {
  const el = $('#tracking-timeline');
  const cancelledEl = $('#tracking-cancelled');
  const line = $('#confirm-status-line');
  if (!el) return;
  const o = state.orders.find(x => x.number === lastOrderNumber);
  if (!o) { el.innerHTML = ''; el.hidden = true; if (cancelledEl) cancelledEl.hidden = true; renderReviewSection(); return; }
  if (line) {
    const st = $('#confirm-status-text');
    if (st) st.textContent = TRACK_STATUS_TEXT[o.status] || '';
  }
  if (o.status === 'Cancelled') {
    el.hidden = true; el.innerHTML = '';
    if (cancelledEl) cancelledEl.hidden = false;
    renderReviewSection();
    return;
  }
  if (cancelledEl) cancelledEl.hidden = true;
  el.hidden = false;
  const idx = TRACK_STEPS.findIndex(s => s.key === o.status);
  const times = trackingTimes(o);
  el.innerHTML = TRACK_STEPS.map((s, i) => {
    const done = o.status === 'Paid' || i < idx;
    const current = i === idx && o.status !== 'Paid';
    const stateCls = done ? 'done' : (current ? 'current' : 'upcoming');
    const mark = done ? '✓' : String(i + 1);
    const t = fmtTime(times[i]);
    return '<div class="track-step ' + stateCls + '">' +
      '<span class="track-dot" aria-hidden="true">' + mark + '</span>' +
      '<span class="track-body"><span class="track-label">' + s.label + '</span>' +
      (t ? '<span class="track-time">' + t + '</span>' : '') + '</span>' +
      (current ? '<span class="track-now">Now</span>' : '') + '</div>';
  }).join('');
  renderReviewSection();
}
/* Fill the confirmation page for an existing order and open its tracking
   view. `dupNote` is shown only when the customer was blocked as a
   duplicate (see placeOrder). */
function showTrackingFor(o, dupNote) {
  lastOrderNumber = o.number;
  const t = tableById(o.tableId);
  $('#confirm-order-no').textContent = o.number;
  $('#confirm-table').textContent = t ? t.name : '';
  $('#confirm-summary').textContent = o.items.map(i => i.name + ' ×' + i.qty).join(', ') + ' — Total ' + fmt(orderItemsTotal(o));
  const note = $('#confirm-duplicate-note');
  if (note) { if (dupNote) { note.textContent = dupNote; note.hidden = false; } else note.hidden = true; }
  const cs = $('#confirm-service');
  if (cs) { cs.innerHTML = serviceButtonsHtml(); wireServiceButtons(cs); }
  showCustPage('confirm');
  renderConfirmChat();
  renderTracking();
}
/* ---------------- duplicate customer prevention ----------------
   One name + one mobile = one active order. Normalised: name trimmed +
   lowercased, phone digits only, last 10 digits (+91 98765 43210 and
   9876543210 are the same number). Only open orders block (New /
   Preparing / Served); a Paid order never blocks, and an empty phone
   cannot be checked, so it never blocks either. */
function normCustomerName(name) { return String(name || '').trim().toLowerCase(); }
function normPhone10(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
function findOpenDuplicateOrder(name, phone) {
  const n = normCustomerName(name);
  const p = normPhone10(phone);
  if (!n || !p) return null;
  return state.orders.find(o =>
    (o.status === 'New' || o.status === 'Preparing' || o.status === 'Served') &&
    normCustomerName(o.customerName) === n && normPhone10(o.phone) === p) || null;
}
function renderCustomer() {
  if (!customerTable) return;
  $('#cust-rest-name').textContent = state.settings.name;
  $('#cust-rest-addr').textContent = state.settings.address;
  $('#cust-table-chip').textContent = customerTable.name;
  $('#cart-table-label').textContent = customerTable.name;
  const cats = categories();
  $('#cust-tabs').innerHTML = '<button class="chip' + (custCat === '' ? ' active' : '') + '" data-cat="">All</button>' +
    cats.map(c => '<button class="chip' + (custCat === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>').join('');
  $$('#cust-tabs .chip').forEach(b => b.addEventListener('click', () => { custCat = b.dataset.cat; renderCustomer(); }));
  const svc = $('#cust-service');
  if (svc) {
    if (pinUnlocked) {
      svc.hidden = false;
      svc.innerHTML = serviceButtonsHtml();
      wireServiceButtons(svc);
      if (lastServiceNote) { const note = $('.service-note', svc); if (note) { note.textContent = lastServiceNote; note.hidden = false; } }
    } else svc.hidden = true;
  }
  const q = custSearch.trim().toLowerCase();
  const items = state.menu.filter(m => m.available !== false && (!custCat || m.category === custCat) && (!q || m.name.toLowerCase().includes(q)));
  $('#cust-items').innerHTML = items.length ? items.map(m => {
    const qty = cart[m.id] || 0;
    return '<div class="cust-card"><div class="cust-photo">' + dishPhotoHtml(m, 'cust-photo-img', 'cust-photo') + '</div>' +
      '<div class="cust-info"><div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
      '<span class="ci-name">' + esc(m.name) + '</span>' + (m.special ? '<span class="special-tag">Chef\'s Special</span>' : '') + '</div>' +
      '<div class="ci-price">' + esc(m.category) + ' · ' + fmt(m.price) + '</div>' +
      '<div class="ci-attrs">' + spicyPillHtml(m) + tagsPillsHtml(m) + '</div></div>' +
      '<div class="cust-action">' + (qty === 0
        ? '<button class="add-btn" data-add="' + m.id + '">ADD</button>'
        : '<div class="stepper"><button data-dec="' + m.id + '" aria-label="Decrease">−</button><span class="qty">' + qty + '</span><button data-inc="' + m.id + '" aria-label="Increase">+</button></div>') +
      '</div></div>';
  }).join('') : '<p class="muted">No dishes match your search.</p>';
  $$('#cust-items [data-add]').forEach(b => b.addEventListener('click', () => { cart[b.dataset.add] = 1; renderCustomer(); }));
  $$('#cust-items [data-inc]').forEach(b => b.addEventListener('click', () => { cart[b.dataset.inc]++; renderCustomer(); }));
  $$('#cust-items [data-dec]').forEach(b => b.addEventListener('click', () => {
    cart[b.dataset.dec]--;
    if (cart[b.dataset.dec] <= 0) delete cart[b.dataset.dec];
    renderCustomer();
  }));
  const n = cartCount();
  $('#cust-cartbar').hidden = n === 0;
  $('#cartbar-text').textContent = n + ' item' + (n === 1 ? '' : 's') + ' · ' + fmt(cartTotal());
  renderCartPage();
  renderConfirmChat();
  renderTracking();
  /* Track Order entry point: an open order for this table gets a banner
     on the menu page that opens the same tracking view. */
  const banner = $('#cust-track-banner');
  if (banner) {
    const open = openOrdersFor(customerTable.id).slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (open) {
      banner.hidden = false;
      banner.innerHTML = '<button class="btn btn-primary btn-block track-btn" id="btn-track-order">Track Order — ' + esc(open.number) + ' · ' + esc(open.status) + '</button>';
      const btn = $('#btn-track-order');
      if (btn) btn.addEventListener('click', () => showTrackingFor(open));
    } else { banner.hidden = true; banner.innerHTML = ''; }
  }
}
function renderCartPage() {
  const entries = Object.entries(cart);
  $('#cart-items').innerHTML = entries.length ? entries.map(([id, qty]) => {
    const m = itemById(id); if (!m) return '';
    return '<div class="cust-item">' + dishPhotoHtml(m, 'cart-thumb') + '<div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
      '<span class="ci-name">' + esc(m.name) + '</span><div class="ci-price">' + fmt(m.price) + ' each</div></div>' +
      '<div class="stepper"><button data-cdec="' + id + '">−</button><span class="qty">' + qty + '</span><button data-cinc="' + id + '">+</button></div>' +
      '<strong>' + fmt(m.price * qty) + '</strong></div>';
  }).join('') : '<p class="muted">Your cart is empty.</p>';
  $$('#cart-items [data-cinc]').forEach(b => b.addEventListener('click', () => { cart[b.dataset.cinc]++; renderCustomer(); }));
  $$('#cart-items [data-cdec]').forEach(b => b.addEventListener('click', () => {
    cart[b.dataset.cdec]--;
    if (cart[b.dataset.cdec] <= 0) delete cart[b.dataset.cdec];
    renderCustomer();
  }));
  $('#cart-total').textContent = fmt(cartTotal());
}
function showCustPage(which) {
  $('#cust-menu-page').hidden = which !== 'menu';
  $('#cust-cart-page').hidden = which !== 'cart';
  $('#cust-confirm-page').hidden = which !== 'confirm';
  $('#cust-cartbar').hidden = which !== 'menu' || cartCount() === 0;
}
/* ---------------- service requests (customer → dashboard) ---------------- */
function serviceButtonsHtml() {
  return '<div class="service-title">Need something?</div><div class="service-btns">' +
    SERVICE_TYPES.map(t => '<button class="btn service-btn" data-service="' + t + '">' + t + '</button>').join('') +
    '</div><div class="service-note muted" hidden></div>';
}
function wireServiceButtons(root) {
  $$('[data-service]', root).forEach(b => b.addEventListener('click', () => requestService(b.dataset.service, root)));
}
function requestService(type, root) {
  if (!customerTable) return;
  const req = {
    id: online ? newUuid() : uid('r'), tableId: customerTable.id, type,
    status: 'New', createdAt: new Date().toISOString(), doneAt: null,
  };
  state.requests.push(req);
  if (feedReady) logActivity('request', 'req-new:' + req.id, activityTextRequest(req, false));
  save();
  // If the Supabase insert fails (table not created yet) the request simply
  // stays in state/localStorage, so the flow still works in demo mode.
  persistRequestInsert(req);
  lastServiceNote = SERVICE_CONFIRM[type] || 'Request sent.';
  const note = $('.service-note', root);
  if (note) { note.textContent = lastServiceNote; note.hidden = false; }
}
/* ---------------- in-app chat (owner ↔ customer) ---------------- */
/* One thread per order number. Messages travel via Supabase Realtime
   (qrdine_messages) when online, and via the cross-tab storage-event path
   in offline demo mode (the whole state, messages included, lives in
   localStorage). The WhatsApp button stays as well — this chat is in
   addition to it, not a replacement. */
let openChatOrder = null; // order number whose owner thread is open
let chatDrafts = {};       // order number -> draft text (kept across re-renders)
let lastOrderNumber = ''; // the customer's most recent order (confirm page chat)
function sendMessage(orderNumber, sender, text) {
  const t = (text || '').trim();
  if (!t || !orderNumber) return false;
  const o = state.orders.find(x => x.number === orderNumber);
  const m = {
    id: online ? newUuid() : uid('g'),
    orderNumber, tableId: o ? o.tableId : '', sender, text: t,
    createdAt: new Date().toISOString(),
  };
  if (!Array.isArray(state.messages)) state.messages = [];
  state.messages.push(m);
  save();
  persistMessageInsert(m);
  if (customerMode) renderCustomer(); else renderAll();
  return true;
}
function chatBubblesHtml(number) {
  const list = messagesFor(number);
  if (!list.length) return '<p class="chat-empty">No messages yet — say hello, messages arrive live.</p>';
  return list.map(m =>
    '<div class="chat-msg ' + m.sender + '">' + esc(m.text) +
    '<span class="chat-meta">' + (m.sender === 'owner' ? 'Restaurant' : 'Customer') + ' · ' +
    new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '</span></div>'
  ).join('');
}
function chatThreadHtml(number) {
  return '<div class="chat-thread" data-chat-thread="' + esc(number) + '">' +
    '<div class="chat-list">' + chatBubblesHtml(number) + '</div>' +
    '<div class="chat-input-row"><input data-chat-input="' + esc(number) + '" maxlength="300" placeholder="Type a message…">' +
    '<button class="btn btn-primary" data-chat-send="' + esc(number) + '">Send</button></div></div>';
}
/* Wire the inputs inside a freshly rendered container. Draft text is kept
   in chatDrafts so typing survives a re-render when a message arrives. */
function wireChatInputs(root) {
  if (!root) return;
  $$('[data-chat-input]', root).forEach(inp => {
    const num = inp.dataset.chatInput;
    if (chatDrafts[num] !== undefined) inp.value = chatDrafts[num];
    inp.addEventListener('input', () => { chatDrafts[num] = inp.value; });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(num); } });
  });
  $$('[data-chat-send]', root).forEach(b => b.addEventListener('click', () => sendChatMessage(b.dataset.chatSend)));
  $$('.chat-list', root).forEach(el => { el.scrollTop = el.scrollHeight; });
}
function sendChatMessage(number) {
  const thread = document.querySelector('[data-chat-thread="' + number + '"]');
  const inp = thread ? thread.querySelector('[data-chat-input]') : null;
  const text = inp ? inp.value : (chatDrafts[number] || '');
  if (!sendMessage(number, customerMode ? 'customer' : 'owner', text)) return;
  chatDrafts[number] = '';
  if (inp) inp.value = '';
}
/* Owner opens/closes a thread; opening marks the customer's messages read. */
function toggleOrderChat(number) {
  openChatOrder = openChatOrder === number ? null : number;
  if (openChatOrder) {
    if (!state.msgSeen) state.msgSeen = {};
    state.msgSeen[number] = new Date().toISOString();
    saveLocal();
  }
  renderAll();
}
/* Customer confirm page: only the message list re-renders (the input is
   static HTML, so typing is never wiped by an incoming reply). */
function renderConfirmChat() {
  const list = $('#confirm-chat-list');
  if (!list || !lastOrderNumber) return;
  const msgs = messagesFor(lastOrderNumber);
  list.innerHTML = msgs.length ? chatBubblesHtml(lastOrderNumber)
    : '<p class="chat-empty">No messages yet — the restaurant will reply here live.</p>';
  list.scrollTop = list.scrollHeight;
}
/* ---------------- customer reviews ----------------
   The review section lives on the confirmation page and appears only
   once the bill is settled (order status Paid — all 4 timeline steps
   done). One review per order: if a review already exists for the order
   number, the thank-you state shows instead of the form, even after a
   reload. Drafts (stars / name / comment) survive re-renders the same
   way chat drafts do. */
let reviewDrafts = {}; // order number -> { rating, name, comment }
function renderReviewSection() {
  const box = $('#review-section');
  if (!box) return;
  const o = state.orders.find(x => x.number === lastOrderNumber);
  if (!o || o.status !== 'Paid') { box.innerHTML = ''; return; }
  const existing = reviewFor(o.number);
  if (existing) {
    box.innerHTML = '<div class="card review-box review-thanks"><div class="review-thanks-tick">✓</div>' +
      '<h3>Thank you for your review!</h3>' +
      '<div class="review-stars-big">' + starsHtml(existing.rating) + '</div>' +
      (existing.comment ? '<p class="review-their-comment">“' + esc(existing.comment) + '”</p>' : '') +
      '<p class="muted">Your review helps us serve you better.</p></div>';
    return;
  }
  const draft = reviewDrafts[o.number] || {};
  const rating = draft.rating || 0;
  const name = draft.name !== undefined ? draft.name : o.customerName;
  const comment = draft.comment || '';
  let starBtns = '';
  for (let i = 1; i <= 5; i++) {
    starBtns += '<button type="button" class="star-btn' + (i <= rating ? ' on' : '') + '" data-star="' + i + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '">★</button>';
  }
  box.innerHTML = '<div class="card review-box">' +
    '<h3>How was your food?</h3>' +
    '<p class="muted">Your bill is settled — tell us how we did.</p>' +
    '<div class="star-row" id="review-stars">' + starBtns + '</div>' +
    '<div class="review-error" id="review-error" hidden>Please tap a star to rate.</div>' +
    '<label class="review-label">Your name <input id="review-name" maxlength="40" value="' + esc(name) + '"></label>' +
    '<label class="review-label">Comment (optional) <textarea id="review-comment" maxlength="300" rows="3" placeholder="Tell us what you liked…">' + esc(comment) + '</textarea></label>' +
    '<button class="btn btn-primary btn-block" id="btn-submit-review">Submit Review</button></div>';
  $$('#review-stars [data-star]', box).forEach(b => b.addEventListener('click', () => {
    const d = reviewDrafts[o.number] = reviewDrafts[o.number] || {};
    d.rating = Number(b.dataset.star);
    $$('#review-stars [data-star]', box).forEach(x => x.classList.toggle('on', Number(x.dataset.star) <= d.rating));
    const err = $('#review-error', box); if (err) err.hidden = true;
  }));
  const nameInp = $('#review-name', box);
  nameInp.addEventListener('input', () => { (reviewDrafts[o.number] = reviewDrafts[o.number] || {}).name = nameInp.value; });
  const cmtInp = $('#review-comment', box);
  cmtInp.addEventListener('input', () => { (reviewDrafts[o.number] = reviewDrafts[o.number] || {}).comment = cmtInp.value; });
  $('#btn-submit-review', box).addEventListener('click', () => submitReview(o));
}
function submitReview(o) {
  if (!o || o.status !== 'Paid') return;
  if (reviewFor(o.number)) { renderReviewSection(); return; } // one review per order
  const d = reviewDrafts[o.number] || {};
  const rating = Number(d.rating || 0);
  if (!rating || rating < 1 || rating > 5) {
    const err = $('#review-error'); if (err) err.hidden = false;
    return;
  }
  const name = (d.name !== undefined ? d.name : o.customerName).trim() || o.customerName;
  const comment = (d.comment || '').trim();
  const review = {
    id: online ? newUuid() : uid('v'),
    orderNumber: o.number, tableId: o.tableId, customerName: name,
    rating, comment, createdAt: new Date().toISOString(),
  };
  if (!Array.isArray(state.reviews)) state.reviews = [];
  state.reviews.push(review);
  delete reviewDrafts[o.number];
  save();
  persistReviewInsert(review);
  renderReviewSection();
}
function placeOrder() {
  const err = $('#order-error');
  const showErr = (msg) => { err.textContent = msg; err.hidden = false; };
  err.hidden = true;
  const name = $('#of-name').value.trim();
  const phone = $('#of-phone').value.trim();
  const notes = $('#of-notes').value.trim();
  const pin = $('#of-pin').value.trim();
  if (!name) return showErr('Please enter your name.');
  if (!cartCount()) return showErr('Your cart is empty. Add at least one dish.');
  if (!/^[0-9]{3}$/.test(pin)) return showErr('Enter the 3-digit Table PIN from your table stand.');
  if (pin !== customerTable.pin) return showErr('Wrong PIN. Ask your waiter for the correct 3-digit PIN for ' + customerTable.name + '.');
  pinUnlocked = true; // correct PIN entered: the table session is unlocked
  /* Duplicate check: one name + one mobile = one active order. A Paid
     order does not block; an empty phone cannot be checked. */
  const dup = findOpenDuplicateOrder(name, phone);
  if (dup) {
    cart = {};
    showTrackingFor(dup, 'This name and mobile already have an open order — showing your existing order ' + dup.number + ' (' + dup.status + ').');
    renderCustomer();
    return;
  }
  const items = Object.entries(cart).map(([id, qty]) => {
    const m = itemById(id);
    return { id, name: m.name, price: m.price, qty };
  });
  const order = {
    id: online ? newUuid() : uid('o'), number: 'ORD-' + (state.nextOrderNo++), tableId: customerTable.id,
    items, customerName: name, phone, instructions: notes,
    status: 'New', createdAt: new Date().toISOString(),
  };
  state.orders.push(order);
  if (feedReady) logActivity('order', 'order-new:' + order.id, activityTextOrder(order));
  refreshTableStatus(customerTable.id);
  save();
  persistOrderInsert(order);
  cart = {};
  showTrackingFor(order);
  renderCustomer();
}

/* ---------------- table picker modal ---------------- */
function openTablePickerFor(preselectId) {
  $('#picker-grid').innerHTML = state.tables.map(t =>
    '<button data-pick="' + t.id + '">' + esc(t.name) + '</button>').join('');
  $('#table-picker').hidden = false;
  $$('#picker-grid [data-pick]').forEach(b => b.addEventListener('click', () => {
    $('#table-picker').hidden = true;
    const n = b.dataset.pick.replace(/^t/, '');
    window.open(location.pathname + '?table=' + n, '_blank');
  }));
}

/* ---------------- init ---------------- */
function tickClock() {
  const el = $('#clock');
  if (el) el.textContent = new Date().toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function wireCustomerEvents() {
  $('#cust-search').addEventListener('input', (e) => { custSearch = e.target.value; renderCustomer(); });
  $('#btn-view-cart').addEventListener('click', () => showCustPage('cart'));
  $('#btn-back-menu').addEventListener('click', () => showCustPage('menu'));
  $('#order-form').addEventListener('submit', (e) => { e.preventDefault(); placeOrder(); });
  $('#btn-confirm-chat-send').addEventListener('click', () => {
    const inp = $('#confirm-chat-input');
    if (sendMessage(lastOrderNumber, 'customer', inp.value)) inp.value = '';
  });
  $('#confirm-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#btn-confirm-chat-send').click(); }
  });
  $('#btn-new-order').addEventListener('click', () => { cart = {}; renderCustomer(); showCustPage('menu'); });
  $('#btn-back-admin').addEventListener('click', () => { location.href = location.pathname; });
}
function wireAdminEvents() {
  const soundBtn = $('#btn-sound');
  const updateSoundBtn = () => {
    soundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  };
  updateSoundBtn();
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('qrdine-sound', soundOn ? 'on' : 'off'); } catch (e) {}
    updateSoundBtn();
    if (soundOn) { armSound(); playChime(); } // audible confirmation
  });
  // Arm audio on the owner's first click/tap (browsers block sound before
  // any user gesture).
  document.addEventListener('pointerdown', armSound, { once: true });
  $$('#main-nav button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#btn-customer-view').addEventListener('click', () => openTablePickerFor());
  $('#picker-close').addEventListener('click', () => { $('#table-picker').hidden = true; });
  $('#table-picker').addEventListener('click', (e) => { if (e.target.id === 'table-picker') $('#table-picker').hidden = true; });
  $('#menu-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#mf-name').value.trim();
    const price = Math.max(1, Math.round(Number($('#mf-price').value) || 0));
    const category = $('#mf-category').value || categories()[0] || 'Tandoor Se';
    const veg = $('#mf-veg').checked, special = $('#mf-special').checked;
    const image = $('#mf-image').value.trim();
    const spicy = $('#mf-spicy').value;
    const tags = $('#mf-tags').value.split(',').map(t => t.trim()).filter(Boolean).join(', ');
    if (!name || !price) return;
    if (editingMenuId) {
      const m = itemById(editingMenuId);
      Object.assign(m, { name, price, category, veg, special, image, spicy, tags });
      save(); persistMenu(m);
    } else {
      const m = { id: uid('m'), name, price, category, veg, special, available: true, image, spicy, tags };
      state.menu.push(m);
      save(); persistMenu(m);
    }
    resetMenuForm(); renderMenuAdmin();
  });
  $('#mf-cancel').addEventListener('click', resetMenuForm);
  $('#menu-filter').addEventListener('change', renderMenuAdmin);
  $('#table-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#tf-name').value.trim();
    const pin = $('#tf-pin').value.trim();
    const type = $('#tf-type').value;
    if (!name || !/^[0-9]{3}$/.test(pin)) { alert('Enter a name and a 3-digit PIN.'); return; }
    const t = { id: uid('t'), name, pin, type, status: 'Available' };
    state.tables.push(t);
    save(); persistTable(t); e.target.reset(); renderTablesAdmin();
  });
  $$('[data-ofilter]').forEach(b => b.addEventListener('click', () => { orderFilter = b.dataset.ofilter; renderOrders(); }));
  $('#bill-table').addEventListener('change', (e) => { billTableId = e.target.value; billDiscount = { mode: 'percent', value: 0 }; billExtra = 0; splitN = 0; renderBillArea(); });
  $('#btn-print-stands').addEventListener('click', printStands);
  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings.name = $('#sf-name').value.trim() || 'Restaurant';
    state.settings.address = $('#sf-address').value.trim();
    state.settings.upiId = $('#sf-upi').value.trim() || RESTAURANT_UPI;
    state.settings.currency = $('#sf-currency').value.trim() || '₹';
    save(); persistSettings(); renderAll(); alert('Settings saved.');
  });
  $('#btn-reset-demo').addEventListener('click', async () => {
    if (!confirm('Reset all demo data? Orders, menu edits and settings will be restored to the original demo.')) return;
    if (online) {
      await persistResetDemo();
      try { await loadFromSupabase(); } catch (e) { state = seedState(); }
      saveLocal(); renderAll();
    } else {
      localStorage.removeItem(LS_KEY);
      location.reload();
    }
  });
  $('#btn-sign-out').addEventListener('click', async () => {
    if (online && sb) { try { await sb.auth.signOut(); } catch (e) {} }
    ownerSession = null; offlineDemo = false;
    showLoginScreen();
  });
  tickClock(); setInterval(tickClock, 30000);
}
function wireLoginEvents() {
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('#login-error');
    errEl.hidden = true;
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const btn = $('#login-form button[type="submit"]');
    btn.disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      ownerSession = data.session;
      subscribeRealtime();
      showAdminShell();
      renderAll();
    } catch (err) {
      errEl.textContent = (err && err.message) ? err.message : 'Sign-in failed. Check your email and password.';
      errEl.hidden = false;
    } finally { btn.disabled = false; }
  });
  $('#btn-offline-demo').addEventListener('click', () => {
    offlineDemo = true;
    showAdminShell();
    renderAll();
  });
}
async function init() {
  customerTable = customerTableFromUrl();
  customerMode = !!customerTable;
  $('#loading').hidden = false;

  // 1. Load data: shared Supabase first, offline cache as fallback.
  const reached = await initSupabase();
  if (reached) {
    try { await loadFromSupabase(); subscribeRealtime(); }
    catch (e) {
      console.warn('QR Dine: shared data load failed — offline demo mode.', e && e.message ? e.message : e);
      online = false; sb = null;
      state = loadLocal(); deriveNextOrderNo();
    }
  } else {
    state = loadLocal(); deriveNextOrderNo();
  }
  feedReady = true; // from here on, new/changed rows are live activity
  $('#loading').hidden = true;

  // 2. Customer view: no login, ever.
  if (customerMode) {
    $('#admin-shell').hidden = true;
    $('#login-shell').hidden = true;
    $('#customer-shell').hidden = false;
    $('#offline-banner').hidden = online;
    if (!customerTable) {
      $('#customer-shell').innerHTML = '<div class="cust-body"><div class="card"><h2>Table not found</h2><p class="muted">This QR code does not match a table. Please scan the QR code on your table stand again, or ask your waiter for help.</p></div></div>';
    } else {
      renderCustomer();
      showCustPage('menu');
    }
    wireCustomerEvents();
    return;
  }

  // 3. Owner dashboard: login gate (Supabase Auth when online).
  wireLoginEvents();
  wireAdminEvents();
  if (online) {
    await checkAuth();
    if (sb) {
      sb.auth.onAuthStateChange((_event, session) => {
        ownerSession = session || null;
        if (!session && !offlineDemo && $('#login-shell').hidden) showLoginScreen();
      });
    }
    if (ownerSession) { subscribeRealtime(); showAdminShell(); renderAll(); }
    else showLoginScreen();
  } else {
    showLoginScreen();
  }
}
document.addEventListener('DOMContentLoaded', init);
