/**
 * JWT auth strategy.
 * Validates the `Authorization: Bearer <token>` header and resolves the user.
 * Replaces Laravel Sanctum with a stateless, type-safe alternative.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { department: true },
    });
    if (!user) throw new UnauthorizedException('Token không hợp lệ');
    if (user.status === 'REJECTED') throw new UnauthorizedException('Tài khoản đã bị từ chối');
    return user;
  }
}
