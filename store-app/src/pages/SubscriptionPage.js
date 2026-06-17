import { useState, useEffect } from 'react';
import { PLANS, OWNER_WHATSAPP } from '../config';
import { getSubscription, isSubscriptionActive } from '../supabase';
import { fmt } from '../utils';

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionPage({ store, onBack }) {
  const [sub, setSub] = useState(null);

  useEffect(() => {
    getSubscription(store.id).then(setSub);
  }, [store.id]);

  if (!sub) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:600 }}>
      ⟳ Loading…
    </div>
  );

  const plan   = PLANS[sub.plan] || PLANS.free;
  const active = isSubscriptionActive(sub);
  const days   = daysLeft(sub.expires_at);
  const expired = sub.plan !== 'free' && !active;

  function contactWhatsApp(planName) {
    const msg = encodeURIComponent(`Hello, I want to subscribe to the ${planName} plan for my store: ${store.name} (${store.code})`);
    window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${msg}`, '_blank');
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', padding:'20px 24px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>← Back</button>
          <div>
            <h1 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:900 }}>💳 Subscription</h1>
            <p style={{ color:'rgba(255,255,255,.5)', margin:'2px 0 0', fontSize:12 }}>{store.name}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'24px 20px 60px' }}>

        {/* Current plan card */}
        <div style={{ background: plan.gradient, borderRadius:20, padding:'24px 28px', marginBottom:24, boxShadow:'0 8px 32px rgba(0,0,0,.15)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Your Current Plan</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#fff', marginBottom:6 }}>{plan.name}</div>
          {expired && <div style={{ fontSize:14, fontWeight:800, color:'#fecaca', marginBottom:4 }}>⚠️ Plan expired — features locked</div>}
          {!expired && sub.plan !== 'free' && days !== null && (
            <div style={{ fontSize:13, fontWeight:700, color: days<7?'#fcd34d':'rgba(255,255,255,.8)' }}>
              {days === 0 ? '⚠️ Expires today!' : `✓ ${days} day${days!==1?'s':''} remaining`}
            </div>
          )}
          {sub.plan === 'free' && <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', fontWeight:600 }}>Upgrade to unlock all features</div>}
        </div>

        {/* Features of current plan */}
        <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:24, border:'1.5px solid #f0f0f0', boxShadow:'0 2px 10px rgba(0,0,0,.05)' }}>
          <h3 style={{ margin:'0 0 14px', fontSize:15, fontWeight:800, color:'#111' }}>What's included in your plan</h3>
          {plan.features.map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ color:plan.color, fontWeight:900, fontSize:15 }}>✓</span>
              <span style={{ fontSize:13, color:'#374151' }}>{f}</span>
            </div>
          ))}
          {plan.missing.map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, opacity:.45 }}>
              <span style={{ color:'#9ca3af', fontWeight:900, fontSize:15 }}>✗</span>
              <span style={{ fontSize:13, color:'#9ca3af' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Upgrade options */}
        {(sub.plan === 'free' || expired) && (
          <>
            <h3 style={{ margin:'0 0 14px', fontSize:16, fontWeight:800, color:'#111' }}>🚀 Upgrade your plan</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
              {Object.values(PLANS).filter(p => p.id !== 'free').map(p => (
                <div key={p.id} style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${p.color}33`, padding:'18px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.05)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:p.gradient, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {p.id==='standard'?'⭐':'🚀'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:16, color:'#111', marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:13, color:'#6b7280' }}>{p.features.join(' · ')}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:900, fontSize:18, color:p.color }}>{fmt(p.price)}<span style={{ fontSize:11, fontWeight:600, color:'#9ca3af' }}>/mo</span></div>
                    <button onClick={()=>contactWhatsApp(p.name)}
                      style={{ marginTop:8, padding:'8px 18px', background:p.gradient, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
                      📲 Contact to Subscribe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Renew option for active paid plans */}
        {sub.plan !== 'free' && active && (
          <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', border:'1.5px solid #e0e7ff', marginBottom:24 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:15, fontWeight:800, color:'#111' }}>🔄 Renew your plan</h3>
            <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 14px' }}>Contact us before your plan expires to renew and keep uninterrupted access.</p>
            <button onClick={()=>contactWhatsApp(plan.name)}
              style={{ padding:'11px 24px', background:plan.gradient, color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:'pointer' }}>
              📲 WhatsApp to Renew
            </button>
          </div>
        )}

        {/* How it works */}
        <div style={{ background:'#fffbeb', borderRadius:12, padding:'16px 20px', border:'1px solid #fcd34d' }}>
          <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:800, color:'#92400e' }}>💡 How to subscribe:</p>
          <ol style={{ margin:0, paddingLeft:20, fontSize:13, color:'#92400e', lineHeight:1.9 }}>
            <li>Click <strong>"Contact to Subscribe"</strong> on the plan you want</li>
            <li>Send payment via <strong>BaridiMob, CCP, or cash</strong></li>
            <li>Your plan will be activated within minutes</li>
            <li>Refresh the app to see your new plan</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
