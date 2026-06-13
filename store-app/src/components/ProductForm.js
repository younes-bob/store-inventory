import { useState } from 'react';
import { Modal, PhotoBox, VariantBuilder } from './ui';
import { CATEGORIES } from '../config';
import { sanitize, clamp, uid } from '../utils';

export default function ProductForm({ initial, onSubmit, onClose, title, submitLabel }) {
  const [name,  setName]  = useState(initial.name     || '');
  const [price, setPrice] = useState(initial.price    || '');
  const [cat,   setCat]   = useState(initial.category || CATEGORIES[0]);
  const [photo, setPhoto] = useState(initial.photo    || null);
  const [rows,  setRows]  = useState(() => {
    const map = {};
    (initial.variants || []).forEach(v => {
      if (!map[v.color]) map[v.color] = { color:v.color, hex:v.hex, sizes:[] };
      map[v.color].sizes.push({ size:v.size, stock:v.stock });
    });
    return Object.values(map);
  });
  const [err, setErr] = useState('');

  function submit() {
    const n = sanitize(name);
    const p = Number(price);
    if (!n)          { setErr('Product name is required.');  return; }
    if (!price || p < 0) { setErr('Enter a valid price.');  return; }
    const variants = rows.flatMap(r =>
      r.sizes.filter(s => s.size).map(s => ({
        color:r.color, hex:r.hex, size:s.size, stock:clamp(s.stock,0,9999)
      }))
    );
    onSubmit({ ...initial, name:n, price:p, category:cat, photo, variants });
    onClose();
  }

  return (
    <Modal onClose={onClose} width={620}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#111827' }}>{title}</h2>
        <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:18, color:'#6b7280' }}>×</button>
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:20, alignItems:'flex-start' }}>
        <PhotoBox photo={photo} onPhoto={setPhoto}/>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Product Name *</label>
            <input value={name} onChange={e=>{ setName(e.target.value); setErr(''); }}
              placeholder="e.g. Summer Dress" maxLength={200}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:10, border:`1.5px solid ${err&&!name?'#fca5a5':'#e5e7eb'}`, fontSize:14, outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Price (DA) *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e=>{ setPrice(e.target.value); setErr(''); }}
                placeholder="0.00"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:14, outline:'none' }}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Category</label>
              <select value={cat} onChange={e=>setCat(e.target.value)}
                style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:14, outline:'none', background:'#fff' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
      {err && <p style={{ color:'#dc2626', fontSize:13, fontWeight:600, margin:'0 0 12px', padding:'8px 12px', background:'#fef2f2', borderRadius:8 }}>{err}</p>}
      <div style={{ borderTop:'1px solid #f3f4f6', paddingTop:20, marginBottom:16 }}>
        <p style={{ fontSize:13, fontWeight:800, color:'#4338ca', margin:'0 0 14px' }}>🎨 Colors & Sizes</p>
        <VariantBuilder rows={rows} setRows={setRows}/>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        <button onClick={submit} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:'pointer' }}>{submitLabel}</button>
        <button onClick={onClose} style={{ padding:'12px 20px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#6b7280' }}>Cancel</button>
      </div>
    </Modal>
  );
}
