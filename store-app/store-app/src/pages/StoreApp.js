import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getItems, setItems as dbSetItems, getSales, setSales as dbSetSales, syncPending } from '../supabase';
import { CATEGORIES } from '../config';
import { uid, fmt, clamp, isToday, stockBadge, isLight, exportCSV, fmtDate } from '../utils';
import { ToastContainer, Spinner, Dot, Modal, PhotoBox, ColorPicker, VariantBuilder } from '../components/ui';
import VisualSearch from '../components/VisualSearch';
import useToast from '../hooks/useToast';
import { isOnline, onNetworkChange, hasPending, readCache } from '../offlineManager';
import { getSubscription, isSubscriptionActive } from '../supabase';
import { getPlan, canAddProduct, canExportCSV, canUseVisualSearch } from '../subscription';

/* ── Offline banner ── */
function OfflineBanner({ pending }) {
  return (
    <div style={{
      background: pending ? 'linear-gradient(90deg,#92400e,#b45309)' : 'linear-gradient(90deg,#374151,#4b5563)',
      color: '#fff', textAlign: 'center', padding: '8px 16px',
      fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14 }}>📡</span>
      {pending
        ? '⚠️ Offline — unsaved changes will sync automatically when you reconnect'
        : '📴 Offline — showing cached data'}
    </div>
  );
}

/* ── ProductForm ── */
function ProductForm({ initial, onSubmit, onClose, t }) {
  const [name,  setName]  = useState(initial.name||'');
  const [price, setPrice] = useState(initial.price||'');
  const [cat,   setCat]   = useState(initial.category||CATEGORIES[0]);
  const [photo, setPhoto] = useState(initial.photo||null);
  const [rows,  setRows]  = useState(() => {
    const map={};(initial.variants||[]).forEach(v=>{if(!map[v.color])map[v.color]={color:v.color,hex:v.hex,sizes:[]};map[v.color].sizes.push({size:v.size,stock:v.stock});});return Object.values(map);
  });
  const [err, setErr] = useState('');
  function submit() {
    if (!name.trim()) { setErr(t.productName); return; }
    if (price==='' || price===null || Number(price)<0) { setErr(t.price); return; }
    // Build variants and merge any duplicates by summing stock
    const rawVariants = rows.flatMap(r=>r.sizes.filter(s=>s.size).map(s=>({color:r.color,hex:r.hex,size:s.size,stock:clamp(s.stock,0,9999)})));
    const mergeMap={};
    rawVariants.forEach(v=>{const k=v.color+'__'+v.size;if(mergeMap[k])mergeMap[k]={...mergeMap[k],stock:mergeMap[k].stock+v.stock};else mergeMap[k]={...v};});
    const variants=Object.values(mergeMap);
    onSubmit({...initial,name:name.trim(),price:Number(price),category:cat,photo,variants});
    onClose();
  }
  return (
    <Modal onClose={onClose} width={620}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'#111'}}>{initial.id&&initial.name?t.editProduct:t.addProduct}</h2>
        <button onClick={onClose} style={{background:'#f3f4f6',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:18,color:'#6b7280'}}>×</button>
      </div>
      <div style={{display:'flex',gap:16,marginBottom:20,alignItems:'flex-start'}}>
        <PhotoBox photo={photo} onPhoto={setPhoto} t={t}/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{t.productName}</label>
            <input value={name} onChange={e=>{setName(e.target.value);setErr('');}} placeholder="e.g. Summer Dress" maxLength={200}
              style={{width:'100%',boxSizing:'border-box',padding:'11px 13px',borderRadius:10,border:`1.5px solid ${err?'#fca5a5':'#e5e7eb'}`,fontSize:14,outline:'none'}}/>
          </div>
          <div style={{display:'flex',gap:12}}>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{t.price}</label>
              <input type="number" min="0" step="1" value={price} onChange={e=>{setPrice(e.target.value);setErr('');}} placeholder="0"
                style={{width:'100%',boxSizing:'border-box',padding:'11px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none'}}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>{t.category}</label>
              <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:'100%',padding:'11px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none',background:'#fff'}}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
      {err&&<p style={{color:'#dc2626',fontSize:13,fontWeight:600,margin:'0 0 12px',padding:'8px 12px',background:'#fef2f2',borderRadius:8}}>{err}</p>}
      <div style={{borderTop:'1px solid #f3f4f6',paddingTop:18,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:800,color:'#4338ca',margin:'0 0 14px'}}>🎨 {t.colorsAndSizes}</p>
        <VariantBuilder rows={rows} setRows={setRows} t={t}/>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={submit} style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>{initial.name?t.saveChanges:t.createProduct}</button>
        <button onClick={onClose} style={{padding:'13px 20px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontWeight:600,fontSize:13,cursor:'pointer',color:'#6b7280'}}>{t.cancel}</button>
      </div>
    </Modal>
  );
}

