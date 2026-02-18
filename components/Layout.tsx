import { Menu, X, Home, Users, Settings, FileText, ChevronRight, LogOut, ChevronLeft, Layers, ChevronDown, Circle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { User, UserRole, Category } from '../types';
import { dbService } from '../services/dbService';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string, targetId?: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkgroupsOpen, setIsWorkgroupsOpen] = useState(false);
  const [workgroups, setWorkgroups] = useState<Category[]>([]);
  const [onlineStatus, setOnlineStatus] = useState(dbService.isOnline);

  useEffect(() => {
    const fetchWorkgroups = async () => {
      const all = await dbService.getCategories();
      setWorkgroups(all.filter(c => c.type === 'workgroups' && (c.parentId === null || c.parent_id === null)));
      setOnlineStatus(dbService.isOnline);
    };
    fetchWorkgroups();
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'ویترین', icon: Home, perm: 'dashboard' },
    { id: 'programs', label: 'برنامه‌های مدرسه', icon: FileText, perm: 'programs' },
    { id: 'council', label: 'مصوبات شورا', icon: FileText, perm: 'council' },
    { id: 'workgroups', label: 'مصوبات کارگروه‌ها', icon: Users, perm: 'workgroups', hasSubmenu: true },
    { id: 'by-grade', label: 'مشاهده و پیگیری مصوبات', icon: Layers, perm: 'byGrade' },
    { id: 'admin', label: 'مدیریت کاربران', icon: Settings, adminOnly: true },
  ];

  const filteredWorkgroups = workgroups.filter(wg => {
    if (user.role === UserRole.ADMIN) return true;
    return user.permissions.workgroupSpecific?.[wg.id]?.canView;
  });

  const filteredMenu = menuItems.filter(item => {
    if (user.role === UserRole.ADMIN) return true;
    if (item.adminOnly) return false;
    if (item.perm === 'dashboard') return true;
    const permKey = item.perm as keyof typeof user.permissions;
    return user.permissions[permKey]?.canView;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-sm h-16 flex items-center justify-between px-4 z-50">
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2">{isSidebarOpen ? <X size={24} /> : <Menu size={24} />}</button>
        <span className="font-bold text-emerald-800 text-lg">مدرسه علمیه امام رضا (ع)</span>
        <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 right-0 h-screen bg-emerald-900 text-white z-50 transition-all duration-300 ease-in-out border-l border-emerald-800 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex absolute -left-4 top-10 w-8 h-8 bg-emerald-700 rounded-full items-center justify-center border-2 border-white shadow-lg text-white hover:bg-emerald-600 transition-all z-[60]">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-emerald-800/50 flex flex-col items-center ${isCollapsed ? 'px-2' : ''}`}>
          <div className="text-center animate-in fade-in duration-500">
            <h1 className={`font-black leading-tight ${isCollapsed ? 'text-[10px]' : 'text-xl'}`}>
              {isCollapsed ? 'امام رضا' : 'سامانه جامع مصوبات'}
            </h1>
            {!isCollapsed && (
              <p className="text-emerald-300 text-[10px] mt-1 flex items-center justify-center gap-1">
                {onlineStatus ? 'متصل به سرور' : 'حالت آفلاین'} <Circle size={6} fill="currentColor" className={onlineStatus ? 'text-emerald-500' : 'text-red-500'} />
              </p>
            )}
          </div>
        </div>

        <nav className="mt-6 px-3 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
          {filteredMenu.map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if (item.hasSubmenu && !isCollapsed) { setIsWorkgroupsOpen(!isWorkgroupsOpen); }
                  else { setActiveTab(item.id); setSidebarOpen(false); }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-700 text-white shadow-inner' : 'hover:bg-emerald-800/50 text-emerald-100'} ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <item.icon size={20} className="shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-right font-bold text-sm truncate">{item.label}</span>
                    {item.hasSubmenu && <ChevronDown size={14} className={`transition-transform duration-300 ${isWorkgroupsOpen ? 'rotate-180' : ''}`} />}
                  </>
                )}
              </button>

              {item.hasSubmenu && isWorkgroupsOpen && !isCollapsed && (
                <div className="pr-10 space-y-1 animate-in slide-in-from-top-2 duration-300">
                  {filteredWorkgroups.map(wg => (
                    <button
                      key={wg.id}
                      onClick={() => { setActiveTab('workgroups', wg.id); setSidebarOpen(false); }}
                      className={`w-full text-right px-4 py-2 text-xs rounded-lg transition-colors border-r border-emerald-700 ${activeTab === 'workgroups' && wg.id === 'FIXME' ? 'text-white bg-emerald-800' : 'text-emerald-300 hover:text-white hover:bg-emerald-800/30'}`}
                    >
                      {wg.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className={`absolute bottom-0 right-0 w-full p-4 bg-emerald-950/30 ${isCollapsed ? 'p-2' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 mb-4 bg-emerald-800/50 p-2 rounded-xl border border-emerald-700/50">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-lg">{user?.fullName?.charAt(0)}</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.fullName}</p>
                <p className="text-[10px] text-emerald-400 truncate">{user?.title}</p>
              </div>
            </div>
          )}
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-emerald-700 hover:bg-red-900/40 hover:border-red-800 transition-all text-emerald-100 ${isCollapsed ? 'px-0 border-none hover:bg-transparent text-red-400' : ''}`}>
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm font-bold">خروج</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;