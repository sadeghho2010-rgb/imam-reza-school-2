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
  parentId?: string;
  parent_id?: string;
  title: string;
  workgroup: string;
  lesson?: string;
  grade?: string;
  description: string;
  createdAt?: string;
  created_at?: string;
  executor: string;
  needsDate: boolean;
  needs_date?: boolean;
  executionDate?: string;
  execution_date?: string;
  executionTerm?: string;
  execution_term?: string;
  images: string[];
  isApproved?: boolean;
  is_approved?: boolean;
  discussionTime?: string;
  discussion_time?: string;
  // Reminder Fields
  reminderType?: 'none' | 'once' | 'monthly' | 'quarterly' | 'yearly';
  reminder_type?: string;
  reminderStartDate?: string;
  reminder_start_date?: string;
  reminderEndDate?: string;
  reminder_end_date?: string;
  // Completion Fields
  isCompleted?: boolean;
  is_completed?: boolean;
  lastCompletedAt?: string;
  last_completed_at?: string;
  progress?: number;
  executorClaim?: boolean;
  executor_claim?: boolean;
  executorClaimDate?: string;
  executor_claim_date?: string;
}

export interface Category {
  id: string;
  parentId?: string | null;
  parent_id?: string | null;
  name: string;
  type: 'programs' | 'council' | 'workgroups' | 'by-grade';
}