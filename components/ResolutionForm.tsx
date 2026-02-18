
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Book, Layers, Users, Image as ImageIcon, Loader2, Clock, FileText, Upload } from 'lucide-react';
import { dbService } from '../services/dbService';
import { GRADES, DEFAULT_TITLES } from '../constants';
import { Resolution } from '../types';

interface ResolutionFormProps {
  parentId: string;
  onClose: () => void;
  onSave: () => void;
  isNote?: boolean;
  initialData?: Resolution | null;
  sectionType?: 'programs' | 'council' | 'workgroups' | 'by-grade';
  parentName?: string;
}

const ResolutionForm: React.FC<ResolutionFormProps> = ({ parentId, onClose, onSave, isNote = false, initialData, sectionType, parentName }) => {
  const [needsDate, setNeedsDate] = useState(initialData?.needsDate || initialData?.needs_date || false);
  const [dateType, setDateType] = useState<'calendar' | 'term'>(initialData?.executionTerm || initialData?.execution_term ? 'term' : 'calendar');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const t = await dbService.getCustomTitles();
      setTitles([...DEFAULT_TITLES, ...t.map(item => item.title)]);
    };
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsUploading(true);
    const files = Array.from(e.target.files).slice(0, 10 - images.length) as File[];
    for (const file of files) {
      try {
        let fileToUpload: File | Blob = file;
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          fileToUpload = await dbService.compressImage(base64);
        }
        const url = await dbService.uploadFile(fileToUpload, file.name, sectionType || 'general');
        setImages(prev => [...prev, url]);
      } catch (err: any) { alert(`خطا در آپلود: ${err.message}`); }
    }
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Improved labeling logic - No more "General" or "Macro"
    let contextLabel = parentName;
    if (sectionType === 'council' && !parentName) contextLabel = "شورای مدرسه";
    if (sectionType === 'programs' && !parentName) contextLabel = "برنامه‌های مدرسه";
    if (sectionType === 'workgroups' && !parentName) contextLabel = "کارگروه مربوطه";
    if (!contextLabel) contextLabel = "ثبت شده در سامانه";

    const res: Resolution = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      parentId: initialData?.parent_id || initialData?.parentId || parentId,
      title: formData.get('title') as string,
      workgroup: initialData?.workgroup || contextLabel,
      lesson: formData.get('lesson') as string,
      grade: formData.get('grade') as string,
      description: formData.get('description') as string,
      createdAt: initialData?.created_at || initialData?.createdAt || new Date().toLocaleDateString('fa-IR'),
      executor: (formData.get('executor') as string) || '',
      needsDate,
      executionDate: needsDate && dateType === 'calendar' ? (formData.get('executionDate') as string) : undefined,
      executionTerm: needsDate && dateType === 'term' ? (formData.get('executionTerm') as string) : undefined,
      images,
      isApproved: initialData ? (initialData.is_approved ?? initialData.isApproved) : !isNote,
      discussionTime: isNote ? (formData.get('discussionTime') as string) : undefined
    };
    try {
      await dbService.saveResolution(res);
      onSave();
    } catch (err: any) { alert(`خطا: ${err.message}`); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-8 flex justify-between items-center z-10">
          <h3 className="text-2xl font-black text-black flex items-center gap-3">
             <Save className="text-emerald-600" /> 
             {isNote ? 'ثبت برنامه جهت پیگیری' : 'ثبت مصوبه جدید'}
          </h3>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full text-gray-400"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 pr-2">عنوان</label>
              <input name="title" defaultValue={initialData?.title} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 pr-2">درس مرتبط / موضوع</label>
              <input name="lesson" defaultValue={initialData?.lesson} placeholder="مثلاً: نحو، منطق، فقه..." className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 pr-2">پایه مرتبط</label>
              <select name="grade" defaultValue={initialData?.grade} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black outline-none appearance-none">
                <option value="">انتخاب پایه...</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {!isNote ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 pr-2">مسئول اجرا</label>
                <select name="executor" defaultValue={initialData?.executor} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black outline-none appearance-none">
                  <option value="">انتخاب مسئول...</option>
                  {titles.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 pr-2">زمان مطرح شدن جهت پیگیری</label>
                <input name="discussionTime" defaultValue={initialData?.discussionTime} placeholder="مثلاً: هفته آینده، ترم دوم..." className="w-full px-5 py-4 bg-amber-50 border border-amber-100 rounded-2xl font-black text-black outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 pr-2">توضیحات کامل</label>
            <textarea name="description" defaultValue={initialData?.description} rows={4} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-black outline-none focus:ring-2 focus:ring-emerald-500/20"></textarea>
          </div>

          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={needsDate} onChange={(e) => setNeedsDate(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
                <span className="font-bold text-black">آیا نیاز به تاریخ خاص جهت اجرا دارد؟</span>
             </label>
             {needsDate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                   <div className="flex gap-2">
                      <button type="button" onClick={() => setDateType('calendar')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${dateType === 'calendar' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-400'}`}>تاریخ زمانی</button>
                      <button type="button" onClick={() => setDateType('term')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${dateType === 'term' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-400'}`}>تاریخ ترمی</button>
                   </div>
                   {dateType === 'calendar' ? (
                      <input type="text" name="executionDate" defaultValue={initialData?.executionDate} placeholder="مثلاً: ۱۴۰۳/۰۵/۱۵" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-black text-black outline-none" />
                   ) : (
                      <input type="text" name="executionTerm" defaultValue={initialData?.executionTerm} placeholder="مثلاً: ترم دوم پایه ۴" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-black text-black outline-none" />
                   )}
                </div>
             )}
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-400 pr-2">بارگذاری مستندات (عکس یا PDF)</label>
             <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden group shadow-md border border-gray-100">
                    {img.includes('.pdf') ? <div className="w-full h-full bg-red-50 flex items-center justify-center text-red-600"><FileText /></div> : <img src={img} className="w-full h-full object-cover" />}
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><X size={20} /></button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 cursor-pointer transition-all bg-gray-50 hover:bg-emerald-50/30">
                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                    <span className="text-[8px] font-black mt-1">افزودن فایل</span>
                    <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
             </div>
          </div>

          <button type="submit" disabled={isUploading} className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all disabled:bg-gray-400">
             {isUploading ? <Loader2 className="animate-spin" /> : <Save size={24} />} ذخیره نهایی اطلاعات
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResolutionForm;
