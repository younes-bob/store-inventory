import { useState } from 'react';
import { T } from './config';
import LoginScreen from './pages/LoginScreen';
import AdminPanel  from './pages/AdminPanel';
import StoreApp    from './pages/StoreApp';

export default function App() {
  const [screen,       setScreen]       = useState('login');
  const [currentStore, setCurrentStore] = useState(null);
  const [lang,         setLang]         = useState('en');
  const t = T[lang];

  if (screen === 'admin') return <AdminPanel t={t} lang={lang} setLang={setLang} onBack={() => setScreen('login')}/>;
  if (screen === 'store' && currentStore) return (
    <StoreApp store={currentStore} t={t} lang={lang} setLang={setLang}
      onLogout={() => { setCurrentStore(null); setScreen('login'); }}/>
  );
  return (
    <LoginScreen t={t} lang={lang} setLang={setLang}
      onLogin={store => { setCurrentStore(store); setScreen('store'); }}
      onAdmin={() => setScreen('admin')}/>
  );
}
