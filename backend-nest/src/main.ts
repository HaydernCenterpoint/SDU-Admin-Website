/**
 * NestJS entry point.
 * Mounts:
 *   - REST health-check at GET /api/health
 *   - tRPC at       POST /api/trpc/*   (procedures, batched)
 *   - Static files  /api/uploads/*
 *   - File upload   POST /api/upload
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TrpcRouter } from './trpc/trpc.mount';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const port = parseInt(process.env.PORT || '4000', 10);
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const maxFileSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

  // Ensure upload dir exists
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(path.resolve(uploadDir), { prefix: '/api/uploads/' });

  // CORS
  const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());
  app.use(
    cors({
      origin: origins,
      credentials: true,
      exposedHeaders: ['Content-Disposition'],
    }),
  );

  // Global validation pipe (for any future REST controllers)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  // ── tRPC mount ─────────────────────────────────────────────────────────
  const trpc = app.get(TrpcRouter);
  await trpc.mountHttpHandlers(app);

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server ready at http://localhost:${port}/api`);
  logger.log(`📡 tRPC endpoint: http://localhost:${port}/api/trpc`);
  logger.log(`📂 Uploads served from: /api/uploads/*`);
  logger.log(`🔒 CORS allowed: ${origins.join(', ')}`);
  logger.log(`📦 Max upload size: ${maxFileSizeMb}MB`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
