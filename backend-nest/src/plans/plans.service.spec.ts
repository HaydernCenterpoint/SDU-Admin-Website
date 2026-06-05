import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, PlanStatus, UserStatus } from '@prisma/client';

describe('PlansService Integration Test', () => {
  let service: PlansService;
  let prisma: PrismaService;
  let testTeacher: any;
  let testDeptHead: any;
  let testDept: any;
  let createdPlanId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, PrismaService],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prisma = module.get<PrismaService>(PrismaService);

    // 1. Get or create department
    testDept = await prisma.department.findFirst({ where: { code: 'CNTT' } });
    if (!testDept) {
      testDept = await prisma.department.create({
        data: { name: 'Khoa Công nghệ thông tin', code: 'CNTT' },
      });
    }

    // 2. Create a test teacher
    testTeacher = await prisma.user.create({
      data: {
        name: 'Test Plan Teacher',
        email: 'test_plan_teacher',
        password: 'hash',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        departmentId: testDept.id,
      },
    });

    // 3. Create a test department head
    testDeptHead = await prisma.user.create({
      data: {
        name: 'Test Plan Dept Head',
        email: 'test_plan_dept_head',
        password: 'hash',
        role: UserRole.DEPT_HEAD,
        status: UserStatus.ACTIVE,
        departmentId: testDept.id,
      },
    });
  });

  afterAll(async () => {
    // Delete any test plans created (cascading deletes plan items/weeks)
    if (createdPlanId) {
      await prisma.plan.delete({ where: { id: createdPlanId } }).catch(() => {});
    }
    // Delete test users
    await prisma.user.deleteMany({
      where: {
        email: { in: ['test_plan_teacher', 'test_plan_dept_head'] },
      },
    });
    await prisma.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create and get plan', () => {
    it('should create a plan in DRAFT status', async () => {
      const plan = await service.create(
        { id: testTeacher.id, departmentId: testDept.id },
        {
          title: 'Kế hoạch học tập năm 2026',
          month: 6,
          year: 2026,
          items: [
            {
              topic: 'Nghiên cứu khoa học máy tính',
              plannedHours: 40,
              type: 'TEACHER' as any,
            },
          ],
          weeks: [
            {
              weekLabel: 'Tuần 1',
              plannedHours: 10,
              status: 'PENDING' as any,
            },
          ],
        },
      );

      expect(plan).toBeDefined();
      expect(plan.title).toBe('Kế hoạch học tập năm 2026');
      expect(plan.status).toBe(PlanStatus.DRAFT);
      expect(plan.items.length).toBe(1);
      expect(plan.weeks.length).toBe(1);

      createdPlanId = plan.id;
    });

    it('should retrieve the created plan', async () => {
      const plan = await service.get(createdPlanId);
      expect(plan.id).toBe(createdPlanId);
      expect(plan.title).toBe('Kế hoạch học tập năm 2026');
    });
  });

  describe('update and status transitions', () => {
    it('should update plan title', async () => {
      const plan = await service.update(
        { id: testTeacher.id, role: UserRole.TEACHER },
        createdPlanId,
        {
          title: 'Kế hoạch học tập năm 2026 (Updated)',
        },
      );

      expect(plan.title).toBe('Kế hoạch học tập năm 2026 (Updated)');
    });

    it('should allow dept head to approve Phase 1', async () => {
      const plan = await service.approvePhase1(
        { id: testDeptHead.id, role: UserRole.DEPT_HEAD, departmentId: testDept.id },
        createdPlanId,
        'Duyệt kế hoạch của thầy cô.',
      );

      expect(plan.status).toBe(PlanStatus.DEPT_APPROVED_TO_BGH);
      expect(plan.auditLogs.some(log => log.action.includes('Phê duyệt Phase 1'))).toBe(true);
    });

    it('should allow BGH or admin to accept Phase 2', async () => {
      const plan = await service.acceptPhase2(
        { id: testDeptHead.id, role: UserRole.ADMIN },
        createdPlanId,
        95,
        'Nghiệm thu tốt, xuất sắc!',
      );

      expect(plan.status).toBe(PlanStatus.ACCEPTED_TO_BGH);
      expect(plan.score).toBe(95);
      expect(plan.feedback).toBe('Nghiệm thu tốt, xuất sắc!');
    });
  });
});
