import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/create-facility.dto';

const DEFAULT_FACILITIES = [
  {
    name: 'Laser Projector & Motorized Screen',
    category: 'audio_visual',
    description: 'Proyektor laser resolusi tinggi dan layar proyektor otomatis.',
    icon: 'Projector',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Wireless Microphone Set & Sound System',
    category: 'audio_visual',
    description: 'Set mikrofon wireless, receiver audio, dan sound system ruangan.',
    icon: 'Mic',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Hybrid Meeting / PTZ 4K Camera Kit',
    category: 'audio_visual',
    description: 'Kamera konferensi PTZ 4K dengan speakerphone untuk hybrid meeting / Zoom.',
    icon: 'Video',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Kursi Tambahan Futura (50 Pcs)',
    category: 'furniture',
    description: 'Paket alokasi kursi tambahan futura siap susun untuk peserta ekstra.',
    icon: 'Armchair',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Meja Registrasi & Taplak Standar',
    category: 'furniture',
    description: 'Meja registrasi dan taplak standar untuk area depan / resepsionis kegiatan.',
    icon: 'Table',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Colokan Listrik / Kabel Roll 10 Meter',
    category: 'connectivity',
    description: 'Kabel roll ekstensi daya listrik 10 meter dengan 4 outlet terminal.',
    icon: 'Cable',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Podium Resmi & Banner Stand',
    category: 'furniture',
    description: 'Podium resmi berlogo YARSI serta tiang X-Banner/Roll-Banner display.',
    icon: 'Podium',
    isSpecial: false,
    isActive: true,
  },
  {
    name: 'Videotron LED Display 8x4m (Khusus Auditorium)',
    category: 'audio_visual',
    description: 'Layar raksasa Videotron LED indoor utama panggung Auditorium Ar-Rahman.',
    icon: 'Monitor',
    isSpecial: true,
    isActive: true,
  },
];

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all facilities, seeding defaults if table is empty
   */
  async findAll(onlyActive: boolean = false) {
    try {
      const count = await (this.prisma as any).facility.count();
      if (count === 0) {
        this.logger.log('Facilities table is empty. Seeding initial default facilities...');
        for (const item of DEFAULT_FACILITIES) {
          await (this.prisma as any).facility.create({
            data: item,
          });
        }
      }

      return (this.prisma as any).facility.findMany({
        where: onlyActive ? { isActive: true } : {},
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    } catch (err: any) {
      this.logger.error('Error fetching facilities:', err);
      // Fallback in case of DB glitch
      return DEFAULT_FACILITIES.map((f, i) => ({
        id: `fac-default-${i + 1}`,
        ...f,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  async findOne(id: string) {
    const facility = await (this.prisma as any).facility.findUnique({
      where: { id },
    });
    if (!facility) {
      throw new NotFoundException(`Fasilitas dengan ID '${id}' tidak ditemukan.`);
    }
    return facility;
  }

  async create(dto: CreateFacilityDto) {
    const name = dto.name.trim();
    const existing = await (this.prisma as any).facility.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Fasilitas dengan nama '${name}' sudah terdaftar.`);
    }

    return (this.prisma as any).facility.create({
      data: {
        name,
        category: dto.category ? dto.category.trim() : 'audio_visual',
        description: dto.description?.trim() || null,
        icon: dto.icon?.trim() || 'Package',
        isSpecial: dto.isSpecial ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFacilityDto) {
    await this.findOne(id);

    if (dto.name) {
      const name = dto.name.trim();
      const existing = await (this.prisma as any).facility.findFirst({
        where: { name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Fasilitas dengan nama '${name}' sudah terdaftar.`);
      }
      dto.name = name;
    }

    return (this.prisma as any).facility.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon?.trim() || 'Package' } : {}),
        ...(dto.isSpecial !== undefined ? { isSpecial: dto.isSpecial } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async toggleStatus(id: string) {
    const facility = await this.findOne(id);
    return (this.prisma as any).facility.update({
      where: { id },
      data: {
        isActive: !facility.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await (this.prisma as any).facility.delete({ where: { id } });
    return { message: 'Fasilitas berhasil dihapus.' };
  }
}
