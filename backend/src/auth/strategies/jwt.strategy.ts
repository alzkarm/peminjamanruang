import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  unitName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret || secret.trim().length === 0) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or empty for JwtStrategy. Server cannot boot securely.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan dalam sistem.');
    }

    if (!(user as any).isActive) {
      throw new UnauthorizedException('Akun Anda telah dinonaktifkan oleh administrator.');
    }

    // Normalisasi defensif role legacy dari DB agar aman sebelum/sesudah migrasi.
    const rawRole = String(user.role).toUpperCase();
    const role =
      rawRole === 'SUPERADMIN'
        ? 'SUPERADMIN'
        : rawRole === 'ADMIN' || rawRole === 'ADMIN_UMUM' || rawRole === 'ADMIN_LPF' || rawRole === 'ADMIN_UNIV' || rawRole === 'ADMIN_YAYASAN' || rawRole === 'YAYASAN'
          ? 'ADMIN'
          : 'USER';

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role,
      unitName: user.unitName,
    };
  }
}
