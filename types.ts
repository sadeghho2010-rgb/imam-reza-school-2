
export enum UserRole {
  ADMIN = 1, // Full Access
  CUSTOM = 2 // Custom Access controlled by Admin
}

export interface SectionPermission {
  canView: boolean;
  canEdit: boolean;
}

export interface UserPermissions {
  programs: SectionPermission;
  council: SectionPermission;
  workgroups: SectionPermission;
  byGrade: SectionPermission;
  workgroupSpecific: Record<string, SectionPermission>;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  phone: string;
  title: string;
  role: UserRole;
  isActive: boolean;
  permissions: UserPermissions;
}

export interface WorkgroupPDF {
  id: string;
  workgroupId: string;
  title: string;
  description: string;
  fileUrl: string;
  createdAt: string;
}

export interface Resolution {
  id: string;
  parentId?: string; // TS side
  parent_id?: string; // DB side
  title: string;
  workgroup: string;
  lesson?: string;
  grade?: string;
  description: string;
  createdAt?: string; // TS side
  created_at?: string; // DB side
  executor: string;
  needsDate: boolean;
  needs_date?: boolean;
  executionDate?: string;
  execution_date?: string;
  executionTerm?: string;
  execution_term?: string;
  images: string[];
  isApproved?: boolean; // TS side
  is_approved?: boolean; // DB side
  discussionTime?: string;
  discussion_time?: string;
}

export interface Category {
  id: string;
  parentId?: string | null;
  parent_id?: string | null;
  name: string;
  type: 'programs' | 'council' | 'workgroups' | 'by-grade';
}
