import { useState, useEffect, useRef } from 'react';
import { PALETTE, SIZES } from '../config';
import { isLight, clamp } from '../utils';

/* ── Dot ───────────────────────────── */
export function Dot({ hex, size = 14, selected = false }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: hex,
      flexShrink: 0, display: 'inline-block',
      border: selected ? '3px solid #6366f1' : isLight(hex) ? '1.5px solid #ccc' : '1.5px solid rgba(0,0,0,0.15)',
      boxShadow: selected ? '0 0 0 2px #e0e7ff' : 'none',
      transform: selected ? 'scale(1.25)' : 'scale(1)', transition: 'all .12s',
    }}/>
  );
}

/* ── Toast container ───────────────── */
export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, maxWidth:320 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding:'12px 18px', borderRadius:12, fontWeight:700, fontSize:13,
          background: t.type==='error' ? '#fee2e2' : t.type==='warn' ? '#fef3c7' : '#dcfce7',
          color:       t.type==='error' ? '#dc2626' : t.type==='warn' ? '#92400e' : '#15803d',
          boxShadow:'0 4px 20px rgba(0,0,0,.15)', animation:'slideIn .2s ease',
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ── Spinner ───────────────────────── */
export function Spinner({ label = '' }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f6fa', flexDirection:'column', gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin .8s linear infinite' }}/>
      {label && <p style={{ color:'#6b7280', fontSize:14, fontWeight:600, margin:0 }}>{label}</p>}
    </div>
  );
}

/* ── Modal ─────────────────────────── */
export function Modal({ onClose, children, width = 520 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(17,24,39,.5)', zIndex:200, backdropFilter:'blur(2px)' }}/>
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201,
        background:'#fff', borderRadius:22, width:`min(${width}px,95vw)`, maxHeight:'92vh', overflowY:'auto',
        boxShadow:'0 32px 80px rgba(0,0,0,.25)', padding:'28px 28px 32px',
      }}>
        {children}
      </div>
    </>
  );
}

/* ── PhotoBox ──────────────────────── */
export function PhotoBox({ photo, onPhoto }) {
  const inputId = useRef('pb' + Date.now());
  function onChange(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => onPhoto(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  }
  return (
    <div style={{ flexShrink:0 }}>
      <label htmlFor={inputId.current} style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        width:90, height:90, borderRadius:14, border:photo ? 'none' : '2px dashed #c7d2fe',
        cursor:'pointer', background:photo ? '#111' : '#eef2ff', overflow:'hidden', position:'relative',
      }}>
        {photo
          ? <img src={photo} alt="product" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <><span style={{ fontSize:26 }}>📷</span><span style={{ fontSize:9, color:'#818cf8', marginTop:3, textAlign:'center' }}>Tap to upload</span></>
        }
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .2s' }}
          onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>
          <span style={{ color:'#fff', fontSize:18 }}>✏️</span>
        </div>
      </label>
      <input id={inputId.current} type="file" accept="image/*" style={{ display:'none' }} onChange={onChange}/>
      {photo && <button type="button" onClick={()=>onPhoto(null)} style={{ display:'block', width:'100%', marginTop:4, background:'none', border:'none', cursor:'pointer', fontSize:11, color:'#dc2626', fontWeight:600 }}>Remove</button>}
    </div>
  );
}

/* ── ColorPicker ───────────────────── */
export function ColorPicker({ selected, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const chosen = PALETTE.find(c => c.name === selected);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative', zIndex:10 }}>
      {label && <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', marginBottom:5, textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>}
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:8, padding:'9px 13px', borderRadius:10,
        border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13,
        color:chosen?'#111':'#9ca3af', minWidth:160,
      }}>
        {chosen ? <><Dot hex={chosen.hex}/><span style={{ fontWeight:600 }}>{chosen.name}</span></> : <span>— pick a color —</span>}
        <span style={{ marginLeft:'auto', color:'#9ca3af', fontSize:11 }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:60, background:'#fff', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,.18)', border:'1px solid #f3f4f6', padding:14, width:268 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
            {PALETTE.map(c => (
              <button key={c.name} type="button" title={c.name} onClick={()=>{ onSelect(c.name, c.hex); setOpen(false); }}
                style={{ width:32, height:32, borderRadius:'50%', background:c.hex, cursor:'pointer', padding:0,
                  border:c.name===selected?'3px solid #6366f1':isLight(c.hex)?'1.5px solid #d1d5db':'1.5px solid rgba(0,0,0,.1)',
                  boxShadow:c.name===selected?'0 0 0 3px #e0e7ff':'none',
                  transform:c.name===selected?'scale(1.2)':'scale(1)', transition:'all .12s' }}/>
            ))}
          </div>
          {chosen && <p style={{ margin:'10px 0 0', fontSize:12, color:'#6b7280', textAlign:'center', fontWeight:600 }}>✓ {chosen.name}</p>}
        </div>
      )}
    </div>
  );
}

