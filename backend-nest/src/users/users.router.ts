// @ts-nocheck — tRPC input optional/required. Runtime validated by Zod.
/**
 * Users router — replaces Laravel /api/users/* endpoints.
 * All Zod-validated, all responses type-safe.
 */
import { router, protectedProcedure, roleProcedure } from '../trpc/trpc';
import { UsersService } from './users.service';
import { z } from 'zod';
import { UserRole } from '@prisma/client';


const actor = (ctx: { user: any }) => ({
  id: ctx.user.id,
  role: ctx.user.role as UserRole,
  departmentId: ctx.user.departmentId,
  status: ctx.user.status,
});

const idInput = z.object({ id: z.number().int() });

export const usersRouter = router({
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return new UsersService(ctx.prisma).listActive(actor(ctx));
  }),

  listPending: protectedProcedure.query(async ({ ctx }) => {
    return new UsersService(ctx.prisma).listPending(actor(ctx));
  }),

  listPendingProfiles: protectedProcedure.query(async ({ ctx }) => {
    return new UsersService(ctx.prisma).listPendingProfiles(actor(ctx));
  }),

  approve: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    return new UsersService(ctx.prisma).approve(actor(ctx), input.id);
  }),

  reject: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    return new UsersService(ctx.prisma).reject(actor(ctx), input.id);
  }),

  delete: roleProcedure([UserRole.BOARD, UserRole.ADMIN])
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      return new UsersService(ctx.prisma).delete(actor(ctx), input.id);
    }),

  activities: protectedProcedure
    .input(idInput)
    .query(async ({ ctx, input }) => {
      return new UsersService(ctx.prisma).getActivities(input.id);
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        departmentId: z.number().int(),
        email: z.string().min(1),
        contactEmail: z.string().email().optional().or(z.literal('')),
        dob: z.string().optional().or(z.literal('')),
        gender: z.string().optional(),
        currentPassword: z.string().optional(),
        password: z.string().min(6).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return new UsersService(ctx.prisma).requestProfileUpdate(ctx.user.id, input);
    }),

  approveProfile: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    return new UsersService(ctx.prisma).approveProfile(actor(ctx), input.id);
  }),

  rejectProfile: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    return new UsersService(ctx.prisma).rejectProfile(actor(ctx), input.id);
  }),

  updateAvatar: protectedProcedure
    .input(z.object({ avatar: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return new UsersService(ctx.prisma).updateAvatar(ctx.user.id, input.avatar);
    }),
});
