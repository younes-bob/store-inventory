import { useState } from 'react';
import { Dot, Modal } from './ui';
import ProductForm from './ProductForm';
import SaleModal from './SaleModal';
import { fmt, stockBadge, clamp } from '../utils';
import { uid } from '../utils';

function DeleteModal({ item, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose} width={380}>
      <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🗑️</div>
        <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:900 }}>Delete Product</h3>
        <p style={{ color:'#6b7280', fontSize:14, margin:'0 0 24px' }}>This will permanently remove <strong>"{item.name}"</strong>.</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={()=>{ onConfirm(item.id); onClose(); }} style={{ flex:1, padding:'11px', background:'#dc2626', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:13, cursor:'pointer' }}>Delete</button>
        </div>
      </div>
    </Modal>
  );
}

export default function ItemCard({ item, onUpdate, onDelete, onSell, highlighted, cardRef }) {
  const [expanded,      setExpanded]      = useState(false);
  const [modal,         setModal]         = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [editStock,     setEditStock]     = useState(0);

  const total        = item.variants.reduce((s,v) => s+v.stock, 0);
  const sb           = stockBadge(total);
  const uniqueColors = [...new Map(item.variants.map(v => [v.color, v.hex])).entries()];
  const grouped      = {};
  item.variants.forEach(v => {
    if (!grouped[v.color]) grouped[v.color] = { hex:v.hex, variants:[] };
    grouped[v.color].variants.push(v);
  });

  function saveQuickEdit() {
    if (!editingVariant) return;
    onUpdate({ ...item, variants: item.variants.map(v =>
      v.color===editingVariant.color && v.size===editingVariant.size ? { ...v, stock:clamp(editStock,0,9999) } : v
    )});
    setEditingVariant(null);
  }

  return (
    <>
      <div ref={cardRef} style={{
        background:'#fff', borderRadius:16, overflow:'hidden', transition:'all .25s',
        border: highlighted ? '2.5px solid #6366f1' : '1.5px solid #f0f0f0',
        boxShadow: highlighted ? '0 0 0 5px rgba(99,102,241,0.15),0 8px 30px rgba(0,0,0,.12)' : '0 2px 12px rgba(0,0,0,.05)',
      }}>
        <div style={{ display:'flex' }}>
          <div style={{ width:80, minHeight:90, flexShrink:0, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            {item.photo ? <img src={item.photo} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:90 }}/> : <span style={{ fontSize:30 }}>👕</span>}
          </div>
          <div style={{ flex:1, padding:'14px 16px', minWidth:0 }}>
            {highlighted && <div style={{ fontSize:11, fontWeight:700, color:'#6366f1', marginBottom:4 }}>📍 Match found</div>}
            <div style={{ fontWeight:800, fontSize:15, color:'#111827', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
              <span style={{ fontSize:18, fontWeight:900, color:'#4338ca' }}>{fmt(item.price)}</span>
              <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:700, background:sb.bg, color:sb.fg, display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:sb.dot, display:'inline-block' }}/>{sb.label}
              </span>
              <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:600, background:'#f3f0ff', color:'#7c3aed' }}>{item.category}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              {uniqueColors.map(([n,h]) => <Dot key={n} hex={h} size={14}/>)}
              <span style={{ fontSize:11, color:'#9ca3af', marginLeft:2 }}>{uniqueColors.length} color{uniqueColors.length!==1?'s':''}</span>
            </div>
          </div>
        </div>
        {/* Action bar */}
        <div style={{ display:'flex', borderTop:'1px solid #f3f4f6', background:'#fafafa' }}>
          {[
            { label:'🛍️ Sale',   color:'#059669', action:()=>setModal('sale')   },
            { label:(expanded?'▲':'▼')+' Stock', color:'#6366f1', action:()=>setExpanded(e=>!e) },
            { label:'✏️ Edit',   color:'#374151', action:()=>setModal('edit')   },
            { label:'🗑️ Delete', color:'#dc2626', action:()=>setModal('delete') },
          ].map((btn,i,arr) => (
            <button key={btn.label} onClick={btn.action}
              style={{ flex:1, padding:'10px 4px', background:'none', border:'none', borderRight:i<arr.length-1?'1px solid #f3f4f6':'none', cursor:'pointer', fontSize:12, fontWeight:700, color:btn.color, display:'flex', alignItems:'center', justifyContent:'center', transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#f3f4f6'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {btn.label}
            </button>
          ))}
        </div>
        {/* Expanded stock */}
        {expanded && (
          <div style={{ borderTop:'1px solid #f3f4f6', padding:'16px 18px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#9ca3af', letterSpacing:1, textTransform:'uppercase', margin:'0 0 12px' }}>STOCK — tap qty to edit</p>
            {Object.entries(grouped).map(([cName, data]) => (
              <div key={cName} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                  <Dot hex={data.hex} size={16}/>
                  <span style={{ fontWeight:700, fontSize:13, color:'#1f2937' }}>{cName}</span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, paddingLeft:23 }}>
                  {data.variants.map((v,i) => {
                    const vb = stockBadge(v.stock);
                    const isEditing = editingVariant?.color===v.color && editingVariant?.size===v.size;
                    return (
                      <div key={i} style={{ padding:'6px 12px', borderRadius:10, border:`1.5px solid ${v.stock===0?'#fecaca':isEditing?'#6366f1':'#e5e7eb'}`, background:v.stock===0?'#fff8f8':isEditing?'#eef2ff':'#f9fafb', textAlign:'center', minWidth:60 }}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{v.size}</div>
                        {isEditing
                          ? <input type="number" min="0" max="9999" value={editStock} autoFocus
                              onChange={e=>setEditStock(clamp(Number(e.target.value),0,9999))}
                              onBlur={saveQuickEdit}
                              onKeyDown={e=>{ if(e.key==='Enter')saveQuickEdit(); if(e.key==='Escape')setEditingVariant(null); }}
                              style={{ width:44, padding:'2px 4px', borderRadius:6, border:'1.5px solid #6366f1', fontSize:12, textAlign:'center', outline:'none' }}/>
                          : <div onClick={()=>{ setEditingVariant(v); setEditStock(v.stock); }}
                              style={{ fontSize:11, fontWeight:700, color:vb.fg, cursor:'pointer' }} title="Tap to edit">
                              {v.stock===0?'Out':v.stock}
                            </div>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal==='edit'   && <ProductForm initial={item} title="✏️ Edit Product" submitLabel="Save Changes" onClose={()=>setModal(null)} onSubmit={u=>{ onUpdate(u); setModal(null); }}/>}
      {modal==='delete' && <DeleteModal item={item} onClose={()=>setModal(null)} onConfirm={onDelete}/>}
      {modal==='sale'   && <SaleModal item={item} onClose={()=>setModal(null)} onSell={s=>onSell(item,s)}/>}
    </>
  );
}
