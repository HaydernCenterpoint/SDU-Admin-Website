/**
 * tRPC initialization.
 * Exports `router`, `publicProcedure`, `protectedProcedure`, `roleProcedure`.
 * Mirrors Laravel middleware as type-safe tRPC middleware.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './trpc.context';
import { UserRole } from '@prisma/client';
import { HttpException } from '@nestjs/common';
import superjson from 'superjson';


const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

/** Middleware that catches NestJS HttpException instances and converts them to TRPCError */
const nestExceptionMiddleware = middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof TRPCError) {
      throw err;
    }
    if (err instanceof HttpException) {
      const status = err.getStatus();
      const response = err.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as any)?.message || err.message;
      const finalMessage = Array.isArray(message) ? message.join(', ') : message;

      let code: TRPCError['code'] = 'INTERNAL_SERVER_ERROR';
      if (status === 400) code = 'BAD_REQUEST';
      else if (status === 401) code = 'UNAUTHORIZED';
      else if (status === 403) code = 'FORBIDDEN';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 409) code = 'CONFLICT';

      throw new TRPCError({ code, message: finalMessage, cause: err });
    }
    throw err;
  }
});

export const publicProcedure = t.procedure.use(nestExceptionMiddleware);

/** Throws UNAUTHORIZED if no user is attached. */
const requireUser = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires a logged-in user. */
export const protectedProcedure = publicProcedure.use(requireUser);

/** Requires one of the given roles. */
export const roleProcedure = (allowed: UserRole[]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!allowed.includes(ctx.user!.role as UserRole)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Yêu cầu role: ${allowed.join(', ')}`,
      });
    }
    return next();
  });

