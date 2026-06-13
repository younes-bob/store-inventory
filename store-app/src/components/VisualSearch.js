import { useState, useRef, useEffect } from 'react';
import { fmt, isLight } from '../utils';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

export default function VisualSearch({ items, onMatch, onClose }) {
  const inputId  = useRef('vs' + Date.now());
  const abortRef = useRef(null);
  const [photo,   setPhoto]  = useState(null);
  const [status,  setStatus] = useState('idle'); // idle|analyzing|match|nomatch|error
  const [matchId, setMatchId] = useState(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setStatus('idle'); setMatchId(null); };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  async function analyze() {
    if (!photo || items.length === 0) return;
    setStatus('analyzing');
    abortRef.current = new AbortController();
    const catalogue = items.map(it =>
      `ID:${it.id} | "${it.name}" | ${it.category} | Colors:${[...new Set(it.variants.map(v=>v.color))].join(',')} | $${it.price}`
    ).join('\n');
    const base64    = photo.split(',')[1];
    const mediaType = photo.split(';')[0].split(':')[1] || 'image/jpeg';
    try {
      const res = await fetch(CLAUDE_API, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role:'user', content:[
            { type:'image', source:{ type:'base64', media_type:mediaType, data:base64 } },
            { type:'text',  text:`You are a clothing inventory matching assistant.\n\nCatalogue:\n${catalogue}\n\nFind the best matching product from the photo. Respond ONLY with valid JSON:\n{"matchId":"<exact ID>","confidence":"high|medium|low","reason":"<short>"}\nIf no match: {"matchId":null,"confidence":"none","reason":"<why>"}` }
          ]}]
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data  = await res.json();
      const raw   = (data.content || []).map(c=>c.text||'').join('').trim();
      const json  = JSON.parse(raw.replace(/```json|```/g,'').trim());
      if (json.matchId && items.find(i => String(i.id) === String(json.matchId))) {
        setMatchId(String(json.matchId)); setStatus('match');
      } else {
        setStatus('nomatch');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      setStatus('error');
    }
  }

  const matchedItem = matchId ? items.find(i => String(i.id) === String(matchId)) : null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(17,24,39,.6)', zIndex:300, backdropFilter:'blur(3px)' }}/>
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:301, background:'#fff', borderRadius:22, width:'min(440px,95vw)', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.28)', padding:'28px 26px 30px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ margin:0, fontSize:19, fontWeight:900 }}>📸 Search by Photo</h2>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>Take or upload a photo to find a product</p>
          </div>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:18, color:'#6b7280' }}>×</button>
        </div>

        <label htmlFor={inputId.current} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:210, borderRadius:16, cursor:'pointer', overflow:'hidden', border:photo?'none':'2.5px dashed #a5b4fc', background:photo?'#111':'linear-gradient(135deg,#eef2ff,#f5f3ff)', position:'relative', boxSizing:'border-box', marginBottom:16 }}>
          {photo
            ? <img src={photo} alt="search" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            : <><div style={{ fontSize:48, marginBottom:8 }}>📷</div><p style={{ margin:0, fontWeight:700, fontSize:14, color:'#6366f1' }}>Tap to take / upload photo</p><p style={{ margin:'4px 0 0', fontSize:12, color:'#9ca3af' }}>Best with a clear, well-lit photo</p></>
          }
          {photo && status==='idle' && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ color:'#fff', fontWeight:700, fontSize:13, background:'rgba(0,0,0,.5)', padding:'7px 14px', borderRadius:9, margin:0 }}>Tap to change</p>
            </div>
          )}
        </label>
        <input id={inputId.current} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>

        {photo && status==='idle' && (
          <button onClick={analyze} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:15, cursor:'pointer' }}>
            🔍 Find this product
          </button>
        )}

        {status==='analyzing' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin .8s linear infinite', margin:'0 auto 14px' }}/>
            <p style={{ fontWeight:700, color:'#6366f1', fontSize:15, margin:0 }}>Analyzing photo…</p>
            <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>Comparing with {items.length} product{items.length!==1?'s':''}…</p>
          </div>
        )}

        {status==='match' && matchedItem && (
          <div style={{ borderRadius:14, border:'2px solid #bbf7d0', background:'#f0fdf4', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'#dcfce7', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>✅</span><span style={{ fontWeight:800, fontSize:15, color:'#15803d' }}>Match found!</span>
            </div>
            <div style={{ display:'flex', gap:14, padding:'14px 16px', alignItems:'center' }}>
              <div style={{ width:60, height:60, borderRadius:10, overflow:'hidden', flexShrink:0, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #e5e7eb' }}>
                {matchedItem.photo ? <img src={matchedItem.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:26 }}>👕</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:16, marginBottom:3 }}>{matchedItem.name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:900, color:'#4338ca', fontSize:15 }}>{fmt(matchedItem.price)}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#f3f0ff', color:'#7c3aed', fontWeight:600 }}>{matchedItem.category}</span>
                </div>
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {[...new Map(matchedItem.variants.map(v=>[v.color,v.hex])).entries()].map(([n,h])=>(
                    <span key={n} title={n} style={{ width:13, height:13, borderRadius:'50%', background:h, display:'inline-block', border:isLight(h)?'1.5px solid #ccc':'1.5px solid rgba(0,0,0,.1)' }}/>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'0 14px 14px', display:'flex', gap:10 }}>
              <button onClick={()=>{ onMatch(matchId); onClose(); }} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:'pointer' }}>→ Go to product</button>
              <button onClick={()=>{ setStatus('idle'); setMatchId(null); setPhoto(null); }} style={{ padding:'11px 14px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#6b7280' }}>Try again</button>
            </div>
          </div>
        )}

        {(status==='nomatch' || status==='error') && (
          <div style={{ textAlign:'center', padding:'20px 16px', background:'#fef2f2', borderRadius:14, border:'1.5px solid #fecaca' }}>
            <div style={{ fontSize:38, marginBottom:8 }}>😕</div>
            <p style={{ fontWeight:700, color:'#dc2626', fontSize:14, margin:'0 0 14px' }}>
              {status==='error' ? 'Could not analyze. Check connection and try again.' : 'No match found. Try a clearer or closer photo.'}
            </p>
            <button onClick={()=>{ setStatus('idle'); setMatchId(null); setPhoto(null); }} style={{ padding:'9px 20px', background:'#fff', border:'1.5px solid #fca5a5', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', color:'#dc2626' }}>Try another photo</button>
          </div>
        )}
      </div>
    </>
  );
}
