import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;

/* ── Compress photo before storing ─── */
export function compressPhoto(dataUrl) {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.onload = () => {
        const MAX = 500;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (_) { resolve(dataUrl); }
  });
}

/* ── Items ─────────────────────────── */
export async function getItems(storeId) {
  const { data, error } = await supabase
    .from('items')
    .select('data')
    .eq('store_id', storeId)
    .single();
  if (error || !data) return [];
  return Array.isArray(data.data) ? data.data : [];
}

export async function setItems(storeId, items) {
  // Compress any new photos
  const ready = await Promise.all(items.map(async item => {
    if (item.photo && item.photo.startsWith('data:image')) {
      return { ...item, photo: await compressPhoto(item.photo) };
    }
    return item;
  }));
  const { error } = await supabase
    .from('items')
    .upsert({ store_id: storeId, data: ready, updated_at: new Date().toISOString() },
             { onConflict: 'store_id' });
  return !error;
}

/* ── Sales ─────────────────────────── */
export async function getSales(storeId) {
  const { data, error } = await supabase
    .from('sales')
    .select('data')
    .eq('store_id', storeId)
    .single();
  if (error || !data) return [];
  return Array.isArray(data.data) ? data.data : [];
}

export async function setSales(storeId, sales) {
  const { error } = await supabase
    .from('sales')
    .upsert({ store_id: storeId, data: sales, updated_at: new Date().toISOString() },
             { onConflict: 'store_id' });
  return !error;
}

/* ── Admin: get all stores data ────── */
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
