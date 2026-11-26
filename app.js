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

/* ---------------- seed data (offline cache + reset) ---------------- */
function seedState() {
  const menu = [
    { id: 'm1', name: 'Roti', price: 15, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm2', name: 'Butter Roti', price: 20, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm3', name: 'Plain Naan', price: 25, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm4', name: 'Butter Naan', price: 35, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm5', name: 'Garlic Naan', price: 40, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm6', name: 'Tandoori Roti', price: 18, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm7', name: 'Missi Roti', price: 30, veg: true, category: 'Tandoor Se', special: false, available: true },
    { id: 'm8', name: 'Tandoori Chicken (Half)', price: 260, veg: false, category: 'Tandoor Se', special: false, available: true },
    { id: 'm9', name: 'Crispy Baby Corn Chilli', price: 180, veg: true, category: 'Chinese Special', special: true, available: true },
    { id: 'm10', name: 'Crispy Chilli Mushroom', price: 200, veg: true, category: 'Chinese Special', special: false, available: true },
    { id: 'm11', name: 'Veg Hakka Noodles', price: 160, veg: true, category: 'Chinese Special', special: false, available: true },
    { id: 'm12', name: 'Chilli Paneer', price: 190, veg: true, category: 'Chinese Special', special: false, available: true },
    { id: 'm13', name: 'Veg Fried Rice', price: 150, veg: true, category: 'Chinese Special', special: false, available: true },
    { id: 'm14', name: 'Schezwan Noodles', price: 170, veg: true, category: 'Chinese Special', special: false, available: true },
    { id: 'm15', name: 'Chicken Manchurian', price: 220, veg: false, category: 'Chinese Special', special: false, available: true },
    { id: 'm16', name: 'Chilli Chicken', price: 240, veg: false, category: 'Chinese Special', special: false, available: true },
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
    s.menu.forEach(m => { if (m.available === undefined) m.available = true; });
    return s;
  } catch (e) { return seedState(); }
}
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }

