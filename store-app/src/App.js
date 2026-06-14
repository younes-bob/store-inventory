import { useState } from 'react';
import { T, STORES } from './config';
import LoginScreen from './pages/LoginScreen';
import AdminPanel  from './pages/AdminPanel';
import StoreApp    from './pages/StoreApp';

function loadSession() {
  try {
    const raw = localStorage.getItem('store_session');
    if (!raw) return { screen: 'login', store: null, lang: 'en' };
    const { storeId, lang } = JSON.parse(raw);
    const store = STORES.find(s => s.id === storeId) || null;
    return { screen: store ? 'store' : 'login', store, lang: lang || 'en' };
  } catch (_) {
    return { screen: 'login', store: null, lang: 'en' };
  }
}

function saveSession(store, lang) {
  try {
    if (store) localStorage.setItem('store_session', JSON.stringify({ storeId: store.id, lang }));
    else localStorage.removeItem('store_session');
  } catch (_) {}
}

export default function App() {
  const init = loadSession();
  const [screen,       setScreen]       = useState(init.screen);
  const [currentStore, setCurrentStore] = useState(init.store);
  const [lang,         setLang]         = useState(init.lang);
  const t = T[lang];

  function handleSetLang(l) { setLang(l); saveSession(currentStore, l); }
  function handleLogin(store) { setCurrentStore(store); setScreen('store'); saveSession(store, lang); }
  function handleLogout() { setCurrentStore(null); setScreen('login'); saveSession(null, lang); }

  if (screen === 'admin') return <AdminPanel t={t} lang={lang} setLang={handleSetLang} onBack={() => setScreen('login')}/>;
  if (screen === 'store' && currentStore) return (
    <StoreApp store={currentStore} t={t} lang={lang} setLang={handleSetLang} onLogout={handleLogout}/>
  );
  return (
    <LoginScreen t={t} lang={lang} setLang={handleSetLang}
      onLogin={handleLogin}
      onAdmin={() => setScreen('admin')}/>
  );
}
