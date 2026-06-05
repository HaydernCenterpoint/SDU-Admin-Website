/**
 * tRPC context.
 * Builds `ctx` for every procedure: gives access to the request, Prisma, JWT, current user.
 */
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type UserRole =
  | 'ADMIN'
  | 'BOARD'
  | 'QC'
  | 'DEPT_HEAD'
  | 'TEACHER'
  | 'STUDENT';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface UserContext {
  id: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  departmentId: number | null;
}



export interface TrpcContext {
  req: Request;
  res: Response;
  prisma: PrismaService;
  jwt: JwtService;
  user: UserContext | null;
  token: string | null;
}

/** Alias used by tRPC initTRPC.context<Context>().create() */
export type Context = TrpcContext;

/**
 * Factory used by tRPC to build context for each request.
 * Decodes JWT manually (no Passport overhead for tRPC) and loads the user.
 */
export async function createTrpcContext(opts: {
  req: Request;
  res: Response;
  prisma: PrismaService;
  jwtService: JwtService;
}): Promise<TrpcContext> {
  const authHeader = opts.req.headers['authorization'];
  let token: string | null = null;
  let user: UserContext | null = null;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
    try {
      const decoded = opts.jwtService.verify<{ sub: number }>(token);
      const u = await opts.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (u && u.status === 'ACTIVE') {
        user = {
          id: u.id,
          email: u.email,
          role: u.role as UserRole,
          status: u.status as UserStatus,
          departmentId: u.departmentId,
        };

      }
    } catch {
      // invalid/expired token → treated as anonymous
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    prisma: opts.prisma,
    jwt: opts.jwtService,
    user,
    token,
  };
}
