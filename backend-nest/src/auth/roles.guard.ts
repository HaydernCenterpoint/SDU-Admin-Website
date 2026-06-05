/**
 * Role-based access guard. Use after JwtAuthGuard.
 * Throws 403 if current user's role is not in the allowed list.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'allowed-roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Chưa xác thực');
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Không có quyền. Yêu cầu một trong: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
