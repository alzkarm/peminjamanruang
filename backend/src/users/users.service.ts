import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
        isActive: true,
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
      isActive: u.isActive,
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
        unitName = 'Pusat Data dan Informasi (PUSDATIN)';
      } else if (
        dto.role === 'admin' ||
        dto.role === 'admin_lpf' ||
        dto.role === 'admin_yayasan' ||
        prismaRole === Role.ADMIN
      ) {
        unitName = 'Biro Layanan Pengelolaan Fasilitas (LPF)';
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
   * Delete / Remove user from whitelist (Protected against Superadmin deletion and cascade data loss)
   */
  async remove(id: string, currentUser?: { id: string; role: Role }) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        bookings: { select: { id: true }, take: 1 },
      },
    });
    if (!existing) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    // 1. Cegah menghapus akun sendiri
    if (currentUser && currentUser.id === id) {
      throw new BadRequestException('Anda tidak dapat menghapus akun Anda sendiri.');
    }

    // 2. Cegah menghapus akun berstatus Superadmin
    const isTargetSuperadmin =
      String(existing.role).toUpperCase() === 'SUPERADMIN' ||
      existing.role === (PrismaRole.SUPERADMIN as any);
    if (isTargetSuperadmin) {
      throw new ForbiddenException('Akun Superadmin tidak dapat dihapus demi keamanan sistem.');
    }

    // 3. Jika user memiliki riwayat peminjaman, lakukan soft-delete (isActive: false) untuk melindungi integritas data
    if (existing.bookings && existing.bookings.length > 0) {
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      this.logger.log(`User ${existing.username} (${id}) has booking history; soft-deleted (deactivated).`);
      return {
        message: `Pengguna ${existing.username} memiliki riwayat peminjaman, dinonaktifkan secara aman dari whitelist.`,
      };
    }

    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User ${existing.username} (${id}) removed from whitelist.`);
    return { message: `Pengguna ${existing.username} berhasil dihapus dari whitelist.` };
  }

  private toPrismaRole(roleStr?: string): any {
    if (!roleStr) return Role.USER;
    const normalized = roleStr.trim().toUpperCase();
    if (normalized === 'SUPERADMIN' || normalized === Role.SUPERADMIN) return Role.SUPERADMIN;
    if (
      normalized === 'ADMIN' ||
      normalized === Role.ADMIN ||
      normalized === 'ADMIN_LPF' ||
      normalized === 'ADMIN_UNIV' ||
      normalized === 'ADMIN_UMUM' ||
      normalized === 'ADMIN_YAYASAN' ||
      normalized === 'YAYASAN'
    ) {
      return Role.ADMIN;
    }
    return Role.USER;
  }

  private mapRole(role: unknown, unitName?: string): string {
    const normalized = String(role || '').toUpperCase();
    if (normalized === 'SUPERADMIN' || normalized === Role.SUPERADMIN) return 'superadmin';
    if (
      normalized === 'ADMIN' ||
      normalized === Role.ADMIN ||
      normalized === 'ADMIN_LPF' ||
      normalized === 'ADMIN_UNIV' ||
      normalized === 'ADMIN_UMUM' ||
      normalized === 'ADMIN_YAYASAN' ||
      normalized === 'YAYASAN'
    ) {
      return 'admin';
    }
    return 'user';
  }
}
