import { useState, useEffect } from 'react';
import { OWNER_PASS, STORES, PLANS } from '../config';
import { getAllSubscriptions, activateSubscription, revokeSubscription, isSubscriptionActive } from '../supabase';
import { fmt } from '../utils';

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
}

export default function OwnerPanel() {
  const [authed,    setAuthed]    = useState(false);
  const [pass,      setPass]      = useState('');
  const [passErr,   setPassErr]   = useState('');
  const [subs,      setSubs]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(null);
  const [msg,       setMsg]       = useState('');
  // Activate form state
  const [selStore,  setSelStore]  = useState(STORES[0].id);
  const [selPlan,   setSelPlan]   = useState('standard');
  const [selMonths, setSelMonths] = useState(1);
  const [selNote,   setSelNote]   = useState('');

  async function load() {
    setLoading(true);
    const all = await getAllSubscriptions();
    // Merge with STORES list so every store shows even without a subscription row
    const merged = STORES.map(store => {
      const found = all.find(s => s.store_id === store.id);
      return found || { store_id: store.id, plan: 'free', status: 'active', expires_at: null };
    });
    setSubs(merged);
    setLoading(false);
  }

  function handleLogin() {
    if (pass !== OWNER_PASS) { setPassErr('Wrong password.'); return; }
    setAuthed(true);
    load();
  }

  async function handleActivate() {
    setSaving('activate');
    setMsg('');
    const ok = await activateSubscription(selStore, selPlan, selMonths, selNote);
    if (ok) { setMsg('✅ Plan activated successfully!'); await load(); setSelNote(''); }
    else setMsg('❌ Failed. Try again.');
    setSaving(null);
  }

  async function handleRevoke(storeId) {
    if (!window.confirm('Downgrade this store to Free plan?')) return;
    setSaving(storeId);
    setMsg('');
    const ok = await revokeSubscription(storeId);
    if (ok) { setMsg('✅ Store downgraded to Free.'); await load(); }
    else setMsg('❌ Failed. Try again.');
    setSaving(null);
  }

  /* ── Login ── */
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'40px 36px', width:'min(380px,100%)', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>👑</div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:'#111' }}>Owner Panel</h2>
          <p style={{ margin:'6px 0 0', color:'#6b7280', fontSize:13 }}>Manage client subscriptions</p>
        </div>
        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Owner Password</label>
        <input type="password" value={pass} onChange={e=>{ setPass(e.target.value); setPassErr(''); }}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()} autoFocus
          style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:11, border:`2px solid ${passErr?'#fca5a5':'#e5e7eb'}`, fontSize:15, outline:'none', marginBottom:6 }}/>
        {passErr && <p style={{ color:'#dc2626', fontSize:13, fontWeight:600, margin:'4px 0 12px' }}>{passErr}</p>}
        <button onClick={handleLogin}
          style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#1e1b4b,#4c1d95)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:15, cursor:'pointer', marginTop:8 }}>
          Enter
        </button>
      </div>
    </div>
  );

  const storeName = id => STORES.find(s => s.id === id)?.name || id;
  const storeCode = id => STORES.find(s => s.id === id)?.code || id;

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1e1b4b,#4c1d95)', padding:'24px 28px' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', margin:0, fontSize:22, fontWeight:900 }}>👑 Owner Panel</h1>
            <p style={{ color:'#a5b4fc', margin:'4px 0 0', fontSize:13 }}>Manual subscription management · {STORES.length} stores</p>
          </div>
          <button onClick={load} disabled={loading}
            style={{ padding:'9px 18px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
            {loading ? '⟳ Loading…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 20px 60px' }}>

        {msg && (
          <div style={{ padding:'12px 18px', borderRadius:12, marginBottom:20, background: msg.startsWith('✅')?'#f0fdf4':'#fef2f2', border:`1px solid ${msg.startsWith('✅')?'#bbf7d0':'#fecaca'}`, fontWeight:700, fontSize:13, color: msg.startsWith('✅')?'#15803d':'#dc2626' }}>
            {msg}
          </div>
        )}

        {/* ── Activate Form ── */}
        <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e0e7ff', boxShadow:'0 4px 20px rgba(0,0,0,.07)', padding:'24px 28px', marginBottom:28 }}>
          <h2 style={{ margin:'0 0 20px', fontSize:17, fontWeight:900, color:'#111' }}>🎯 Activate / Upgrade a Store</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:16 }}>

            {/* Store */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Store</label>
              <select value={selStore} onChange={e=>setSelStore(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none', cursor:'pointer' }}>
                {STORES.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>

            {/* Plan */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Plan</label>
              <select value={selPlan} onChange={e=>setSelPlan(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none', cursor:'pointer' }}>
                <option value="standard">⭐ Standard — {fmt(990)}/mo</option>
                <option value="pro">🚀 Pro — {fmt(2490)}/mo</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Duration</label>
              <select value={selMonths} onChange={e=>setSelMonths(Number(e.target.value))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, background:'#fff', outline:'none', cursor:'pointer' }}>
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
              </select>
            </div>

            {/* Note */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Note (optional)</label>
              <input value={selNote} onChange={e=>setSelNote(e.target.value)} placeholder="e.g. paid cash, BaridiMob…"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}/>
            </div>
          </div>

          {/* Summary */}
          <div style={{ background:'#f8faff', borderRadius:12, padding:'14px 18px', marginBottom:16, border:'1px solid #e0e7ff', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontSize:13, color:'#374151' }}>
              <strong>{storeName(selStore)}</strong> → <strong style={{ color: PLANS[selPlan].color }}>{PLANS[selPlan].name}</strong> for <strong>{selMonths} month{selMonths>1?'s':''}</strong>
            </div>
            <div style={{ fontWeight:900, fontSize:16, color:'#4f46e5' }}>
              Total: {fmt(PLANS[selPlan].price * selMonths)}
            </div>
          </div>

          <button onClick={handleActivate} disabled={saving==='activate'}
            style={{ padding:'13px 32px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:14, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
            {saving==='activate' ? '⟳ Activating…' : '✅ Activate Plan'}
          </button>
        </div>

        {/* ── All Stores Status ── */}
        <h3 style={{ margin:'0 0 16px', fontSize:17, fontWeight:800, color:'#111' }}>🏪 All Stores — Subscription Status</h3>
        {loading
          ? <div style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:14 }}>Loading…</div>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {subs.map(sub => {
                const store  = STORES.find(s => s.id === sub.store_id);
                const plan   = PLANS[sub.plan] || PLANS.free;
                const active = isSubscriptionActive(sub);
                const days   = daysLeft(sub.expires_at);
                const expired = sub.plan !== 'free' && !active;

                return (
                  <div key={sub.store_id} style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${expired?'#fecaca':active&&sub.plan!=='free'?'#c7d2fe':'#f0f0f0'}`, boxShadow:'0 2px 10px rgba(0,0,0,.05)', padding:'18px 22px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                    {/* Icon */}
                    <div style={{ width:48, height:48, borderRadius:13, background: plan.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                      {plan.id==='free'?'🆓':plan.id==='standard'?'⭐':'🚀'}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontWeight:800, fontSize:16, color:'#111' }}>{store?.name}</span>
                        <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:800, color:'#6366f1', background:'#eef2ff', padding:'2px 8px', borderRadius:6, letterSpacing:2 }}>{store?.code}</span>
                        <span style={{ fontSize:12, fontWeight:800, padding:'3px 10px', borderRadius:20, background: expired?'#fef2f2':plan.id==='free'?'#f3f4f6':`${plan.color}22`, color: expired?'#dc2626':plan.id==='free'?'#6b7280':plan.color }}>
                          {expired ? '⚠️ Expired' : plan.name}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, color:'#6b7280' }}>
                        {sub.plan !== 'free' && (
                          <>
                            <span>📅 Activated: {fmtDate(sub.activated_at)}</span>
                            <span>⏳ Expires: {fmtDate(sub.expires_at)}</span>
                            {days !== null && (
                              <span style={{ fontWeight:700, color: days<7?'#dc2626':days<30?'#b45309':'#059669' }}>
                                {days === 0 ? '🔴 Expired today' : `${days} day${days!==1?'s':''} left`}
                              </span>
                            )}
                            {sub.note && <span>📝 {sub.note}</span>}
                          </>
                        )}
                        {sub.plan === 'free' && <span style={{ color:'#9ca3af' }}>No active subscription</span>}
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button onClick={()=>{ setSelStore(sub.store_id); setSelPlan('standard'); window.scrollTo({top:0,behavior:'smooth'}); }}
                        style={{ padding:'8px 16px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                        {sub.plan==='free'||expired ? '➕ Activate' : '🔄 Renew'}
                      </button>
                      {sub.plan !== 'free' && (
                        <button onClick={()=>handleRevoke(sub.store_id)} disabled={saving===sub.store_id}
                          style={{ padding:'8px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:10, fontWeight:700, fontSize:12, cursor:'pointer', color:'#dc2626' }}>
                          {saving===sub.store_id ? '…' : '🚫 Revoke'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        {/* Legend */}
        <div style={{ marginTop:24, padding:'16px 20px', background:'#fffbeb', borderRadius:12, border:'1px solid #fcd34d' }}>
          <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:800, color:'#92400e' }}>💡 How to give manual access:</p>
          <ol style={{ margin:0, paddingLeft:20, fontSize:13, color:'#92400e', lineHeight:1.8 }}>
            <li>Client pays you (cash, BaridiMob, CCP, etc.)</li>
            <li>Select their store, choose the plan and duration above</li>
            <li>Add a note about how they paid</li>
            <li>Click <strong>Activate Plan</strong> — done instantly</li>
            <li>Client refreshes the app and sees their plan is active</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
