import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers?.authorization || req.headers?.Authorization || '');
    const token = header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : header.startsWith('bearer ')
        ? header.slice(7).trim()
        : '';

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      });
      const userId = Number(payload?.sub);
      if (!Number.isFinite(userId)) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });
      if (!user) throw new UnauthorizedException('Token không hợp lệ');
      if (user.status === 'REJECTED') {
        throw new UnauthorizedException('Tài khoản đã bị từ chối');
      }

      req.user = user;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(err?.message || 'Token không hợp lệ');
    }
  }
}