let state = loadLocal();
/* save() keeps the offline cache fresh; Supabase writes happen via persist*(). */
function save() { saveLocal(); }

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
function deriveNextOrderNo() {
  let max = 1000;
  state.orders.forEach(o => {
    const m = /ORD-(\d+)/.exec(o.number || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  state.nextOrderNo = max + 1;
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
  };
}
function rowToMenu(r) {
  return { id: r.id, name: r.name, price: Number(r.price), veg: !!r.veg, category: r.category, special: !!r.special, available: r.available !== false };
}
function menuToRow(m) {
  return { id: m.id, name: m.name, price: m.price, veg: !!m.veg, category: m.category, special: !!m.special, available: m.available !== false };
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
function settingsToRow() {
  return { id: 1, restaurant_name: state.settings.name, address: state.settings.address, upi_id: state.settings.upiId, currency: state.settings.currency };
}

/* ---------------- Supabase data layer ---------------- */
let sb = null;          // Supabase client (null when offline)
let online = false;     // true once the shared database answered
let liveSubscribed = false;
let ownerSession = null;
let offlineDemo = false; // owner chose "Continue in offline demo"

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
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
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
  const [sRes, mRes, tRes, oRes] = await Promise.all([
    sb.from('qrdine_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('qrdine_menu').select('*').order('id'),
    sb.from('qrdine_tables').select('*').order('id'),
    sb.from('qrdine_orders').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  if (sRes.error) throw sRes.error;
  if (mRes.error) throw mRes.error;
  if (tRes.error) throw tRes.error;
  if (oRes.error) throw oRes.error;
  if (sRes.data) state.settings = rowToSettings(sRes.data);
  if (Array.isArray(mRes.data) && mRes.data.length) state.menu = mRes.data.map(rowToMenu);
  if (Array.isArray(tRes.data) && tRes.data.length) state.tables = tRes.data.map(rowToTable);
  state.orders = (oRes.data || []).map(rowToOrder);
  deriveNextOrderNo();
  saveLocal();
}

/* Realtime: every device re-renders live, no refresh. Handlers merge by id,
   so our own writes echoing back never duplicate rows. */
function applyOrderRow(r) {
  const o = rowToOrder(r);
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
function subscribeRealtime() {
  if (!sb || liveSubscribed) return;
  liveSubscribed = true;
  sb.channel('qrdine-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'qrdine_orders' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        state.orders = state.orders.filter(x => x.id !== payload.old.id);
        renderAll();
      } else if (payload.new) { applyOrderRow(payload.new); saveLocal(); renderAll(); }
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
function persistOrderInsert(o) { return sbSafe(() => sb.from('qrdine_orders').insert(orderToRow(o))); }
function persistOrderUpdate(o) {
  return sbSafe(() => sb.from('qrdine_orders').update(orderToRow(o)).eq('id', o.id));
}
function persistTable(t) { return sbSafe(() => sb.from('qrdine_tables').upsert(tableToRow(t))); }
function persistTableDelete(id) { return sbSafe(() => sb.from('qrdine_tables').delete().eq('id', id)); }
function persistMenu(m) { return sbSafe(() => sb.from('qrdine_menu').upsert(menuToRow(m))); }
function persistMenuDelete(id) { return sbSafe(() => sb.from('qrdine_menu').delete().eq('id', id)); }
function persistSettings() { return sbSafe(() => sb.from('qrdine_settings').upsert(settingsToRow())); }
async function persistResetDemo() {
  if (!online || !sb) return;
  const seed = seedState();
  await sbSafe(() => sb.from('qrdine_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
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
  if (online && live) {
    dot.style.background = 'var(--green)';
    label.textContent = 'Live · Shared DB';
  } else if (online) {
    dot.style.background = 'var(--amber)';
    label.textContent = 'Shared DB · connecting…';
  } else {
    dot.style.background = 'var(--amber)';
    label.textContent = 'Offline demo';
  }
}

/* ---------------- navigation ---------------- */
const VIEW_TITLES = { dashboard: 'Dashboard', menu: 'Menu Management', tables: 'Tables', orders: 'Orders', billing: 'Billing', analytics: 'Analytics', qrcodes: 'QR Codes', settings: 'Settings' };
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
     orders: renderOrders, billing: renderBilling, analytics: renderAnalytics,
     qrcodes: renderQrStands, settings: renderSettings }[name] || (() => {}))();
}
function renderAll() {
  $('#side-rest-name').textContent = state.settings.name;
  $('#side-rest-addr').textContent = state.settings.address;
  const newCount = state.orders.filter(o => o.status === 'New').length;
  const badge = $('#orders-badge');
  badge.hidden = newCount === 0; badge.textContent = newCount;
  renderView(currentView);
  if (customerMode) renderCustomer();
}
window.addEventListener('storage', (e) => {
  // Same-browser tabs only matter in offline mode; online mode uses Realtime.
  if (!online && e.key === LS_KEY) { state = loadLocal(); renderAll(); }
});

/* ---------------- dashboard ---------------- */
function renderDashboard() {
  const occupied = state.tables.filter(t => t.status === 'Occupied').length;
  const newOrders = state.orders.filter(o => o.status === 'New');
  const revenueToday = state.orders.filter(o => o.status === 'Paid' && o.settledAt && isToday(o.settledAt))
    .reduce((s, o) => s + (o.finalTotal || 0), 0);
  $('#dash-stats').innerHTML =
    statCard('Tables Occupied', occupied + ' / ' + state.tables.length) +
    statCard('New Orders', String(newOrders.length)) +
    statCard("Today's Revenue", fmt(revenueToday)) +
    statCard('Total Orders', String(state.orders.length));

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
    return '<div class="feed-item"><div><strong>' + esc(o.number) + '</strong> · ' + esc(t ? t.name : '') +
      ' · ' + esc(o.customerName) + ' · ' + o.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ') +
      '</div><div><span class="status ' + o.status.toLowerCase() + '">' + o.status.toUpperCase() + '</span> <strong>' + fmt(orderItemsTotal(o)) + '</strong></div></div>';
  }).join('') : '<p class="muted">No orders yet. Open the customer view and place a test order.</p>';
}
function statCard(label, value) {
  return '<div class="stat"><div class="stat-label">' + esc(label) + '</div><div class="stat-value">' + esc(value) + '</div></div>';
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
    '<div class="menu-row"><div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
    '<span class="m-name">' + esc(m.name) + '</span>' + (m.special ? '<span class="special-tag">Chef\'s Special</span>' : '') +
    '<div class="m-sub">' + esc(m.category) + ' · ' + fmt(m.price) + '</div></div>' +
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
function renderOrders() {
  $$('[data-ofilter]').forEach(b => b.classList.toggle('active', b.dataset.ofilter === orderFilter));
  const list = state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter(o => !orderFilter || o.status === orderFilter);
  $('#orders-list').innerHTML = list.length ? list.map(o => {
    const t = tableById(o.tableId);
    const next = { 'New': 'Preparing', 'Preparing': 'Served', 'Served': 'Paid' }[o.status];
    return '<div class="order-row"><div class="order-meta"><span class="o-no">' + esc(o.number) + '</span> · ' + esc(t ? t.name : '') +
      ' · ' + esc(o.customerName) + '<div class="o-items">' + o.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ') +
      (o.instructions ? '<br>Note: ' + esc(o.instructions) : '') + '</div></div>' +
      '<div><span class="status ' + o.status.toLowerCase() + '">' + o.status.toUpperCase() + '</span> <strong>' + fmt(orderItemsTotal(o)) + '</strong></div>' +
      '<div class="order-actions">' +
      (next ? '<button class="btn btn-sm btn-primary" data-advance="' + o.id + '">' + (next === 'Paid' ? 'Mark Paid' : '→ ' + next) + '</button>' : '') +
      (o.status === 'New' ? '<button class="btn btn-sm btn-danger" data-cancel="' + o.id + '">Cancel</button>' : '') +
      '</div></div>';
  }).join('') : '<p class="muted">No orders match this filter.</p>';
  $$('#orders-list [data-advance]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.advance); if (!o) return;
    o.status = { 'New': 'Preparing', 'Preparing': 'Served', 'Served': 'Paid' }[o.status];
    if (o.status === 'Paid') { o.finalTotal = orderItemsTotal(o); o.settledAt = new Date().toISOString(); o.paymentMode = o.paymentMode || 'Cash'; }
    refreshTableStatus(o.tableId); save(); persistOrderUpdate(o); renderAll();
  }));
  $$('#orders-list [data-cancel]').forEach(b => b.addEventListener('click', () => {
    const o = state.orders.find(x => x.id === b.dataset.cancel); if (!o) return;
    if (confirm('Cancel order ' + o.number + '?')) { o.status = 'Cancelled'; refreshTableStatus(o.tableId); save(); persistOrderUpdate(o); renderAll(); }
  }));
}

/* ---------------- billing ---------------- */
let billTableId = '';
let billDiscount = { mode: 'percent', value: 0 };
let billExtra = 0;
let billPayMode = 'Cash';

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
    '<div class="bill-actions">' +
      '<button class="btn" id="btn-bill-download">Download Bill</button>' +
      '<button class="btn" id="btn-bill-whatsapp">Send on WhatsApp</button>' +
      '<button class="btn btn-primary" id="btn-bill-settle">Print &amp; Settle</button>' +
    '</div></div>';
  renderQR($('#bill-qr'), upi, 160);
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
  refreshTableStatus(tableId);
  save();
  orders.forEach(o => persistOrderUpdate(o));
  billTableId = ''; billDiscount = { mode: 'percent', value: 0 }; billExtra = 0;
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
  const q = custSearch.trim().toLowerCase();
  const items = state.menu.filter(m => m.available !== false && (!custCat || m.category === custCat) && (!q || m.name.toLowerCase().includes(q)));
  $('#cust-items').innerHTML = items.length ? items.map(m => {
    const qty = cart[m.id] || 0;
    return '<div class="cust-item"><div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
      '<span class="ci-name">' + esc(m.name) + '</span>' + (m.special ? '<span class="special-tag">Chef\'s Special</span>' : '') +
      '<div class="ci-price">' + esc(m.category) + ' · ' + fmt(m.price) + '</div></div>' +
      (qty === 0
        ? '<button class="add-btn" data-add="' + m.id + '">ADD</button>'
        : '<div class="stepper"><button data-dec="' + m.id + '" aria-label="Decrease">−</button><span class="qty">' + qty + '</span><button data-inc="' + m.id + '" aria-label="Increase">+</button></div>') +
      '</div>';
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
}
function renderCartPage() {
  const entries = Object.entries(cart);
  $('#cart-items').innerHTML = entries.length ? entries.map(([id, qty]) => {
    const m = itemById(id); if (!m) return '';
    return '<div class="cust-item"><div><span class="veg-mark' + (m.veg ? '' : ' nonveg') + '"></span>' +
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
  refreshTableStatus(customerTable.id);
  save();
  persistOrderInsert(order);
  cart = {};
  $('#confirm-order-no').textContent = order.number;
  $('#confirm-table').textContent = customerTable.name;
  $('#confirm-summary').textContent = items.map(i => i.name + ' ×' + i.qty).join(', ') + ' — Total ' + fmt(orderItemsTotal(order));
  showCustPage('confirm');
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
  $('#btn-new-order').addEventListener('click', () => { cart = {}; renderCustomer(); showCustPage('menu'); });
  $('#btn-back-admin').addEventListener('click', () => { location.href = location.pathname; });
}
function wireAdminEvents() {
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
    if (!name || !price) return;
    if (editingMenuId) {
      const m = itemById(editingMenuId);
      Object.assign(m, { name, price, category, veg, special });
      save(); persistMenu(m);
    } else {
      const m = { id: uid('m'), name, price, category, veg, special, available: true };
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
  $('#bill-table').addEventListener('change', (e) => { billTableId = e.target.value; billDiscount = { mode: 'percent', value: 0 }; billExtra = 0; renderBillArea(); });
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
