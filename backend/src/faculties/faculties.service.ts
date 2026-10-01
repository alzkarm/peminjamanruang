import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFacultyDto, UpdateFacultyDto } from './dto/create-faculty.dto';

@Injectable()
export class FacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive: boolean = false) {
    return (this.prisma as any).faculty.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const faculty = await (this.prisma as any).faculty.findUnique({
      where: { id },
    });
    if (!faculty) {
      throw new NotFoundException(`Fakultas dengan ID '${id}' tidak ditemukan.`);
    }
    return faculty;
  }

  async create(dto: CreateFacultyDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await (this.prisma as any).faculty.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Fakultas dengan kode '${code}' sudah terdaftar.`);
    }

    return (this.prisma as any).faculty.create({
      data: {
        code,
        name: dto.name.trim(),
        colorBg: dto.colorBg || '#3B82F6',
        colorBorder: dto.colorBorder || '#2563EB',
        colorText: dto.colorText || '#FFFFFF',
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFacultyDto) {
    await this.findOne(id);

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const existing = await (this.prisma as any).faculty.findFirst({
        where: { code, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Fakultas dengan kode '${code}' sudah terdaftar.`);
      }
      dto.code = code;
    }

    return (this.prisma as any).faculty.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.colorBg !== undefined ? { colorBg: dto.colorBg } : {}),
        ...(dto.colorBorder !== undefined ? { colorBorder: dto.colorBorder } : {}),
        ...(dto.colorText !== undefined ? { colorText: dto.colorText } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await (this.prisma as any).faculty.delete({ where: { id } });
    return { message: 'Fakultas berhasil dihapus.' };
  }
}
