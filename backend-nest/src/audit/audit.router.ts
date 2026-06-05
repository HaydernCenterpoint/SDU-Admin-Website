/**
 * Audit log router.
 */
import { router, protectedProcedure } from '../trpc/trpc';
import { z } from 'zod';

export const auditRouter = router({
  listForPlan: protectedProcedure
    .input(z.object({ planId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.auditLog.findMany({
        where: { planId: input.planId },
        include: { user: true },
        orderBy: { timestamp: 'desc' },
      });
    }),
});
