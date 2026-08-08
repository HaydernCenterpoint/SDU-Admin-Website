import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, RegisterInput } from '../shared/schemas';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus, ActivityType, Gender } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ─── Login ────────────────────────────────────────────────────────────
  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { department: true },
    });
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác.');
    }
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Tài khoản của bạn đang chờ phê duyệt từ Trưởng khoa.');
    }
    if (user.status === UserStatus.REJECTED) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị từ chối.');
    }

    await this.prisma.userActivity.create({
      data: {
        userId: user.id,
        type: ActivityType.login,
        description: 'Đăng nhập thành công',
      },
    });

    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  // ─── Register ─────────────────────────────────────────────────────────
  async register(input: RegisterInput) {
    let code = input.email;

    if (!code) {
      // Race-safe code generation using a transaction with retry
      let attempt = 0;
      const maxRetries = 3;
      while (attempt < maxRetries) {
        attempt++;
        try {
          code = await this.prisma.$transaction(async (tx) => {
            const max = await tx.user.findFirst({
              where: { email: { not: { contains: '@' } } },
              orderBy: { id: 'desc' },
              select: { email: true },
            });
            const parsed = parseInt(max?.email ?? '', 10);
            const maxNum = Number.isFinite(parsed) ? parsed : 1000000;
            return String(Math.max(maxNum, 1000000) + 1);
          });
          break;
        } catch (err) {
          if (attempt >= maxRetries) throw err;
        }
      }
    }

    // Check if code already exists
    const existing = await this.prisma.user.findUnique({ where: { email: code! } });
    if (existing) throw new ConflictException('Mã giảng viên đã tồn tại.');

    const hashed = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: code!,
        contactEmail: input.contactEmail || null,
        password: hashed,
        departmentId: input.departmentId ?? null,
        role: (input.role as UserRole) ?? UserRole.TEACHER,
        gender: (input.gender as Gender) ?? Gender.Nam,
        dob: input.dob ? new Date(input.dob) : null,
        status: UserStatus.PENDING,
      },
    });
    return {
      message: 'Đăng ký thành công. Vui lòng chờ Trưởng khoa duyệt.',
      user,
    };
  }

  // ─── Next user code (for the registration UI) ────────────────────────
  async getNextCode(): Promise<string> {
    const last = await this.prisma.user.findFirst({
      where: { email: { not: { contains: '@' } } },
      orderBy: { id: 'desc' },
      select: { email: true },
    });
    const parsed = parseInt(last?.email ?? '', 10);
    const maxNum = Number.isFinite(parsed) ? parsed : 1000000;
    return String(Math.max(maxNum, 1000000) + 1);
  }
}