/* ── VariantBuilder ────────────────── */
export function VariantBuilder({ rows, setRows }) {
  const [pName, setPName] = useState('');
  const [pHex,  setPHex]  = useState('');
  function addColor() {
    if (!pName || rows.find(r => r.color === pName)) return;
    setRows([...rows, { color:pName, hex:pHex, sizes:[{ size:'', stock:0 }] }]);
    setPName(''); setPHex('');
  }
  const removeColor = ci => setRows(rows.filter((_,i) => i !== ci));
  const addSize     = ci => setRows(rows.map((r,i) => i!==ci ? r : { ...r, sizes:[...r.sizes,{ size:'', stock:0 }] }));
  const removeSize  = (ci,si) => setRows(rows.map((r,i) => i!==ci ? r : { ...r, sizes:r.sizes.filter((_,j)=>j!==si) }));
  const upd = (ci,si,k,v) => setRows(rows.map((r,i) => i!==ci ? r : {
    ...r, sizes: r.sizes.map((s,j) => j!==si ? s : { ...s, [k]: k==='stock' ? clamp(Number(v),0,9999) : v })
  }));
  return (
    <div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap', marginBottom:16, padding:14, background:'#f8faff', borderRadius:12, border:'1px solid #e0e7ff' }}>
        <ColorPicker selected={pName} onSelect={(n,h)=>{ setPName(n); setPHex(h); }} label="Pick a color"/>
        <button type="button" onClick={addColor} disabled={!pName}
          style={{ padding:'9px 18px', borderRadius:10, border:'none', fontWeight:700, fontSize:13, cursor:pName?'pointer':'not-allowed', background:pName?'#6366f1':'#e5e7eb', color:pName?'#fff':'#aaa' }}>
          Add Color
        </button>
      </div>
      {rows.length === 0 && <p style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:'10px 0' }}>Pick a color above to start →</p>}
      {rows.map((row, ci) => (
        <div key={row.color+ci} style={{ background:'#fff', borderRadius:12, border:'1.5px solid #e5e7eb', marginBottom:10, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
            <Dot hex={row.hex} size={20}/>
            <span style={{ fontWeight:700, fontSize:14, color:'#1f2937' }}>{row.color}</span>
            <button type="button" onClick={()=>removeColor(ci)} style={{ marginLeft:'auto', background:'none', border:'1.5px solid #fca5a5', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, color:'#dc2626', fontWeight:700 }}>Remove</button>
          </div>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 34px', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5 }}>Size</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5 }}>Qty</span>
              <span/>
            </div>
            {row.sizes.map((s, si) => (
              <div key={si} style={{ display:'grid', gridTemplateColumns:'1fr 90px 34px', gap:8, marginBottom:8, alignItems:'center' }}>
                <select value={s.size} onChange={e=>upd(ci,si,'size',e.target.value)} style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none' }}>
                  <option value="">— size —</option>
                  {SIZES.map(sz => <option key={sz}>{sz}</option>)}
                </select>
                <input type="number" min="0" max="9999" value={s.stock} onChange={e=>upd(ci,si,'stock',e.target.value)}
                  style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13, textAlign:'center', outline:'none' }}/>
                <button type="button" onClick={()=>removeSize(ci,si)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:20, lineHeight:1, padding:0 }}>×</button>
              </div>
            ))}
            <button type="button" onClick={()=>addSize(ci)} style={{ width:'100%', marginTop:4, padding:'7px', background:'#f5f3ff', border:'1.5px dashed #a5b4fc', borderRadius:9, cursor:'pointer', color:'#6366f1', fontSize:12, fontWeight:700 }}>+ Add Size</button>
          </div>
        </div>
      ))}
    </div>
  );
}
