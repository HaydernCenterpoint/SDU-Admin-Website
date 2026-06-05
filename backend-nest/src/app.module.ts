import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { PlansModule } from './plans/plans.module';
import { AuditModule } from './audit/audit.module';
import { TrpcModule } from './trpc/trpc.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    PlansModule,
    AuditModule,
    UploadsModule,
    TrpcModule,
  ],
})
export class AppModule {}
