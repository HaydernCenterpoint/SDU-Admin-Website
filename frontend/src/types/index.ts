export type Role = 'TEACHER' | 'DEPT_HEAD' | 'BOARD' | 'QC' | 'ADMIN';

export type PlanStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'DEPT_APPROVED_TO_BGH' 
  | 'DEPT_REJECTED_PHASE1'
  | 'REPORTING'
  | 'REPORT_SUBMITTED'
  | 'RECEIVED'
  | 'ACCEPTED_TO_BGH'
  | 'DEPT_REJECTED_PHASE2'
  | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  departmentName: string;
  avatar?: string;
  dob?: string;
  gender?: string;
  contact_email?: string;
  pending_profile?: any;
}

export interface TableColumn {
  id: string;
  name: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableTemplate {
  id: string;
  name: string;
  columns: TableColumn[];
  defaultRows?: any[];
}


export interface PlanItem {
  id: string;
  [key: string]: any; // Allow dynamic custom columns based on TableTemplate
}

export interface PlanWeek {
  id: string;
  weekLabel: string;
  plannedHours: number;
  actualHours?: number;
  [key: string]: any;
}

export interface Plan {
  id: string;
  code: string;
  title: string;
  month: number;
  year: number;
  teacherId: string;
  teacherName: string;
  departmentId: string;
  departmentName?: string;
  status: PlanStatus;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
  items: PlanItem[];
  weeks: PlanWeek[];
  attachedFileUrl?: string; // Legacy
  attachedFilePath?: string; // Legacy
  attachedFileName?: string; // Legacy
  attachments?: { path: string, name: string, url?: string }[];
  auditLog: {
    id: string;
    actor: string;
    action: string;
    timestamp: string;
    comment?: string;
  }[];
  score?: number;
  feedback?: string;
}
