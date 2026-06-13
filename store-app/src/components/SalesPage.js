import { useState, useMemo } from 'react';
import { fmt, fmtDate, isToday, isLight, exportCSV } from '../utils';

export default function SalesPage({ sales, onClear, storeName }) {
  const [filter, setFilter] = useState('all');
  const now = Date.now();

  const filtered = useMemo(() => {
    const s = [...sales].sort((a,b) => b.ts - a.ts);
    if (filter==='today') return s.filter(r => isToday(r.ts));
    if (filter==='week')  return s.filter(r => r.ts > now - 7*24*3600*1000);
    return s;
  }, [sales, filter, now]);

  const rev      = filtered.reduce((s,r) => s+r.total, 0);
  const sold     = filtered.reduce((s,r) => s+r.qty, 0);
  const todayRev = sales.filter(r => isToday(r.ts)).reduce((s,r) => s+r.total, 0);

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px 60px' }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { icon:'💰', label:'Revenue (shown)',     value:fmt(rev),        bg:'linear-gradient(135deg,#059669,#0d9488)' },
          { icon:'📦', label:'Items Sold',          value:sold+' pcs',     bg:'linear-gradient(135deg,#4f46e5,#7c3aed)' },
          { icon:'📅', label:"Today's Revenue",     value:fmt(todayRev),   bg:'linear-gradient(135deg,#d97706,#b45309)' },
          { icon:'🧾', label:'Total Transactions',  value:filtered.length, bg:'linear-gradient(135deg,#0284c7,#0369a1)' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:'16px 18px', boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>
            <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.75)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:21, fontWeight:900, color:'#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #f0f0f0', boxShadow:'0 2px 12px rgba(0,0,0,.05)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f3f4f6', flexWrap:'wrap', gap:10 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800 }}>Sales History</h3>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {/* Time filter */}
            <div style={{ display:'flex', background:'#f3f4f6', borderRadius:9, padding:3, gap:2 }}>
              {[['all','All'],['today','Today'],['week','7 days']].map(([v,l]) => (
                <button key={v} onClick={()=>setFilter(v)}
                  style={{ padding:'5px 12px', borderRadius:7, border:'none', fontWeight:700, fontSize:12, cursor:'pointer',
                    background:filter===v?'#fff':'transparent', color:filter===v?'#111':'#6b7280',
                    boxShadow:filter===v?'0 1px 4px rgba(0,0,0,.1)':'none' }}>
                  {l}
                </button>
              ))}
            </div>
            {sales.length > 0 && (
              <>
                <button onClick={()=>exportCSV(sales, storeName)}
                  style={{ padding:'6px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, color:'#15803d' }}>
                  ⬇️ Export CSV
                </button>
                <button onClick={()=>{ if(window.confirm('Clear all sales history? This cannot be undone.')) onClear(); }}
                  style={{ padding:'6px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, color:'#dc2626' }}>
                  🗑️ Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {filtered.length === 0
          ? <div style={{ textAlign:'center', padding:'50px 20px', color:'#9ca3af' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <p style={{ fontSize:14, fontWeight:600 }}>No sales {filter!=='all'?'in this period':'recorded yet'}.</p>
            </div>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f9fafb' }}>
                    {['Date','Product','Color / Size','Qty','Unit Price','Total','Note'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#6b7280', fontSize:11, textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s,i) => {
                    const hd = s.salePrice < s.originalPrice;
                    return (
                      <tr key={s.id} style={{ borderTop:'1px solid #f3f4f6', background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'11px 14px', color:'#6b7280', whiteSpace:'nowrap', fontSize:12 }}>{fmtDate(s.ts)}</td>
                        <td style={{ padding:'11px 14px', fontWeight:700 }}>{s.itemName}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:12, height:12, borderRadius:'50%', background:s.colorHex||'#9ca3af', display:'inline-block', border:isLight(s.colorHex||'')?'1.5px solid #ccc':'1.5px solid rgba(0,0,0,.1)' }}/>
                            <span>{s.color} / {s.size}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:700, textAlign:'center' }}>{s.qty}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ fontWeight:700 }}>{fmt(s.salePrice)}</div>
                          {hd && <div style={{ fontSize:11, color:'#9ca3af', textDecoration:'line-through' }}>{fmt(s.originalPrice)}</div>}
                          {hd && <div style={{ fontSize:10, padding:'1px 6px', background:'#fef3c7', borderRadius:6, color:'#b45309', fontWeight:700, display:'inline-block', marginTop:2 }}>{Math.round((1-s.salePrice/s.originalPrice)*100)}% off</div>}
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:900, color:'#059669', fontSize:14 }}>{fmt(s.total)}</td>
                        <td style={{ padding:'11px 14px', color:'#9ca3af', fontSize:12, fontStyle:s.note?'normal':'italic' }}>{s.note||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
