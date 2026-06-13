import { LOW_STOCK } from './config';

export const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
export const fmt   = n  => '$' + Number(n).toFixed(2);
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
  const header = ['Date','Product','Color','Size','Qty','Unit Price','Original Price','Discount %','Total','Note'];
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
