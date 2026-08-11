/**
 * Prisma seed — replaces Laravel's /seed-demo endpoint.
 * Run with: npx prisma db seed
 * Idempotent: safe to re-run.
 */
import { PrismaClient, UserRole, UserStatus, Gender } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // 1. Departments (5 khoa)
  const depts = [
    { name: 'Khoa Công nghệ thông tin', code: 'CNTT' },
    { name: 'Khoa May và Thời trang', code: 'KMT' },
    { name: 'Khoa Cơ khí', code: 'KCK' },
    { name: 'Khoa Điện', code: 'KD' },
    { name: 'Khoa Ô tô', code: 'KOT' },
  ];
  for (const d of depts) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
  }

  // 2. Admin user (id=1, replace original reset-admin-pw)
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@saodo.edu.vn' },
    update: { password: adminHash, status: UserStatus.ACTIVE, role: UserRole.ADMIN },
    create: {
      name: 'Quản trị viên',
      email: 'admin@saodo.edu.vn',
      password: adminHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      gender: Gender.Nam,
    },
  });

  // 2b. Update BOARD user to Nguyễn Trọng Các (01006027)
  await prisma.user.updateMany({
    where: {
      OR: [
        { id: 2 },
        { email: '01006030' },
        { name: 'Đỗ Văn Đỉnh' },
      ],
    },
    data: {
      name: 'Nguyễn Trọng Các',
      email: '01006027',
    },
  });

  // 3. Demo teachers (5 per dept = 25 users)
  const hash = await bcrypt.hash('password123', 10);
  const allDepts = await prisma.department.findMany();
  for (const dept of allDepts) {
    const prefix = dept.code.toLowerCase();
    for (let i = 1; i <= 5; i++) {
      const email = `${prefix}${i}@saodo.edu.vn`;
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: `Giảng viên ${i} (${dept.name})`,
          email,
          password: hash,
          role: UserRole.TEACHER,
          status: UserStatus.ACTIVE,
          departmentId: dept.id,
          gender: Gender.Nam,
        },
      });
    }
  }

  // 4. Demo locations
  const locs = [
    { name: 'Phòng thí nghiệm CNTT', code: 'LAB-CNTT' },
    { name: 'Xưởng Cơ khí', code: 'WS-CK' },
    { name: 'Phòng Điện tử', code: 'ROOM-DT' },
    { name: 'Xưởng May', code: 'WS-MAY' },
  ];
  for (const l of locs) {
    await prisma.location.upsert({
      where: { id: 0 }, // upsert by code instead
      update: {},
      create: l,
    }).catch(async () => {
      await prisma.location.updateMany({ where: { code: l.code }, data: l });
    });
  }

  const counts = {
    departments: await prisma.department.count(),
    users: await prisma.user.count(),
    locations: await prisma.location.count(),
  };
  console.log('✅ Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
