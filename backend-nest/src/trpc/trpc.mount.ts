/**
 * Mounts tRPC on a NestExpressApplication.
 * Replaces ~15 REST routes from `backend/routes/api.php` with a single
 * type-safe RPC surface.
 */
import { Injectable, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { buildTrpcHandler } from './http-mount';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

@Injectable()
export class TrpcRouter {
  private readonly logger = new Logger(TrpcRouter.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async mountHttpHandlers(app: NestExpressApplication) {
    const handler = buildTrpcHandler(this.prisma, this.jwt);

    // tRPC procedures + batched calls
    app.use('/api/trpc', (req: Request, res: Response) => handler(req, res));

    // Health-check (REST, simple)
    app.use('/api/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        time: new Date().toISOString(),
        db: 'connected',
        api: 'tRPC',
      });
    });

    this.logger.log('tRPC mounted at POST /api/trpc/*');
  }
}
