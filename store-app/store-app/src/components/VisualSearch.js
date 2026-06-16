import { useState, useRef, useEffect } from 'react';
import { fmt, isLight } from '../utils';

export default function VisualSearch({ items, onMatch, onClose, t }) {
  const cameraId  = useRef('vsc' + Date.now());
  const galleryId = useRef('vsg' + (Date.now()+1));
  const abortRef  = useRef(null);
  const [photo,   setPhoto]  = useState(null);
  const [status,  setStatus] = useState('idle');
  const [matchId, setMatchId] = useState(null);
  const [reason,  setReason] = useState('');

  useEffect(() => () => abortRef.current?.abort(), []);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setStatus('idle'); setMatchId(null); setReason(''); };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  async function analyze() {
    if (!photo || items.length === 0) return;
    setStatus('analyzing');
    abortRef.current = new AbortController();

    const catalogue = items.map((it, idx) =>
      `${idx+1}. ID="${it.id}" | Name="${it.name}" | Category="${it.category}" | Colors=[${[...new Set(it.variants.map(v=>v.color))].join(', ')}] | Price=${it.price} DA | TotalStock=${it.variants.reduce((s,v)=>s+v.stock,0)}`
    ).join('\n');

    const base64    = photo.split(',')[1];
    const mediaType = photo.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `You are an expert clothing product identification assistant for a store inventory system.

TASK: Look at this photo and identify which product from the catalogue below it matches.

CATALOGUE (${items.length} products):
${catalogue}

INSTRUCTIONS:
- Examine the clothing item in the photo carefully: type (shirt/dress/pants/etc), color(s), style, pattern
- Match it against the catalogue by comparing clothing type, colors, and category
- Pick the SINGLE best match, even if confidence is medium or low
- Only respond with null matchId if the photo contains NO clothing at all

Respond with ONLY this exact JSON (no markdown, no explanation):
{"matchId":"<the exact ID value>","confidence":"high|medium|low","reason":"<one sentence why it matches>"}

If truly no match possible:
{"matchId":null,"confidence":"none","reason":"<why>"}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{ role:'user', content:[
            { type:'image', source:{ type:'base64', media_type:mediaType, data:base64 } },
            { type:'text',  text:prompt }
          ]}]
        }),
      });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      const raw  = (data.content || []).map(c=>c.text||'').join('').trim();
      const cleaned = raw.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
      const json = JSON.parse(cleaned);
      if (json.matchId && items.find(i => String(i.id) === String(json.matchId))) {
        setMatchId(String(json.matchId));
        setReason(json.reason || '');
        setStatus('match');
      } else {
        setReason(json.reason || '');
        setStatus('nomatch');
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('VS error:', e);
      setStatus('error');
    }
  }

  const matchedItem = matchId ? items.find(i => String(i.id) === String(matchId)) : null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:300, backdropFilter:'blur(8px)' }}/>
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:301, background:'#fff', borderRadius:24, width:'min(440px,95vw)', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 40px 100px rgba(0,0,0,.5)', padding:'28px 24px 30px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#111' }}>📸 {t.searchByPhoto}</h2>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>{t.fromGallery} · {t.takePhoto}</p>
          </div>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:10, width:34, height:34, cursor:'pointer', fontSize:18, color:'#6b7280', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {photo && (
          <div style={{ width:'100%', height:200, borderRadius:16, overflow:'hidden', marginBottom:14, background:'#111', border:'2px solid #e5e7eb' }}>
            <img src={photo} alt="search" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          </div>
        )}

        {!photo && (
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <label htmlFor={cameraId.current} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 10px', borderRadius:16, border:'2.5px dashed #a5b4fc', cursor:'pointer', background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', gap:8 }}>
              <span style={{ fontSize:40 }}>📷</span>
              <span style={{ fontWeight:800, fontSize:14, color:'#6366f1' }}>{t.takePhoto}</span>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{t.opensCamera}</span>
            </label>
            <input id={cameraId.current} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile}/>
            <label htmlFor={galleryId.current} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 10px', borderRadius:16, border:'2.5px dashed #a5b4fc', cursor:'pointer', background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', gap:8 }}>
              <span style={{ fontSize:40 }}>🖼️</span>
              <span style={{ fontWeight:800, fontSize:14, color:'#6366f1' }}>{t.fromGallery}</span>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{t.chooseExisting}</span>
            </label>
            <input id={galleryId.current} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
          </div>
        )}

        {photo && status==='idle' && (
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <label htmlFor={cameraId.current} style={{ flex:1, padding:'9px', borderRadius:10, border:'1.5px solid #e0e7ff', cursor:'pointer', background:'#eef2ff', textAlign:'center', fontSize:12, fontWeight:700, color:'#6366f1' }}>📷 {t.retake||'Retake'}</label>
            <input id={cameraId.current} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile}/>
            <label htmlFor={galleryId.current} style={{ flex:1, padding:'9px', borderRadius:10, border:'1.5px solid #e0e7ff', cursor:'pointer', background:'#eef2ff', textAlign:'center', fontSize:12, fontWeight:700, color:'#6366f1' }}>🖼️ {t.fromGallery}</label>
            <input id={galleryId.current} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
          </div>
        )}

        {photo && status==='idle' && (
          <button onClick={analyze} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:15, cursor:'pointer', boxShadow:'0 4px 16px rgba(99,102,241,.35)' }}>
            {t.findProduct}
          </button>
        )}

        {status==='analyzing' && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', border:'4px solid #e0e7ff', borderTopColor:'#6366f1', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontWeight:800, color:'#6366f1', fontSize:16, margin:0 }}>{t.analyzing}</p>
            <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>{t.comparingWith} {items.length} product{items.length!==1?'s':''}…</p>
          </div>
        )}

        {status==='match' && matchedItem && (
          <div style={{ borderRadius:16, border:'2px solid #bbf7d0', background:'#f0fdf4', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#059669,#0d9488)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:20 }}>✅</span><span style={{ fontWeight:800, fontSize:15, color:'#fff' }}>{t.matchFound}</span>
            </div>
            <div style={{ display:'flex', gap:14, padding:'16px', alignItems:'center' }}>
              <div style={{ width:64, height:64, borderRadius:12, overflow:'hidden', flexShrink:0, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #e5e7eb' }}>
                {matchedItem.photo?<img src={matchedItem.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<span style={{ fontSize:28 }}>👕</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:17, marginBottom:4, color:'#111' }}>{matchedItem.name}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontWeight:900, color:'#059669', fontSize:16 }}>{fmt(matchedItem.price)}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'#dcfce7', color:'#15803d', fontWeight:700 }}>{matchedItem.category}</span>
                </div>
                {reason && <p style={{ fontSize:11, color:'#6b7280', margin:'6px 0 0', fontStyle:'italic' }}>{reason}</p>}
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {[...new Map(matchedItem.variants.map(v=>[v.color,v.hex])).entries()].map(([n,h])=>(
                    <span key={n} title={n} style={{ width:14, height:14, borderRadius:'50%', background:h, display:'inline-block', border:isLight(h)?'1.5px solid #ccc':'1.5px solid rgba(0,0,0,.1)' }}/>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'0 16px 16px', display:'flex', gap:10 }}>
              <button onClick={()=>{onMatch(matchId);onClose();}} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:11, fontWeight:800, fontSize:14, cursor:'pointer' }}>{t.goToProduct}</button>
              <button onClick={()=>{setStatus('idle');setMatchId(null);setPhoto(null);setReason('');}} style={{ padding:'12px 14px', background:'#f9fafb', border:'1.5px solid #e5e7eb', borderRadius:11, fontWeight:600, fontSize:13, cursor:'pointer', color:'#6b7280' }}>{t.tryAgain}</button>
            </div>
          </div>
        )}

        {(status==='nomatch'||status==='error') && (
          <div style={{ textAlign:'center', padding:'24px 16px', background:'#fef2f2', borderRadius:16, border:'2px solid #fecaca' }}>
            <div style={{ fontSize:42, marginBottom:10 }}>😕</div>
            <p style={{ fontWeight:700, color:'#dc2626', fontSize:14, margin:'0 0 6px' }}>{status==='error'?t.analyzeError:t.noMatch}</p>
            {reason && <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 14px', fontStyle:'italic' }}>{reason}</p>}
            <button onClick={()=>{setStatus('idle');setMatchId(null);setPhoto(null);setReason('');}} style={{ padding:'10px 22px', background:'#fff', border:'2px solid #fca5a5', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', color:'#dc2626' }}>{t.tryAnotherPhoto}</button>
          </div>
        )}
      </div>
    </>
  );
}
