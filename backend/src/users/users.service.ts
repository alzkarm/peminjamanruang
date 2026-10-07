import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { Role } from '@/common/types';
import { Role as PrismaRole } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all whitelisted users
   */
  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        unitName: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      unitName: u.unitName,
      role: this.mapRole(u.role),
      rawRole: u.role,
      hasLocalPassword: Boolean(u.passwordHash),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  /**
   * Invite / Register user into local DB whitelist
   */
  async invite(dto: InviteUserDto) {
    const rawIdentifier = dto.identifier.trim();
    if (!rawIdentifier) {
      throw new BadRequestException('Identifier wajib diisi.');
    }

    let username = '';
    let email = '';

    if (rawIdentifier.includes('@')) {
      email = rawIdentifier.toLowerCase();
      username = rawIdentifier.split('@')[0].toLowerCase().trim();
    } else {
      username = rawIdentifier.toLowerCase().trim();
      if (/^\d+$/.test(username)) {
        email = `${username}@mhs.yarsi.ac.id`;
      } else {
        email = `${username}@yarsi.ac.id`;
      }
    }

    // Check if user already exists in DB
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Pengguna dengan identifier "${rawIdentifier}" sudah terdaftar dalam whitelist.`,
      );
    }

    // Compute display name if not provided
    let fullName = (dto.fullName || '').trim();
    if (!fullName) {
      if (username.includes('.')) {
        fullName = username
          .split('.')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      } else {
        fullName = `Pengguna (${username})`;
      }
    }

    // Map Prisma Role
    const prismaRole = this.toPrismaRole(dto.role);

    // Compute unitName / department
    let unitName = (dto.unitName || '').trim();
    if (!unitName) {
      if (dto.role === 'superadmin' || prismaRole === Role.SUPERADMIN) {
        unitName = 'PUSDATIN';
      } else if (dto.role === 'admin' || prismaRole === Role.ADMIN) {
        unitName = 'LPF';
      } else {
        unitName = 'Fakultas Teknologi Informasi';
      }
    }

    // Whitelist LDAP: akun invite TIDAK punya password lokal. passwordHash
    // dikosongkan supaya login wajib lewat server LDAP YARSI (password
    // diambil langsung dari akun LDAP, bukan password default apapun).
    // Field `dto.password` sengaja diabaikan bila dikirim klien lama.
    const newUser = await this.prisma.user.create({
      data: {
        username,
        email,
        fullName,
        unitName,
        role: prismaRole,
        passwordHash: null,
      },
    });

    this.logger.log(`User ${username} (${prismaRole}) invited by Superadmin into whitelist.`);

    return {
      message: `Pengguna ${username} berhasil di-invite ke dalam sistem.`,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        unitName: newUser.unitName,
        role: this.mapRole(newUser.role as unknown as Role),
        hasLocalPassword: false,
        createdAt: newUser.createdAt,
      },
    };
  }

  /**
   * Delete / Remove user from whitelist
   */
  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User ${existing.username} (${id}) removed from whitelist.`);
    return { message: `Pengguna ${existing.username} berhasil dihapus dari whitelist.` };
  }

  private toPrismaRole(roleStr?: string): PrismaRole {
    if (!roleStr) return PrismaRole.USER;
    const normalized = roleStr.trim().toUpperCase();
    if (normalized === PrismaRole.SUPERADMIN) return PrismaRole.SUPERADMIN;
    if (normalized === PrismaRole.ADMIN) return PrismaRole.ADMIN;
    return PrismaRole.USER;
  }

  private mapRole(role: unknown): string {
    const normalized = String(role).toUpperCase();
    if (normalized === Role.SUPERADMIN) return 'superadmin';
    if (normalized === Role.ADMIN) return 'admin';
    return 'user';
  }
}
