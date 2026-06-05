/**
 * tRPC initialization.
 * Exports `router`, `publicProcedure`, `protectedProcedure`, `roleProcedure`.
 * Mirrors Laravel middleware as type-safe tRPC middleware.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './trpc.context';
import { UserRole } from '@prisma/client';
import superjson from 'superjson';


const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

/** Throws UNAUTHORIZED if no user is attached. */
const requireUser = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires a logged-in user. */
export const protectedProcedure = t.procedure.use(requireUser);

/** Requires one of the given roles. */
export const roleProcedure = (allowed: UserRole[]) =>
  t.procedure.use(requireUser).use(({ ctx, next }) => {
    if (!allowed.includes(ctx.user!.role as UserRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Yêu cầu role: ${allowed.join(', ')}`,
      });
    }
    return next();
  });
