import { createClient } from '@supabase/supabase-js';
import {
  readCache, writeCache,
  readPending, writePending, clearPending,
  isOnline,
} from './offlineManager';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;

/* ── Photo compression ──────────────────────────── */
export function compressPhoto(dataUrl) {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        const MAX = 500;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (_) { resolve(dataUrl); }
  });
}

/* ── Items ──────────────────────────────────────── */
export async function getItems(storeId) {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('items').select('data').eq('store_id', storeId).single();
      if (!error && data) {
        const items = Array.isArray(data.data) ? data.data : [];
        writeCache('items', storeId, items);
        return items;
      }
    } catch (_) {}
  }
  const cached  = readCache('items', storeId) || [];
  const pending = readPending('items', storeId);
  return pending !== null ? pending : cached;
}

export async function setItems(storeId, items) {
  const ready = await Promise.all(items.map(async item => {
    if (item.photo && item.photo.startsWith('data:image')) {
      return { ...item, photo: await compressPhoto(item.photo) };
    }
    return item;
  }));
  writeCache('items', storeId, ready);
  if (!isOnline()) { writePending('items', storeId, ready); return true; }
  try {
    const { error } = await supabase.from('items')
      .upsert({ store_id: storeId, data: ready, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
    if (error) { writePending('items', storeId, ready); return false; }
    clearPending('items', storeId);
    return true;
  } catch (_) { writePending('items', storeId, ready); return false; }
}

/* ── Sales ──────────────────────────────────────── */
export async function getSales(storeId) {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('sales').select('data').eq('store_id', storeId).single();
      if (!error && data) {
        const sales = Array.isArray(data.data) ? data.data : [];
        writeCache('sales', storeId, sales);
        return sales;
      }
    } catch (_) {}
  }
  const cached  = readCache('sales', storeId) || [];
  const pending = readPending('sales', storeId);
  return pending !== null ? pending : cached;
}

export async function setSales(storeId, sales) {
  writeCache('sales', storeId, sales);
  if (!isOnline()) { writePending('sales', storeId, sales); return true; }
  try {
    const { error } = await supabase.from('sales')
      .upsert({ store_id: storeId, data: sales, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
    if (error) { writePending('sales', storeId, sales); return false; }
    clearPending('sales', storeId);
    return true;
  } catch (_) { writePending('sales', storeId, sales); return false; }
}

/* ── Sync pending ───────────────────────────────── */
export async function syncPending(storeId) {
  let synced = false;
  const pendingItems = readPending('items', storeId);
  if (pendingItems !== null) {
    try {
      const { error } = await supabase.from('items')
        .upsert({ store_id: storeId, data: pendingItems, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
      if (!error) { clearPending('items', storeId); synced = true; }
    } catch (_) {}
  }
  const pendingSales = readPending('sales', storeId);
  if (pendingSales !== null) {
    try {
      const { error } = await supabase.from('sales')
        .upsert({ store_id: storeId, data: pendingSales, updated_at: new Date().toISOString() }, { onConflict: 'store_id' });
      if (!error) { clearPending('sales', storeId); synced = true; }
    } catch (_) {}
  }
  return synced;
}

/* ── Admin: all stores ──────────────────────────── */
export async function getAllStoresData(storeIds) {
  const [itemsRes, salesRes] = await Promise.all([
    supabase.from('items').select('store_id, data').in('store_id', storeIds),
    supabase.from('sales').select('store_id, data').in('store_id', storeIds),
  ]);
  const result = {};
  storeIds.forEach(id => { result[id] = { items: [], sales: [] }; });
  (itemsRes.data || []).forEach(r => { if (result[r.store_id]) result[r.store_id].items = r.data || []; });
  (salesRes.data || []).forEach(r => { if (result[r.store_id]) result[r.store_id].sales = r.data || []; });
  return result;
}

/* ── Subscriptions (per store) ──────────────────── */
export async function getSubscription(storeId) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single();
    if (error || !data) return { store_id: storeId, plan: 'free', status: 'active', expires_at: null };
    return data;
  } catch (_) {
    return { store_id: storeId, plan: 'free', status: 'active', expires_at: null };
  }
}

export async function getAllSubscriptions() {
  try {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error || !data) return [];
    return data;
  } catch (_) { return []; }
}

export async function activateSubscription(storeId, plan, months, note = '') {
  const now = new Date();
  const expiresAt = plan === 'free' ? null :
    new Date(now.setMonth(now.getMonth() + months)).toISOString();
  const { error } = await supabase.from('subscriptions').upsert({
    store_id: storeId,
    plan,
    status: 'active',
    activated_at: new Date().toISOString(),
    expires_at: expiresAt,
    months_paid: months,
    note,
    payment_method: 'manual',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id' });
  return !error;
}

export async function revokeSubscription(storeId) {
  const { error } = await supabase.from('subscriptions').upsert({
    store_id: storeId,
    plan: 'free',
    status: 'active',
    expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id' });
  return !error;
}

export function isSubscriptionActive(sub) {
  if (!sub || sub.plan === 'free') return true;
  if (!sub.expires_at) return false;
  return new Date(sub.expires_at) > new Date();
}
/* ════════════════════════════════════════════════════════
   AUTH + DYNAMIC STORES
   Append this whole block to the end of your existing
   store-app/src/supabase.js (the exports above are unchanged).
   ════════════════════════════════════════════════════════ */

/* ── Magic link auth ────────────────────────────── */
export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/owner-dashboard',
    },
  });
  return !error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

/* ── Dynamic stores (owned by a signed-in user) ──── */
function genStoreCode() {
  // 6-char uppercase code, avoiding ambiguous chars (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function getMyStores(userId) {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function createStore(userId, name) {
  let code = genStoreCode();
  // Retry on the rare code collision (unique constraint)
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('stores')
      .insert({ owner_id: userId, name: name.trim(), code })
      .select()
      .single();
    if (!error) return data;
    if (error.code === '23505') { code = genStoreCode(); continue; } // unique violation, retry
    return null;
  }
  return null;
}

export async function deleteStore(storeId, userId) {
  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .eq('owner_id', userId);
  return !error;
}

// Looks up a store by its access code, checking BOTH the dynamic `stores`
// table (via the public RPC, so it works for anonymous/logged-out staff
// at the storefront login screen) and the hardcoded STORES array.
export async function findStoreByCode(code, hardcodedStores) {
  const upper = code.trim().toUpperCase();
  const hardcoded = hardcodedStores.find(s => s.code === upper);
  if (hardcoded) return hardcoded;
  try {
    const { data, error } = await supabase.rpc('find_store_by_code', { p_code: upper });
    if (!error && data && data.length > 0) return data[0];
  } catch (_) {}
  return null;
}
