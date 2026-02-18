
import React, { useState, useEffect } from 'react';
import { User, Resolution, Category } from '../types';
import { BookOpen, Calendar, ShieldAlert, Award, ChevronRight, CheckCircle, ExternalLink, School, Users, X, FileText, MapPin, Layers, Image as ImageIcon } from 'lucide-react';
import { dbService } from '../services/dbService';

interface DashboardProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setActiveTab }) => {
  const [myTasks, setMyTasks] = useState<Resolution[]>([]);
  const [selectedRes, setSelectedRes] = useState<Resolution | null>(null);
  const [stats, setStats] = useState({ workgroupRes: 0, councilRes: 0, setWorkgroups: 0, workgroups: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const allRes = await dbService.getResolutions();
      const allCats = await dbService.getCategories();
      
      const userRoleTitle = user.title;
      setMyTasks(allRes.filter(r => r.executor === userRoleTitle && (r.is_approved || r.isApproved)));
      
      const wgCats = allCats.filter(c => c.type === 'workgroups');
      const wgIds = wgCats.map(c => c.id);
      
      setStats({
        workgroupRes: allRes.filter(r => wgIds.includes(r.parent_id || r.parentId || '')).length,
        councilRes: allRes.filter(r => (r.parent_id === 'council-root' || r.parentId === 'council-root' || r.workgroup === 'شورای مدرسه')).length,
        setWorkgroups: 0, // Unused placeholder
        workgroups: wgCats.filter(c => (c.parent_id === null || c.parentId === null)).length
      });
    };
    fetchData();
  }, [user]);

  const statItems = [
    { label: 'مصوبات کارگروه ها', value: stats.workgroupRes, icon: BookOpen, color: 'bg-emerald-500' },
    { label: 'مصوبات شورا', value: stats.councilRes, icon: Calendar, color: 'bg-amber-500' },
    { label: 'کارگروه ها', value: stats.workgroups, icon: Users, color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="relative overflow-hidden bg-emerald-900 text-white p-8 md:p-12 rounded-[3rem] shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-black mb-4 leading-relaxed">
            سلام، {user.fullName}
          </h1>
          <p className="text-emerald-100 text-lg opacity-90 leading-relaxed mb-8">
            به سامانه جامع برنامه‌ها و مصوبات مدرسه علمیه امام رضا علیه السلام خوش آمدید.
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setActiveTab('programs')}
              className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center gap-3"
            >
              مشاهده برنامه‌ها <Calendar size={20} />
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-700 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[400px]">
            <h3 className="text-2xl font-black text-black mb-8 flex items-center gap-3 border-r-4 border-amber-500 pr-4">
              <CheckCircle className="text-amber-500" size={28} /> مصوباتی که مسئول پیگیری آن‌ها هستم
            </h3>
            
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-50">
                <BookOpen size={64} className="mb-4" />
                <p className="font-bold">موردی برای نمایش یافت نشد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myTasks.map(task => (
                  <button 
                    key={task.id}
                    onClick={() => setSelectedRes(task)}
                    className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-right hover:border-emerald-200 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black bg-white px-2 py-1 rounded-lg text-emerald-600 border border-emerald-100">
                          {task.workgroup}
                       </span>
                       <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h4 className="font-black text-black text-lg mb-2">{task.title}</h4>
                    <p className="text-xs text-gray-500 font-bold line-clamp-2">{task.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           {statItems.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                 <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg`}>
                    <stat.icon size={24} />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-black text-black">{stat.value}</p>
                 </div>
              </div>
           ))}
        </div>
      </div>

      {selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setSelectedRes(null)} className="absolute top-8 left-8 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-xl text-xs font-black border border-emerald-100 flex items-center gap-2">
                  <MapPin size={14} /> {selectedRes.workgroup}
                </span>
                {selectedRes.grade && (
                  <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-xs font-black border border-blue-100 flex items-center gap-2">
                    <Layers size={14} /> {selectedRes.grade}
                  </span>
                )}
              </div>

              <h2 className="text-3xl font-black text-black mb-8 leading-tight pr-5 border-r-8 border-emerald-500">{selectedRes.title}</h2>
              
              <div className="space-y-8 text-black">
                <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 leading-relaxed text-lg text-justify font-bold">
                  {selectedRes.description}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Calendar size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400">تاریخ ثبت</p>
                        <p className="font-black text-sm">{selectedRes.createdAt || selectedRes.created_at}</p>
                      </div>
                   </div>
                   {selectedRes.executor && (
                     <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={24} /></div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400">مسئول پیگیری</p>
                          <p className="font-black text-sm">{selectedRes.executor}</p>
                        </div>
                     </div>
                   )}
                </div>

                {selectedRes.images && selectedRes.images.length > 0 && (
                   <div className="space-y-4">
                      <h4 className="text-lg font-black text-black flex items-center gap-2"><ImageIcon size={20} className="text-emerald-500" /> مستندات و پیوست‌ها</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {selectedRes.images.map((img, i) => (
                          <a href={img} target="_blank" key={i} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                            {img.includes('.pdf') ? (
                              <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center text-red-600">
                                <FileText size={40} />
                                <span className="text-[10px] font-black mt-1">PDF</span>
                              </div>
                            ) : (
                              <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            )}
                          </a>
                        ))}
                      </div>
                   </div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
