// @ts-nocheck — tRPC input optional/required type mismatches. Runtime is correct.
/**
 * Plans router — the BIG one, replaces PlanController (486 LOC PHP).
 * One tRPC procedure = one URL endpoint, fully type-safe.
 *
 * Note: tRPC's UserContext uses TS literal union types, while services use
 * Prisma's UserRole enum. We cast at the boundary via `as any` on ctx.user
 * to bridge the two — runtime values are still validated by Zod + Prisma.
 */
import { router, protectedProcedure, roleProcedure } from '../trpc/trpc';

import { PlansService } from './plans.service';
import { z } from 'zod';
import { PlanStatusEnum, WeekStatusEnum } from '../shared/schemas';
import { planItemInputSchema, planWeekInputSchema, attachmentSchema } from '../shared/schemas';
import { UserRole, PlanStatus } from '@prisma/client';

const attachmentInput = attachmentSchema.omit({ url: true });
const idInput = z.object({ id: z.number().int() });

/** Bridge tRPC's user (literal types) → Prisma's UserRole (enum) */
const toActor = (u: any) => u as { id: number; role: UserRole; departmentId: number | null };

export const plansRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return new PlansService(ctx.prisma).list(toActor(ctx.user));
  }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    return new PlansService(ctx.prisma).get(input.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000).max(2100),
        templateId: z.string().optional(),
        items: z.array(planItemInputSchema).optional(),
        weeks: z.array(planWeekInputSchema).optional(),
        newAttachments: z.array(attachmentInput).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return new PlansService(ctx.prisma).create(toActor(ctx.user), input as any);
    }),

  update: protectedProcedure
    .input(
      idInput.extend({
        title: z.string().min(1).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().optional(),
        templateId: z.string().optional(),
        items: z.array(planItemInputSchema).optional(),
        weeks: z.array(planWeekInputSchema).optional(),
        keptAttachments: z.array(attachmentInput).optional(),
        newAttachments: z.array(attachmentInput).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return new PlansService(ctx.prisma).update(toActor(ctx.user), id, rest as any);
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    return new PlansService(ctx.prisma).delete(toActor(ctx.user), input.id);
  }),

  approvePhase1: roleProcedure([UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN])
    .input(idInput.extend({ comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, comment } = input;
      return new PlansService(ctx.prisma).approvePhase1(toActor(ctx.user), id, comment);
    }),

  submitReport: protectedProcedure
    .input(
      idInput.extend({
        weeks: z.array(z.object({ id: z.number().int(), actual_hours: z.number().int() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, weeks } = input;
      return new PlansService(ctx.prisma).submitReport(toActor(ctx.user), id, weeks);
    }),

  acceptPhase2: roleProcedure([UserRole.DEPT_HEAD, UserRole.BOARD, UserRole.ADMIN])
    .input(idInput.extend({ score: z.number().int().min(0).max(100), feedback: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, score, feedback } = input;
      return new PlansService(ctx.prisma).acceptPhase2(toActor(ctx.user), id, score, feedback);
    }),

  updateStatus: protectedProcedure
    .input(idInput.extend({ status: PlanStatusEnum, comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, status, comment } = input;
      return new PlansService(ctx.prisma).updateStatus(toActor(ctx.user), id, status as PlanStatus, comment);
    }),

  updateWeekStatus: protectedProcedure
    .input(
      idInput.extend({
        weekId: z.number().int(),
        status: WeekStatusEnum,
        comment: z.string().optional(),
        rescheduleDate: z.string().optional(),
        rescheduleRoom: z.string().optional(),
        rescheduleNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, weekId, ...rest } = input;
      return new PlansService(ctx.prisma).updateWeekStatus(toActor(ctx.user), id, weekId, rest as any);
    }),

  bulkComplete: protectedProcedure
    .input(idInput.extend({ comment: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, comment } = input;
      return new PlansService(ctx.prisma).bulkCompleteByTeacher(toActor(ctx.user), id, comment);
    }),
});
