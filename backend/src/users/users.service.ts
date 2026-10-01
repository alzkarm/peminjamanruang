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
import * as bcrypt from 'bcrypt';

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
      role: this.mapRole(u.role as unknown as Role, u.unitName),
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
        unitName = 'Pusat Data dan Informasi (PUSDATIN)';
      } else if (dto.role === 'admin_umum' || prismaRole === Role.ADMIN_UMUM) {
        unitName = 'Bagian Administrasi Umum Kampus';
      } else if (dto.role === 'admin_yayasan' || dto.role === 'yayasan' || prismaRole === Role.YAYASAN || prismaRole === Role.ADMIN_YAYASAN) {
        unitName = 'Biro Sekretariat & Aset Yayasan YARSI';
      } else if (dto.role === 'admin_lpf' || prismaRole === Role.ADMIN_LPF || prismaRole === Role.ADMIN_UNIV) {
        unitName = 'Biro Layanan Pengelolaan Fasilitas (LPF)';
      } else if (dto.role === 'dosen') {
        unitName = 'Fakultas Kedokteran (Dosen)';
      } else if (dto.role === 'tendik') {
        unitName = 'Bagian Tata Usaha Kampus';
      } else {
        unitName = 'Fakultas Teknologi Informasi (Mahasiswa)';
      }
    }

    // Hash password (default to 'password123' if not specified)
    const rawPass = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(rawPass, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username,
        email,
        fullName,
        unitName,
        role: prismaRole as any,
        passwordHash,
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
        role: this.mapRole(newUser.role as unknown as Role, newUser.unitName),
        hasLocalPassword: true,
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

  private toPrismaRole(roleStr?: string): Role {
    if (!roleStr) return Role.USER;
    const r = roleStr.toLowerCase();
    if (r === 'superadmin') return Role.SUPERADMIN;
    if (r === 'admin_umum' || r === 'admin') return Role.ADMIN_UMUM;
    if (r === 'admin_lpf' || r === 'admin_univ') return Role.ADMIN_LPF;
    if (r === 'admin_yayasan' || r === 'yayasan') return Role.YAYASAN;
    return Role.USER;
  }

  private mapRole(role: Role, unitName: string): string {
    if (role === Role.SUPERADMIN) return 'superadmin';
    if (role === Role.ADMIN_UMUM) return 'admin_umum';
    if (role === Role.ADMIN_LPF || role === Role.ADMIN_UNIV) return 'admin_lpf';
    if (role === Role.YAYASAN || role === Role.ADMIN_YAYASAN) return 'admin_yayasan';
    const u = (unitName || '').toLowerCase();
    if (u.includes('dosen')) return 'dosen';
    if (u.includes('tendik') || u.includes('tata usaha')) return 'tendik';
    return 'mahasiswa';
  }
}
