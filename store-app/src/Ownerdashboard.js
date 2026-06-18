import { useState, useEffect } from 'react';
import { getCurrentUser, getMyStores, createStore, deleteStore, signOutUser, onAuthChange } from '../supabase';
import { Spinner, Modal } from '../components/ui';

function CreateStoreModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!n) { setErr('Please enter a store name.'); return; }
    setBusy(true);
    const ok = await onCreate(n);
    setBusy(false);
    if (!ok) setErr('Could not create store. Please try again.');
  }

  return (
    <Modal onClose={onClose} width={420}>
      <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:900, color:'#111' }}>🏪 New Store</h2>
      <p style={{ margin:'0 0 20px', fontSize:13, color:'#6b7280' }}>Give your store a name. You'll get a unique access code your staff can use to log in.</p>
      <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Store Name</label>
      <input value={name} onChange={e=>{ setName(e.target.value); setErr(''); }}
        onKeyDown={e=>e.key==='Enter' && submit()}
        placeholder="e.g. Downtown Branch" autoFocus maxLength={60}
        style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:11, border:`2px solid ${err?'#fca5a5':'#e5e7eb'}`, fontSize:15, outline:'none', marginBottom:6 }}/>
      {err && <p style={{ color:'#dc2626', fontSize:13, fontWeight:600, margin:'4px 0 12px' }}>{err}</p>}
      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <button onClick={submit} disabled={busy}
          style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:busy?'not-allowed':'pointer', opacity:busy?0.7:1 }}>
          {busy ? '…' : 'Create Store'}
        </button>
        <button onClick={onClose} style={{ padding:'13px 20px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#6b7280' }}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function OwnerDashboard({ onEnterStore }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = not logged in
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      setUser(u);
      if (u) {
        const s = await getMyStores(u.id);
        if (mounted) setStores(s);
      }
      setLoading(false);
    })();
    const cleanup = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        const s = await getMyStores(u.id);
        setStores(s);
      } else {
        setStores([]);
      }
    });
    return () => { mounted = false; cleanup(); };
  }, []);

  async function handleCreate(name) {
    const store = await createStore(user.id, name);
    if (!store) return false;
    setStores(prev => [...prev, store]);
    setShowCreate(false);
    return true;
  }

  async function handleDelete(storeId) {
    if (!window.confirm('Delete this store? This cannot be undone and all its products and sales will be lost.')) return;
    setDeleting(storeId);
    const ok = await deleteStore(storeId, user.id);
    if (ok) setStores(prev => prev.filter(s => s.id !== storeId));
    setDeleting(null);
  }

  if (loading || user === undefined) return <Spinner label="Loading your dashboard…"/>;

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0c29,#302b63,#24243e)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'40px 36px', width:'min(420px,100%)', textAlign:'center', boxShadow:'0 32px 80px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize:44, marginBottom:14 }}>🔒</div>
        <h2 style={{ margin:'0 0 10px', fontSize:20, fontWeight:900, color:'#111' }}>Sign-in link expired or invalid</h2>
        <p style={{ color:'#6b7280', fontSize:14, margin:'0 0 20px' }}>Please request a new sign-in link to access your dashboard.</p>
        <a href="/signup" style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:14, textDecoration:'none' }}>
          Get a new link
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
      <div style={{ background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', padding:'24px 28px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ color:'#fff', margin:0, fontSize:22, fontWeight:900 }}>🏪 My Stores</h1>
            <p style={{ color:'rgba(255,255,255,.5)', margin:'4px 0 0', fontSize:13 }}>{user.email}</p>
          </div>
          <button onClick={signOutUser} style={{ padding:'9px 18px', background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', borderRadius:10, cursor:'pointer', color:'#fff', fontWeight:700, fontSize:13 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px 60px' }}>
        <button onClick={()=>setShowCreate(true)}
          style={{ marginBottom:24, padding:'13px 24px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(79,70,229,.35)' }}>
          + New Store
        </button>

        {stores.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#9ca3af' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📦</div>
            <p style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>You don't have any stores yet.</p>
            <p style={{ fontSize:13 }}>Click "+ New Store" above to create your first one.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {stores.map(store => (
              <div key={store.id} style={{ background:'#fff', borderRadius:16, border:'1.5px solid #f0f0f0', boxShadow:'0 2px 10px rgba(0,0,0,.05)', padding:'20px 22px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ width:48, height:48, borderRadius:13, background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🏪</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:'#111' }}>{store.name}</div>
                  <div style={{ marginTop:5 }}>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#6366f1', background:'#eef2ff', padding:'3px 10px', borderRadius:8, letterSpacing:2 }}>{store.code}</span>
                    <span style={{ marginLeft:10, fontSize:12, color:'#9ca3af' }}>Share this code with your staff to log in</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={()=>onEnterStore(store)}
                    style={{ padding:'10px 18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                    Open Store
                  </button>
                  <button onClick={()=>handleDelete(store.id)} disabled={deleting===store.id}
                    style={{ padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', color:'#dc2626' }}>
                    {deleting===store.id ? '…' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:24, padding:'16px 20px', background:'#fffbeb', borderRadius:12, border:'1px solid #fcd34d' }}>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#92400e' }}>
            💡 New stores start on the <strong>Free plan</strong> (1 store, up to 30 products). You can upgrade anytime from inside the store.
          </p>
        </div>
      </div>

      {showCreate && <CreateStoreModal onClose={()=>setShowCreate(false)} onCreate={handleCreate}/>}
    </div>
  );
}
