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
import * as ldap from 'ldapjs';

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

    // Extract clean username (strip @yarsi.ac.id if user typed full email)
    const cleanUsername = username.includes('@')
      ? username.split('@')[0]
      : username.trim();

    if (!cleanUsername || !password) {
      throw new BadRequestException('Username dan password wajib diisi.');
    }

    // Step 1: Verify credentials against LDAP pdc.yarsi.ac.id
    let ldapAttributes: { displayName?: string } = {};
    try {
      ldapAttributes = await this.verifyLdapCredentials(cleanUsername, password);
    } catch (error) {
      this.logger.warn(`LDAP authentication failed for ${cleanUsername}: ${error.message}`);
      throw error;
    }

    // Step 2: Find or provision user in local database
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { username: { startsWith: cleanUsername } },
        ],
      },
    });

    if (!user) {
      // Auto-provision: create new user record from LDAP profile
      user = await this.provisionLdapUser(cleanUsername, ldapAttributes.displayName);
      this.logger.log(`Auto-provisioned new LDAP user: ${cleanUsername}`);
    } else {
      // Update display name from LDAP if available
      if (ldapAttributes.displayName && ldapAttributes.displayName !== user.fullName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { fullName: ldapAttributes.displayName },
        });
        this.logger.log(`Updated display name for ${cleanUsername} from LDAP.`);
      }
    }

    // Step 3: Generate JWT Token
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      unitName: user.unitName,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User ${user.username} (${user.role}) logged in via LDAP SSO.`);

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
   * Verify credentials against YARSI LDAP server (pdc.yarsi.ac.id:389)
   *
   * Mirrors the proven flow from ATK project:
   * 1. Connect to LDAP host
   * 2. Anonymous bind
   * 3. Search for user DN by uid filter
   * 4. Bind with found DN + user password
   * 5. Return LDAP display name attributes
   */
  private verifyLdapCredentials(
    username: string,
    password: string,
  ): Promise<{ displayName?: string }> {
    return new Promise((resolve, reject) => {
      // Create LDAP client connection
      const client = ldap.createClient({
        url: `ldap://${this.ldapHost}:${this.ldapPort}`,
        connectTimeout: this.ldapTimeout,
        timeout: this.ldapTimeout,
      });

      // Handle connection errors
      client.on('error', (err: Error) => {
        this.logger.error(`LDAP connection error: ${err.message}`);
        reject(
          new InternalServerErrorException(
            'Gagal terhubung ke server LDAP YARSI. Pastikan jaringan kampus tersedia.',
          ),
        );
      });

      client.on('connectError', (err: Error) => {
        this.logger.error(`LDAP connectError: ${err.message}`);
        reject(
          new InternalServerErrorException(
            'Gagal terhubung ke server LDAP YARSI. Pastikan jaringan kampus tersedia.',
          ),
        );
      });

      // Step 1: Anonymous bind to search for user
      client.bind('', '', (bindErr) => {
        if (bindErr) {
          this.logger.error(`LDAP anonymous bind failed: ${bindErr.message}`);
          client.destroy();
          reject(
            new InternalServerErrorException(
              'Gagal melakukan koneksi awal ke direktori LDAP YARSI.',
            ),
          );
          return;
        }

        // Step 2: Search for user entry by uid
        const searchFilter = `(uid=${username})`;
        const searchOpts: ldap.SearchOptions = {
          filter: searchFilter,
          scope: 'sub',
          attributes: ['dn', 'displayName', 'uid', 'mail', 'cn'],
        };

        client.search(this.ldapBaseDn, searchOpts, (searchErr, searchRes) => {
          if (searchErr) {
            this.logger.error(`LDAP search error: ${searchErr.message}`);
            client.destroy();
            reject(
              new UnauthorizedException(
                'Gagal mencari akun di direktori LDAP YARSI.',
              ),
            );
            return;
          }

          let userDn: string | null = null;
          let displayName: string | undefined;

          searchRes.on('searchEntry', (entry) => {
            userDn = entry.dn.toString();
            // Extract displayName attribute from search entry
            try {
              const attrs = entry.attributes || [];
              for (const attr of attrs) {
                const attrType = (attr as any).type || '';
                const attrVals = (attr as any).values || (attr as any).vals || [];
                if (attrType === 'displayName' && attrVals.length > 0) {
                  displayName = attrVals[0];
                }
                if (!displayName && attrType === 'cn' && attrVals.length > 0) {
                  displayName = attrVals[0];
                }
              }
            } catch (parseErr) {
              this.logger.warn(`Could not parse LDAP attributes: ${parseErr}`);
            }
          });

          searchRes.on('error', (err) => {
            this.logger.error(`LDAP search result error: ${err.message}`);
            client.destroy();
            reject(
              new UnauthorizedException('Pencarian LDAP gagal.'),
            );
          });

          searchRes.on('end', (result) => {
            if (!userDn) {
              client.destroy();
              reject(
                new UnauthorizedException(
                  'Username tidak ditemukan di direktori LDAP YARSI. Pastikan NIM/NIDN/NIK yang dimasukkan benar.',
                ),
              );
              return;
            }

            // Step 3: Bind with the user's actual DN + password to verify
            client.bind(userDn, password, (authBindErr) => {
              client.destroy(); // Always close after verification

              if (authBindErr) {
                this.logger.warn(
                  `LDAP password verification failed for ${username} (DN: ${userDn})`,
                );
                reject(
                  new UnauthorizedException(
                    'Password SSO LDAP salah. Silakan periksa kembali kata sandi Anda.',
                  ),
                );
                return;
              }

              // LDAP authentication successful
              this.logger.log(
                `LDAP verified: ${username} (DN: ${userDn}, Name: ${displayName || 'N/A'})`,
              );
              resolve({ displayName });
            });
          });
        });
      });
    });
  }

  /**
   * Auto-provisions LDAP user profile to local database on first login.
   * Role is inferred from username convention used by YARSI LDAP directory.
   */
  private async provisionLdapUser(username: string, ldapDisplayName?: string) {
    let role: Role = Role.USER;
    let fullName = ldapDisplayName || `Civitas YARSI (${username})`;
    let unitName = 'Fakultas Teknologi Informasi';
    let email = `${username}@yarsi.ac.id`;

    // Role inference based on YARSI LDAP naming conventions
    if (username.toLowerCase().includes('yayasan') || username.startsWith('YYS-')) {
      role = Role.ADMIN_YAYASAN;
      if (!ldapDisplayName) fullName = 'Sekretariat Yayasan YARSI';
      unitName = 'Biro Sekretariat & Aset Yayasan';
    } else if (username.toLowerCase().includes('lpf') || username.startsWith('LPF-') || username === 'admin') {
      role = Role.ADMIN_UNIV;
      if (!ldapDisplayName) fullName = 'Biro Layanan Pengelolaan Fasilitas (LPF)';
      unitName = 'Biro Umum & Fasilitas Universitas';
    } else if (username.startsWith('03') || (username.length === 10 && username.startsWith('0'))) {
      role = Role.USER;
      if (!ldapDisplayName) fullName = `Dosen / Tenaga Pendidik (${username})`;
      unitName = 'Fakultas Kedokteran';
    } else if (username.startsWith('14')) {
      role = Role.USER;
      if (!ldapDisplayName) fullName = `Mahasiswa (${username})`;
      unitName = 'BEM Fakultas Teknologi Informasi';
      email = `${username}@mhs.yarsi.ac.id`;
    }

    const newUser = await this.prisma.user.create({
      data: {
        username,
        fullName,
        email,
        unitName,
        role: role.toString(),
      },
    });

    this.logger.log(`Provisioned new LDAP user: ${username} -> role ${role}`);
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
        role: Role.USER.toString(),
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
