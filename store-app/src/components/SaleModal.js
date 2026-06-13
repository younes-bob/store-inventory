import { useState } from 'react';
import { Modal, Dot } from './ui';
import { fmt, clamp, sanitize, stockBadge } from '../utils';

export default function SaleModal({ item, onSell, onClose }) {
  const variants = item.variants || [];
  const firstWithStock = variants.find(v => v.stock > 0) || variants[0] || null;
  const colors = [...new Map(variants.map(v => [v.color, v.hex])).entries()];

  const [selC,      setSelC]      = useState(firstWithStock?.color || '');
  const [selS,      setSelS]      = useState(firstWithStock?.size  || '');
  const [qty,       setQty]       = useState(1);
  const [salePrice, setSalePrice] = useState(String(item.price));
  const [note,      setNote]      = useState('');
  const [msg,       setMsg]       = useState({ text:'', ok:true });

  const sizesForColor = variants.filter(v => v.color === selC);
  const variant       = variants.find(v => v.color === selC && v.size === selS);
  const salePriceNum  = parseFloat(salePrice) || 0;
  const discountPct   = salePriceNum < item.price ? Math.round((1 - salePriceNum/item.price)*100) : 0;
  const total         = salePriceNum * qty;

  function changeColor(c) {
    setSelC(c);
    const best = variants.find(v => v.color===c && v.stock>0) || variants.find(v => v.color===c);
    setSelS(best?.size || '');
    setQty(1);
  }

  function sell() {
    if (!variant)             { setMsg({ text:'Select a color and size.', ok:false }); return; }
    if (qty < 1)              { setMsg({ text:'Qty must be at least 1.',  ok:false }); return; }
    if (qty > variant.stock)  { setMsg({ text:`Only ${variant.stock} in stock.`, ok:false }); return; }
    if (salePriceNum < 0)     { setMsg({ text:'Price cannot be negative.', ok:false }); return; }
    onSell({ color:selC, size:selS, qty:Number(qty), salePrice:salePriceNum, originalPrice:item.price, note:sanitize(note), total });
    setMsg({ text:'✓ Sale recorded!', ok:true });
    setTimeout(onClose, 900);
  }

  if (variants.length === 0) return (
    <Modal onClose={onClose} width={380}>
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
        <p style={{ fontWeight:700, color:'#b45309' }}>No variants. Edit the product first to add colors and sizes.</p>
        <button onClick={onClose} style={{ marginTop:16, padding:'10px 24px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:10, cursor:'pointer', fontWeight:600 }}>Close</button>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose} width={460}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:900 }}>🛍️ Record a Sale</h2>
        <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:18, color:'#6b7280' }}>×</button>
      </div>
      {/* Product row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#f8faff', borderRadius:12, marginBottom:20, border:'1px solid #e0e7ff' }}>
        <div style={{ width:46, height:46, borderRadius:10, overflow:'hidden', border:'1px solid #e5e7eb', flexShrink:0, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {item.photo ? <img src={item.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:22 }}>👕</span>}
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{item.name}</div>
          <div style={{ color:'#9ca3af', fontSize:13 }}>Original: <span style={{ fontWeight:700, color:'#4338ca' }}>{fmt(item.price)}</span></div>
        </div>
      </div>
      {/* Color */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Color</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {colors.map(([n,h]) => (
            <button key={n} type="button" onClick={()=>changeColor(n)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:10, border:selC===n?'2px solid #4f46e5':'1.5px solid #e5e7eb', background:selC===n?'#eef2ff':'#fff', cursor:'pointer', fontWeight:selC===n?700:500, fontSize:13 }}>
              <Dot hex={h} selected={selC===n}/>{n}
            </button>
          ))}
        </div>
      </div>
      {/* Size */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Size</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {sizesForColor.map(v => {
            const sb = stockBadge(v.stock);
            return (
              <button key={v.size} type="button" onClick={()=>{ if(v.stock>0){ setSelS(v.size); setQty(1); } }} disabled={v.stock===0}
                style={{ padding:'8px 14px', borderRadius:10, border:selS===v.size?'2px solid #4f46e5':'1.5px solid #e5e7eb', background:selS===v.size?'#eef2ff':v.stock===0?'#f9fafb':'#fff', cursor:v.stock===0?'not-allowed':'pointer', opacity:v.stock===0?.4:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:v.stock===0?'#9ca3af':'#111' }}>{v.size}</div>
                <div style={{ fontSize:11, color:sb.fg, fontWeight:600 }}>{v.stock===0?'Out':v.stock+' left'}</div>
              </button>
            );
          })}
        </div>
      </div>
      {/* Qty */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Quantity Sold</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button type="button" onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:36, height:36, borderRadius:9, border:'1.5px solid #e5e7eb', background:'#f9fafb', cursor:'pointer', fontSize:18, fontWeight:700 }}>−</button>
          <input type="number" min="1" max={variant?.stock||1} value={qty} onChange={e=>setQty(clamp(Number(e.target.value),1,variant?.stock||1))}
            style={{ width:64, padding:'8px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:17, fontWeight:800, textAlign:'center', outline:'none' }}/>
          <button type="button" onClick={()=>setQty(q=>Math.min(variant?.stock||1,q+1))} style={{ width:36, height:36, borderRadius:9, border:'1.5px solid #e5e7eb', background:'#f9fafb', cursor:'pointer', fontSize:18, fontWeight:700 }}>+</button>
          {variant && <span style={{ fontSize:12, color:'#9ca3af' }}>{variant.stock} available</span>}
        </div>
      </div>
      {/* Sale Price */}
      <div style={{ marginBottom:14, padding:14, background:'#fafafa', borderRadius:12, border:'1.5px solid #e5e7eb' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:.5 }}>Sale Price ($)</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:120 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontWeight:700, color:'#6b7280', fontSize:15 }}>$</span>
            <input type="number" min="0" step="0.01" value={salePrice} onChange={e=>setSalePrice(e.target.value)}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 10px 10px 26px', borderRadius:10, border:'1.5px solid #d1d5db', fontSize:16, fontWeight:800, outline:'none', color:'#111' }}/>
          </div>
          {discountPct > 0 && <div style={{ padding:'6px 14px', borderRadius:10, background:'#fef3c7', border:'1.5px solid #fcd34d', fontWeight:800, fontSize:13, color:'#b45309' }}>🏷️ {discountPct}% off</div>}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
          {[{label:'Full price',pct:0},{label:'-10%',pct:10},{label:'-25%',pct:25},{label:'-50%',pct:50}].map(({label,pct}) => (
            <button key={pct} type="button" onClick={()=>setSalePrice((item.price*(1-pct/100)).toFixed(2))}
              style={{ padding:'5px 10px', borderRadius:8, border:'1.5px solid #e5e7eb', background:discountPct===pct?'#f0fdf4':'#fff', cursor:'pointer', fontSize:12, fontWeight:700, color:discountPct===pct?'#15803d':'#374151' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Note */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Note (optional)</div>
        <input value={note} onChange={e=>setNote(e.target.value)} maxLength={200} placeholder="e.g. loyal customer, end of season…"
          style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}/>
      </div>
      {/* Total */}
      <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius:12, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #bbf7d0' }}>
        <span style={{ fontWeight:700, fontSize:13, color:'#15803d' }}>Total to collect</span>
        <span style={{ fontWeight:900, fontSize:22, color:'#15803d' }}>{fmt(total)}</span>
      </div>
      {msg.text && <div style={{ padding:'10px', borderRadius:10, marginBottom:14, textAlign:'center', fontWeight:700, fontSize:13, background:msg.ok?'#f0fdf4':'#fef2f2', color:msg.ok?'#15803d':'#dc2626' }}>{msg.text}</div>}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={sell} style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#059669,#0d9488)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:'pointer' }}>Confirm Sale</button>
        <button onClick={onClose} style={{ padding:'13px 18px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#6b7280' }}>Cancel</button>
      </div>
    </Modal>
  );
}
