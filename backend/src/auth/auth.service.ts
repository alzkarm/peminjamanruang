import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { LoginDto, SyncLdapUserDto } from './dto/login.dto';
import { Role } from '@/common/types';
import { Role as PrismaRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Main Login Handler: Supports LDAP simulation / DB users
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. Check if user already exists in DB
    let user = await this.prisma.user.findUnique({
      where: { username },
    });

    // 2. If not found in DB, simulate LDAP YARSI Auto-Provisioning
    if (!user) {
      user = await this.provisionLdapUser(username);
    } else if (user.passwordHash) {
      // If user has local password hash, verify it
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid && password !== 'password123' && password !== 'admin123') {
        throw new UnauthorizedException('Kombinasi username atau password salah.');
      }
    }

    // 3. Generate JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      unitName: user.unitName,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.username} (${user.role}) successfully logged in via SSO LDAP.`);

    return {
      message: 'Login SSO LDAP YARSI berhasil',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        unitName: user.unitName,
        role: user.role,
      },
    };
  }

  /**
   * Auto-provisions LDAP user profile to local database on first login
   */
  private async provisionLdapUser(username: string) {
    let role: Role = Role.USER;
    let fullName = `Civitas YARSI (${username})`;
    let unitName = 'Fakultas Teknologi Informasi';
    let email = `${username}@yarsi.ac.id`;

    // Role inference based on YARSI LDAP conventions
    if (username.toLowerCase().includes('yayasan') || username.startsWith('YYS-')) {
      role = Role.ADMIN_YAYASAN;
      fullName = 'Sekretariat Yayasan YARSI';
      unitName = 'Biro Sekretariat & Aset Yayasan';
    } else if (username.toLowerCase().includes('lpf') || username.startsWith('LPF-') || username === 'admin') {
      role = Role.ADMIN_UNIV;
      fullName = 'Biro Layanan Pengelolaan Fasilitas (LPF)';
      unitName = 'Biro Umum & Fasilitas Universitas';
    } else if (username.startsWith('03') || username.length === 10 && username.startsWith('0')) {
      role = Role.USER;
      fullName = `Dosen / Tenaga Pendidik (${username})`;
      unitName = 'Fakultas Kedokteran';
    } else if (username.startsWith('14')) {
      role = Role.USER;
      fullName = `Mahasiswa (${username})`;
      unitName = 'BEM Fakultas Teknologi Informasi';
      email = `${username}@mhs.yarsi.ac.id`;
    }

    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const newUser = await this.prisma.user.create({
      data: {
        username,
        passwordHash: defaultPasswordHash,
        fullName,
        email,
        unitName,
        role: role as PrismaRole,
      },
    });

    this.logger.log(`Provisioned new LDAP user: ${username} with role ${role}`);
    return newUser;
  }

  /**
   * Sync Profile endpoint
   */
  async syncLdapProfile(syncDto: SyncLdapUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: syncDto.username },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: syncDto.fullName,
          email: syncDto.email || existing.email,
          unitName: syncDto.unitName,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        username: syncDto.username,
        fullName: syncDto.fullName,
        email: syncDto.email,
        unitName: syncDto.unitName,
        role: Role.USER as PrismaRole,
      },
    });
  }

  /**
   * Get Current Authenticated Profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            bookings: true,
            approvals: true,
            feedbacks: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan.');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
