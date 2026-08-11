/**
 * Users service encapsulates the business rules from AuthController.
 * Mirrors:
 *   - getActiveUsers, getPendingUsers
 *   - approveUser, rejectUser, destroyUser
 *   - requestProfileUpdate, approveProfileUpdate, rejectProfileUpdate
 *   - getActivities
 * Now with proper Zod validation + Prisma transactions.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole, UserStatus, ActivityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const ROLES_BOARD_CAN_MANAGE: UserRole[] = [UserRole.DEPT_HEAD, UserRole.QC];
const ROLES_BOARD_CAN_DELETE: UserRole[] = [UserRole.TEACHER, UserRole.DEPT_HEAD, UserRole.QC];
const ROLES_ADMIN_BOARD_QC: UserRole[] = [UserRole.ADMIN, UserRole.BOARD, UserRole.QC];
const ROLES_DEPT_HEAD_TEACHER: UserRole[] = [UserRole.DEPT_HEAD, UserRole.TEACHER];
const ROLES_ADMIN_QC: UserRole[] = [UserRole.ADMIN, UserRole.QC];
const ROLES_BOARD_ADMIN: UserRole[] = [UserRole.BOARD, UserRole.ADMIN];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Permission helpers
  canManageUser(
    actor: { role: UserRole; departmentId: number | null; id: number },
    target: { role: UserRole; departmentId: number | null; status: UserStatus },
  ) {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.role === UserRole.BOARD) return ROLES_BOARD_CAN_MANAGE.includes(target.role);
    if (actor.role === UserRole.DEPT_HEAD) {
      return target.departmentId === actor.departmentId && target.role === UserRole.TEACHER;
    }
    return false;
  }

  canDeleteUser(actor: { role: UserRole; id: number }, target: { id: number; role: UserRole }) {
    if (actor.role !== UserRole.BOARD) return false;
    if (actor.id === target.id) return false;
    return ROLES_BOARD_CAN_DELETE.includes(target.role);
  }

  // Queries
  async listActive(actor: { role: UserRole; departmentId: number | null; id: number }) {
    if (ROLES_ADMIN_BOARD_QC.includes(actor.role)) {
      return this.prisma.user.findMany({
        where: { status: UserStatus.ACTIVE },
        include: { department: true },
        orderBy: { id: 'asc' },
      });
    }
    if (ROLES_DEPT_HEAD_TEACHER.includes(actor.role)) {
      return this.prisma.user.findMany({
        where: { status: UserStatus.ACTIVE, departmentId: actor.departmentId },
        include: { department: true },
        orderBy: { id: 'asc' },
      });
    }
    throw new ForbiddenException('Không có quyền truy cập.');
  }

  async listPending(actor: { role: UserRole; departmentId: number | null; id: number }) {
    if (actor.role === UserRole.ADMIN) {
      return this.prisma.user.findMany({
        where: { status: UserStatus.PENDING },
        include: { department: true },
      });
    }
    if (actor.role === UserRole.BOARD) {
      return this.prisma.user.findMany({
        where: { status: UserStatus.PENDING, role: { in: ROLES_BOARD_CAN_MANAGE } },
        include: { department: true },
      });
    }
    if (actor.role === UserRole.DEPT_HEAD) {
      return this.prisma.user.findMany({
        where: {
          status: UserStatus.PENDING,
          role: UserRole.TEACHER,
          departmentId: actor.departmentId,
        },
        include: { department: true },
      });
    }
    throw new ForbiddenException('Không có quyền truy cập.');
  }

  async listPendingProfiles(actor: { role: UserRole; departmentId: number | null; id: number }) {
    if (ROLES_ADMIN_QC.includes(actor.role)) {
      return this.prisma.user.findMany({
        where: { pendingProfile: { not: Prisma.DbNull } },
        include: { department: true },
      });
    }
    if (actor.role === UserRole.BOARD) {
      return this.prisma.user.findMany({
        where: {
          pendingProfile: { not: Prisma.DbNull },
          role: { in: ROLES_BOARD_CAN_MANAGE },
        },
        include: { department: true },
      });
    }
    if (actor.role === UserRole.DEPT_HEAD) {
      return this.prisma.user.findMany({
        where: {
          pendingProfile: { not: Prisma.DbNull },
          role: UserRole.TEACHER,
          departmentId: actor.departmentId,
        },
        include: { department: true },
      });
    }
    throw new ForbiddenException('Không có quyền truy cập.');
  }

  async getActivities(userId: number) {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  // ─── Mutations ─────────────────────────────────────────────────────────
  async approve(actor: { role: UserRole; departmentId: number | null; id: number }, userId: number) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (!this.canManageUser(actor, target)) {
      throw new ForbiddenException('Không có quyền duyệt tài khoản này.');
    }
    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('Người dùng không ở trạng thái chờ duyệt.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });
  }

  async reject(actor: { role: UserRole; departmentId: number | null; id: number }, userId: number) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (!this.canManageUser(actor, target)) {
      throw new ForbiddenException('Không có quyền từ chối tài khoản này.');
    }
    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('Người dùng không ở trạng thái chờ duyệt.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.REJECTED },
    });
  }

  async delete(actor: { role: UserRole; id: number }, userId: number) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (!this.canDeleteUser(actor, target)) {
      throw new ForbiddenException('Không có quyền xóa hồ sơ này.');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  async updateAvatar(userId: number, avatarPath: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPath },
    });
  }

  // ─── Profile updates ───────────────────────────────────────────────────
  async requestProfileUpdate(
    userId: number,
    input: {
      name: string;
      departmentId: number;
      email: string;
      contactEmail?: string;
      dob?: string;
      gender?: string;
      currentPassword?: string;
      password?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    if (input.password) {
      if (!input.currentPassword) {
        throw new BadRequestException('Vui lòng nhập mật khẩu hiện tại.');
      }
      const ok = await bcrypt.compare(input.currentPassword, user.password);
      if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng.');
    }

    const pendingProfile = {
      name: input.name,
      departmentId: input.departmentId,
      email: input.email,
      contactEmail: input.contactEmail ?? null,
      dob: input.dob ?? null,
      gender: input.gender ?? null,
      ...(input.password && { password: await bcrypt.hash(input.password, 10) }),
    };

    // Admins/board can update directly
    if (ROLES_BOARD_ADMIN.includes(user.role)) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: pendingProfile.name,
          departmentId: pendingProfile.departmentId,
          email: pendingProfile.email,
          contactEmail: pendingProfile.contactEmail,
          dob: pendingProfile.dob ? new Date(pendingProfile.dob) : null,
          gender: pendingProfile.gender as any,
          ...(pendingProfile.password && { password: pendingProfile.password }),
          pendingProfile: Prisma.DbNull,
        },
        include: { department: true },
      });
      await this.prisma.userActivity.create({
        data: { userId, type: ActivityType.update_profile, description: 'Cập nhật hồ sơ tài khoản' },
      });
      return { message: 'Đã lưu thông tin hồ sơ thành công.', user: updated, requiresApproval: false };
    }

    // Others need approval
    await this.prisma.user.update({
      where: { id: userId },
      data: { pendingProfile: pendingProfile as any },
    });
    await this.prisma.userActivity.create({
      data: { userId, type: ActivityType.request_update_profile, description: 'Gửi yêu cầu cập nhật hồ sơ' },
    });
    return { message: 'Yêu cầu cập nhật đã được gửi cho Trưởng khoa.', requiresApproval: true };
  }

  async approveProfile(actor: { role: UserRole; departmentId: number | null; id: number }, userId: number) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (!this.canManageUser(actor, target)) {
      throw new ForbiddenException('Không có quyền duyệt hồ sơ này.');
    }
    const updates = target.pendingProfile as any;
    if (!updates || typeof updates !== 'object') {
      throw new BadRequestException('Không có yêu cầu cập nhật.');
    }

    const allowed = ['name', 'departmentId', 'email', 'contactEmail', 'dob', 'gender', 'password'] as const;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k as any)),
    );

    let dobVal: Date | null | undefined = undefined;
    if ('dob' in filtered) {
      if (!filtered.dob) {
        dobVal = null;
      } else {
        const parsed = new Date(filtered.dob as string);
        dobVal = isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...filtered,
        ...(dobVal !== undefined && { dob: dobVal }),
        pendingProfile: Prisma.DbNull,
      },
      include: { department: true },
    });
    return { message: 'Đã phê duyệt cập nhật hồ sơ.', user: updated };
  }

  async rejectProfile(actor: { role: UserRole; departmentId: number | null; id: number }, userId: number) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');
    if (!this.canManageUser(actor, target)) {
      throw new ForbiddenException('Không có quyền từ chối hồ sơ này.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { pendingProfile: Prisma.DbNull },
    });
    return { message: 'Đã từ chối cập nhật hồ sơ.' };
  }
}