/* ── SaleModal ── */
function SaleModal({ item, onSell, onClose, t }) {
  const variants = item.variants||[];
  const firstWithStock = variants.find(v=>v.stock>0)||variants[0]||null;
  const colors = [...new Map(variants.map(v=>[v.color,v.hex])).entries()];
  const [selC,setSelC] = useState(firstWithStock?.color||'');
  const [selS,setSelS] = useState(firstWithStock?.size||'');
  const [qty,setQty]   = useState(1);
  const [salePrice,setSalePrice] = useState(String(item.price));
  const [note,setNote] = useState('');
  const [msg,setMsg]   = useState({text:'',ok:true});
  // Merge duplicate color+size entries by summing stock
  const mergedVariants = useMemo(()=>{
    const map={};
    variants.forEach(v=>{const k=v.color+'__'+v.size;if(map[k])map[k]={...map[k],stock:map[k].stock+v.stock};else map[k]={...v};});
    return Object.values(map);
  },[variants]);
  const sizesForColor  = mergedVariants.filter(v=>v.color===selC);
  const variant        = mergedVariants.find(v=>v.color===selC&&v.size===selS);
  const salePriceNum   = parseFloat(salePrice)||0;
  const discountPct    = salePriceNum<item.price?Math.round((1-salePriceNum/item.price)*100):0;
  const total          = salePriceNum*qty;
  function changeColor(c){setSelC(c);const b=mergedVariants.find(v=>v.color===c&&v.stock>0)||mergedVariants.find(v=>v.color===c);setSelS(b?.size||'');setQty(1);}
  function sell(){
    if(!variant){setMsg({text:'Select size.',ok:false});return;}
    if(qty<1||qty>variant.stock){setMsg({text:`Only ${variant.stock} in stock.`,ok:false});return;}
    if(salePriceNum<0){setMsg({text:'Invalid price.',ok:false});return;}
    onSell({color:selC,size:selS,qty:Number(qty),salePrice:salePriceNum,originalPrice:item.price,note:note.trim(),total});
    setMsg({text:t.soldOk||'✓ Done!',ok:true});setTimeout(onClose,900);
  }
  if(!variants.length)return(<Modal onClose={onClose} width={360}><div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:40,marginBottom:10}}>⚠️</div><p style={{fontWeight:700,color:'#b45309'}}>{t.noVariants}</p><button onClick={onClose} style={{marginTop:16,padding:'10px 24px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:10,cursor:'pointer',fontWeight:600}}>{t.cancel}</button></div></Modal>);
  return(
    <Modal onClose={onClose} width={460}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <h2 style={{margin:0,fontSize:19,fontWeight:900}}>🛍️ {t.recordSale}</h2>
        <button onClick={onClose} style={{background:'#f3f4f6',border:'none',borderRadius:10,width:34,height:34,cursor:'pointer',fontSize:18,color:'#6b7280'}}>×</button>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'linear-gradient(135deg,#f8faff,#eef2ff)',borderRadius:14,marginBottom:18,border:'1px solid #e0e7ff'}}>
        <div style={{width:48,height:48,borderRadius:12,overflow:'hidden',border:'1px solid #e5e7eb',flexShrink:0,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {item.photo?<img src={item.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:24}}>👕</span>}
        </div>
        <div><div style={{fontWeight:800,fontSize:15,color:'#111'}}>{item.name}</div><div style={{color:'#9ca3af',fontSize:13}}>{t.original}: <span style={{fontWeight:700,color:'#4338ca'}}>{fmt(item.price)}</span></div></div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>{t.color}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {colors.map(([n,h])=>(
            <button key={n} type="button" onClick={()=>changeColor(n)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:10,border:selC===n?'2px solid #4f46e5':'1.5px solid #e5e7eb',background:selC===n?'#eef2ff':'#fff',cursor:'pointer',fontWeight:selC===n?700:500,fontSize:13,transition:'all .1s'}}>
              <Dot hex={h} selected={selC===n}/>{n}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>{t.size}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {sizesForColor.map(v=>{const sb=stockBadge(v.stock);return(
            <button key={v.size} type="button" onClick={()=>{if(v.stock>0){setSelS(v.size);setQty(1);}}} disabled={v.stock===0}
              style={{padding:'8px 14px',borderRadius:10,border:selS===v.size?'2px solid #4f46e5':'1.5px solid #e5e7eb',background:selS===v.size?'#eef2ff':v.stock===0?'#f9fafb':'#fff',cursor:v.stock===0?'not-allowed':'pointer',opacity:v.stock===0?.4:1,transition:'all .1s'}}>
              <div style={{fontWeight:700,fontSize:13,color:v.stock===0?'#9ca3af':'#111'}}>{v.size}</div>
              <div style={{fontSize:11,color:sb.fg,fontWeight:600}}>{v.stock===0?t.out:v.stock+' left'}</div>
            </button>
          );})}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>{t.qty}</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button type="button" onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:38,height:38,borderRadius:10,border:'1.5px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',fontSize:20,fontWeight:700}}>−</button>
          <input type="number" min="1" max={variant?.stock||1} value={qty} onChange={e=>setQty(clamp(Number(e.target.value),1,variant?.stock||1))} style={{width:64,padding:'8px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:18,fontWeight:800,textAlign:'center',outline:'none'}}/>
          <button type="button" onClick={()=>setQty(q=>Math.min(variant?.stock||1,q+1))} style={{width:38,height:38,borderRadius:10,border:'1.5px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',fontSize:20,fontWeight:700}}>+</button>
          {variant&&<span style={{fontSize:12,color:'#9ca3af'}}>{variant.stock} available</span>}
        </div>
      </div>
      <div style={{marginBottom:14,padding:14,background:'#fafafa',borderRadius:12,border:'1.5px solid #e5e7eb'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>{t.salePrice}</div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'stretch',flex:1,minWidth:120,border:'1.5px solid #d1d5db',borderRadius:10,overflow:'hidden',background:'#fff'}}>
            <input type="number" min="0" step="1" value={salePrice} onChange={e=>setSalePrice(e.target.value)} style={{flex:1,padding:'11px 10px',border:'none',fontSize:17,fontWeight:800,outline:'none',color:'#111',background:'transparent',minWidth:0}}/>
            <span style={{padding:'0 12px',fontWeight:700,color:'#6b7280',fontSize:13,display:'flex',alignItems:'center',background:'#f3f4f6',borderLeft:'1px solid #e5e7eb'}}>DA</span>
          </div>
          {discountPct>0&&<div style={{padding:'6px 14px',borderRadius:20,background:'#fef3c7',border:'1.5px solid #fcd34d',fontWeight:800,fontSize:13,color:'#b45309'}}>🏷️ {discountPct}% off</div>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {[{label:t.fullPrice,pct:0},{label:'-10%',pct:10},{label:'-25%',pct:25},{label:'-50%',pct:50}].map(({label,pct})=>(
            <button key={pct} type="button" onClick={()=>setSalePrice(Math.round(item.price*(1-pct/100)))} style={{padding:'5px 12px',borderRadius:20,border:'1.5px solid #e5e7eb',background:discountPct===pct?'#eef2ff':'#fff',cursor:'pointer',fontSize:12,fontWeight:700,color:discountPct===pct?'#4f46e5':'#374151',transition:'all .1s'}}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>{t.note}</div>
        <input value={note} onChange={e=>setNote(e.target.value)} maxLength={200} placeholder={t.notePlaceholder} style={{width:'100%',boxSizing:'border-box',padding:'10px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none'}}/>
      </div>
      <div style={{padding:'14px 18px',background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',borderRadius:14,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid #bbf7d0'}}>
        <span style={{fontWeight:700,fontSize:13,color:'#15803d'}}>{t.totalCollect}</span>
        <span style={{fontWeight:900,fontSize:24,color:'#15803d'}}>{fmt(total)}</span>
      </div>
      {msg.text&&<div style={{padding:'10px',borderRadius:10,marginBottom:14,textAlign:'center',fontWeight:700,fontSize:13,background:msg.ok?'#f0fdf4':'#fef2f2',color:msg.ok?'#15803d':'#dc2626'}}>{msg.text}</div>}
      <div style={{display:'flex',gap:10}}>
        <button onClick={sell} style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#059669,#0d9488)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer'}}>{t.confirmSale}</button>
        <button onClick={onClose} style={{padding:'13px 18px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontWeight:600,fontSize:13,cursor:'pointer',color:'#6b7280'}}>{t.cancel}</button>
      </div>
    </Modal>
  );
}

/* ── DeleteModal ── */
function DeleteModal({ item, onConfirm, onClose, t }) {
  return(
    <Modal onClose={onClose} width={380}>
      <div style={{textAlign:'center',padding:'8px 0 16px'}}>
        <div style={{fontSize:52,marginBottom:12}}>🗑️</div>
        <h3 style={{margin:'0 0 8px',fontSize:18,fontWeight:900,color:'#111'}}>{t.deleteProduct}</h3>
        <p style={{color:'#6b7280',fontSize:14,margin:'0 0 24px'}}>{t.deleteConfirm} <strong>"{item.name}"</strong>?</p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontWeight:600,fontSize:13,cursor:'pointer',color:'#374151'}}>{t.cancel}</button>
          <button onClick={()=>{onConfirm(item.id);onClose();}} style={{flex:1,padding:'12px',background:'#dc2626',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:13,cursor:'pointer'}}>{t.delete}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── ItemCard ── */
function ItemCard({ item, onUpdate, onDelete, onSell, highlighted, cardRef, t }) {
  const [expanded,setExpanded]=useState(false);
  const [modal,setModal]=useState(null);
  const [editingV,setEditingV]=useState(null);
  const [editStock,setEditStock]=useState(0);
  const total=item.variants.reduce((s,v)=>s+v.stock,0);
  const sb=stockBadge(total);
  const uniqueColors=[...new Map(item.variants.map(v=>[v.color,v.hex])).entries()];
  const grouped={};item.variants.forEach(v=>{if(!grouped[v.color])grouped[v.color]={hex:v.hex,variants:[]};grouped[v.color].variants.push(v);});
  function saveQ(){if(!editingV)return;onUpdate({...item,variants:item.variants.map(v=>v.color===editingV.color&&v.size===editingV.size?{...v,stock:clamp(editStock,0,9999)}:v)});setEditingV(null);}
  return(
    <>
      <div ref={cardRef} style={{ background:'#fff', borderRadius:20, overflow:'hidden', transition:'all .25s', border:highlighted?'2.5px solid #6366f1':'1.5px solid #f0f0f0', boxShadow:highlighted?'0 0 0 6px rgba(99,102,241,0.12),0 12px 40px rgba(0,0,0,.12)':'0 2px 16px rgba(0,0,0,.06)' }}>
        <div style={{display:'flex'}}>
          <div style={{width:90,minHeight:100,flexShrink:0,background:'linear-gradient(135deg,#f8f9ff,#f0f4ff)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}}>
            {item.photo?<img src={item.photo} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover',minHeight:100}}/>:<span style={{fontSize:34}}>👕</span>}
            {highlighted&&<div style={{position:'absolute',top:6,left:6,background:'#6366f1',borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:800,color:'#fff'}}>📍</div>}
          </div>
          <div style={{flex:1,padding:'14px 16px 12px',minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,color:'#111',marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <span style={{fontSize:18,fontWeight:900,color:'#4338ca',letterSpacing:-0.5}}>{fmt(item.price)}</span>
              <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,background:sb.bg,color:sb.fg,display:'flex',alignItems:'center',gap:4}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:sb.dot,display:'inline-block'}}/>{sb.label}
              </span>
              <span style={{fontSize:11,padding:'3px 9px',borderRadius:20,fontWeight:600,background:'#f3f0ff',color:'#7c3aed'}}>{item.category}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
              {uniqueColors.map(([n,h])=><Dot key={n} hex={h} size={13}/>)}
              <span style={{fontSize:11,color:'#9ca3af',marginLeft:2}}>{uniqueColors.length} color{uniqueColors.length!==1?'s':''}</span>
            </div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',borderTop:'1px solid #f5f5f5'}}>
          {[
            {label:t.sale,       color:'#059669', bg:'#f0fdf4', action:()=>setModal('sale')},
            {label:(expanded?'▲':'▼')+' '+t.stock, color:'#6366f1', bg:'#eef2ff', action:()=>setExpanded(e=>!e)},
            {label:t.edit,       color:'#374151', bg:'#f9fafb', action:()=>setModal('edit')},
            {label:'🗑️ '+t.delete, color:'#dc2626', bg:'#fff5f5', action:()=>setModal('delete')},
          ].map((btn,i,arr)=>(
            <button key={btn.label} onClick={btn.action}
              style={{padding:'11px 4px',background:'none',border:'none',borderRight:i<arr.length-1?'1px solid #f5f5f5':'none',cursor:'pointer',fontSize:11,fontWeight:700,color:btn.color,transition:'background .15s'}}
              onMouseEnter={e=>e.currentTarget.style.background=btn.bg}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {btn.label}
            </button>
          ))}
        </div>
        {expanded&&(
          <div style={{borderTop:'1px solid #f5f5f5',padding:'16px 18px',background:'#fafbff'}}>
            <p style={{fontSize:10,fontWeight:800,color:'#9ca3af',letterSpacing:1.5,textTransform:'uppercase',margin:'0 0 12px'}}>{t.stockBreakdown}</p>
            {Object.entries(grouped).map(([cName,data])=>(
              <div key={cName} style={{marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}><Dot hex={data.hex} size={16}/><span style={{fontWeight:700,fontSize:13,color:'#1f2937'}}>{cName}</span></div>
                <div style={{display:'flex',flexWrap:'wrap',gap:7,paddingLeft:23}}>
                  {data.variants.map((v,i)=>{const vb=stockBadge(v.stock);const isEd=editingV?.color===v.color&&editingV?.size===v.size;return(
                    <div key={i} style={{padding:'7px 12px',borderRadius:12,border:`1.5px solid ${v.stock===0?'#fecaca':isEd?'#6366f1':'#e5e7eb'}`,background:v.stock===0?'#fff8f8':isEd?'#eef2ff':'#f9fafb',textAlign:'center',minWidth:58,transition:'all .15s'}}>
                      <div style={{fontWeight:700,fontSize:13,color:'#111',marginBottom:2}}>{v.size}</div>
                      {isEd?<input type="number" min="0" max="9999" value={editStock} autoFocus onChange={e=>setEditStock(clamp(Number(e.target.value),0,9999))} onBlur={saveQ} onKeyDown={e=>{if(e.key==='Enter')saveQ();if(e.key==='Escape')setEditingV(null);}} style={{width:44,padding:'2px 4px',borderRadius:6,border:'1.5px solid #6366f1',fontSize:12,textAlign:'center',outline:'none'}}/>
                      :<div onClick={()=>{setEditingV(v);setEditStock(v.stock);}} style={{fontSize:11,fontWeight:700,color:vb.fg,cursor:'pointer'}} title="Tap to edit">{v.stock===0?t.out:v.stock}</div>}
                    </div>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal==='edit'&&<ProductForm initial={item} t={t} onClose={()=>setModal(null)} onSubmit={u=>{onUpdate(u);setModal(null);}}/>}
      {modal==='delete'&&<DeleteModal item={item} t={t} onClose={()=>setModal(null)} onConfirm={onDelete}/>}
      {modal==='sale'&&<SaleModal item={item} t={t} onClose={()=>setModal(null)} onSell={s=>onSell(item,s)}/>}
    </>
  );
}

/* ── ReturnModal ── */
function ReturnModal({ sale, onConfirm, onClose, t }) {
  const maxReturn = sale.qty - (sale.returnedQty || 0);
  const [qty, setQty] = useState(maxReturn);
  return (
    <Modal onClose={onClose} width={400}>
      <div style={{textAlign:'center',padding:'4px 0 16px'}}>
        <div style={{fontSize:48,marginBottom:10}}>↩️</div>
        <h3 style={{margin:'0 0 6px',fontSize:18,fontWeight:900,color:'#111'}}>{t.returnTitle||'Process Return'}</h3>
        <p style={{color:'#6b7280',fontSize:13,margin:'0 0 20px'}}>"{sale.itemName}" · {sale.color} / {sale.size}</p>
        <div style={{background:'#f9fafb',borderRadius:12,padding:'16px',marginBottom:20,textAlign:'left'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>{t.returnQty||'Qty to return'}</div>
          <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center'}}>
            <button type="button" onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:38,height:38,borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:20,fontWeight:700}}>−</button>
            <span style={{fontSize:24,fontWeight:900,minWidth:40,textAlign:'center'}}>{qty}</span>
            <button type="button" onClick={()=>setQty(q=>Math.min(maxReturn,q+1))} style={{width:38,height:38,borderRadius:10,border:'1.5px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:20,fontWeight:700}}>+</button>
          </div>
          <p style={{fontSize:11,color:'#9ca3af',margin:'8px 0 0',textAlign:'center'}}>max {maxReturn}</p>
        </div>
        <div style={{background:'#fef2f2',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid #fecaca'}}>
          <span style={{fontSize:13,fontWeight:700,color:'#dc2626'}}>{t.returnRefund||'Refund amount'}</span>
          <span style={{fontSize:20,fontWeight:900,color:'#dc2626'}}>{fmt(sale.salePrice * qty)}</span>
        </div>
        <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 20px'}}>{t.returnNote||'Stock will be restored automatically.'}</p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',background:'#f9fafb',border:'1.5px solid #e5e7eb',borderRadius:12,fontWeight:600,fontSize:13,cursor:'pointer',color:'#374151'}}>{t.cancel}</button>
          <button onClick={()=>{onConfirm(sale,qty);onClose();}} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'#fff',border:'none',borderRadius:12,fontWeight:800,fontSize:13,cursor:'pointer'}}>
            {t.confirmReturn||'Confirm Return'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── SalesPage ── */
function SalesPage({ sales, onClear, onReturn, storeName, t, plan }) {
  const [filter,setFilter]=useState('all');
  const [returnSale,setReturnSale]=useState(null);
  const now=Date.now();
  const filtered=useMemo(()=>{const s=[...sales].sort((a,b)=>b.ts-a.ts);if(filter==='today')return s.filter(r=>isToday(r.ts));if(filter==='week')return s.filter(r=>r.ts>now-7*24*3600*1000);return s;},[sales,filter,now]);
  const active=filtered.filter(r=>!r.returned);
  const rev=active.reduce((s,r)=>s+r.total,0);
  const sold=active.reduce((s,r)=>s+(r.qty-(r.returnedQty||0)),0);
  const todayRev=sales.filter(r=>isToday(r.ts)&&!r.returned).reduce((s,r)=>s+r.total,0);
  return(
    <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px 60px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:24}}>
        {[{icon:'💰',label:t.revenue,value:fmt(rev),g:'linear-gradient(135deg,#059669,#0d9488)'},{icon:'📦',label:t.itemsSold,value:sold+' pcs',g:'linear-gradient(135deg,#4f46e5,#7c3aed)'},{icon:'📅',label:t.today,value:fmt(todayRev),g:'linear-gradient(135deg,#d97706,#b45309)'},{icon:'🧾',label:t.transactions,value:active.length,g:'linear-gradient(135deg,#0284c7,#0369a1)'}].map(s=>(
          <div key={s.label} style={{background:s.g,borderRadius:18,padding:'18px 20px',boxShadow:'0 8px 24px rgba(0,0,0,.15)'}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)',fontWeight:700,textTransform:'uppercase',letterSpacing:.8,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:20,border:'1.5px solid #f0f0f0',boxShadow:'0 4px 20px rgba(0,0,0,.06)',overflow:'hidden'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 22px',borderBottom:'1px solid #f5f5f5',flexWrap:'wrap',gap:10}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:800,color:'#111'}}>{t.salesHistory}</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{display:'flex',background:'#f3f4f6',borderRadius:20,padding:3,gap:2}}>
              {[[t.all,'all'],[t.todayFilter,'today'],[t.sevenDays,'week']].map(([l,v])=>(
                <button key={v} onClick={()=>setFilter(v)} style={{padding:'5px 14px',borderRadius:16,border:'none',fontWeight:700,fontSize:12,cursor:'pointer',background:filter===v?'#fff':'transparent',color:filter===v?'#111':'#6b7280',boxShadow:filter===v?'0 1px 4px rgba(0,0,0,.1)':'none',transition:'all .15s'}}>{l}</button>
              ))}
            </div>
            {sales.length>0&&<>
              {canExportCSV(plan?.id||'free')
                ? <button onClick={()=>exportCSV(sales,storeName)} style={{padding:'6px 14px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:700,color:'#15803d'}}>{t.exportCSV}</button>
                : <div title="Upgrade to Standard or Pro to export CSV" style={{padding:'6px 14px',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:20,cursor:'not-allowed',fontSize:12,fontWeight:700,color:'#9ca3af'}}>🔒 {t.exportCSV}</div>
              }
              <button onClick={()=>{if(window.confirm(t.clearConfirm))onClear();}} style={{padding:'6px 14px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:700,color:'#dc2626'}}>{t.clearAll}</button>
            </>}
          </div>
        </div>
        {filtered.length===0?<div style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}><div style={{fontSize:44,marginBottom:12}}>📋</div><p style={{fontSize:14,fontWeight:600}}>{filter!=='all'?t.noSalesPeriod:t.noSalesYet}</p></div>
        :<div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f9fafb'}}>
              {[t.date,t.product,t.colorSize,t.qty,t.unitPrice,t.total,'Note',''].map((h,i)=><th key={i} style={{padding:'11px 14px',textAlign:'left',fontWeight:700,color:'#6b7280',fontSize:11,textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((s,i)=>{const hd=s.salePrice<s.originalPrice; const isReturned=s.returned; const isPartial=s.partialReturn; return(
                <tr key={s.id} style={{borderTop:'1px solid #f5f5f5',background:(isReturned||isPartial)?'#fef2f2':i%2===0?'#fff':'#fafafa',transition:'background .1s',opacity:isReturned?.6:1}} onMouseEnter={e=>e.currentTarget.style.background=(isReturned||isPartial)?'#fef2f2':'#f8f9ff'} onMouseLeave={e=>e.currentTarget.style.background=(isReturned||isPartial)?'#fef2f2':i%2===0?'#fff':'#fafafa'}>
                  <td style={{padding:'12px 14px',color:'#6b7280',whiteSpace:'nowrap',fontSize:12}}>
                    {fmtDate(s.ts)}
                    {isReturned&&<div style={{fontSize:10,fontWeight:700,color:'#dc2626',marginTop:2}}>↩️ {t.returned||'Returned'}</div>}
                    {isPartial&&<div style={{fontSize:10,fontWeight:700,color:'#b45309',marginTop:2}}>↩️ {s.returnedQty} {t.returned||'returned'}</div>}
                  </td>
                  <td style={{padding:'12px 14px',fontWeight:700,color:'#111'}}>{s.itemName}</td>
                  <td style={{padding:'12px 14px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:12,height:12,borderRadius:'50%',background:s.colorHex||'#9ca3af',display:'inline-block',border:isLight(s.colorHex||'')?'1.5px solid #ccc':'1.5px solid rgba(0,0,0,.1)'}}/><span>{s.color} / {s.size}</span></div></td>
                  <td style={{padding:'12px 14px',fontWeight:700,textAlign:'center'}}>{s.qty}</td>
                  <td style={{padding:'12px 14px'}}><div style={{fontWeight:700}}>{fmt(s.salePrice)}</div>{hd&&<div style={{fontSize:11,color:'#9ca3af',textDecoration:'line-through'}}>{fmt(s.originalPrice)}</div>}{hd&&<div style={{fontSize:10,padding:'1px 6px',background:'#fef3c7',borderRadius:6,color:'#b45309',fontWeight:700,display:'inline-block',marginTop:2}}>{Math.round((1-s.salePrice/s.originalPrice)*100)}% off</div>}</td>
                  <td style={{padding:'12px 14px',fontWeight:900,color:isReturned?'#9ca3af':'#059669',fontSize:15,textDecoration:isReturned?'line-through':'none'}}>{fmt(s.total)}</td>
                  <td style={{padding:'12px 14px',color:'#9ca3af',fontSize:12,fontStyle:s.note?'normal':'italic'}}>{s.note||'—'}</td>
                  <td style={{padding:'8px 14px'}}>
                    {isReturned
                      ? <span style={{fontSize:11,fontWeight:700,color:'#dc2626',padding:'5px 10px',background:'#fef2f2',borderRadius:20,border:'1.5px solid #fecaca'}}>✓ {t.returned||'Returned'}</span>
                      : <button onClick={()=>setReturnSale(s)} style={{padding:'5px 12px',background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:20,cursor:'pointer',fontSize:11,fontWeight:700,color:'#dc2626',whiteSpace:'nowrap'}}>↩️ {t.returnBtn||'Return'}</button>
                    }
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>}
      </div>
      {returnSale&&<ReturnModal sale={returnSale} t={t} onClose={()=>setReturnSale(null)} onConfirm={onReturn}/>}
    </div>
  );
}

/* ── Main StoreApp ── */
export default function StoreApp({ store, t, lang, setLang, onLogout }) {
  const [tab,setTab]=useState('inventory');
  const [items,setItemsState]=useState(()=>readCache('items',store.id)||[]);
  const [sales,setSalesState]=useState(()=>readCache('sales',store.id)||[]);
  const [loading,setLoading]=useState(()=>!(readCache('items',store.id)));
  const [syncStatus,setSyncStatus]=useState('synced');
  const [online,setOnline]=useState(isOnline());
  const [pendingSync,setPendingSync]=useState(false);
  const [search,setSearch]=useState('');
  const [filterCat,setFilterCat]=useState(0);
  const [filterStock,setFilterStock]=useState('All');
  const [showAdd,setShowAdd]=useState(false);
  const [showVS,setShowVS]=useState(false);
  const [highlightId,setHighlightId]=useState(null);
  const cardRefs=useRef({});
  const saveItemsTimer=useRef(null);
  const saveSalesTimer=useRef(null);
  const {toasts,show:toast}=useToast();
  const [sub,setSub]=useState(null);
  const plan=getPlan(sub?.plan||'free');
  const planActive=isSubscriptionActive(sub);

  // Initial load
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const[i,s,subscription]=await Promise.all([getItems(store.id),getSales(store.id),getSubscription()]);
      if(mounted){setItemsState(i);setSalesState(s);setSub(subscription);setLoading(false);setPendingSync(hasPending(store.id));}
    })();
    return()=>{mounted=false;};
  },[store.id]);

  // Poll for remote changes every 15s (only when online)
  useEffect(()=>{
    const iv=setInterval(async()=>{
      if(!isOnline())return;
      if(hasPending(store.id))return; // don't overwrite unsaved local changes
      const[i,s]=await Promise.all([getItems(store.id),getSales(store.id)]);
      setItemsState(i);setSalesState(s);
    },15000);
    return()=>clearInterval(iv);
  },[store.id]);

  // Network status listener + auto-sync on reconnect
  useEffect(()=>{
    const cleanup = onNetworkChange(async(nowOnline)=>{
      setOnline(nowOnline);
      if(nowOnline){
        toast('🌐 Back online — syncing…');
        const synced = await syncPending(store.id);
        setPendingSync(hasPending(store.id));
        if(synced) toast('✅ All changes synced!');
      } else {
        toast('📴 Offline — changes saved locally','warn');
        setPendingSync(hasPending(store.id));
      }
    });
    return cleanup;
  },[store.id,toast]);

  useEffect(()=>()=>{clearTimeout(saveItemsTimer.current);clearTimeout(saveSalesTimer.current);},[]);
  useEffect(()=>{const ids=new Set(items.map(i=>String(i.id)));Object.keys(cardRefs.current).forEach(k=>{if(!ids.has(k))delete cardRefs.current[k];});},[items]);

  const persistItems=useCallback((next)=>{
    setSyncStatus('saving');
    clearTimeout(saveItemsTimer.current);
    saveItemsTimer.current=setTimeout(async()=>{
      const ok=await dbSetItems(store.id,next);
      setSyncStatus(ok?'synced':'error');
      setPendingSync(hasPending(store.id));
      if(!ok&&isOnline())toast(t.saveFailed,'error');
    },600);
  },[store.id,toast,t]);

  const persistSales=useCallback((next)=>{
    setSyncStatus('saving');
    clearTimeout(saveSalesTimer.current);
    saveSalesTimer.current=setTimeout(async()=>{
      const ok=await dbSetSales(store.id,next);
      setSyncStatus(ok?'synced':'error');
      setPendingSync(hasPending(store.id));
      if(!ok&&isOnline())toast(t.saveFailed,'error');
    },600);
  },[store.id,toast,t]);

  function updateItems(fn){setItemsState(prev=>{const next=typeof fn==='function'?fn(prev):fn;persistItems(next);return next;});}
  function updateSales(fn){setSalesState(prev=>{const next=typeof fn==='function'?fn(prev):fn;persistSales(next);return next;});}

  function handleMatch(id){setTab('inventory');setSearch('');setFilterCat(0);setFilterStock('All');setHighlightId(String(id));setTimeout(()=>{cardRefs.current[String(id)]?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>setHighlightId(null),3500);},150);}

  function handleSell(item,{color,size,qty,salePrice,originalPrice,note,total}){
    updateItems(prev=>prev.map(i=>i.id!==item.id?i:{...i,variants:i.variants.map(v=>v.color===color&&v.size===size?{...v,stock:clamp(v.stock-qty,0,9999)}:v)}));
    const colorHex=item.variants.find(v=>v.color===color)?.hex||'#9ca3af';
    updateSales(prev=>[...prev,{id:uid(),ts:Date.now(),itemId:item.id,itemName:item.name,color,colorHex,size,qty,salePrice,originalPrice,note,total}]);
    toast(`✓ ${qty}× ${item.name} ${t.soldToast} ${fmt(total)}`);
  }

  function handleReturn(sale, returnQty) {
    const refund = sale.salePrice * returnQty;
    const totalReturned = (sale.returnedQty || 0) + returnQty;
    const fullyReturned = totalReturned >= sale.qty;
    updateSales(prev=>prev.map(s=>s.id!==sale.id?s:{...s,returned:fullyReturned,partialReturn:!fullyReturned,returnedQty:totalReturned,returnedAt:Date.now(),total:Math.max(0,s.total-refund)}));
    updateItems(prev=>prev.map(i=>i.id!==sale.itemId?i:{...i,variants:i.variants.map(v=>v.color===sale.color&&v.size===sale.size?{...v,stock:clamp(v.stock+returnQty,0,9999)}:v)}));
    toast(returnQty+"× "+sale.itemName+" returned — stock restored","warn");
  }

  const filtered=useMemo(()=>{
    const rc=filterCat===0?null:CATEGORIES[filterCat-1];
    const q=search.toLowerCase();
    return items.filter(item=>{
      const ms=!q||item.name.toLowerCase().includes(q)||item.category.toLowerCase().includes(q)||item.variants.some(v=>v.color.toLowerCase().includes(q));
      const mc=!rc||item.category===rc;
      const tot=item.variants.reduce((s,v)=>s+v.stock,0);
      const mst=filterStock==='All'?true:filterStock==='InStock'?tot>5:filterStock==='Low'?(tot>0&&tot<=5):tot===0;
      return ms&&mc&&mst;
    });
  },[items,search,filterCat,filterStock]);

  const oos=items.filter(i=>i.variants.reduce((s,v)=>s+v.stock,0)===0).length;
  const low=items.filter(i=>{const tt=i.variants.reduce((s,v)=>s+v.stock,0);return tt>0&&tt<=5;}).length;
  const todayRev=sales.filter(s=>isToday(s.ts)&&!s.returned).reduce((a,s)=>a+s.total,0);

  // Sync status label
  const syncColor = !online ? '#9ca3af' : syncStatus==='saving'?'#fbbf24':syncStatus==='error'?'#f87171':'#4ade80';
  const syncLabel = !online
    ? (pendingSync ? '⚠️ Offline (unsaved)' : '📴 Offline')
    : syncStatus==='saving'?t.saving:syncStatus==='error'?t.saveFailed:t.synced;

  if(loading)return <Spinner label={`Loading ${store.name}…`}/>;

  const fontFamily = lang==='ar'?"'Segoe UI',Tahoma,sans-serif":"'Inter',system-ui,sans-serif";

  return(
    <div dir={t.dir} style={{minHeight:'100vh',background:'#f0f2f8',fontFamily}}>
      {/* Offline banner */}
      {!online && <OfflineBanner pending={pendingSync}/>}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',padding:'0 0 0'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'20px 20px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:20}}>
            <div>
              <h1 style={{color:'#fff',fontSize:20,fontWeight:900,margin:0,letterSpacing:-0.5}}>🏪 {store.name}</h1>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5,flexWrap:'wrap'}}>
                <span style={{color:'rgba(255,255,255,0.5)',fontSize:12,fontFamily:'monospace',letterSpacing:2,background:'rgba(255,255,255,0.08)',padding:'2px 8px',borderRadius:6}}>{store.code}</span>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:700,background:'rgba(0,0,0,0.3)',color:syncColor}}>{syncLabel}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.1)',borderRadius:20,padding:4}}>
                {['en','fr','ar'].map(l=>(
                  <button key={l} onClick={()=>setLang(l)} style={{padding:'5px 12px',borderRadius:16,border:'none',fontWeight:700,fontSize:12,cursor:'pointer',background:lang===l?'#fff':'transparent',color:lang===l?'#302b63':'#fff',transition:'all .2s'}}>
                    {l==='en'?'EN':l==='fr'?'FR':'ع'}
                  </button>
                ))}
              </div>
              <button onClick={onLogout} style={{padding:'8px 16px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:20,cursor:'pointer',color:'#fff',fontWeight:700,fontSize:13,transition:'all .2s'}}>{t.logOut}</button>
            </div>
          </div>
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,background:'rgba(255,255,255,0.06)',borderRadius:'16px 16px 0 0',overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',borderBottom:'none'}}>
            {[{label:t.products,value:items.length,icon:'📦',warn:false},{label:t.outOfStock,value:oos,icon:'❌',warn:oos>0},{label:t.lowStock,value:low,icon:'⚠️',warn:low>0},{label:t.today,value:fmt(todayRev),icon:'💰',warn:false}].map((s,i,arr)=>(
              <div key={i} style={{padding:'14px 12px',borderRight:i<arr.length-1?'1px solid rgba(255,255,255,0.08)':'none',textAlign:'center'}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:3}}>{s.icon} {s.label}</div>
                <div style={{fontSize:18,fontWeight:900,color:s.warn?'#fde68a':'#fff'}}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:'#fff',boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
        <div style={{maxWidth:900,margin:'0 auto',padding:'0 20px',display:'flex'}}>
          {[['inventory','📦 '+t.inventory],['sales','📊 '+t.salesHistory]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{padding:'16px 22px',background:'none',border:'none',cursor:'pointer',fontWeight:700,fontSize:14,color:tab===key?'#4f46e5':'#9ca3af',borderBottom:tab===key?'3px solid #4f46e5':'3px solid transparent',transition:'all .15s'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab==='sales'?<SalesPage sales={sales} onClear={()=>updateSales([])} onReturn={handleReturn} storeName={store.name} t={t} plan={plan}/>:(
        <div style={{maxWidth:900,margin:'0 auto',padding:'20px 20px 0'}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:18}}>
            <div style={{flex:1,minWidth:180,position:'relative'}}>
              <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:15,color:'#9ca3af'}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
                style={{width:'100%',boxSizing:'border-box',padding:'12px 14px 12px 40px',borderRadius:14,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}/>
            </div>
            <select value={filterCat} onChange={e=>setFilterCat(Number(e.target.value))} style={{padding:'12px 14px',borderRadius:14,border:'1.5px solid #e5e7eb',fontSize:13,background:'#fff',outline:'none',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              {t.categories.map((c,i)=><option key={c} value={i}>{c}</option>)}
            </select>
            <select value={filterStock} onChange={e=>setFilterStock(e.target.value)} style={{padding:'12px 14px',borderRadius:14,border:'1.5px solid #e5e7eb',fontSize:13,background:'#fff',outline:'none',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              <option value="All">{t.allStock}</option>
              <option value="InStock">{t.inStock}</option>
              <option value="Low">{t.low}</option>
              <option value="Out">{t.out}</option>
            </select>
            {canUseVisualSearch(plan.id)
              ? <button onClick={()=>setShowVS(true)} title={t.searchByPhoto} style={{padding:'12px 16px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:16,cursor:'pointer',boxShadow:'0 4px 14px rgba(99,102,241,.35)'}}>📸</button>
              : <div title="Upgrade to Standard or Pro to use Photo Search" style={{padding:'12px 16px',background:'#e5e7eb',color:'#9ca3af',borderRadius:14,fontWeight:800,fontSize:16,cursor:'not-allowed'}}>🔒</div>
            }
            {canAddProduct(plan.id,items.length)
              ? <button onClick={()=>setShowAdd(true)} style={{padding:'12px 20px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:14,fontWeight:800,fontSize:13,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 4px 14px rgba(79,70,229,.35)'}}>{t.newProduct}</button>
              : <div title={`Upgrade to add more products (${plan.limits.products} max on ${plan.name})`} style={{padding:'12px 20px',background:'#e5e7eb',color:'#9ca3af',borderRadius:14,fontWeight:800,fontSize:13,cursor:'not-allowed',whiteSpace:'nowrap'}}>🔒 {t.newProduct}</div>
            }
          </div>
          {search&&<p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>{filtered.length} result{filtered.length!==1?'s':''} for "{search}"</p>}
          {filtered.length===0?(
            <div style={{textAlign:'center',padding:'80px 20px',color:'#9ca3af'}}>
              <div style={{fontSize:56,marginBottom:16}}>{search?'🔍':'📦'}</div>
              <p style={{fontSize:16,fontWeight:600,marginBottom:16}}>{search?`${t.noResults} "${search}"`:t.noProductsYet}</p>
              {!search&&<button onClick={()=>setShowAdd(true)} style={{padding:'12px 28px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:14,fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:'0 4px 14px rgba(79,70,229,.35)'}}>{t.addFirst}</button>}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:14,paddingBottom:60}}>
              {filtered.map(item=>(
                <ItemCard key={item.id} item={item} t={t}
                  highlighted={highlightId===String(item.id)}
                  cardRef={el=>{if(el)cardRefs.current[String(item.id)]=el;}}
                  onUpdate={u=>updateItems(prev=>prev.map(i=>i.id===u.id?u:i))}
                  onDelete={id=>{updateItems(prev=>prev.filter(i=>i.id!==id));toast(t.deletedToast,'warn');}}
                  onSell={handleSell}/>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd&&<ProductForm initial={{id:uid(),name:'',price:'',category:CATEGORIES[0],photo:null,variants:[]}} t={t} onClose={()=>setShowAdd(false)} onSubmit={data=>{updateItems(prev=>[...prev,data]);toast(`✓ "${data.name}" ${t.addedToast}`);}}/>}
      {showVS&&<VisualSearch items={items} t={t} onClose={()=>setShowVS(false)} onMatch={handleMatch}/>}
      <ToastContainer toasts={toasts}/>
    </div>
  );
}
