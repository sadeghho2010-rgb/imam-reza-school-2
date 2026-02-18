
import { User, UserRole, UserPermissions } from './types';

export const DEFAULT_PERMISSIONS: UserPermissions = {
  programs: { canView: true, canEdit: false },
  council: { canView: true, canEdit: false },
  workgroups: { canView: true, canEdit: false },
  byGrade: { canView: true, canEdit: false },
  workgroupSpecific: {}
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  programs: { canView: true, canEdit: true },
  council: { canView: true, canEdit: true },
  workgroups: { canView: true, canEdit: true },
  byGrade: { canView: true, canEdit: true },
  workgroupSpecific: {}
};

export const ADMIN_USER: User = {
  id: 'admin-1',
  username: 'sadeghho',
  password: '8411924As',
  fullName: 'مدیر اصلی',
  phone: '09151259664',
  title: 'مدیر مجموعه',
  role: UserRole.ADMIN,
  isActive: true,
  permissions: ADMIN_PERMISSIONS
};

export const DEFAULT_TITLES = [
  'مدیر مجموعه',
  'معاون آموزش',
  'مسئول آموزش',
  'معاون پژوهش',
  'مسئول واحد قرآن',
  'کاربر عادی'
];

export const GRADES = ['پایه ۱', 'پایه ۲', 'پایه ۳', 'پایه ۴', 'پایه ۵', 'پایه ۶'];
