import React, { useState, useEffect } from 'react';
import { User, Resolution, Category } from '../types';
import { BookOpen, Calendar, ChevronLeft, CheckCircle, Users, X, FileText, MapPin, Layers, Image as ImageIcon, Bell, Clock, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { dbService } from '../services/dbService';

interface DashboardProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setActiveTab }) => {
  const [pendingTasks, setPendingTasks] = useState<Resolution[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Resolution[]>([]);
  const [reminders, setReminders] = useState<Resolution[]>([]);
  const [selectedRes, setSelectedRes] = useState<Resolution | null>(null);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [stats, setStats] = useState({ workgroupRes: 0, councilRes: 0, workgroups: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const allRes = await dbService.getResolutions();
      const allCats = await dbService.getCategories();
      
      const userRoleTitle = user.title;
      const now = new Date();
      const nowJalaliStr = now.toLocaleDateString('fa-IR');
      const nowMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

      // فیلتر کردن مصوباتی که مسئولش کاربر فعلی است
      const myTasks = allRes.filter(r => r.executor === userRoleTitle && (r.is_approved || r.isApproved));
      
      const pending: Resolution[] = [];
      const completed: Resolution[] = [];

      for (const task of myTasks) {
        let isClaimed = task.executorClaim ?? task.executor_claim ?? false;
        
        // منطق بازنشانی خودکار بر اساس یادآورها برای ادعای مجری
        if (isClaimed && task.executorClaimDate) {
          if (task.reminderType === 'yearly' && task.reminderStartDate) {
            const lastYear = (task.executorClaimDate || "").split('/')[0];
            const currentYear = nowJalaliStr.split('/')[0];
            if (lastYear !== currentYear && nowMMDD >= task.reminderStartDate) {
              isClaimed = false;
            }
          }
        }

        if (isClaimed) completed.push({...task, executorClaim: true});
        else pending.push({...task, executorClaim: false});
      }

      setPendingTasks(pending);
      setCompletedTasks(completed);
      
      const activeReminders = myTasks.filter(res => {
        if (!res.reminderType || res.reminderType === 'none') return false;
        if (res.reminderType === 'yearly' && res.reminderStartDate && res.reminderEndDate) {
           return nowMMDD >= res.reminderStartDate && nowMMDD <= res.reminderEndDate;
        }
        return true;
      });
      setReminders(activeReminders);
      
      const wgCats = allCats.filter(c => c.type === 'workgroups');
      const wgIds = wgCats.map(c => c.id);
      
      setStats({
        workgroupRes: allRes.filter(r => wgIds.includes(r.parent_id || r.parentId || '')).length,
        councilRes: allRes.filter(r => (r.parent_id === 'council-root' || r.parentId === 'council-root' || r.workgroup === 'شورای مدرسه')).length,
        workgroups: wgCats.filter(c => (c.parent_id === null || c.parentId === null)).length
      });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClaim = async (task: Resolution, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !task.executorClaim;
    const nowStr = new Date().toLocaleDateString('fa-IR');
    
    const updatedTask = {
      ...task,
      executorClaim: newStatus,
      executor_claim: newStatus,
      executorClaimDate: newStatus ? nowStr : task.executorClaimDate,
      executor_claim_date: newStatus ? nowStr : task.executor_claim_date,
      // ادعای انجام ۱۰۰ درصد پیشرفت را نیز ثبت می‌کند
      progress: newStatus ? 100 : (task.progress || 0)
    };

    try {
      if (newStatus) {
        setPendingTasks(prev => prev.filter(t => t.id !== task.id));
        setCompletedTasks(prev => [updatedTask, ...prev]);
      } else {
        setCompletedTasks(prev => prev.filter(t => t.id !== task.id));
        setPendingTasks(prev => [updatedTask, ...prev]);
      }
      
      await dbService.saveResolution(updatedTask);
    } catch (err) {
      alert('خطا در بروزرسانی وضعیت. لطفا مجددا تلاش کنید.');
      fetchData();
    }
  };

  const statItems = [
    { label: 'مصوبات کارگروه‌ها', value: stats.workgroupRes, icon: BookOpen, color: 'bg-emerald-600' },
    { label: 'مصوبات شورا', value: stats.councilRes, icon: Calendar, color: 'bg-amber-600' },
    { label: 'کارگروه‌ها', value: stats.workgroups, icon: Users, color: 'bg-blue-600' },
  ];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-emerald-900 text-white p-8 md:p-12 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">سلام، {user.fullName}</h1>
          <p className="text-emerald-100 opacity-80 font-medium">
             امروز {new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} است.
          </p>
        </div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-700/30 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 min-h-[400px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">چک‌لیست پیگیری‌های من</h3>
            </div>

            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-48 text-emerald-600">
                  <Clock size={32} className="animate-spin mb-3" />
                  <p className="font-bold text-sm">در حال بارگذاری لیست...</p>
               </div>
            ) : pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <CheckCircle size={64} strokeWidth={1} className="mb-3 opacity-20" />
                <p className="font-bold opacity-40 text-sm">همه کارهای امروز انجام شده است.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedRes(task)}
                    className="flex items-center gap-4 p-4 bg-gray-50/50 hover:bg-emerald-50/30 rounded-2xl border border-gray-100 transition-all cursor-pointer group"
                  >
                    <button 
                      onClick={(e) => toggleClaim(task, e)}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-300 hover:border-emerald-500 hover:text-emerald-500 transition-all shrink-0 bg-white"
                    >
                      <Circle size={20} strokeWidth={2} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded-md border border-emerald-100">{task.workgroup}</span>
                        {task.reminderType && task.reminderType !== 'none' && <Bell size={10} className="text-amber-500" />}
                      </div>
                      <h4 className="text-base font-bold text-gray-800 truncate">{task.title}</h4>
                    </div>
                    <ChevronLeft size={18} className="text-gray-300 group-hover:text-emerald-500" />
                  </div>
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
               <div className="mt-8 pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                     <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-md flex items-center justify-center font-bold text-[10px]">{completedTasks.length}</span>
                        <span className="font-bold text-sm text-gray-500">کارهای انجام شده</span>
                     </div>
                     {isCompletedOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>

                  {isCompletedOpen && (
                     <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                        {completedTasks.map(task => (
                          <div 
                            key={task.id}
                            onClick={() => setSelectedRes(task)}
                            className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-50 opacity-50 group hover:opacity-100 transition-all cursor-pointer"
                          >
                             <button 
                                onClick={(e) => toggleClaim(task, e)}
                                className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm"
                             >
                                <CheckCircle2 size={16} />
                             </button>
                             <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-600 line-through truncate">{task.title}</h4>
                                <p className="text-[9px] text-gray-400 font-medium">ادعای انجام در: {task.executorClaimDate || task.executor_claim_date}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h4 className="text-base font-bold text-gray-800 mb-5">وضعیت کلی</h4>
              <div className="space-y-3">
                 {statItems.map((stat, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                       <div className={`${stat.color} p-2 rounded-lg text-white`}>
                          <stat.icon size={16} />
                       </div>
                       <div>
                          <p className="text-[10px] font-medium text-gray-400">{stat.label}</p>
                          <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setSelectedRes(null)} className="absolute top-6 left-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5">
                  <MapPin size={12} /> {selectedRes.workgroup}
                </span>
                {(selectedRes.executorClaim || selectedRes.executor_claim) && (
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> ادعای انجام شده
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight border-r-4 border-emerald-500 pr-4">{selectedRes.title}</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 leading-relaxed text-sm font-medium text-gray-800 whitespace-pre-line text-justify">
                  {selectedRes.description}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;