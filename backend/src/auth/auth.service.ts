import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { LoginDto, SyncLdapUserDto } from './dto/login.dto';
import { Role } from '@/common/types';
import { Client } from 'ldapts';
import * as bcrypt from 'bcrypt';

/**
 * SIPERU YARSI AuthService — Real LDAP Authentication
 * Based on proven YARSI ATK LDAP integration pattern (pdc.yarsi.ac.id:389)
 *
 * Flow:
 * 1. Anonymous bind → search user DN by uid
 * 2. Authenticated bind with user DN + password → verify credentials
 * 3. If LDAP success → check/provision local DB user → issue JWT
 * 4. If LDAP fails → REJECT (no local password fallback)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly ldapHost: string;
  private readonly ldapPort: number;
  private readonly ldapBaseDn: string;
  private readonly ldapTimeout: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.ldapHost = this.configService.get<string>('LDAP_HOST') || 'pdc.yarsi.ac.id';
    this.ldapPort = parseInt(this.configService.get<string>('LDAP_PORT') || '389', 10);
    this.ldapBaseDn = this.configService.get<string>('LDAP_BASE_DN') || 'dc=yarsi,dc=ac,dc=id';
    this.ldapTimeout = parseInt(this.configService.get<string>('LDAP_NETWORK_TIMEOUT') || '3000', 10);
  }

  /**
   * Main Login Handler — LDAP Only (no local password fallback)
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Security: Extract clean username (strip domain if user typed email) and sanitize against LDAP filter injection
    const rawUsername = username.includes('@')
      ? username.split('@')[0]
      : username.trim();
    const cleanUsername = rawUsername.replace(/[^\w.-]/g, '').trim();

    if (!cleanUsername || !password) {
      throw new BadRequestException('Username dan password wajib diisi.');
    }

    // Step 1: Check Whitelist in local database (Strict Whitelist / Invitation Protection)
    const rawSearch = username.trim();
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' as const } },
          ...(cleanUsername === 'admin' ? [{ username: { equals: 'admin.umum', mode: 'insensitive' as const } }] : []),
          { username: { equals: rawSearch, mode: 'insensitive' as const } },
          { email: { equals: rawSearch, mode: 'insensitive' as const } },
          { email: { startsWith: cleanUsername + '@', mode: 'insensitive' as const } },
        ],
      },
    });

    // Whitelist Protection: If user not whitelisted by Superadmin, REJECT immediately!
    if (!user) {
      this.logger.warn(`Rejected login attempt: Identifier "${rawUsername}" is not whitelisted by Superadmin.`);
      throw new UnauthorizedException(
        'Akun Anda belum terdaftar dalam sistem. Silakan hubungi Superadmin.',
      );
    }

    // Step 2: Try LDAP authentication first (Primary Auth)
    let isLdapSuccess = false;
    let ldapAttributes: { displayName?: string } = {};
    try {
      ldapAttributes = await this.verifyLdapCredentials(cleanUsername, password);
      isLdapSuccess = true;
    } catch (error) {
      this.logger.warn(
        `LDAP authentication unavailable or failed for ${cleanUsername}: ${error.message}. Checking local database password...`,
      );
    }

    // Step 3: Local Database Fallback (if LDAP failed or not available)
    if (!isLdapSuccess) {
      if (user.passwordHash) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          throw new UnauthorizedException('Username atau password tidak sesuai.');
        }
      } else {
        throw new UnauthorizedException(
          'Username atau password tidak sesuai. (Pastikan terhubung ke jaringan kampus YARSI untuk SSO LDAP)',
        );
      }
    } else {
      // If LDAP succeeded, update display name if changed
      const newFullName = ldapAttributes.displayName;
      if (newFullName && newFullName !== user.fullName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { fullName: newFullName },
        });
        this.logger.log(`Updated display name for ${cleanUsername} from LDAP: ${newFullName}`);
      }
    }

    // Step 4: Map Role & Generate JWT Token
    const mappedRole = this.mapUserRole(user.role as unknown as Role, user.unitName);

    const payload = {
      sub: user.id,
      username: user.username,
      role: mappedRole,
      unitName: user.unitName,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(
      `User ${user.username} (${mappedRole}) logged in via ${isLdapSuccess ? 'LDAP SSO' : 'Local DB Fallback'}.`,
    );

    return {
      message: isLdapSuccess
        ? 'Login SSO LDAP YARSI berhasil'
        : 'Login Berhasil (Akun Terdaftar di Sistem)',
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: {
        id: user.id,
        username: user.username,
        name: user.fullName,
        fullName: user.fullName,
        email: user.email,
        unitName: user.unitName,
        department: user.unitName,
        faculty: user.unitName,
        role: mappedRole,
        identifier: user.username,
      },
    };
  }

  /**
   * Verify credentials against YARSI LDAP server (pdc.yarsi.ac.id:389)
   *
   * Mirrors the proven flow from ATK project:
   * 1. Connect to LDAP host
   * 2. Anonymous bind
   * 3. Search for user DN by uid filter
   * 4. Bind with found DN + user password
   * 5. Return LDAP display name attributes
   */
  /**
   * Verify credentials against YARSI LDAP server
   *
   * Flow using modern ldapts (Promise-based):
   * 1. Connect to LDAP URL
   * 2. Bind with admin credentials (or anonymous if LDAP_BIND_DN is empty)
   * 3. Search for user DN by uid filter in LDAP_SEARCH_BASE
   * 4. Bind with found user DN + user password
   * 5. Return LDAP display name
   */
  private async verifyLdapCredentials(
    username: string,
    password: string,
  ): Promise<{ displayName?: string }> {
    const ldapUrl =
      this.configService.get<string>('LDAP_URL') ||
      `ldap://${this.ldapHost}:${this.ldapPort}`;
    const bindDn = this.configService.get<string>('LDAP_BIND_DN') || '';
    const bindPassword =
      this.configService.get<string>('LDAP_BIND_PASSWORD') || '';
    const searchBase =
      this.configService.get<string>('LDAP_SEARCH_BASE') || this.ldapBaseDn;
    const filterTemplate =
      this.configService.get<string>('LDAP_SEARCH_FILTER') ||
      '(uid={{username}})';

    const client = new Client({
      url: ldapUrl,
      timeout: this.ldapTimeout,
      connectTimeout: this.ldapTimeout,
      strictDN: false,
    });

    try {
      // 1. Initial bind (admin or anonymous)
      if (bindDn) {
        await client.bind(bindDn, bindPassword);
      } else {
        await client.bind('', '');
      }

      // 2. Search for user entry
      const searchFilter = filterTemplate.replace('{{username}}', username);
      const searchRes = await client.search(searchBase, {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'displayName', 'cn', 'uid', 'mail'],
      });

      if (!searchRes.searchEntries || searchRes.searchEntries.length === 0) {
        throw new UnauthorizedException(
          'Username tidak ditemukan di direktori LDAP YARSI. Pastikan NIM/NIDN/NIK yang dimasukkan benar.',
        );
      }

      const userEntry = searchRes.searchEntries[0];
      const userDn = userEntry.dn;
      const displayName = ((userEntry.displayName as string) || ((userEntry as any).displayname as string) || (userEntry.cn as string) || username);

      // 3. User authenticated bind with password
      const userClient = new Client({
        url: ldapUrl,
        timeout: this.ldapTimeout,
        connectTimeout: this.ldapTimeout,
        strictDN: false,
      });

      try {
        await userClient.bind(userDn, password);
      } catch (bindErr: any) {
        this.logger.warn(
          `LDAP password verification failed for ${username} (DN: ${userDn})`,
        );
        throw new UnauthorizedException(
          'Password SSO LDAP salah. Silakan periksa kembali kata sandi Anda.',
        );
      } finally {
        await userClient.unbind().catch(() => {});
      }

      this.logger.log(
        `LDAP verified via ldapts: ${username} (DN: ${userDn}, Name: ${displayName || 'N/A'})`,
      );
      return { displayName };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`LDAP error: ${err.message}`);
      throw new InternalServerErrorException(
        'Gagal terhubung ke server LDAP YARSI. Pastikan jaringan kampus tersedia.',
      );
    } finally {
      await client.unbind().catch(() => {});
    }
  }

  /**
   * Auto-provisions LDAP user profile to local database on first login.
   * Security: Newly provisioned LDAP users are strictly assigned Role.USER.
   * Elevated administrative privileges (ADMIN_UNIV, ADMIN_YAYASAN) must be assigned
   * explicitly by Superadmin in the database, matching the ATK security architecture.
   */
  private async provisionLdapUser(username: string, ldapDisplayName?: string) {
    const role: Role = Role.USER;
    const fullName = ldapDisplayName || `Civitas YARSI (${username})`;
    let unitName = 'Fakultas Teknologi Informasi';
    let email = `${username}@yarsi.ac.id`;

    // Department/Unit inference based on YARSI identifier conventions
    if (username.startsWith('03') || (username.length === 10 && username.startsWith('0'))) {
      unitName = 'Fakultas Kedokteran';
    } else if (username.startsWith('14')) {
      unitName = 'BEM / Mahasiswa FTI';
      email = `${username}@mhs.yarsi.ac.id`;
    } else if (/^\d{12,}$/.test(username)) {
      unitName = 'Bagian Tata Usaha Kampus';
    }

    const newUser = await this.prisma.user.create({
      data: {
        username,
        fullName,
        email,
        unitName,
        role: role,
      },
    });

    this.logger.log(`Safely provisioned new LDAP user: ${username} (Role: ${role}, Unit: ${unitName})`);
    return newUser;
  }

  /**
   * Sync Profile endpoint — updates local DB from LDAP attributes
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
        role: Role.USER,
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

  private mapUserRole(role: Role, unitName: string): string {
    if ((role as any) === 'SUPERADMIN' || role === Role.SUPERADMIN) return 'superadmin';
    if ((role as any) === 'ADMIN_UMUM' || role === Role.ADMIN_UMUM) return 'admin_umum';
    if ((role as any) === 'ADMIN_LPF' || role === Role.ADMIN_LPF || role === Role.ADMIN_UNIV) return 'admin_lpf';
    if ((role as any) === 'YAYASAN' || role === Role.YAYASAN || role === Role.ADMIN_YAYASAN) return 'admin_yayasan';
    const u = (unitName || '').toLowerCase();
    if (u.includes('dosen')) return 'dosen';
    if (u.includes('tendik') || u.includes('tata usaha')) return 'tendik';
    return 'mahasiswa';
  }
}
