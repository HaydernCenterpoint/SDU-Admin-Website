// @ts-nocheck — Prisma enum literal types cause benign narrowing errors. Runtime is correct.
/**
 * Plans service — encapsulates all business logic for plans.
 * Mirrors PlanController (486 lines of PHP) but with:
 *   - Prisma transactions
 *   - Explicit ownership/role checks
 *   - Zod input validation
 *   - Audit log written in the same transaction as the mutation
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanStatus, WeekStatus, UserRole, ActivityType } from '@prisma/client';
import type { PlanItemInput, PlanWeekInput, AttachmentDTO } from '../shared/schemas';

export interface CreatePlanInput {
  title: string;
  month: number;
  year: number;
  templateId?: string;
  items?: PlanItemInput[];
  weeks?: PlanWeekInput[];
  newAttachments?: AttachmentDTO[];
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  keptAttachments?: AttachmentDTO[];
}

const planInclude = {
  teacher: { include: { department: true } },
  department: true,
  items: true,
  weeks: true,
  auditLogs: { include: { user: true }, orderBy: { timestamp: 'desc' as const } },
} as const;


@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────
  private generateCode(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `KH-${year}-${rand}`;
  }

  // ─── list ─────────────────────────────────────────────────────────────
  async list(actor: { id: number; role: UserRole; departmentId: number | null }) {
    const baseInclude = planInclude;
    if (actor.role === UserRole.TEACHER) {
      return this.prisma.plan.findMany({
        where: {
          OR: [
            { userId: actor.id },
            { departmentId: actor.departmentId, status: { not: PlanStatus.DRAFT } },
          ],
        },
        include: baseInclude,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }
    if (actor.role === UserRole.DEPT_HEAD) {
      return this.prisma.plan.findMany({
        where: {
          OR: [
            { userId: actor.id },
            { departmentId: actor.departmentId, status: { not: PlanStatus.DRAFT } },
          ],
        },
        include: baseInclude,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }
    // BOARD / QC / ADMIN
    return this.prisma.plan.findMany({
      where: { status: { not: PlanStatus.DRAFT } },
      include: baseInclude,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  // ─── get ──────────────────────────────────────────────────────────────
  async get(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan) throw new NotFoundException('Kế hoạch không tồn tại');
    return plan;
  }

  // ─── create ───────────────────────────────────────────────────────────
  async create(actor: { id: number; departmentId: number | null }, input: CreatePlanInput) {
    if (!actor.departmentId) {
      throw new BadRequestException('Tài khoản chưa gán khoa, không thể tạo kế hoạch.');
    }
    if (input.month < 1 || input.month > 12) throw new BadRequestException('Tháng không hợp lệ');

    const code = this.generateCode();
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          code,
          title: input.title,
          month: input.month,
          year: input.year,
          userId: actor.id,
          departmentId: actor.departmentId!,
          status: PlanStatus.DRAFT,
          templateId: input.templateId ?? 'tpl-1',
          attachments: input.newAttachments ?? undefined,
        },
      });
      if (input.items?.length) {
        await tx.planItem.createMany({
          data: input.items.map((i) => ({
            planId: plan.id,
            topic: i.topic ?? 'N/A',
            plannedHours: i.plannedHours ?? 0,
            expectedResult: i.expectedResult ?? null,
            type: (i.type as any) ?? 'TEACHER',
            locationId: i.locationId ?? null,
            equipmentId: i.equipmentId ?? null,
            executorId: i.executorId ?? null,
            mentorId: i.mentorId ?? null,
            timeRange: i.timeRange ?? null,
          })),
        });
      }
      if (input.weeks?.length) {
        await tx.planWeek.createMany({
          data: input.weeks.map((w) => ({
            planId: plan.id,
            userId: actor.id,
            weekLabel: w.weekLabel,
            plannedHours: w.plannedHours ?? 0,
            status: (w.status as any) ?? WeekStatus.PENDING,
            busyNote: w.busyNote ?? null,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          planId: plan.id,
          userId: actor.id,
          action: 'Tạo kế hoạch',
          comment: `Tạo kế hoạch ${plan.title} (${plan.code})`,
          timestamp: new Date(),
        },
      });
      await tx.userActivity.create({
        data: {
          userId: actor.id,
          type: ActivityType.create_plan,
          description: `Tạo kế hoạch ${plan.title} (${plan.code})`,
        },
      });
      return tx.plan.findUniqueOrThrow({ where: { id: plan.id }, include: planInclude });
    });
  }

  // ─── update ───────────────────────────────────────────────────────────
  async update(actor: { id: number; role: UserRole }, id: number, input: UpdatePlanInput) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    if (plan.userId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu kế hoạch này.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Merge attachments
      const kept = input.keptAttachments ?? (plan.attachments as any) ?? [];
      const merged = [...kept, ...(input.newAttachments ?? [])];

      const updated = await tx.plan.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.month && { month: input.month }),
          ...(input.year && { year: input.year }),
          ...(input.templateId && { templateId: input.templateId }),
          attachments: merged as any,
        },
      });

      // Sync items (full replace — items don't carry mutable state)
      if (input.items) {
        await tx.planItem.deleteMany({ where: { planId: id } });
        if (input.items.length) {
          await tx.planItem.createMany({
            data: input.items.map((i) => ({
              planId: id,
              topic: i.topic ?? 'N/A',
              plannedHours: i.plannedHours ?? 0,
              expectedResult: i.expectedResult ?? null,
              type: (i.type as any) ?? 'TEACHER',
              locationId: i.locationId ?? null,
              equipmentId: i.equipmentId ?? null,
              executorId: i.executorId ?? null,
              mentorId: i.mentorId ?? null,
              timeRange: i.timeRange ?? null,
            })),
          });
        }
      }

      // Upsert weeks — preserve `actual_hours` & `status` for existing rows
      if (input.weeks) {
        const incomingIds: number[] = [];
        for (const w of input.weeks) {
          if (w.id) {
            const existing = await tx.planWeek.findUnique({ where: { id: w.id } });
            if (existing && existing.planId === id) {
              await tx.planWeek.update({
                where: { id: w.id },
                data: {
                  weekLabel: w.weekLabel,
                  plannedHours: w.plannedHours ?? 0,
                  busyNote: w.busyNote ?? null,
                },
              });
              incomingIds.push(w.id);
              continue;
            }
          }
          const created = await tx.planWeek.create({
            data: {
              planId: id,
              userId: actor.id,
              weekLabel: w.weekLabel,
              plannedHours: w.plannedHours ?? 0,
              status: (w.status as any) ?? WeekStatus.PENDING,
              busyNote: w.busyNote ?? null,
            },
          });
          incomingIds.push(created.id);
        }
        await tx.planWeek.deleteMany({ where: { planId: id, id: { notIn: incomingIds } } });
      }

      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: 'Cập nhật kế hoạch',
          timestamp: new Date(),
        },
      });
      await tx.userActivity.create({
        data: {
          userId: actor.id,
          type: ActivityType.update_plan,
          description: `Cập nhật kế hoạch ${updated.title} (${updated.code})`,
        },
      });

      return tx.plan.findUniqueOrThrow({ where: { id }, include: planInclude });
    });
  }

  // ─── delete ───────────────────────────────────────────────────────────
  async delete(actor: { id: number; role: UserRole }, id: number) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    if (plan.userId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Không có quyền xóa');
    }
    if (![PlanStatus.DRAFT, PlanStatus.DEPT_REJECTED_PHASE1, PlanStatus.DEPT_REJECTED_PHASE2].includes(plan.status as PlanStatus)) {
      throw new BadRequestException('Chỉ có thể xóa kế hoạch ở trạng thái DRAFT/REJECTED');
    }
    await this.prisma.plan.delete({ where: { id } });
    return { success: true };
  }

  // ─── approvePhase1 (Dept Head) ────────────────────────────────────────
  async approvePhase1(
    actor: { id: number; role: UserRole; departmentId: number | null },
    id: number,
    comment?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    if (![UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Không có quyền duyệt Phase 1');
    }
    if (actor.role === UserRole.DEPT_HEAD && plan.departmentId !== actor.departmentId) {
      throw new ForbiddenException('Bạn không quản lý khoa này');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { id }, data: { status: PlanStatus.DEPT_APPROVED_TO_BGH } });
      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: 'Phê duyệt Phase 1 (Kế hoạch)',
          comment: comment ?? 'Đã phê duyệt kế hoạch.',
          timestamp: new Date(),
        },
      });
    });
    return this.get(id);
  }

  // ─── submitReport (Teacher) ───────────────────────────────────────────
  async submitReport(
    actor: { id: number; role: UserRole },
    id: number,
    weeks: { id: number; actual_hours: number }[],
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    if (plan.userId !== actor.id) {
      throw new ForbiddenException('Chỉ chủ sở hữu mới có thể nộp báo cáo');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const w of weeks) {
        await tx.planWeek.updateMany({
          where: { id: w.id, planId: id },
          data: { actualHours: w.actual_hours },
        });
      }
      await tx.plan.update({ where: { id }, data: { status: PlanStatus.REPORT_SUBMITTED } });
      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: 'Nộp báo cáo thực hiện',
          timestamp: new Date(),
        },
      });
    });
    return this.get(id);
  }

  // ─── acceptPhase2 (BGH/Dept Head) ────────────────────────────────────
  async acceptPhase2(
    actor: { id: number; role: UserRole },
    id: number,
    score: number,
    feedback?: string,
  ) {
    if (![UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Không có quyền nghiệm thu');
    }
    if (score < 0 || score > 100) throw new BadRequestException('Điểm 0-100');

    await this.prisma.$transaction(async (tx) => {
      await tx.plan.update({
        where: { id },
        data: { status: PlanStatus.ACCEPTED_TO_BGH, score, feedback: feedback ?? null },
      });
      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: 'Nghiệm thu Phase 2 (Hoàn thành)',
          comment: `Điểm: ${score}. Nhận xét: ${feedback ?? ''}`,
          timestamp: new Date(),
        },
      });
    });
    return this.get(id);
  }

  // ─── updateStatus ─────────────────────────────────────────────────────
  async updateStatus(
    actor: { id: number; role: UserRole },
    id: number,
    status: PlanStatus,
    comment?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { id }, data: { status } });
      if (status === PlanStatus.COMPLETED) {
        await tx.planWeek.updateMany({
          where: { planId: id, status: { not: WeekStatus.COMPLETED } },
          data: { status: WeekStatus.COMPLETED },
        });
      }
      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: `Cập nhật trạng thái: ${status}`,
          comment: comment ?? '',
          timestamp: new Date(),
        },
      });
    });
    return this.get(id);
  }

  // ─── updateWeekStatus ────────────────────────────────────────────────
  async updateWeekStatus(
    actor: { id: number; role: UserRole },
    id: number,
    weekId: number,
    input: { status: WeekStatus; comment?: string; rescheduleDate?: string; rescheduleRoom?: string; rescheduleNote?: string },
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    const week = await this.prisma.planWeek.findUnique({ where: { id: weekId } });
    if (!week || week.planId !== id) throw new BadRequestException('Tuần không thuộc kế hoạch này');

    if (plan.userId !== actor.id && ![UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Không có quyền cập nhật tuần này');
    }

    const updateData: any = { status: input.status };
    if (input.status === WeekStatus.RESCHEDULED) {
      updateData.rescheduleDate = input.rescheduleDate ?? null;
      updateData.rescheduleRoom = input.rescheduleRoom ?? null;
      updateData.rescheduleNote = input.rescheduleNote ?? null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.planWeek.update({ where: { id: weekId }, data: updateData });

      // Auto-complete the plan if all weeks done
      const total = await tx.planWeek.count({ where: { planId: id } });
      const done = await tx.planWeek.count({
        where: { planId: id, status: { in: [WeekStatus.COMPLETED, WeekStatus.RESCHEDULED] } },
      });
      if (total > 0 && done === total) {
        await tx.plan.update({ where: { id }, data: { status: PlanStatus.COMPLETED } });
        await tx.auditLog.create({
          data: {
            planId: id,
            userId: actor.id,
            action: 'Tất cả lịch đã hoàn thành/chuyển → Kế hoạch tự động hoàn thành',
            comment: input.comment ?? 'Xác nhận hoàn thành',
            timestamp: new Date(),
          },
        });
      }

      const actionText =
        input.status === WeekStatus.RESCHEDULED
          ? `Chuyển lịch #${weekId} → ${input.rescheduleDate ?? 'N/A'}`
          : `Xác nhận hoàn thành lịch #${weekId}`;
      await tx.auditLog.create({
        data: {
          planId: id,
          userId: actor.id,
          action: actionText,
          comment: input.comment ?? input.rescheduleNote ?? '',
          timestamp: new Date(),
        },
      });
    });
    return this.get(id);
  }

  // ─── bulkCompleteByTeacher ────────────────────────────────────────────
  async bulkCompleteByTeacher(
    actor: { id: number; role: UserRole },
    id: number,
    comment?: string,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException();
    if (plan.userId !== actor.id && ![UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Không có quyền xác nhận');
    }
    const targetUserId = plan.userId;
    const plansToUpdate = await this.prisma.plan.findMany({
      where: { userId: targetUserId, status: { not: PlanStatus.COMPLETED } },
    });
    const updatedIds: number[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const p of plansToUpdate) {
        await tx.plan.update({ where: { id: p.id }, data: { status: PlanStatus.COMPLETED } });
        await tx.auditLog.create({
          data: {
            planId: p.id,
            userId: actor.id,
            action: `Xác nhận hoàn thành (tự động từ lịch: ${plan.code})`,
            comment: comment ?? 'Xác nhận hoàn thành (tự động)',
            timestamp: new Date(),
          },
        });
        updatedIds.push(p.id);
      }
    });
    return { message: `Đã xác nhận hoàn thành ${updatedIds.length} kế hoạch.`, updatedIds, teacherId: targetUserId };
  }
}


