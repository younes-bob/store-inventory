export const ADMIN_PASS = 'ADMIN2024';
export const LOW_STOCK  = 5;

// ── Add / remove stores here ──────────────────
// Each store needs a unique id, name, and code.
// Staff log in with the CODE.
export const STORES = [
  { id: 's1', name: 'Main Branch',    code: 'MAIN01' },
  { id: 's2', name: 'Downtown Store', code: 'DOWN02' },
  { id: 's3', name: 'Mall Kiosk',     code: 'MALL03' },
];
// ─────────────────────────────────────────────

export const PALETTE = [
  { name:'White',    hex:'#f5f5f0' }, { name:'Cream',    hex:'#fef3c7' },
  { name:'Beige',    hex:'#e8d5b7' }, { name:'Yellow',   hex:'#fbbf24' },
  { name:'Orange',   hex:'#f97316' }, { name:'Rust',     hex:'#c2410c' },
  { name:'Red',      hex:'#dc2626' }, { name:'Pink',     hex:'#ec4899' },
  { name:'Rose',     hex:'#fb7185' }, { name:'Purple',   hex:'#9333ea' },
  { name:'Lavender', hex:'#a78bfa' }, { name:'Indigo',   hex:'#4338ca' },
  { name:'Navy',     hex:'#1e3a8a' }, { name:'Blue',     hex:'#3b82f6' },
  { name:'Sky',      hex:'#38bdf8' }, { name:'Teal',     hex:'#0d9488' },
  { name:'Green',    hex:'#16a34a' }, { name:'Olive',    hex:'#65803d' },
  { name:'Khaki',    hex:'#c4b070' }, { name:'Camel',    hex:'#c4995a' },
  { name:'Brown',    hex:'#92400e' }, { name:'Grey',     hex:'#9ca3af' },
  { name:'Charcoal', hex:'#374151' }, { name:'Black',    hex:'#111827' },
  { name:'Silver',   hex:'#cbd5e1' }, { name:'Gold',     hex:'#d4a017' },
  { name:'Denim',    hex:'#5b7fa6' }, { name:'Coral',    hex:'#ff6b6b' },
  { name:'Mint',     hex:'#6ee7b7' }, { name:'Lilac',    hex:'#c084fc' },
];

export const SIZES = [
  'XS','S','M','L','XL','XXL',
  '28','30','32','34','36','38',
  '6','7','8','9','10','11',
];

export const CATEGORIES = ['Tops','Bottoms','Dresses','Outerwear','Shoes','Accessories'];
