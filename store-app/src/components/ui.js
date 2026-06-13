import { useState, useEffect, useRef } from 'react';
import { PALETTE, SIZES } from '../config';
import { isLight, clamp } from '../utils';

export function Dot({ hex, size = 14, selected = false }) {
  return <span style={{ width:size, height:size, borderRadius:'50%', background:hex, flexShrink:0, display:'inline-block', border:selected?'3px solid #6366f1':isLight(hex)?'1.5px solid #ccc':'1.5px solid rgba(0,0,0,0.15)', boxShadow:selected?'0 0 0 2px #e0e7ff':'none', transform:selected?'scale(1.25)':'scale(1)', transition:'all .12s' }}/>;
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:9999, display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding:'12px 22px', borderRadius:24, fontWeight:700, fontSize:13, whiteSpace:'nowrap', background:t.type==='error'?'#7f1d1d':t.type==='warn'?'#78350f':'#14532d', color:'#fff', boxShadow:'0 8px 32px rgba(0,0,0,.3)', animation:'slideUp .2s ease' }}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

export function Spinner({ label = '' }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', flexDirection:'column', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.2)', borderTopColor:'#8b5cf6', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {label && <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, fontWeight:600, margin:0 }}>{label}</p>}
    </div>
  );
}

export function Modal({ onClose, children, width = 520 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, backdropFilter:'blur(8px)' }}/>
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:201, background:'#fff', borderRadius:24, width:`min(${width}px,95vw)`, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 40px 100px rgba(0,0,0,.4)', padding:'28px 28px 32px' }}>
        {children}
      </div>
    </>
  );
}

export function PhotoBox({ photo, onPhoto, t }) {
  const cameraId  = useRef('cam' + Date.now());
  const galleryId = useRef('gal' + (Date.now()+1));
  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => onPhoto(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  }
  return (
    <div style={{ flexShrink:0 }}>
      {photo && (
        <div style={{ width:90, height:90, borderRadius:14, overflow:'hidden', marginBottom:8, border:'2px solid #e5e7eb', position:'relative' }}>
          <img src={photo} alt="product" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        </div>
      )}
      <div style={{ display:'flex', gap:6, width:90 }}>
        <label htmlFor={cameraId.current} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 4px', borderRadius:10, border:'2px dashed #c7d2fe', cursor:'pointer', background:'#eef2ff', fontSize:9, color:'#6366f1', fontWeight:700, textAlign:'center', gap:2 }}>
          <span style={{ fontSize:18 }}>📷</span>{t?.camera||'Camera'}
        </label>
        <input id={cameraId.current} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile}/>
        <label htmlFor={galleryId.current} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 4px', borderRadius:10, border:'2px dashed #c7d2fe', cursor:'pointer', background:'#eef2ff', fontSize:9, color:'#6366f1', fontWeight:700, textAlign:'center', gap:2 }}>
          <span style={{ fontSize:18 }}>🖼️</span>{t?.gallery||'Gallery'}
        </label>
        <input id={galleryId.current} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
      </div>
      {photo && <button type="button" onClick={()=>onPhoto(null)} style={{ display:'block', width:90, marginTop:5, background:'none', border:'none', cursor:'pointer', fontSize:10, color:'#dc2626', fontWeight:600, textAlign:'center' }}>{t?.removePhoto||'Remove'}</button>}
    </div>
  );
}

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
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', cursor:'pointer', fontSize:13, color:chosen?'#111':'#9ca3af', minWidth:160 }}>
        {chosen?<><Dot hex={chosen.hex}/><span style={{ fontWeight:600 }}>{chosen.name}</span></>:<span>— pick a color —</span>}
        <span style={{ marginLeft:'auto', color:'#9ca3af', fontSize:11 }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:60, background:'#fff', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,.18)', border:'1px solid #f3f4f6', padding:14, width:268 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
            {PALETTE.map(c => <button key={c.name} type="button" title={c.name} onClick={()=>{onSelect(c.name,c.hex);setOpen(false);}} style={{ width:32, height:32, borderRadius:'50%', background:c.hex, cursor:'pointer', padding:0, border:c.name===selected?'3px solid #6366f1':isLight(c.hex)?'1.5px solid #d1d5db':'1.5px solid rgba(0,0,0,.1)', boxShadow:c.name===selected?'0 0 0 3px #e0e7ff':'none', transform:c.name===selected?'scale(1.2)':'scale(1)', transition:'all .12s' }}/>)}
          </div>
          {chosen && <p style={{ margin:'10px 0 0', fontSize:12, color:'#6b7280', textAlign:'center', fontWeight:600 }}>✓ {chosen.name}</p>}
        </div>
      )}
    </div>
  );
}

