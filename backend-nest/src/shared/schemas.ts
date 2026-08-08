/**
 * Shared Zod schemas & TS types.
 * Importable from BOTH backend routers AND frontend client.
 * Single source of truth for API contract.
 */
import { z } from 'zod';

// ─── Primitives ────────────────────────────────────────────────────────────
export const idSchema = z.union([z.string(), z.number()]).transform((v) =>
  typeof v === 'string' ? parseInt(v, 10) : v,
);

// ─── Enums (must mirror Prisma enums) ──────────────────────────────────────
export const UserRoleEnum = z.enum(['ADMIN', 'BOARD', 'QC', 'DEPT_HEAD', 'TEACHER', 'STUDENT']);
export const UserStatusEnum = z.enum(['PENDING', 'ACTIVE', 'REJECTED']);
export const GenderEnum = z.enum(['Nam', 'Nu', 'Khac']);
export const PlanStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'DEPT_APPROVED_TO_BGH',
  'DEPT_REJECTED_PHASE1',
  'DEPT_REJECTED_PHASE2',
  'REPORT_SUBMITTED',
  'ACCEPTED_TO_BGH',
  'COMPLETED',
  'CANCELLED',
]);
export const WeekStatusEnum = z.enum(['PENDING', 'COMPLETED', 'RESCHEDULED']);

// ─── Department ────────────────────────────────────────────────────────────
export const departmentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DepartmentDTO = z.infer<typeof departmentSchema>;

// ─── User ──────────────────────────────────────────────────────────────────
export const userSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  role: UserRoleEnum,
  status: UserStatusEnum,
  departmentId: z.number().int().nullable(),
  department: departmentSchema.nullable().optional(),
  avatar: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: GenderEnum.nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  pendingProfile: z.any().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserDTO = z.infer<typeof userSchema>;

// ─── Plan ──────────────────────────────────────────────────────────────────
export const planItemInputSchema = z.object({
  id: z.number().int().optional(),
  topic: z.string().min(1).default('N/A'),
  locationId: z.number().int().nullable().optional(),
  equipmentId: z.number().int().nullable().optional(),
  equipmentNameManual: z.string().nullable().optional(),
  equipmentYearManual: z.number().int().nullable().optional(),
  executorId: z.number().int().nullable().optional(),
  mentorId: z.number().int().nullable().optional(),
  timeRange: z.string().nullable().optional(),
  expectedResult: z.string().nullable().optional(),
  plannedHours: z.number().int().nonnegative().default(0),
  type: z.enum(['TEACHER', 'STUDENT']).default('TEACHER'),
});
export type PlanItemInput = z.infer<typeof planItemInputSchema>;

export const planWeekInputSchema = z.object({
  id: z.number().int().optional(),
  weekLabel: z.string().min(1),
  plannedHours: z.number().int().nonnegative().default(0),
  actualHours: z.number().int().nullable().optional(),
  status: WeekStatusEnum.default('PENDING'),
  busyNote: z.string().nullable().optional(),
  rescheduleDate: z.string().nullable().optional(),
  rescheduleRoom: z.string().nullable().optional(),
  rescheduleNote: z.string().nullable().optional(),
});
export type PlanWeekInput = z.infer<typeof planWeekInputSchema>;

export const attachmentSchema = z.object({
  name: z.string(),
  path: z.string(),
  url: z.string().optional(),
});
export type AttachmentDTO = z.infer<typeof attachmentSchema>;

export const planSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  title: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  userId: z.number().int(),
  teacher: userSchema.optional(),
  departmentId: z.number().int(),
  department: departmentSchema.optional(),
  status: PlanStatusEnum,
  score: z.number().int().nullable(),
  feedback: z.string().nullable(),
  attachedFilePath: z.string().nullable(),
  attachedFileName: z.string().nullable(),
  attachments: z.array(attachmentSchema).optional(),
  items: z.array(z.any()).optional(),
  weeks: z.array(z.any()).optional(),
  auditLogs: z.array(z.any()).optional(),
  templateId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlanDTO = z.infer<typeof planSchema>;

// ─── Audit Log ─────────────────────────────────────────────────────────────
export const auditLogSchema = z.object({
  id: z.number().int(),
  planId: z.number().int(),
  userId: z.number().int(),
  user: userSchema.optional(),
  action: z.string(),
  comment: z.string().nullable(),
  timestamp: z.string(),
  createdAt: z.string(),
});
export type AuditLogDTO = z.infer<typeof auditLogSchema>;

// ─── Auth payloads ─────────────────────────────────────────────────────────
export const loginInputSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email hoặc mã giảng viên'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  email: z.string().optional(),
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  contactEmail: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  departmentId: z.number().int().nullable().optional(),
  role: UserRoleEnum.default('TEACHER'),
  gender: GenderEnum.default('Nam'),
  dob: z.string().optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
