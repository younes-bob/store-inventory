import { useState } from 'react';
import { STORES } from '../config';

export default function LoginScreen({ onLogin, onAdmin }) {
  const [code, setCode] = useState('');
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  function handleLogin() {
    const c = code.trim().toUpperCase();
    if (!c) { setErr('Please enter your access code.'); return; }
    setBusy(true);
    setTimeout(() => {
      const store = STORES.find(s => s.code === c);
      if (store) { onLogin(store); }
      else { setErr('Invalid access code. Check with your manager.'); setBusy(false); }
    }, 200);
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4c1d95 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'44px 36px', width:'min(420px,100%)', boxShadow:'0 32px 80px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🏪</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:'#111827' }}>Store Inventory</h1>
          <p style={{ margin:'8px 0 0', color:'#6b7280', fontSize:14 }}>Enter your store access code to continue</p>
        </div>
        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Access Code</label>
        <input
          value={code}
          onChange={e=>{ setCode(e.target.value.toUpperCase()); setErr(''); }}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          placeholder="e.g. MAIN01"
          autoFocus
          maxLength={12}
          style={{ width:'100%', boxSizing:'border-box', padding:'14px 16px', borderRadius:12, border:`2px solid ${err?'#fca5a5':'#e5e7eb'}`, fontSize:22, fontWeight:800, letterSpacing:4, textAlign:'center', outline:'none', color:'#111', textTransform:'uppercase', marginBottom:6 }}
        />
        {err && <p style={{ color:'#dc2626', fontSize:13, fontWeight:600, margin:'0 0 10px', textAlign:'center' }}>{err}</p>}
        <button onClick={handleLogin} disabled={busy}
          style={{ width:'100%', padding:'14px', background:busy?'#9ca3af':'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:16, cursor:busy?'not-allowed':'pointer', boxShadow:'0 4px 16px rgba(79,70,229,.35)', marginBottom:20, marginTop:6 }}>
          {busy ? '…' : 'Enter Store'}
        </button>
        <div style={{ textAlign:'center' }}>
          <button onClick={onAdmin} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:12, fontWeight:600, textDecoration:'underline' }}>
            Admin Access
          </button>
        </div>
      </div>
    </div>
  );
}