export function VariantBuilder({ rows, setRows, t }) {
  const [pName, setPName] = useState('');
  const [pHex,  setPHex]  = useState('');
  function addColor() {
    if (!pName || rows.find(r => r.color === pName)) return;
    setRows([...rows, { color:pName, hex:pHex, sizes:[{ size:'', stock:0 }] }]);
    setPName(''); setPHex('');
  }
  const removeColor = ci => setRows(rows.filter((_,i) => i !== ci));
  const addSize     = ci => setRows(rows.map((r,i) => i!==ci?r:{...r,sizes:[...r.sizes,{size:'',stock:0}]}));
  const removeSize  = (ci,si) => setRows(rows.map((r,i) => i!==ci?r:{...r,sizes:r.sizes.filter((_,j)=>j!==si)}));
  const upd = (ci,si,k,v) => setRows(rows.map((r,i) => i!==ci?r:{...r,sizes:r.sizes.map((s,j)=>j!==si?s:{...s,[k]:k==='stock'?clamp(Number(v),0,9999):v})}));
  return (
    <div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap', marginBottom:16, padding:14, background:'#f8faff', borderRadius:12, border:'1px solid #e0e7ff' }}>
        <ColorPicker selected={pName} onSelect={(n,h)=>{setPName(n);setPHex(h);}} label={t?.pickColor||'Pick a color'}/>
        <button type="button" onClick={addColor} disabled={!pName} style={{ padding:'9px 18px', borderRadius:10, border:'none', fontWeight:700, fontSize:13, cursor:pName?'pointer':'not-allowed', background:pName?'#6366f1':'#e5e7eb', color:pName?'#fff':'#aaa' }}>{t?.addColor||'Add Color'}</button>
      </div>
      {rows.length===0 && <p style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:'10px 0' }}>Pick a color above to start →</p>}
      {rows.map((row,ci) => (
        <div key={row.color+ci} style={{ background:'#fff', borderRadius:12, border:'1.5px solid #e5e7eb', marginBottom:10, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f9fafb', borderBottom:'1px solid #f3f4f6' }}>
            <Dot hex={row.hex} size={20}/><span style={{ fontWeight:700, fontSize:14, color:'#1f2937' }}>{row.color}</span>
            <button type="button" onClick={()=>removeColor(ci)} style={{ marginLeft:'auto', background:'none', border:'1.5px solid #fca5a5', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, color:'#dc2626', fontWeight:700 }}>{t?.remove||'Remove'}</button>
          </div>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 34px', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5 }}>{t?.size||'Size'}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:.5 }}>{t?.qty||'Qty'}</span>
              <span/>
            </div>
            {row.sizes.map((s,si) => (
              <div key={si} style={{ display:'grid', gridTemplateColumns:'1fr 90px 34px', gap:8, marginBottom:8, alignItems:'center' }}>
                <select value={s.size} onChange={e=>upd(ci,si,'size',e.target.value)} style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none' }}>
                  <option value="">— size —</option>{SIZES.map(sz=><option key={sz}>{sz}</option>)}
                </select>
                <input type="number" min="0" max="9999" value={s.stock} onChange={e=>upd(ci,si,'stock',e.target.value)} style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:13, textAlign:'center', outline:'none' }}/>
                <button type="button" onClick={()=>removeSize(ci,si)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', fontSize:20, lineHeight:1, padding:0 }}>×</button>
              </div>
            ))}
            <button type="button" onClick={()=>addSize(ci)} style={{ width:'100%', marginTop:4, padding:'7px', background:'#f5f3ff', border:'1.5px dashed #a5b4fc', borderRadius:9, cursor:'pointer', color:'#6366f1', fontSize:12, fontWeight:700 }}>{t?.addSize||'+ Add Size'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
