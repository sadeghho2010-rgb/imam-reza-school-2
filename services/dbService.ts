import { createClient } from '@supabase/supabase-js';
import { User, Resolution, Category, UserRole, UserPermissions, WorkgroupPDF } from '../types';
import { ADMIN_USER } from '../constants';

const SUPABASE_URL = 'https://ouqdshscwuikindiuxzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cWRzaHNjd3Vpa2luZGl1eHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzkyNzUsImV4cCI6MjA4NDg1NTI3NX0.q6QvlIKq4CJU6kDRcZGPwgveu5Ko6C3jdf7aYGk5HJU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = 'imam-reza-assets';
const PDF_MARKER = '__PDF_INTERNAL_DOC__';

export const dbService = {
  isOnline: true,

  init: async () => {
    try {
      const { error: pingError } = await supabase.from('users').select('id').limit(1);
      dbService.isOnline = !pingError || pingError.code === 'PGRST116';

      if (dbService.isOnline) {
        await supabase.from('users').upsert([{ 
          id: ADMIN_USER.id,
          username: ADMIN_USER.username,
          password: ADMIN_USER.password,
          full_name: ADMIN_USER.fullName,
          phone: ADMIN_USER.phone,
          title: ADMIN_USER.title,
          role: ADMIN_USER.role,
          is_active: ADMIN_USER.isActive,
          permissions: ADMIN_USER.permissions
        }], { onConflict: 'username' });

        await supabase.from('categories').upsert([
          { id: 'programs-root', name: 'ریشه برنامه‌ها', type: 'programs' },
          { id: 'council-root', name: 'ریشه مصوبات شورا', type: 'council' }
        ], { onConflict: 'id' });
      }
    } catch (e) {
      dbService.isOnline = false;
    }
  },

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []).map(u => ({
        ...u,
        fullName: u.full_name,
        isActive: u.is_active
      }));
    } catch { return [ADMIN_USER]; }
  },
  
  saveUser: async (user: User) => {
    const { error } = await supabase.from('users').upsert([{
      id: user.id,
      username: user.username,
      password: user.password,
      full_name: user.fullName,
      phone: user.phone,
      title: user.title,
      role: user.role,
      is_active: user.isActive,
      permissions: user.permissions
    }], { onConflict: 'username' });
    if (error) throw error;
  },

  getCategories: async (): Promise<Category[]> => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return (data || []).map(c => ({ ...c, parentId: c.parent_id }));
    } catch { return []; }
  },

  saveCategory: async (cat: Category) => {
    const payload = {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      parent_id: cat.parent_id || cat.parentId || null
    };
    const { error } = await supabase.from('categories').upsert([payload]);
    if (error) throw error;
  },

  deleteCategory: async (id: string) => {
    if (id === 'programs-root' || id === 'council-root') return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  getResolutions: async (parentId?: string): Promise<Resolution[]> => {
    try {
      let query = supabase.from('resolutions').select('*').neq('lesson', PDF_MARKER);
      if (parentId) query = query.eq('parent_id', parentId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        parentId: r.parent_id,
        createdAt: r.created_at,
        needsDate: r.needs_date,
        executionDate: r.execution_date,
        executionTerm: r.execution_term,
        isApproved: r.is_approved,
        discussionTime: r.discussion_time,
        reminderType: r.reminder_type,
        reminderStartDate: r.reminder_start_date,
        reminderEndDate: r.reminder_end_date,
        isCompleted: r.is_completed,
        lastCompletedAt: r.last_completed_at,
        progress: r.progress || 0,
        executorClaim: r.executor_claim || false,
        executorClaimDate: r.executor_claim_date
      }));
    } catch { return []; }
  },

  searchResolutions: async (type: string, query: string): Promise<Resolution[]> => {
    try {
      const { data: cats } = await supabase.from('categories').select('id, name').eq('type', type);
      const catIds = cats?.map(c => c.id) || [];
      if (type === 'council') catIds.push('council-root');
      if (type === 'programs') catIds.push('programs-root');

      const { data, error } = await supabase
        .from('resolutions')
        .select('*')
        .neq('lesson', PDF_MARKER)
        .in('parent_id', catIds)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        parentId: r.parent_id,
        createdAt: r.created_at,
        needsDate: r.needs_date,
        executionDate: r.execution_date,
        executionTerm: r.execution_term,
        isApproved: r.is_approved,
        discussionTime: r.discussion_time,
        reminderType: r.reminder_type,
        reminderStartDate: r.reminder_start_date,
        reminderEndDate: r.reminder_end_date,
        isCompleted: r.is_completed,
        lastCompletedAt: r.last_completed_at,
        progress: r.progress || 0,
        executorClaim: r.executor_claim || false,
        executorClaimDate: r.executor_claim_date
      }));
    } catch { return []; }
  },
  
  saveResolution: async (res: Resolution) => {
    const { error } = await supabase.from('resolutions').upsert([{
      id: res.id,
      parent_id: res.parent_id || res.parentId,
      title: res.title,
      workgroup: res.workgroup,
      lesson: res.lesson,
      grade: res.grade,
      description: res.description,
      created_at: res.created_at || res.createdAt,
      executor: res.executor,
      needs_date: res.needs_date ?? res.needsDate,
      execution_date: res.execution_date || res.executionDate,
      execution_term: res.execution_term || res.executionTerm,
      images: res.images || [],
      is_approved: res.is_approved ?? res.isApproved,
      discussion_time: res.discussion_time || res.discussionTime,
      reminder_type: res.reminderType,
      reminder_start_date: res.reminderStartDate,
      reminder_end_date: res.reminderEndDate,
      is_completed: res.isCompleted ?? res.is_completed,
      last_completed_at: res.lastCompletedAt || res.last_completed_at,
      progress: res.progress || 0,
      executor_claim: res.executorClaim ?? res.executor_claim,
      executor_claim_date: res.executorClaimDate || res.executor_claim_date
    }]);
    if (error) throw error;
  },

  deleteResolution: async (id: string) => {
    const { error } = await supabase.from('resolutions').delete().eq('id', id);
    if (error) throw error;
  },

  getWorkgroupPDFs: async (workgroupId: string): Promise<WorkgroupPDF[]> => {
    try {
      const { data, error } = await supabase
        .from('resolutions')
        .select('*')
        .eq('parent_id', workgroupId)
        .eq('lesson', PDF_MARKER)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        workgroupId: workgroupId,
        title: r.title,
        description: r.description,
        fileUrl: r.images?.[0] || '',
        createdAt: r.created_at
      }));
    } catch { return []; }
  },

  saveWorkgroupPDF: async (pdf: WorkgroupPDF) => {
    const { error } = await supabase.from('resolutions').upsert([{
      id: pdf.id,
      parent_id: pdf.workgroupId, 
      title: pdf.title,
      description: pdf.description,
      images: [pdf.fileUrl],
      lesson: PDF_MARKER,
      workgroup: 'بایگانی اسناد',
      executor: 'سیستم',
      created_at: pdf.createdAt || new Date().toISOString(),
      is_approved: true
    }]);
    if (error) throw error;
  },

  deleteWorkgroupPDF: async (id: string) => {
    return dbService.deleteResolution(id);
  },

  updateUserPermissions: async (userId: string, perms: UserPermissions, title: string, role: UserRole) => {
    await supabase.from('users').update({ permissions: perms, title, role }).eq('id', userId);
  },

  getCustomTitles: async (): Promise<{id: number, title: string}[]> => {
    try {
      const { data, error } = await supabase.from('custom_titles').select('*').order('id');
      if (error) throw error;
      return data || [];
    } catch { return []; }
  },

  saveCustomTitle: async (title: string) => {
    const { error } = await supabase.from('custom_titles').insert([{ title }]);
    if (error) throw error;
  },

  updateCustomTitle: async (id: number, newTitle: string) => {
    const { error } = await supabase.from('custom_titles').update({ title: newTitle }).eq('id', id);
    if (error) throw error;
  },

  deleteCustomTitle: async (id: number) => {
    const { error } = await supabase.from('custom_titles').delete().eq('id', id);
    if (error) throw error;
  },

  uploadFile: async (file: File | Blob, fileName: string, folder: string = 'general'): Promise<string> => {
    const ext = fileName.split('.').pop();
    const cleanName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(cleanName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  compressImage: async (base64: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX_DIM = 1200;
        if (width > height && width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
        else if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/jpeg', 0.6); 
      };
    });
  }
};