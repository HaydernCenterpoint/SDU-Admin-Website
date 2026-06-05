/**
 * tRPC HTTP handlers: expose `appRouter` at `POST /api/trpc/*` and
 * `GET /api/trpc-playground` for interactive testing.
 */
import { Module } from '@nestjs/common';
import { TrpcRouter } from './trpc.mount';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule {}
