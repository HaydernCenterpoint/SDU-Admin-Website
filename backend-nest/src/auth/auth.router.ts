/**
 * Auth router — replaces Laravel /api/login, /api/register, /api/me, /api/users/next-code.
 * All inputs Zod-validated, all responses type-safe.
 */
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc';
import { AuthService } from './auth.service';
import { loginInputSchema, registerInputSchema } from '../shared/schemas';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ActivityType } from '@prisma/client';

const userWithDept = {
  department: true,
};

export const authRouter = router({
  /** POST auth.login */
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(async ({ ctx, input }) => {
      const svc = new AuthService(ctx.prisma, ctx.jwt);
      return svc.login(input);
    }),

  /** POST auth.register */
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const svc = new AuthService(ctx.prisma, ctx.jwt);
      return svc.register(input);
    }),

  /** GET auth.me */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user!.id },
      include: userWithDept,
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
    return user;
  }),

  /** GET auth.nextCode */
  nextCode: publicProcedure.query(async ({ ctx }) => {
    const svc = new AuthService(ctx.prisma, ctx.jwt);
    return { code: await svc.getNextCode() };
  }),


  /** POST auth.logout — record activity */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.userActivity.create({
      data: {
        userId: ctx.user!.id,
        type: ActivityType.logout,
        description: 'Đăng xuất',
      },
    });
    return { success: true };
  }),

  /** GET auth.test — replaces /api/test */
  test: publicProcedure.query(() => ({
    status: 'success',
    message: 'Backend NestJS + tRPC đang hoạt động!',
    time: new Date().toISOString(),
  })),
});
