import { useState } from 'react';
import LoginScreen from './pages/LoginScreen';
import AdminPanel  from './pages/AdminPanel';
import StoreApp    from './pages/StoreApp';

export default function App() {
  const [screen,       setScreen]       = useState('login'); // login | admin | store
  const [currentStore, setCurrentStore] = useState(null);

  if (screen === 'admin') {
    return <AdminPanel onBack={() => setScreen('login')}/>;
  }
  if (screen === 'store' && currentStore) {
    return (
      <StoreApp
        store={currentStore}
        onLogout={() => { setCurrentStore(null); setScreen('login'); }}
      />
    );
  }
  return (
    <LoginScreen
      onLogin={store => { setCurrentStore(store); setScreen('store'); }}
      onAdmin={() => setScreen('admin')}
    />
  );
}
