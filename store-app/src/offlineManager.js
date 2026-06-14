/**
 * offlineManager.js
 *
 * Provides a localStorage-backed cache + pending-write queue so the app
 * works fully offline and syncs automatically when connectivity returns.
 *
 * Keys used in localStorage:
 *   items_<storeId>          – last known items array
 *   sales_<storeId>          – last known sales array
 *   pending_items_<storeId>  – items waiting to be saved to Supabase
 *   pending_sales_<storeId>  – sales waiting to be saved to Supabase
 */

const PREFIX = 'store_';

function key(type, storeId) {
  return `${PREFIX}${type}_${storeId}`;
}

/* ── Cache read/write ─────────────────────────────── */
export function readCache(type, storeId) {
  try {
    const raw = localStorage.getItem(key(type, storeId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function writeCache(type, storeId, data) {
  try {
    localStorage.setItem(key(type, storeId), JSON.stringify(data));
  } catch (_) {}
}

/* ── Pending queue ────────────────────────────────── */
export function readPending(type, storeId) {
  try {
    const raw = localStorage.getItem(key('pending_' + type, storeId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function writePending(type, storeId, data) {
  try {
    localStorage.setItem(key('pending_' + type, storeId), JSON.stringify(data));
  } catch (_) {}
}

export function clearPending(type, storeId) {
  try {
    localStorage.removeItem(key('pending_' + type, storeId));
  } catch (_) {}
}

export function hasPending(storeId) {
  return (
    localStorage.getItem(key('pending_items', storeId)) !== null ||
    localStorage.getItem(key('pending_sales', storeId)) !== null
  );
}

/* ── Network status ───────────────────────────────── */
export function isOnline() {
  return navigator.onLine;
}

export function onNetworkChange(cb) {
  window.addEventListener('online',  () => cb(true));
  window.addEventListener('offline', () => cb(false));
  return () => {
    window.removeEventListener('online',  cb);
    window.removeEventListener('offline', cb);
  };
}
