import { useState } from 'react';
import { STORES, ADMIN_PASS } from '../config';
import { getAllStoresData } from '../supabase';
import { fmt, fmtDate, isToday, exportCSV } from '../utils';
import { Spinner } from '../components/ui';

export default function AdminPanel({ t, lang, setLang, onBack }) {
  const [authed,       setAuthed]       = useState(false);
  const [pass,         setPass]         = useState('');
  const [passErr,      setPassErr]      = useState('');
  const [storesData,   setStoresData]   = useState({});
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  async function fetchAll() {
    const ids  = STORES.map(s => s.id);
    return await getAllStoresData(ids);
  }

  async function handleLogin() {
    if (pass !== ADMIN_PASS) { setPassErr('Wrong password.'); return; }
    setAuthed(true); setLoading(true);
    setStoresData(await fetchAll());
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    setStoresData(await fetchAll());
    setRefreshing(false);
  }

  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'40px 36px', width:'min(380px,100%)', boxShadow:'0 32px 80px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🔐</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900 }}>Admin Panel</h2>
          <p style={{ margin:'6px 0 0', color:'#6b7280', fontSize:13 }}>Enter your admin password</p>
        </div>
        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Password</label>
        <input type="password" value={pass} onChange={e=>{ setPass(e.target.value); setPassErr(''); }}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus
          style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:11, border:`2px solid ${passErr?'#fca5a5':'#e5e7eb'}`, fontSize:15, outline:'none', marginBottom:6 }}/>
        {passErr && <p style={{ color:'#dc2626', fontSize:13, fontWeight:600, margin:'4px 0 12px' }}>{passErr}</p>}
        <button onClick={handleLogin}
          style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#1e1b4b,#4c1d95)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:15, cursor:'pointer', marginTop:8, marginBottom:16 }}>
          Enter
        </button>
        <div style={{ textAlign:'center' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:13, fontWeight:600 }}>← Back to login</button>
        </div>
      </div>
    </div>
  );

  if (loading) return <Spinner label="Loading all stores…"/>;

  if (selectedStore) {
    const d       = storesData[selectedStore.id] || { items:[], sales:[] };
    const rev     = d.sales.filter(r=>!r.returned).reduce((s,r)=>s+r.total,0);
    const todayRev = d.sales.filter(r=>isToday(r.ts)&&!r.returned).reduce((s,r)=>s+r.total,0);
    return (
      <div style={{ minHeight:'100vh', background:'#f5f6fa' }}>
        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding:'20px 28px' }}>
          <div style={{ maxWidth:900, margin:'0 auto', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <button onClick={()=>setSelectedStore(null)} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, padding:'8px 16px', cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>← All Stores</button>
            <div>
              <h2 style={{ color:'#fff', margin:0, fontSize:20, fontWeight:900 }}>🏪 {selectedStore.name}</h2>
              <p style={{ color:'#a5b4fc', margin:'2px 0 0', fontSize:12 }}>Code: <strong style={{ letterSpacing:2 }}>{selectedStore.code}</strong></p>
            </div>
            <button onClick={async()=>{ setRefreshing(true); setStoresData(await fetchAll()); setRefreshing(false); }}
              style={{ marginLeft:'auto', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
              {refreshing?'…':'🔄 Refresh'}
            </button>
          </div>
        </div>
        <div style={{ maxWidth:900, margin:'24px auto', padding:'0 20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14, marginBottom:28 }}>
            {[
              { icon:'📦', label:'Products',       value:d.items.length,  bg:'linear-gradient(135deg,#4f46e5,#7c3aed)' },
              { icon:'💰', label:'Total Revenue',   value:fmt(rev),        bg:'linear-gradient(135deg,#059669,#0d9488)' },
              { icon:'🛍️', label:'Total Sales',    value:d.sales.length,  bg:'linear-gradient(135deg,#d97706,#b45309)' },
              { icon:'📅', label:"Today's Revenue", value:fmt(todayRev),   bg:'linear-gradient(135deg,#0284c7,#0369a1)' },
            ].map(s=>(
              <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:'16px 18px', boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:21, fontWeight:900, color:'#fff' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #f0f0f0', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f3f4f6', fontWeight:800, fontSize:15 }}>📦 Products ({d.items.length})</div>
              {d.items.length===0
                ? <p style={{ textAlign:'center', padding:'30px', color:'#9ca3af', fontSize:13 }}>No products yet.</p>
                : d.items.map(item=>(
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderTop:'1px solid #f3f4f6' }}>
                      <div style={{ width:38, height:38, borderRadius:8, overflow:'hidden', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {item.photo?<img src={item.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<span style={{ fontSize:16 }}>👕</span>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize:11, color:'#6b7280' }}>{fmt(item.price)} · {item.variants.reduce((s,v)=>s+v.stock,0)} in stock</div>
                      </div>
                    </div>
                  ))
              }
            </div>
            <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #f0f0f0', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #f3f4f6', fontWeight:800, fontSize:15 }}>🛍️ Recent Sales</div>
              {d.sales.length===0
                ? <p style={{ textAlign:'center', padding:'30px', color:'#9ca3af', fontSize:13 }}>No sales yet.</p>
                : [...d.sales].sort((a,b)=>b.ts-a.ts).slice(0,20).map(s=>(
                    <div key={s.id} style={{ padding:'10px 18px', borderTop:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.itemName}</div>
                        <div style={{ fontSize:11, color:'#9ca3af' }}>{s.color}/{s.size} · x{s.qty} · {fmtDate(s.ts)}</div>
                      </div>
                      <div style={{ fontWeight:900, color:'#059669', fontSize:14, flexShrink:0 }}>{fmt(s.total)}</div>
                    </div>
                  ))
              }
            </div>
          </div>
          {d.sales.length > 0 && (
            <div style={{ marginTop:16, textAlign:'right' }}>
              <button onClick={()=>exportCSV(d.sales, selectedStore.name)}
                style={{ padding:'8px 18px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700, color:'#15803d' }}>
                ⬇️ Export {selectedStore.name} CSV
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const allItems = Object.values(storesData).flatMap(d=>d.items);
  const allSales = Object.values(storesData).flatMap(d=>d.sales);
  const totalRev = allSales.filter(r=>!r.returned).reduce((s,r)=>s+r.total,0);
  const todayRev = allSales.filter(r=>isToday(r.ts)&&!r.returned).reduce((s,r)=>s+r.total,0);

  return (
    <div style={{ minHeight:'100vh', background:'#f5f6fa' }}>
      <div style={{ background:'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding:'24px 28px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', margin:0, fontSize:22, fontWeight:900 }}>🔐 Admin Panel</h1>
            <p style={{ color:'#a5b4fc', margin:'4px 0 0', fontSize:13 }}>{STORES.length} stores · live data from Supabase</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={refresh} disabled={refreshing}
              style={{ padding:'8px 14px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, cursor:refreshing?'not-allowed':'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
              {refreshing?'…':'🔄 Refresh'}
            </button>
            <button onClick={onBack}
              style={{ padding:'8px 16px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:14, marginBottom:28 }}>
          {[
            { icon:'🏪', label:'Stores',          value:STORES.length,    bg:'linear-gradient(135deg,#4f46e5,#7c3aed)' },
            { icon:'📦', label:'Total Products',   value:allItems.length,  bg:'linear-gradient(135deg,#0284c7,#0369a1)' },
            { icon:'💰', label:'Total Revenue',    value:fmt(totalRev),    bg:'linear-gradient(135deg,#059669,#0d9488)' },
            { icon:'📅', label:"Today's Revenue",  value:fmt(todayRev),    bg:'linear-gradient(135deg,#d97706,#b45309)' },
          ].map(s=>(
            <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:'16px 18px', boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>
              <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:21, fontWeight:900, color:'#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <h3 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#1e1b4b' }}>🏪 All Stores</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {STORES.map(store => {
            const d   = storesData[store.id] || { items:[], sales:[] };
            const rev = d.sales.reduce((s,r)=>s+r.total,0);
            const oos = d.items.filter(i=>i.variants.reduce((s,v)=>s+v.stock,0)===0).length;
            return (
              <div key={store.id} style={{ background:'#fff', borderRadius:14, border:'1.5px solid #f0f0f0', boxShadow:'0 2px 8px rgba(0,0,0,.05)', padding:'18px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🏪</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:'#111' }}>{store.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:5, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#6366f1', background:'#eef2ff', padding:'3px 10px', borderRadius:8, letterSpacing:2 }}>{store.code}</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>📦 {d.items.length} products</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>🛍️ {d.sales.length} sales</span>
                    <span style={{ fontSize:12, color:'#6b7280' }}>💰 {fmt(rev)}</span>
                    {oos>0 && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#fef2f2', color:'#dc2626', fontWeight:700 }}>⚠️ {oos} out of stock</span>}
                  </div>
                </div>
                <button onClick={()=>setSelectedStore(store)}
                  style={{ padding:'9px 18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  👁️ View
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:24, padding:'16px 20px', background:'#fffbeb', borderRadius:12, border:'1px solid #fcd34d' }}>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#92400e' }}>
            💡 <strong>To add stores:</strong> edit the <code style={{ background:'#fef3c7', padding:'1px 5px', borderRadius:4 }}>STORES</code> array in <code style={{ background:'#fef3c7', padding:'1px 5px', borderRadius:4 }}>src/config.js</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
