
import React, { useState, useEffect } from 'react';
import { dbService } from './services/dbService';
import { User } from './types';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import TreeSection from './components/TreeSection';
import { AlertTriangle, RefreshCcw, WifiOff, Database } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [targetWorkgroupId, setTargetWorkgroupId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const initApp = async () => {
    setIsInitializing(true);
    try {
      await dbService.init();
      setIsOffline(!dbService.isOnline);

      const savedUser = localStorage.getItem('logged_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Critical error in init:", e);
      setIsOffline(true);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('logged_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('logged_user');
    setActiveTab('dashboard');
  };

  if (isInitializing) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-emerald-900 text-white" dir="rtl">
      <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="font-black text-xl animate-pulse">در حال فراخوانی سامانه...</p>
    </div>
  );

  if (!user) {
    return (
      <>
        {isOffline && (
          <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-[10px] font-black py-1 text-center z-[200] flex items-center justify-center gap-2">
            <WifiOff size={12} /> حالت آفلاین فعال است (دیتابیس در دسترس نیست)
          </div>
        )}
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const renderContent = () => {
    const key = activeTab + (targetWorkgroupId || '');
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} setActiveTab={setActiveTab} />;
      case 'admin': return <AdminPanel />;
      case 'programs': return <TreeSection key={key} type="programs" user={user} />;
      case 'council': return <TreeSection key={key} type="council" user={user} />;
      case 'workgroups': return <TreeSection key={key} type="workgroups" user={user} targetId={targetWorkgroupId} />;
      case 'by-grade': return <TreeSection key={key} type="by-grade" user={user} />;
      default: return <Dashboard user={user} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={(tab, id) => { setActiveTab(tab); setTargetWorkgroupId(id); }} onLogout={handleLogout}>
      {isOffline && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="shrink-0" />
            <span className="text-xs font-black">شما در حالت آفلاین هستید. تغییرات شما ممکن است ذخیره نشود.</span>
          </div>
          <button onClick={initApp} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-amber-700">
            <RefreshCcw size={14} /> تلاش مجدد برای اتصال
          </button>
        </div>
      )}
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;
