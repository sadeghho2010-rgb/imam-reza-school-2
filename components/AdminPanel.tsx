
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { User, UserRole, UserPermissions, Category } from '../types';
import { UserCheck, Shield, Award, Edit2, CheckCircle, Eye, EyeOff, Lock, Unlock, Plus, Users as UsersIcon, Download, Loader2, AlertCircle, X, Save, Trash2, Edit, Settings, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customTitles, setCustomTitles] = useState<{id: number, title: string}[]>([]);
  const [workgroups, setWorkgroups] = useState<Category[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTitlesListOpen, setIsTitlesListOpen] = useState(false);

  // Modal State for adding/editing
  const [inputModal, setInputModal] = useState<{ 
    show: boolean, 
    type: 'wg' | 'title', 
    mode: 'add' | 'edit', 
    value: string, 
    id?: string | number 
  }>({
    show: false,
    type: 'wg',
    mode: 'add',
    value: ''
  });

  // Custom Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean,
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'delete' | 'warning'
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'delete'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const [u, t, allCats] = await Promise.all([
        dbService.getUsers(),
        dbService.getCustomTitles(),
        dbService.getCategories()
      ]);
      setUsers(u);
      setCustomTitles(t);
      setWorkgroups(allCats.filter(c => c.type === 'workgroups' && (c.parentId === null || c.parent_id === null)));
    } catch (err: any) {
      setErrorMsg('خطا در بارگذاری داده‌ها.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInputSubmit = async () => {
    const val = inputModal.value.trim();
    if (!val) return;

    setIsRefreshing(true);
    try {
      if (inputModal.type === 'wg') {
        if (inputModal.mode === 'add') {
          const newWg: Category = {
            id: `wg-${Date.now()}`,
            parentId: null,
            parent_id: null,
            name: val.startsWith('کارگروه') ? val : `کارگروه ${val}`,
            type: 'workgroups'
          };
          await dbService.saveCategory(newWg);
        } else {
          const cat = workgroups.find(w => w.id === inputModal.id);
          if (cat) await dbService.saveCategory({ ...cat, name: val });
        }
      } else {
        if (inputModal.mode === 'add') {
          await dbService.saveCustomTitle(val);
        } else {
          await dbService.updateCustomTitle(inputModal.id as number, val);
        }
      }
      await fetchData();
      setInputModal({ ...inputModal, show: false, value: '' });
    } catch (err: any) {
      setErrorMsg('خطا در عملیات. ممکن است مورد تکراری باشد.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const requestDelete = (type: 'wg' | 'title', id: string | number, name: string) => {
    setConfirmModal({
      show: true,
      title: 'تایید حذف نهایی',
      message: `آیا از حذف "${name}" اطمینان دارید؟ این عمل تمام موارد مرتبط را نیز پاک خواهد کرد.`,
      type: 'delete',
      onConfirm: async () => {
        setIsRefreshing(true);
        try {
          if (type === 'wg') await dbService.deleteCategory(id as string);
          else await dbService.deleteCustomTitle(id as number);
          await fetchData();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
          setErrorMsg('خطا در حذف مورد.');
        } finally {
          setIsRefreshing(false);
        }
      }
    });
  };

  const handleUpdateUser = async (userId: string, role: UserRole, title: string, perms: UserPermissions) => {
    setIsRefreshing(true);
    try {
      await dbService.updateUserPermissions(userId, perms, title, role);
      await fetchData();
      setEditingId(null);
    } catch (err) {
      setErrorMsg('خطا در آپدیت کاربر.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFullBackup = async () => {
    const allRes = await dbService.getResolutions();
    const allCats = await dbService.getCategories();
    const backupData = {
      timestamp: new Date().toISOString(),
      resolutions: allRes,
      categories: allCats,
      users: users.map(u => ({ ...u, password: '***' }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `full-backup-${new Date().toLocaleDateString('fa-IR')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-8 text-right pb-24">
      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmModal.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-black mb-3">{confirmModal.title}</h3>
            <p className="text-gray-500 font-bold text-sm mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={confirmModal.onConfirm} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">حذف شود</button>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between text-red-600 font-black">
          <div className="flex items-center gap-3"><AlertCircle size={20} /> {errorMsg}</div>
          <button onClick={() => setErrorMsg(null)}><X size={18} /></button>
        </div>
      )}

      {/* Input Modal */}
      {inputModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-black mb-6">
              {inputModal.mode === 'add' ? 'افزودن' : 'ویرایش'} {inputModal.type === 'wg' ? 'کارگروه' : 'عنوان'}
            </h3>
            <input 
              autoFocus
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black mb-6 outline-none focus:ring-4 focus:ring-emerald-500/10"
              placeholder={inputModal.type === 'wg' ? 'نام کارگروه...' : 'نام عنوان...'}
              value={inputModal.value}
              onChange={(e) => setInputModal({ ...inputModal, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
            />
            <div className="flex gap-3">
              <button onClick={handleInputSubmit} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">ذخیره</button>
              <button onClick={() => setInputModal({ ...inputModal, show: false })} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <Settings size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-black">مدیریت زیرساخت</h2>
            <p className="text-gray-400 text-xs font-bold">مدیریت تمام سطوح و عناوین سیستم</p>
          </div>
        </div>
        <div className="flex gap-3">
           {isRefreshing && <Loader2 className="animate-spin text-emerald-600" />}
           <button onClick={handleFullBackup} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-gray-200">
             <Download size={18} /> پشتیبان‌گیری
           </button>
        </div>
      </div>

      {/* Assets Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Workgroups */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 h-fit">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-black text-black flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><UsersIcon size={20} /></div>
                مدیریت کارگروه‌ها
             </h3>
             <button onClick={() => setInputModal({ show: true, type: 'wg', mode: 'add', value: '' })} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 shadow-lg">
                <Plus size={20} />
             </button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {workgroups.map(wg => (
              <div key={wg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                <span className="font-bold text-gray-700 text-sm">{wg.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setInputModal({ show: true, type: 'wg', mode: 'edit', value: wg.name, id: wg.id })} className="p-2 text-gray-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm"><Edit size={14} /></button>
                  <button onClick={() => requestDelete('wg', wg.id, wg.name)} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unified Titles Section */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 h-fit">
          <button 
            onClick={() => setIsTitlesListOpen(!isTitlesListOpen)}
            className="w-full flex items-center justify-between mb-2 group"
          >
             <h3 className="text-xl font-black text-black flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Award size={20} /></div>
                مدیریت عناوین
             </h3>
             <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setInputModal({ show: true, type: 'title', mode: 'add', value: '' }); }}
                  className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 shadow-lg"
                >
                   <Plus size={20} />
                </button>
                {isTitlesListOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
             </div>
          </button>
          <p className="text-gray-400 text-[10px] font-bold mb-6 mr-14">برای مشاهده و مدیریت عناوین کلیک کنید</p>

          {isTitlesListOpen && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in slide-in-from-top-2">
              {customTitles.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-emerald-200 transition-all">
                  <span className="font-bold text-gray-700 text-sm">{t.title}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setInputModal({ show: true, type: 'title', mode: 'edit', value: t.title, id: t.id })} className="p-2 text-gray-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm"><Edit size={14} /></button>
                    <button onClick={() => requestDelete('title', t.id, t.title)} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {customTitles.length === 0 && <p className="text-center text-gray-300 py-10 font-bold text-sm">عنوانی ثبت نشده است.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Users Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-black pr-4 border-r-4 border-emerald-600">دسترسی کاربران</h3>
        <div className="grid grid-cols-1 gap-6">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${u.role === UserRole.ADMIN ? 'bg-red-500' : 'bg-blue-500'}`}>
                    {u.role === UserRole.ADMIN ? <Shield size={32} /> : <UserCheck size={32} />}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-black">{u.fullName}</h4>
                    <p className="text-xs font-bold text-gray-400 mt-1">{u.phone} | <span className="text-emerald-600">{u.username}</span> | <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{u.title}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 text-sm font-black text-black flex items-center gap-3">
                      {showPasswords[u.id] ? u.password : '••••••••'}
                      <button onClick={() => setShowPasswords(p => ({...p, [u.id]: !p[u.id]}))} className="text-gray-400 hover:text-emerald-600"><Eye size={16} /></button>
                   </div>
                   {u.username !== 'sadeghho' && (
                     <button onClick={() => setEditingId(editingId === u.id ? null : u.id)} className={`p-3 rounded-2xl transition-all ${editingId === u.id ? 'bg-black text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'}`}>
                        {editingId === u.id ? <X size={20} /> : <Edit2 size={20} />}
                     </button>
                   )}
                </div>
              </div>

              {editingId === u.id && (
                <div className="mt-8 pt-8 border-t border-gray-50 animate-in slide-in-from-top-4 duration-500">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="space-y-6">
                         <h5 className="font-black text-black mb-4 flex items-center gap-2">مشخصات</h5>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 pr-2">عنوان انتخابی</label>
                           <select 
                             id={`title-${u.id}`} 
                             defaultValue={u.title} 
                             className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black text-black outline-none appearance-none"
                           >
                             {customTitles.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 pr-2">نقش</label>
                           <select id={`role-${u.id}`} defaultValue={u.role} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black text-black outline-none appearance-none">
                             <option value={UserRole.ADMIN}>مدیر ارشد</option>
                             <option value={UserRole.CUSTOM}>کاربر ویژه / عادی</option>
                           </select>
                         </div>
                      </div>

                      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h5 className="font-black text-black mb-2">دسترسی بخش‌ها</h5>
                            {(['programs', 'council', 'byGrade'] as const).map(key => (
                              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                 <span className="text-xs font-black text-gray-700">{key === 'programs' ? 'برنامه‌ها' : key === 'council' ? 'شورا' : 'بر اساس پایه'}</span>
                                 <div className="flex gap-1">
                                    <PermissionToggle label="دیدن" active={u.permissions[key].canView} onToggle={(v) => { u.permissions[key].canView = v; setUsers([...users]); }} />
                                    <PermissionToggle label="ویرایش" active={u.permissions[key].canEdit} onToggle={(v) => { u.permissions[key].canEdit = v; setUsers([...users]); }} />
                                 </div>
                              </div>
                            ))}
                         </div>
                         <div className="space-y-4">
                            <h5 className="font-black text-black mb-2">دسترسی کارگروه‌ها</h5>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                               {workgroups.map(wg => (
                                 <div key={wg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-xs font-black text-gray-700 truncate max-w-[120px]">{wg.name}</span>
                                    <div className="flex gap-1">
                                       <PermissionToggle label="دیدن" active={u.permissions.workgroupSpecific?.[wg.id]?.canView || false} onToggle={(v) => {
                                          if (!u.permissions.workgroupSpecific) u.permissions.workgroupSpecific = {};
                                          if (!u.permissions.workgroupSpecific[wg.id]) u.permissions.workgroupSpecific[wg.id] = { canView: false, canEdit: false };
                                          u.permissions.workgroupSpecific[wg.id].canView = v;
                                          setUsers([...users]);
                                       }} />
                                       <PermissionToggle label="ویرایش" active={u.permissions.workgroupSpecific?.[wg.id]?.canEdit || false} onToggle={(v) => {
                                          if (!u.permissions.workgroupSpecific) u.permissions.workgroupSpecific = {};
                                          if (!u.permissions.workgroupSpecific[wg.id]) u.permissions.workgroupSpecific[wg.id] = { canView: false, canEdit: false };
                                          u.permissions.workgroupSpecific[wg.id].canEdit = v;
                                          setUsers([...users]);
                                       }} />
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="mt-10 flex justify-end">
                      <button onClick={() => handleUpdateUser(u.id, parseInt((document.getElementById(`role-${u.id}`) as HTMLSelectElement).value), (document.getElementById(`title-${u.id}`) as HTMLSelectElement).value, u.permissions)} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-3">
                         <CheckCircle size={24} /> ثبت نهایی تنظیمات
                      </button>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PermissionToggle = ({ label, active, onToggle }: { label: string, active: boolean, onToggle: (v: boolean) => void }) => (
  <button onClick={(e) => { e.preventDefault(); onToggle(!active); }} className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-2 ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-200'}`}>
    {active ? <Unlock size={12} /> : <Lock size={12} />} {label}
  </button>
);

export default AdminPanel;
