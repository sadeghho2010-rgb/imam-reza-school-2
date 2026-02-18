import { Folder, ChevronLeft, Plus, FileText, Download, List, ClipboardList, StickyNote, FileCheck, Clock, ChevronDown, Edit, Image as ImageIcon, X, FileSearch, Layers, Loader2, Inbox, RefreshCw, Save, Search, MapPin, Users, Trash2, AlertTriangle, FileUp, ExternalLink, BookOpen, UserCheck, CheckCircle2, Circle, AlertCircle, Book, Activity, BellRing } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { Category, User, UserRole, Resolution, WorkgroupPDF } from '../types';
import ResolutionForm from './ResolutionForm';
import { GRADES, DEFAULT_TITLES } from '../constants';

interface TreeSectionProps {
  type: 'programs' | 'council' | 'workgroups' | 'by-grade';
  user: User;
  targetId?: string; 
}

const TreeSection: React.FC<TreeSectionProps> = ({ type, user, targetId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPath, setCurrentPath] = useState<Category[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [showForm, setShowForm] = useState<'resolution' | 'note' | null>(null);
  const [editingRes, setEditingRes] = useState<Resolution | null>(null);
  const [subTab, setSubTab] = useState<'approved' | 'unapproved'>('approved');
  const [selectedDetail, setSelectedDetail] = useState<Resolution | null>(null);
  
  const [viewMode, setViewMode] = useState<'grade' | 'executor' | 'lesson' | 'uncompleted' | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedExecutor, setSelectedExecutor] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [availableTitles, setAvailableTitles] = useState<string[]>([]);
  const [availableLessons, setAvailableLessons] = useState<string[]>([]);
  
  const [showPDFPanel, setShowPDFPanel] = useState(false);
  const [wgPDFs, setWgPDFs] = useState<WorkgroupPDF[]>([]);
  const [isPDFUploading, setIsPDFUploading] = useState(false);
  const [pdfUploadData, setPdfUploadData] = useState<{ id?: string, title: string, description: string, file: File | null, existingUrl?: string }>({ title: '', description: '', file: null });
  const [showPDFUploadForm, setShowPDFUploadForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Resolution[]>([]);

  const [showAddSubcat, setShowAddSubcat] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [subcatName, setSubcatName] = useState('');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);
  const [confirmDeleteRes, setConfirmDeleteRes] = useState<Resolution | null>(null);

  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchMeta = async () => {
      const custom = await dbService.getCustomTitles();
      setAvailableTitles(Array.from(new Set([...DEFAULT_TITLES, ...custom.map(c => c.title)])));
      
      const allRes = await dbService.getResolutions();
      const lessons = Array.from(new Set(allRes.map(r => r.lesson).filter(l => l && l.trim() !== ''))).sort() as string[];
      setAvailableLessons(lessons);
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      if (targetId) {
        const all = await dbService.getCategories();
        const target = all.find(c => c.id === targetId);
        if (target) setCurrentPath([target]);
        else setCurrentPath([]);
      } else {
        setCurrentPath([]);
      }
      isInitialMount.current = false;
    };
    init();
  }, [targetId, type]);

  useEffect(() => {
    if (!isInitialMount.current && searchQuery === '') {
      loadData();
    }
  }, [type, currentPath, subTab, selectedGrade, selectedExecutor, selectedLesson, searchQuery, viewMode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allCats = await dbService.getCategories();
      const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      
      if (type !== 'by-grade' || (!selectedGrade && !selectedExecutor && !selectedLesson && viewMode !== 'uncompleted')) {
        let filteredCats = allCats.filter(c => c.type === type && (c.parent_id === parentId || c.parentId === parentId));
        setCategories(filteredCats);
      } else {
        setCategories([]);
      }

      let rawResolutions: Resolution[] = [];
      if (type === 'by-grade') {
        const allRes = await dbService.getResolutions();
        if (selectedGrade) rawResolutions = allRes.filter(r => r.grade === selectedGrade);
        else if (selectedExecutor) rawResolutions = allRes.filter(r => r.executor === selectedExecutor);
        else if (selectedLesson) rawResolutions = allRes.filter(r => r.lesson === selectedLesson);
        else if (viewMode === 'uncompleted') rawResolutions = allRes.filter(r => !(r.isCompleted || r.is_completed));
      } else {
        let fetchId: string | null = parentId;
        if (!parentId) {
          if (type === 'council') fetchId = 'council-root';
          if (type === 'programs') fetchId = 'programs-root';
        }
        if (fetchId || type === 'workgroups') {
          const res = await dbService.getResolutions(fetchId || undefined);
          if (type === 'workgroups') {
             rawResolutions = parentId ? res.filter(r => (r.is_approved ?? r.isApproved) === (subTab === 'approved')) : [];
          } else {
             rawResolutions = res;
          }
        }
      }

      const processed = rawResolutions.map(r => ({
        ...r,
        isCompleted: r.isCompleted ?? r.is_completed ?? false,
        executorClaim: r.executorClaim ?? r.executor_claim ?? false
      }));
      setResolutions(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupervisorApproval = async (res: Resolution, confirmed: boolean) => {
    if (!canEdit()) return;
    const nowStr = new Date().toLocaleDateString('fa-IR');
    const updated = {
      ...res,
      isCompleted: confirmed,
      is_completed: confirmed,
      lastCompletedAt: confirmed ? nowStr : res.lastCompletedAt,
      last_completed_at: confirmed ? nowStr : res.lastCompletedAt,
      executorClaim: confirmed,
      executor_claim: confirmed,
      progress: confirmed ? 100 : 0
    };
    try {
      await dbService.saveResolution(updated);
      setSelectedDetail(updated);
      setResolutions(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err) { alert('خطا در ذخیره وضعیت'); }
  };

  const handleProgressChange = async (res: Resolution, val: number) => {
    if (!canEdit()) return;
    const updated = {
      ...res,
      progress: val,
      isCompleted: val === 100,
      is_completed: val === 100,
      lastCompletedAt: val === 100 ? new Date().toLocaleDateString('fa-IR') : res.lastCompletedAt
    };
    try {
      await dbService.saveResolution(updated);
      setSelectedDetail(updated);
      setResolutions(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err) { alert('خطا در ذخیره درصد پیشرفت'); }
  };

  const fetchWgPDFs = async () => {
    if (!currentCategory || type !== 'workgroups') return;
    const pdfs = await dbService.getWorkgroupPDFs(currentCategory.id);
    setWgPDFs(pdfs);
  };

  const handlePDFSubmit = async () => {
    if (!currentCategory) return;
    if (!pdfUploadData.title || (!pdfUploadData.file && !pdfUploadData.existingUrl)) {
      alert('لطفا عنوان و فایل را وارد کنید');
      return;
    }
    setIsPDFUploading(true);
    try {
      let finalUrl = pdfUploadData.existingUrl || '';
      if (pdfUploadData.file) {
        finalUrl = await dbService.uploadFile(pdfUploadData.file, pdfUploadData.file.name, `pdfs/${currentCategory.id}`);
      }
      const newPdf: WorkgroupPDF = {
        id: pdfUploadData.id || `pdf-${Date.now()}`,
        workgroupId: currentCategory.id,
        title: pdfUploadData.title,
        description: pdfUploadData.description,
        fileUrl: finalUrl,
        createdAt: new Date().toISOString()
      };
      await dbService.saveWorkgroupPDF(newPdf);
      setShowPDFUploadForm(false);
      setPdfUploadData({ title: '', description: '', file: null });
      fetchWgPDFs();
    } catch (err: any) { alert(err.message); } finally { setIsPDFUploading(false); }
  };

  const handleDeletePDF = async (id: string) => {
    if (!confirm('آیا از حذف این فایل اطمینان دارید؟')) return;
    try {
      await dbService.deleteWorkgroupPDF(id);
      fetchWgPDFs();
    } catch (err: any) { alert(err.message); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsLoading(true);
    setIsSearching(true);
    try {
      const results = await dbService.searchResolutions(type, searchQuery.trim());
      setSearchResults(results);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleAddOrUpdateSubcat = async () => {
    if (!subcatName.trim()) return;
    setIsLoading(true);
    try {
      if (editingCat) {
        await dbService.saveCategory({ ...editingCat, name: subcatName.trim() });
      } else {
        const parentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
        const newCat: Category = {
          id: `cat-${Date.now()}`,
          parent_id: parentId,
          parentId: parentId,
          name: subcatName.trim(),
          type: type
        };
        await dbService.saveCategory(newCat);
      }
      setSubcatName('');
      setShowAddSubcat(false);
      setEditingCat(null);
      await loadData();
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const handleDeleteCategory = async () => {
    if (!confirmDeleteCat) return;
    setIsLoading(true);
    try {
      await dbService.deleteCategory(confirmDeleteCat.id);
      setConfirmDeleteCat(null);
      await loadData();
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const handleDeleteResolution = async () => {
    if (!confirmDeleteRes) return;
    setIsLoading(true);
    try {
      await dbService.deleteResolution(confirmDeleteRes.id);
      setConfirmDeleteRes(null);
      await loadData();
    } catch (err: any) { alert(err.message); } finally { setIsLoading(false); }
  };

  const currentCategory = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;

  const canEdit = () => {
    if (user.role === UserRole.ADMIN) return true;
    if (type === 'by-grade') return user.permissions.byGrade.canEdit;
    if (!currentCategory) {
      if (type === 'council') return user.permissions.council.canEdit;
      if (type === 'programs') return user.permissions.programs.canEdit;
      if (type === 'workgroups') return user.permissions.workgroups.canEdit;
      return false;
    }
    if (currentCategory.type === 'council') return user.permissions.council.canEdit;
    if (currentCategory.type === 'programs') return user.permissions.programs.canEdit;
    const wgId = (currentCategory.parent_id === null || currentCategory.parentId === null) ? currentCategory.id : (currentCategory.parent_id || currentCategory.parentId);
    return user.permissions.workgroupSpecific?.[wgId || '']?.canEdit;
  };

  const resetByGradeView = () => {
    setSelectedGrade(null);
    setSelectedExecutor(null);
    setSelectedLesson(null);
    setViewMode(null);
    setIsSearching(false);
    setSearchQuery('');
  };

  const getPageTitle = () => {
    if (isSearching) return 'نتایج جست‌وجو';
    if (selectedGrade) return `مصوبات ${selectedGrade}`;
    if (selectedExecutor) return `مصوبات ${selectedExecutor}`;
    if (selectedLesson) return `مصوبات درس ${selectedLesson}`;
    if (viewMode === 'uncompleted') return 'تمامی مصوبات انجام نشده';
    if (currentCategory) return currentCategory.name;
    if (type === 'programs') return 'برنامه‌های مدرسه';
    if (type === 'council') return 'مصوبات شورا';
    if (type === 'by-grade') return 'مشاهده و پیگیری مصوبات';
    return 'کارگروه‌ها';
  };

  if (type === 'by-grade' && !viewMode) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-right">
           <h2 className="text-3xl font-black text-black mb-2">مشاهده و پیگیری مصوبات</h2>
           <p className="text-gray-500 font-bold">شیوه نمایش و فیلتر مصوبات را انتخاب کنید.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <button onClick={() => setViewMode('grade')} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex flex-col items-center gap-6 group">
              <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl shadow-blue-100"><Layers size={40} /></div>
              <div className="text-center"><span className="text-xl font-black text-black block mb-2">بر اساس پایه تحصیلی</span><p className="text-[10px] text-gray-400 font-bold">تفکیک مصوبات هر پایه</p></div>
           </button>
           <button onClick={() => setViewMode('executor')} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-amber-500 hover:bg-amber-50/50 transition-all flex flex-col items-center gap-6 group">
              <div className="w-20 h-20 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xl shadow-amber-100"><UserCheck size={40} /></div>
              <div className="text-center"><span className="text-xl font-black text-black block mb-2">بر اساس مسئول پیگیری</span><p className="text-[10px] text-gray-400 font-bold">وظایف اختصاص یافته به افراد</p></div>
           </button>
           <button onClick={() => setViewMode('lesson')} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-6 group">
              <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-xl shadow-blue-50"><Book size={40} /></div>
              <div className="text-center"><span className="text-xl font-black text-black block mb-2">بر اساس درس مرتبط</span><p className="text-[10px] text-gray-400 font-bold">فیلتر مصوبات بر اساس موضوع درس</p></div>
           </button>
           <button onClick={() => setViewMode('uncompleted')} className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-red-500 hover:bg-red-50/50 transition-all flex flex-col items-center gap-6 group">
              <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shadow-xl shadow-red-100"><BellRing size={40} /></div>
              <div className="text-center"><span className="text-xl font-black text-black block mb-2">مصوبات انجام نشده</span><p className="text-[10px] text-gray-400 font-bold">مشاهده فوری موارد باز و در دست اقدام</p></div>
           </button>
        </div>
      </div>
    );
  }

  if (type === 'by-grade' && viewMode === 'grade' && !selectedGrade) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-right flex justify-between items-center">
           <h2 className="text-3xl font-black text-black">انتخاب پایه تحصیلی</h2>
           <button onClick={() => setViewMode(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24} /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
           {GRADES.map(grade => (
             <button key={grade} onClick={() => setSelectedGrade(grade)} className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center gap-4 group">
                <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Layers size={40} /></div>
                <span className="text-2xl font-black text-black">{grade}</span>
             </button>
           ))}
        </div>
      </div>
    );
  }

  if (type === 'by-grade' && viewMode === 'executor' && !selectedExecutor) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-right flex justify-between items-center">
           <h2 className="text-3xl font-black text-black">انتخاب مسئول پیگیری</h2>
           <button onClick={() => setViewMode(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {availableTitles.map(title => (
             <button key={title} onClick={() => setSelectedExecutor(title)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-amber-500 hover:bg-amber-50 transition-all flex items-center gap-6 group">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all"><UserCheck size={32} /></div>
                <span className="text-lg font-black text-black text-right flex-1">{title}</span>
             </button>
           ))}
        </div>
      </div>
    );
  }

  if (type === 'by-grade' && viewMode === 'lesson' && !selectedLesson) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-right flex justify-between items-center">
           <h2 className="text-3xl font-black text-black">انتخاب درس / موضوع</h2>
           <button onClick={() => setViewMode(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {availableLessons.map(lesson => (
             <button key={lesson} onClick={() => setSelectedLesson(lesson)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-6 group">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Book size={32} /></div>
                <span className="text-lg font-black text-black text-right flex-1">{lesson}</span>
             </button>
           ))}
           {availableLessons.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 font-black">درسی ثبت نشده است.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-500">
      {/* PDF Panel Modal */}
      {showPDFPanel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[250] flex items-center justify-center p-4">
           <div className="bg-gray-50 rounded-[3rem] w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="p-8 bg-white border-b border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center"><FileText size={32} /></div>
                    <div><h3 className="text-2xl font-black text-black">اسناد و PDFهای {currentCategory?.name}</h3><p className="text-xs font-bold text-gray-400">بانک جامع مستندات کارگروه</p></div>
                 </div>
                 <div className="flex gap-3">
                    {canEdit() && <button onClick={() => setShowPDFUploadForm(true)} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg"><FileUp size={20} /> آپلود جدید</button>}
                    <button onClick={() => setShowPDFPanel(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24} /></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wgPDFs.map(pdf => (
                      <div key={pdf.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                         <div className="w-full aspect-[3/4] bg-gray-50 rounded-2xl mb-4 flex flex-col items-center justify-center relative overflow-hidden">
                            <FileText size={80} className="text-red-200" /><a href={pdf.fileUrl} target="_blank" className="absolute inset-0 bg-red-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><ExternalLink size={40} /></a>
                         </div>
                         <h4 className="font-black text-black mb-1 line-clamp-1">{pdf.title}</h4>
                         <p className="text-xs text-gray-400 font-bold mb-4 line-clamp-2 h-8">{pdf.description}</p>
                         <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                            <span className="text-[10px] font-bold text-gray-300">{new Date(pdf.createdAt).toLocaleDateString('fa-IR')}</span>
                            {canEdit() && <div className="flex gap-1">
                               <button onClick={() => { setPdfUploadData({ id: pdf.id, title: pdf.title, description: pdf.description, file: null, existingUrl: pdf.fileUrl }); setShowPDFUploadForm(true); }} className="p-2 text-gray-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm"><Edit size={14} /></button>
                               <button onClick={() => handleDeletePDF(pdf.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white rounded-lg shadow-sm"><Trash2 size={14} /></button>
                            </div>}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           {showPDFUploadForm && (
             <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95">
                   <h3 className="text-2xl font-black text-black mb-8">{pdfUploadData.id ? 'ویرایش سند' : 'آپلود سند جدید'}</h3>
                   <div className="space-y-5">
                      <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 pr-2">عنوان سند</label><input className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none" value={pdfUploadData.title} onChange={e => setPdfUploadData({...pdfUploadData, title: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 pr-2">توضیحات</label><textarea className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black outline-none" rows={3} value={pdfUploadData.description} onChange={e => setPdfUploadData({...pdfUploadData, description: e.target.value})} /></div>
                      {!pdfUploadData.id && <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 pr-2">فایل PDF</label><label className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-red-400 cursor-pointer bg-gray-50">{pdfUploadData.file ? <span className="font-black text-red-600">{pdfUploadData.file.name}</span> : <><FileUp size={24} /><span className="text-[10px] font-black mt-2">انتخاب فایل</span></>}<input type="file" accept=".pdf" className="hidden" onChange={e => setPdfUploadData({...pdfUploadData, file: e.target.files?.[0] || null})} /></label></div>}
                      <div className="flex gap-3 pt-4"><button onClick={handlePDFSubmit} disabled={isPDFUploading} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">{isPDFUploading ? <Loader2 className="animate-spin" /> : <Save size={20} />} ذخیره</button><button onClick={() => setShowPDFUploadForm(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button></div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Main Header & Search */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 mb-2 uppercase">
              <button onClick={() => { setCurrentPath([]); resetByGradeView(); }} className="hover:text-emerald-600">ریشه</button>
              {viewMode && (
                 <>
                   <ChevronLeft size={10} />
                   <button onClick={() => { setSelectedGrade(null); setSelectedExecutor(null); setSelectedLesson(null); if(viewMode==='uncompleted') setViewMode(null); }} className="hover:text-emerald-600">
                     {viewMode === 'grade' ? 'مشاهده بر اساس پایه' : viewMode === 'executor' ? 'مشاهده بر اساس مسئول' : viewMode === 'lesson' ? 'مشاهده بر اساس درس' : 'مصوبات انجام نشده'}
                   </button>
                 </>
              )}
              {currentPath.map((p, i) => (
                <React.Fragment key={p.id}><ChevronLeft size={10} /><button onClick={() => setCurrentPath(currentPath.slice(0, i + 1))} className="hover:text-emerald-600">{p.name}</button></React.Fragment>
              ))}
            </div>
            <h2 className="text-3xl font-black text-black">{getPageTitle()}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {type === 'workgroups' && currentCategory && <button onClick={() => { setShowPDFPanel(true); fetchWgPDFs(); }} className="bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 border border-amber-100"><BookOpen size={20} /> مشاهده PDFها</button>}
            <button onClick={() => { loadData(); setIsSearching(false); setSearchQuery(''); }} className="p-3 bg-gray-50 text-gray-500 rounded-xl hover:bg-emerald-50"><RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} /></button>
            {canEdit() && !isSearching && type !== 'by-grade' && <button onClick={() => setShowAddSubcat(true)} className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 border border-emerald-100"><Plus size={20} /> زیرمجموعه</button>}
            {(canEdit() && !isSearching && (currentCategory || type === 'council' || type === 'programs')) && (
              <div className="flex gap-2">
                 <button onClick={() => setShowForm('resolution')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-100"><FileCheck size={20} /> ثبت مصوبه</button>
                 {type === 'workgroups' && <button onClick={() => setShowForm('note')} className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-100"><StickyNote size={20} /> ثبت پیگیری</button>}
              </div>
            )}
          </div>
        </div>
        <form onSubmit={handleSearch} className="relative group max-w-2xl">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input type="text" placeholder={`جست‌وجوی هوشمند...`} className="w-full pr-14 pl-6 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-black outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </form>
      </div>

      {type === 'workgroups' && currentCategory && !isSearching && (
        <div className="flex gap-4 p-2 bg-gray-100 rounded-[2rem] mb-6">
          <button onClick={() => setSubTab('approved')} className={`flex-1 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all ${subTab === 'approved' ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}><ClipboardList size={20} /> مصوبات</button>
          <button onClick={() => setSubTab('unapproved')} className={`flex-1 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all ${subTab === 'unapproved' ? 'bg-white text-amber-700 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}><Clock size={20} /> پیگیری‌ها</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-emerald-600"><Loader2 size={48} className="animate-spin mb-4" /><p className="font-black">در حال بارگذاری...</p></div>
      ) : (
        <div className="animate-in fade-in duration-500">
          {!isSearching && categories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {categories.map(cat => (
                <div key={cat.id} className="relative group">
                  <button onClick={() => setCurrentPath([...currentPath, cat])} className="w-full bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-emerald-200 transition-all text-right flex items-center gap-6 group">
                    <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Folder size={32} /></div>
                    <h3 className="font-black text-black text-lg flex-1 truncate">{cat.name}</h3>
                  </button>
                  {canEdit() && <div className="absolute left-6 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setSubcatName(cat.name); }} className="p-2 bg-white text-gray-400 hover:text-emerald-600 rounded-xl shadow-sm border border-gray-100"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteCat(cat); }} className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100"><Trash2 size={16} /></button>
                    </div>}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
             {(isSearching ? searchResults : resolutions).map(res => (
               <div key={res.id} onClick={() => setSelectedDetail(res)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-emerald-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-center">
                     <div className="flex-1"><div className="flex items-center gap-2 mb-2"><span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[10px] font-black">{res.workgroup}</span>{res.isCompleted ? <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1"><CheckCircle2 size={10} /> تایید نهایی</span> : (res.executorClaim || res.executor_claim) ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1"><AlertCircle size={10} /> منتظر تایید</span> : <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1"><Clock size={10} /> در دست پیگیری ({res.progress || 0}%)</span>}</div><h4 className="text-xl font-black text-black group-hover:text-emerald-700">{res.title}</h4></div>
                     <div className="flex items-center gap-2">{canEdit() && <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setEditingRes(res); }} className="p-2 text-gray-400 hover:text-emerald-600"><Edit size={18} /></button><button onClick={(e) => { e.stopPropagation(); setConfirmDeleteRes(res); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button></div>}<ChevronLeft size={20} className="text-gray-300" /></div>
                  </div>
               </div>
             ))}
             {(isSearching ? searchResults : resolutions).length === 0 && !isLoading && <div className="flex flex-col items-center justify-center py-20 text-gray-300"><Inbox size={64} strokeWidth={1} className="mb-4 opacity-20" /><p className="font-black text-lg opacity-40">موردی یافت نشد.</p></div>}
          </div>
        </div>
      )}

      {/* Full Detail View Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 md:p-12 relative animate-in zoom-in-95">
              <button onClick={() => setSelectedDetail(null)} className="absolute top-8 left-8 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"><X size={28} /></button>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="bg-emerald-50 text-emerald-700 px-5 py-2 rounded-2xl text-xs font-black border border-emerald-100 flex items-center gap-2 shadow-sm"><MapPin size={16} /> {selectedDetail.workgroup}</div>
                {selectedDetail.grade && <div className="bg-blue-50 text-blue-700 px-5 py-2 rounded-2xl text-xs font-black border border-blue-100 flex items-center gap-2 shadow-sm"><Layers size={16} /> {selectedDetail.grade}</div>}
                <div className={`px-5 py-2 rounded-2xl text-xs font-black border flex items-center gap-2 shadow-sm ${selectedDetail.isCompleted ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{selectedDetail.isCompleted ? <CheckCircle2 size={16} /> : <Activity size={16} />} پیشرفت: {selectedDetail.progress || 0}٪</div>
              </div>
              <h2 className="text-4xl font-black text-black mb-10 border-r-8 border-emerald-500 pr-6 leading-tight max-w-2xl">{selectedDetail.title}</h2>
              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-3 group hover:bg-amber-50 transition-colors"><div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm"><Clock size={24} /></div><div><p className="text-[11px] font-black text-gray-400 mb-1">زمان ثبت</p><p className="font-black text-lg text-black">{selectedDetail.createdAt || selectedDetail.created_at || 'نامشخص'}</p></div></div>
                   <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-3 group hover:bg-blue-50 transition-colors"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm"><Book size={24} /></div><div><p className="text-[11px] font-black text-gray-400 mb-1">درس مرتبط</p><p className="font-black text-lg text-black">{selectedDetail.lesson || 'ثبت نشده'}</p></div></div>
                   <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-3 group hover:bg-emerald-50 transition-colors"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><Users size={24} /></div><div><p className="text-[11px] font-black text-gray-400 mb-1">مسئول پیگیری</p><p className="font-black text-lg text-black">{selectedDetail.executor || 'نامشخص'}</p></div></div>
                   <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-3 group hover:bg-purple-50 transition-colors"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm"><Layers size={24} /></div><div><p className="text-[11px] font-black text-gray-400 mb-1">پایه تحصیلی</p><p className="font-black text-lg text-black">{selectedDetail.grade || 'همه پایه‌ها'}</p></div></div>
                </div>
                {canEdit() && (
                   <div className="bg-gray-100/50 p-8 rounded-[2.5rem] border border-gray-200 space-y-6 shadow-inner">
                      {(selectedDetail.executorClaim || selectedDetail.executor_claim) && !selectedDetail.isCompleted && (
                        <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2rem] animate-in slide-in-from-top-4 shadow-xl"><div className="flex items-center gap-4 text-amber-800 mb-6"><AlertCircle size={40} className="shrink-0" /><span className="font-black text-lg">هشدار: اعلام اتمام کار توسط مسئول ({selectedDetail.executor})</span></div><p className="text-sm font-bold text-amber-700 mb-8">آیا تایید نهایی می‌کنید؟</p><div className="flex flex-col sm:flex-row gap-4"><button onClick={() => handleSupervisorApproval(selectedDetail, true)} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 transition-all text-lg"><CheckCircle2 size={24} /> تایید نهایی</button><button onClick={() => handleSupervisorApproval(selectedDetail, false)} className="flex-1 bg-white text-red-600 py-5 rounded-2xl font-black flex items-center justify-center gap-3 border-2 border-red-100 hover:bg-red-50 text-lg"><X size={24} /> نیاز به اصلاح</button></div></div>
                      )}
                      {!selectedDetail.isCompleted && !(selectedDetail.executorClaim || selectedDetail.executor_claim) && (
                        <div className="space-y-6"><div className="flex items-center justify-between mb-4"><h4 className="font-black text-gray-700 flex items-center gap-3 text-xl"><ClipboardList size={28} className="text-emerald-600" /> مدیریت نظارت</h4><div className="bg-white px-6 py-2 rounded-2xl font-black text-emerald-600 border-2 border-emerald-50 shadow-sm text-xl">{selectedDetail.progress || 0}٪</div></div><input type="range" min="0" max="100" step="5" value={selectedDetail.progress || 0} onChange={(e) => handleProgressChange(selectedDetail, parseInt(e.target.value))} className="w-full h-6 bg-white rounded-full appearance-none cursor-pointer accent-emerald-600 border-2 border-gray-100" />{selectedDetail.progress === 100 && <button onClick={() => handleSupervisorApproval(selectedDetail, true)} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black mt-6 shadow-2xl hover:bg-emerald-700 text-lg flex items-center justify-center gap-3"><CheckCircle2 size={24} /> ثبت نهایی به عنوان انجام شده</button>}</div>
                      )}
                      {selectedDetail.isCompleted && <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center gap-4"><p className="font-black text-emerald-800 text-center">تایید نهایی شده در {selectedDetail.lastCompletedAt || selectedDetail.last_completed_at}</p><button onClick={() => handleSupervisorApproval(selectedDetail, false)} className="w-full bg-white text-amber-700 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-amber-50 border border-amber-200"><RefreshCw size={20} /> لغو تایید نهایی</button></div>}
                   </div>
                )}
                <div className="space-y-6"><h4 className="text-2xl font-black text-black flex items-center gap-3"><List size={32} className="text-emerald-500" /> شرح کامل مصوبه</h4><div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 leading-loose text-lg font-bold text-gray-800 whitespace-pre-line text-justify shadow-inner min-h-[150px]">{selectedDetail.description || 'توضیحاتی ثبت نشده است.'}</div></div>
                {selectedDetail.images && selectedDetail.images.length > 0 && (
                  <div className="space-y-6 pt-10 border-t-2 border-gray-50"><h4 className="text-2xl font-black text-black flex items-center gap-3"><ImageIcon size={32} className="text-emerald-500" /> مستندات و فایل‌های پیوست</h4><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-8">
                      {selectedDetail.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl hover:scale-105 transition-transform block bg-gray-50 group relative">{img.includes('.pdf') ? <div className="w-full h-full flex flex-col items-center justify-center text-red-600 gap-3"><div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center"><FileText size={40} /></div><span className="text-xs font-black">مشاهده PDF</span></div> : <><img src={img} className="w-full h-full object-cover" alt={`مستند ${i+1}`} /><div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><ExternalLink size={32} /></div></>}</a>
                      ))}
                    </div></div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Confirmation Modals and Forms remain functionally identical to ensure logic stability */}
      {confirmDeleteRes && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 text-center"><div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div><h3 className="text-xl font-black text-black mb-3">حذف نهایی</h3><p className="text-gray-500 font-bold text-sm mb-8">آیا از حذف مصوبه "{confirmDeleteRes.title}" اطمینان دارید؟</p><div className="flex gap-3"><button onClick={handleDeleteResolution} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">حذف شود</button><button onClick={() => setConfirmDeleteRes(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button></div></div>
        </div>
      )}

      {confirmDeleteCat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 text-center"><div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle size={40} /></div><h3 className="text-xl font-black text-black mb-3">حذف زیرمجموعه</h3><p className="text-gray-500 font-bold text-sm mb-8">آیا از حذف "{confirmDeleteCat.name}" اطمینان دارید؟</p><div className="flex gap-3"><button onClick={handleDeleteCategory} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">حذف</button><button onClick={() => setConfirmDeleteCat(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button></div></div>
        </div>
      )}

      {(showForm || editingRes) && <ResolutionForm parentId={editingRes?.parentId || editingRes?.parent_id || currentCategory?.id || (type === 'council' ? 'council-root' : type === 'programs' ? 'programs-root' : '')} onClose={() => { setShowForm(null); setEditingRes(null); }} isNote={showForm === 'note'} initialData={editingRes} sectionType={type} onSave={() => { setShowForm(null); setEditingRes(null); loadData(); }} parentName={currentCategory?.name} />}
      {(showAddSubcat || editingCat) && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black text-black mb-6">{editingCat ? 'ویرایش نام' : 'افزودن زیرمجموعه'}</h3><input autoFocus className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black mb-6 outline-none" value={subcatName} onChange={(e) => setSubcatName(e.target.value)} /><div className="flex gap-3"><button onClick={handleAddOrUpdateSubcat} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black">تایید</button><button onClick={() => { setShowAddSubcat(false); setEditingCat(null); setSubcatName(''); }} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button></div></div></div>}
    </div>
  );
};

export default TreeSection;