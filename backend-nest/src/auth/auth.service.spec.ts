import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserStatus, UserRole } from '@prisma/client';

describe('AuthService Integration Test', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PrismaService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Delete any test users created
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test_teacher_unique', 'test_pending_teacher'] },
      },
    });
    await prisma.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new pending teacher', async () => {
      const result = await service.register({
        name: 'Test Teacher',
        email: 'test_teacher_unique',
        password: 'password123',
        role: 'TEACHER' as any,
        gender: 'Nam' as any,
      });

      expect(result.message).toContain('Đăng ký thành công');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test_teacher_unique');
      expect(result.user.status).toBe(UserStatus.PENDING);
    });

    it('should fail registering a user with duplicate email', async () => {
      await expect(
        service.register({
          name: 'Test Teacher Duplicate',
          email: 'test_teacher_unique',
          password: 'password123',
          role: 'TEACHER' as any,
          gender: 'Nam' as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should fail login if credentials are incorrect', async () => {
      await expect(
        service.login({
          email: 'test_teacher_unique',
          password: 'wrong_password',
        }),
      ).rejects.toThrow('Thông tin đăng nhập không chính xác.');
    });

    it('should fail login if user is still pending', async () => {
      // Temporarily change status back to PENDING for testing
      await prisma.user.update({
        where: { email: 'test_teacher_unique' },
        data: { status: UserStatus.PENDING },
      });

      await expect(
        service.login({
          email: 'test_teacher_unique',
          password: 'password123',
        }),
      ).rejects.toThrow('đang chờ phê duyệt');
    });

    it('should succeed login if user is active', async () => {
      // Manually activate test user
      await prisma.user.update({
        where: { email: 'test_teacher_unique' },
        data: { status: UserStatus.ACTIVE },
      });

      const result = await service.login({
        email: 'test_teacher_unique',
        password: 'password123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test_teacher_unique');
    });
  });
});
