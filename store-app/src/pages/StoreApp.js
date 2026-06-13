import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { getItems, setItems, getSales, setSales } from '../supabase';
import { CATEGORIES } from '../config';
import { uid, fmt, clamp, isToday } from '../utils';
import { ToastContainer, Spinner } from '../components/ui';
import ItemCard from '../components/ItemCard';
import ProductForm from '../components/ProductForm';
import SaleModal from '../components/SaleModal';
import SalesPage from '../components/SalesPage';
import VisualSearch from '../components/VisualSearch';
import useToast from '../hooks/useToast';

const CATS_ALL = ['All', ...CATEGORIES];

export default function StoreApp({ store, onLogout }) {
  const [tab,         setTab]         = useState('inventory');
  const [items,       setItemsState]  = useState([]);
  const [sales,       setSalesState]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [syncStatus,  setSyncStatus]  = useState('synced');
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState(0);
  const [filterStock, setFilterStock] = useState('All');
  const [showAdd,     setShowAdd]     = useState(false);
  const [showVS,      setShowVS]      = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs       = useRef({});
  const saveItemsTimer = useRef(null);
  const saveSalesTimer = useRef(null);
  const { toasts, show: toast } = useToast();

  // Load on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [i, s] = await Promise.all([getItems(store.id), getSales(store.id)]);
      if (mounted) { setItemsState(i); setSalesState(s); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [store.id]);

  // Poll every 10s for changes from other devices
  useEffect(() => {
    const iv = setInterval(async () => {
      const [i, s] = await Promise.all([getItems(store.id), getSales(store.id)]);
      setItemsState(i); setSalesState(s);
    }, 10000);
    return () => clearInterval(iv);
  }, [store.id]);

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(saveItemsTimer.current);
    clearTimeout(saveSalesTimer.current);
  }, []);

  // Clean up stale card refs
  useEffect(() => {
    const ids = new Set(items.map(i => String(i.id)));
    Object.keys(cardRefs.current).forEach(k => { if (!ids.has(k)) delete cardRefs.current[k]; });
  }, [items]);

  const persistItems = useCallback((next) => {
    setSyncStatus('saving');
    clearTimeout(saveItemsTimer.current);
    saveItemsTimer.current = setTimeout(async () => {
      const ok = await setItems(store.id, next);
      setSyncStatus(ok ? 'synced' : 'error');
      if (!ok) toast('⚠️ Could not save. Check your connection.', 'error');
    }, 600);
  }, [store.id, toast]);

  const persistSales = useCallback((next) => {
    setSyncStatus('saving');
    clearTimeout(saveSalesTimer.current);
    saveSalesTimer.current = setTimeout(async () => {
      const ok = await setSales(store.id, next);
      setSyncStatus(ok ? 'synced' : 'error');
      if (!ok) toast('⚠️ Could not save sale.', 'error');
    }, 600);
  }, [store.id, toast]);

  function updateItems(fn) {
    setItemsState(prev => { const next = typeof fn==='function' ? fn(prev) : fn; persistItems(next); return next; });
  }
  function updateSales(fn) {
    setSalesState(prev => { const next = typeof fn==='function' ? fn(prev) : fn; persistSales(next); return next; });
  }

  function handleMatch(id) {
    setTab('inventory'); setSearch(''); setFilterCat(0); setFilterStock('All');
    setHighlightId(String(id));
    setTimeout(() => {
      cardRefs.current[String(id)]?.scrollIntoView({ behavior:'smooth', block:'center' });
      setTimeout(() => setHighlightId(null), 3500);
    }, 150);
  }

  function handleSell(item, { color, size, qty, salePrice, originalPrice, note, total }) {
    updateItems(prev => prev.map(i => i.id!==item.id ? i : {
      ...i, variants: i.variants.map(v =>
        v.color===color && v.size===size ? { ...v, stock:clamp(v.stock-qty,0,9999) } : v
      )
    }));
    const colorHex = item.variants.find(v=>v.color===color)?.hex || '#9ca3af';
    updateSales(prev => [...prev, {
      id:uid(), ts:Date.now(),
      itemId:item.id, itemName:item.name,
      color, colorHex, size, qty, salePrice, originalPrice, note, total
    }]);
    toast(`✓ Sold ${qty}× ${item.name} for ${fmt(total)}`);
  }

  const filtered = useMemo(() => {
    const rc = filterCat===0 ? null : CATEGORIES[filterCat-1];
    const q  = search.toLowerCase();
    return items.filter(item => {
      const ms = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.variants.some(v=>v.color.toLowerCase().includes(q));
      const mc = !rc || item.category===rc;
      const tot = item.variants.reduce((s,v)=>s+v.stock,0);
      const mst = filterStock==='All' ? true : filterStock==='InStock' ? tot>5 : filterStock==='Low' ? (tot>0&&tot<=5) : tot===0;
      return ms && mc && mst;
    });
  }, [items, search, filterCat, filterStock]);

  const oos      = items.filter(i=>i.variants.reduce((s,v)=>s+v.stock,0)===0).length;
  const low      = items.filter(i=>{const t=i.variants.reduce((s,v)=>s+v.stock,0);return t>0&&t<=5;}).length;
  const todayRev = sales.filter(s=>isToday(s.ts)).reduce((a,s)=>a+s.total,0);

  const syncColor = syncStatus==='saving'?'#fbbf24':syncStatus==='error'?'#f87171':'#4ade80';
  const syncLabel = syncStatus==='saving'?'⟳ Saving…':syncStatus==='error'?'⚠️ Save failed':'✓ Synced';

  if (loading) return <Spinner label={`Loading ${store.name}…`}/>;

  return (
    <div style={{ minHeight:'100vh', background:'#f5f6fa' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4c1d95 100%)', padding:'22px 0 0' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'0 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:18 }}>
            <div>
              <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:0 }}>🏪 {store.name}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, flexWrap:'wrap' }}>
                <span style={{ color:'#a5b4fc', fontSize:12, fontFamily:'monospace', letterSpacing:2, background:'rgba(255,255,255,.1)', padding:'2px 8px', borderRadius:6 }}>{store.code}</span>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background:'rgba(0,0,0,.2)', color:syncColor }}>{syncLabel}</span>
              </div>
            </div>
            <button onClick={onLogout} style={{ padding:'8px 16px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
              ⬅️ Log Out
            </button>
          </div>
          {/* Stats bar */}
          <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,.08)', borderRadius:'14px 14px 0 0', overflow:'hidden' }}>
            {[
              { label:'Products',    value:items.length,      icon:'📦', warn:false   },
              { label:'Out of Stock', value:oos,              icon:'❌', warn:oos>0   },
              { label:'Low Stock',   value:low,               icon:'⚠️', warn:low>0   },
              { label:'Today',       value:fmt(todayRev),     icon:'💰', warn:false   },
            ].map((s,i,arr) => (
              <div key={i} style={{ flex:1, padding:'12px 10px', borderRight:i<arr.length-1?'1px solid rgba(255,255,255,.12)':'none' }}>
                <div style={{ fontSize:10, color:'#a5b4fc', marginBottom:2 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize:17, fontWeight:900, color:s.warn?'#fde68a':'#fff' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'0 20px', display:'flex' }}>
          {[['inventory','📦 Inventory'],['sales','📊 Sales']].map(([key,label]) => (
            <button key={key} onClick={()=>setTab(key)}
              style={{ padding:'14px 20px', background:'none', border:'none', cursor:'pointer', fontWeight:700, fontSize:14, color:tab===key?'#4f46e5':'#6b7280', borderBottom:tab===key?'3px solid #4f46e5':'3px solid transparent', transition:'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab==='sales'
        ? <SalesPage sales={sales} onClear={()=>updateSales([])} storeName={store.name}/>
        : (
          <div style={{ maxWidth:860, margin:'0 auto', padding:'18px 20px 0' }}>
            {/* Toolbar */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
              <div style={{ flex:1, minWidth:180, position:'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'#9ca3af' }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search by name, color, category…"
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px 10px 36px', borderRadius:11, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', background:'#fff' }}/>
              </div>
              <select value={filterCat} onChange={e=>setFilterCat(Number(e.target.value))}
                style={{ padding:'10px 12px', borderRadius:11, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none' }}>
                {CATS_ALL.map((c,i) => <option key={c} value={i}>{c}</option>)}
              </select>
              <select value={filterStock} onChange={e=>setFilterStock(e.target.value)}
                style={{ padding:'10px 12px', borderRadius:11, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none' }}>
                <option value="All">All Stock</option>
                <option value="InStock">In Stock</option>
                <option value="Low">Low Stock</option>
                <option value="Out">Out of Stock</option>
              </select>
              <button onClick={()=>setShowVS(true)} title="Search by photo"
                style={{ padding:'10px 14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:16, cursor:'pointer' }}>
                📸
              </button>
              <button onClick={()=>setShowAdd(true)}
                style={{ padding:'10px 18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
                + New Product
              </button>
            </div>

            {search && <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 12px' }}>{filtered.length} result{filtered.length!==1?'s':''} for "{search}"</p>}

            {filtered.length===0
              ? (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'#9ca3af' }}>
                  <div style={{ fontSize:52, marginBottom:12 }}>{search?'🔍':'📦'}</div>
                  <p style={{ fontSize:15, fontWeight:600 }}>{search?`No products matching "${search}"`:'No products yet. Add your first one!'}</p>
                  {!search && <button onClick={()=>setShowAdd(true)} style={{ marginTop:16, padding:'10px 24px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Add Product</button>}
                </div>
              )
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:12, paddingBottom:52 }}>
                  {filtered.map(item => (
                    <ItemCard key={item.id} item={item}
                      highlighted={highlightId===String(item.id)}
                      cardRef={el=>{ if(el) cardRefs.current[String(item.id)]=el; }}
                      onUpdate={u=>updateItems(prev=>prev.map(i=>i.id===u.id?u:i))}
                      onDelete={id=>{ updateItems(prev=>prev.filter(i=>i.id!==id)); toast('Product deleted.','warn'); }}
                      onSell={handleSell}/>
                  ))}
                </div>
              )
            }
          </div>
        )
      }

      {showAdd && (
        <ProductForm
          initial={{ id:uid(), name:'', price:'', category:CATEGORIES[0], photo:null, variants:[] }}
          title="✨ New Product" submitLabel="Create Product"
          onClose={()=>setShowAdd(false)}
          onSubmit={data=>{ updateItems(prev=>[...prev,data]); toast(`✓ "${data.name}" added.`); }}/>
      )}
      {showVS && <VisualSearch items={items} onClose={()=>setShowVS(false)} onMatch={handleMatch}/>}
      <ToastContainer toasts={toasts}/>
    </div>
  );
}
