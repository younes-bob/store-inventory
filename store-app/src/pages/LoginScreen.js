import { useState } from 'react';
import { STORES } from '../config';

export default function LoginScreen({ t, lang, setLang, onLogin, onAdmin }) {
  const [code, setCode] = useState('');
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  function handleLogin() {
    const c = code.trim().toUpperCase();
    if (!c) { setErr(t.invalidCode); return; }
    setBusy(true);
    setTimeout(() => {
      const store = STORES.find(s => s.code === c);
      if (store) { onLogin(store); }
      else { setErr(t.invalidCode); setBusy(false); }
    }, 200);
  }

  return (
    <div dir={t.dir} style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, fontFamily: lang==='ar'?"'Segoe UI',Tahoma,sans-serif":"'Inter',system-ui,sans-serif" }}>
      <div style={{ position:'absolute', top:20, right:20, display:'flex', gap:6 }}>
        {['en','fr','ar'].map(l => (
          <button key={l} onClick={()=>setLang(l)} style={{ padding:'6px 12px', borderRadius:20, border:'none', fontWeight:700, fontSize:12, cursor:'pointer', background:lang===l?'#fff':'rgba(255,255,255,0.15)', color:lang===l?'#302b63':'#fff', transition:'all .2s' }}>
            {l==='en'?'EN':l==='fr'?'FR':'ع'}
          </button>
        ))}
      </div>
      <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:28, padding:'48px 40px', width:'min(400px,100%)', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(99,102,241,0.4)' }}>🏪</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#fff', letterSpacing:-0.5 }}>{t.appName}</h1>
          <p style={{ margin:'8px 0 0', color:'rgba(255,255,255,0.5)', fontSize:14 }}>{t.tagline}</p>
        </div>
        <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>{t.accessCode}</label>
        <input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setErr('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          placeholder="e.g. MAIN01" autoFocus maxLength={12}
          style={{ width:'100%', boxSizing:'border-box', padding:'16px', borderRadius:14, border:`2px solid ${err?'#f87171':'rgba(255,255,255,0.2)'}`, background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:22, fontWeight:800, letterSpacing:4, textAlign:'center', outline:'none', marginBottom:8, backdropFilter:'blur(10px)' }}/>
        {err && <p style={{ color:'#fca5a5', fontSize:13, fontWeight:600, margin:'0 0 12px', textAlign:'center' }}>{err}</p>}
        <button onClick={handleLogin} disabled={busy}
          style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:16, cursor:busy?'not-allowed':'pointer', boxShadow:'0 8px 24px rgba(99,102,241,0.4)', marginTop:4, marginBottom:20, transition:'opacity .2s', opacity:busy?.7:1 }}>
          {busy ? '…' : t.enterStore}
        </button>
        <div style={{ textAlign:'center' }}>
          <button onClick={onAdmin} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:12, fontWeight:600, textDecoration:'underline' }}>
            {t.adminAccess}
          </button>
        </div>
      </div>
    </div>
  );
}
