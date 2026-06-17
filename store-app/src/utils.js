import { LOW_STOCK } from './config';

export const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
export const fmt   = n  => Number(n).toLocaleString('fr-DZ') + ' DA';
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const sanitize = s => String(s).trim().slice(0, 200);

export function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
}

export const isToday  = ts => new Date(ts).toDateString() === new Date().toDateString();
export const isLight  = hex => ['#f5f5f0','#fef3c7','#e8d5b7','#fbbf24','#cbd5e1','#6ee7b7','#c4b070'].includes(hex);

export function stockBadge(n) {
  if (n === 0)          return { label:'Out of stock', bg:'#fef2f2', fg:'#dc2626', dot:'#dc2626' };
  if (n <= LOW_STOCK)   return { label:`Low · ${n}`,   bg:'#fffbeb', fg:'#b45309', dot:'#f59e0b' };
  return                       { label:`${n} in stock`, bg:'#f0fdf4', fg:'#15803d', dot:'#22c55e' };
}

export function exportCSV(sales, storeName) {
  const header = ['Date','Product','Color','Size','Qty','Unit Price','Original Price','Discount %','Total (DA)','Note'];
  const rows = [...sales].sort((a,b) => b.ts - a.ts).map(s => [
    fmtDate(s.ts), `"${s.itemName}"`, s.color, s.size, s.qty,
    s.salePrice.toFixed(2), s.originalPrice.toFixed(2),
    s.salePrice < s.originalPrice ? Math.round((1 - s.salePrice/s.originalPrice)*100)+'%' : '0%',
    s.total.toFixed(2), `"${s.note||''}"`
  ]);
  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${storeName}-sales-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}
/* ── Fuzzy search ─────────────────────────────── */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}

// Returns the best (lowest) edit-distance score between query and any
// substring-window of `text` of similar length — lets "drss" match "Dress"
// even inside a longer product name like "Summer Dress".
function fuzzyScore(query, text) {
  query = query.toLowerCase().trim();
  text  = text.toLowerCase();
  if (!query) return Infinity;
  if (text.includes(query)) return 0; // exact substring = best possible score
  const words = text.split(/\s+/);
  let best = Infinity;
  for (const w of words) {
    const d = levenshtein(query, w);
    if (d < best) best = d;
  }
  // also compare against full text in case query spans multiple words
  best = Math.min(best, levenshtein(query, text));
  return best;
}

// Returns up to `limit` items sorted by closeness to query.
// Tolerance scales with query length so short queries aren't too lenient.
export function fuzzySuggest(items, query, limit = 6) {
  const q = query.trim();
  if (!q) return [];
  const maxDist = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;
  return items
    .map(item => ({ item, score: fuzzyScore(q, item.name) }))
    .filter(r => r.score <= maxDist)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(r => r.item);
}
