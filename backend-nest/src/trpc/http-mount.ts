/**
 * Express ↔ tRPC HTTP bridge.
 * Uses @trpc/server/adapters/standalone which provides a `createHTTPHandler`.
 */
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { appRouter } from './trpc.router';
import { createTrpcContext, TrpcContext } from './trpc.context';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

export function buildTrpcHandler(prisma: PrismaService, jwtService: JwtService) {
  // tRPC 11 type signatures — the generic constraint uses AnyRouter, so we cast.
  return createHTTPHandler({
    router: appRouter as any,
    createContext: ({ req, res }): TrpcContext | Promise<TrpcContext> =>
      createTrpcContext({ req: req as any, res: res as any, prisma, jwtService }),
    onError({ error, path }: any) {
      // eslint-disable-next-line no-console
      console.error(`[tRPC] Error on ${path}:`, error.message);
    },
  } as any);
}
