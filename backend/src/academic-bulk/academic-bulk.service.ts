import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAcademicBulkDto } from './dto/create-academic-bulk.dto';
import { ActivityType, BookingStatus } from '@/common/types';
import { BookingStatus as PrismaBookingStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SchedulingService } from '../scheduling/scheduling.service';

type AcademicBookingInput = Prisma.BookingCreateManyInput & {
  startTime: Date;
  endTime: Date;
};

@Injectable()
export class AcademicBulkService {
  private readonly logger = new Logger(AcademicBulkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  /**
   * Generates recurring academic timetable bookings for an entire semester
   */
  async createBulk(userId: string, dto: CreateAcademicBulkDto) {
    const startSemester = new Date(dto.semesterStartDate);
    const endSemester = new Date(dto.semesterEndDate);

    if (startSemester >= endSemester) {
      throw new BadRequestException('Tanggal awal semester harus lebih awal dari tanggal akhir.');
    }

    const [startH, startM] = dto.startTimeStr.split(':').map(Number);
    const [endH, endM] = dto.endTimeStr.split(':').map(Number);

    if (isNaN(startH) || isNaN(endH)) {
      throw new BadRequestException('Format jam mulai atau selesai tidak valid (gunakan format HH:mm).');
    }

    const bulkGroupId = `bulk-acad-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const instancesToCreate: AcademicBookingInput[] = [];

    // Iterate through all days in the semester range
    const cursor = new Date(startSemester);
    while (cursor <= endSemester) {
      const day = cursor.getDay(); // 0 is Sunday, 1 is Monday, 6 is Saturday

      // Target day matches (1 = Mon, ..., 5 = Fri) and is not weekend
      if (day === dto.dayOfWeek && day !== 0 && day !== 6) {
        for (const roomId of dto.roomIds) {
          const sessionStart = new Date(cursor);
          sessionStart.setHours(startH, startM, 0, 0);

          const sessionEnd = new Date(cursor);
          sessionEnd.setHours(endH, endM, 0, 0);

          instancesToCreate.push({
            userId,
            roomId,
            title: `[Jadwal Kuliah] ${dto.courseName} - ${dto.lecturerName}`,
            activityType: ActivityType.KULIAH,
            startTime: sessionStart,
            endTime: sessionEnd,
            status: PrismaBookingStatus.APPROVED,
            notes: `Perkuliahan Semester Terjadwal: ${dto.studentGroup || ''} (${dto.faculty || ''})`,
            isAcademicBulk: true,
            bulkGroupId,
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (instancesToCreate.length === 0) {
      throw new BadRequestException('Tidak ada jadwal yang sesuai dengan rentang semester dan hari yang dipilih.');
    }

    const result = await this.scheduling.inSerializableTransaction(async (tx) => {
      for (const instance of instancesToCreate) {
        await this.scheduling.assertAvailable(
          instance.roomId,
          instance.startTime,
          instance.endTime,
          undefined,
          tx,
        );
      }

      await tx.booking.createMany({
        data: instancesToCreate,
      });

      return {
        bulkGroupId,
        totalCreatedSessions: instancesToCreate.length,
        courseName: dto.courseName,
        lecturerName: dto.lecturerName,
        dayOfWeek: dto.dayOfWeek,
        time: `${dto.startTimeStr} - ${dto.endTimeStr} WIB`,
      };
    });

    this.logger.log(`Created ${result.totalCreatedSessions} academic bulk sessions under group ${bulkGroupId}`);
    return result;
  }

  async findAll() {
    return this.prisma.booking.findMany({
      where: {
        isAcademicBulk: true,
      },
      include: {
        room: { include: { floor: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findAllGroups() {
    return this.prisma.booking.groupBy({
      by: ['bulkGroupId', 'title', 'roomId'],
      where: {
        isAcademicBulk: true,
        bulkGroupId: { not: null },
      },
      _count: {
        id: true,
      },
      _min: {
        startTime: true,
      },
      _max: {
        endTime: true,
      },
    });
  }

  async deleteGroup(bulkGroupId: string) {
    const deleted = await this.prisma.booking.deleteMany({
      where: {
        bulkGroupId,
        isAcademicBulk: true,
      },
    });

    return {
      message: `Berhasil menghapus ${deleted.count} sesi perkuliahan untuk kelompok jadwal '${bulkGroupId}'.`,
      deletedCount: deleted.count,
    };
  }
}
