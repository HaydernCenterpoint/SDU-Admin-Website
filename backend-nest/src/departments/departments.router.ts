// @ts-nocheck
/**
 * Departments router — replaces /api/departments and /api/departments (POST).
 */
import { router, publicProcedure, protectedProcedure, roleProcedure } from '../trpc/trpc';

import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export const departmentsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.department.findMany({ orderBy: { id: 'asc' } });
  }),

  create: roleProcedure([UserRole.BOARD, UserRole.ADMIN])
    .input(z.object({ name: z.string().min(1), code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.prisma.department.findUnique({ where: { code: input.code } });
      if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'Mã khoa đã tồn tại' });
      return ctx.prisma.department.create({ data: input });
    }),
});
