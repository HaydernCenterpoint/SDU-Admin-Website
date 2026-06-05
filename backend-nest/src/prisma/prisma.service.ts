/**
 * PrismaService — wraps the auto-generated Prisma Client as a Nest provider.
 * Ensures a single connection pool is reused (singleton per app instance).
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (err) {
      this.logger.error('❌ Prisma connection failed', err as Error);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
