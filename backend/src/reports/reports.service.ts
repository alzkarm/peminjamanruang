import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { BookingStatus } from '@/common/types';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
  floorId?: number;
  roomId?: string;
  status?: BookingStatus;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates streaming Excel XLSX file for large datasets
   */
  async exportBookingsToExcelStream(res: Response, filter: ReportFilterDto) {
    const { startDate, endDate, floorId, roomId, status } = filter;

    const bookings = await this.prisma.booking.findMany({
      where: {
        ...(status ? { status: status.toString() } : {}),
        ...(roomId ? { roomId } : {}),
        ...(floorId ? { room: { floorId } } : {}),
        ...(startDate || endDate
          ? {
              startTime: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
              },
            }
          : {}),
      },
      include: {
        room: { include: { floor: true } },
        user: true,
        feedback: true,
      },
      orderBy: { startTime: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Universitas YARSI - SIPERU Engine';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Rekapitulasi Peminjaman Ruang', {
      views: [{ showGridLines: true }],
      properties: { tabColor: { argb: '0D7A5F' } },
    });

    // Setup Columns
    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'ID Booking', key: 'id', width: 38 },
      { header: 'Nama Ruangan', key: 'roomName', width: 28 },
      { header: 'Lantai / Gedung', key: 'floor', width: 20 },
      { header: 'Nama Pemohon', key: 'userName', width: 25 },
      { header: 'NIM / NIDN', key: 'identifier', width: 18 },
      { header: 'Fakultas / Unit', key: 'unitName', width: 30 },
      { header: 'Judul Kegiatan', key: 'title', width: 35 },
      { header: 'Kategori', key: 'activityType', width: 15 },
      { header: 'Waktu Mulai (WIB)', key: 'startTime', width: 20 },
      { header: 'Waktu Selesai (WIB)', key: 'endTime', width: 20 },
      { header: 'Status Persetujuan', key: 'status', width: 18 },
      { header: 'Special Room (Yayasan)', key: 'isSpecial', width: 22 },
      { header: 'Rating Evaluasi', key: 'rating', width: 16 },
    ];

    // Style Header Row (YARSI Emerald)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D7A5F' },
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF075240' } },
        left: { style: 'thin', color: { argb: 'FF075240' } },
        bottom: { style: 'medium', color: { argb: 'FF043026' } },
        right: { style: 'thin', color: { argb: 'FF075240' } },
      };
    });

    // Populate Data Rows
    bookings.forEach((b, index) => {
      const row = worksheet.addRow({
        no: index + 1,
        id: b.id,
        roomName: b.room.name,
        floor: b.room.floor.name,
        userName: b.user.fullName,
        identifier: b.user.username,
        unitName: b.user.unitName,
        title: b.title,
        activityType: b.activityType,
        startTime: b.startTime.toLocaleString('id-ID'),
        endTime: b.endTime.toLocaleString('id-ID'),
        status: b.status,
        isSpecial: b.room.isSpecialRoom ? 'Ya (Yayasan)' : 'Tidak (Reguler)',
        rating: b.feedback ? `${b.feedback.overallRating} / 5` : '-',
      });

      row.height = 22;
      row.alignment = { vertical: 'middle' };

      // Alternating row background
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        });
      }
    });

    const filename = `Rekap_Peminjaman_Ruang_YARSI_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    this.logger.log(`Exporting ${bookings.length} bookings to Excel stream.`);
    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Analytics Summary for dashboard
   */
  async getSummaryMetrics() {
    const totalBookings = await this.prisma.booking.count();
    const approvedCount = await this.prisma.booking.count({
      where: { status: BookingStatus.APPROVED },
    });
    const pendingCount = await this.prisma.booking.count({
      where: { status: BookingStatus.PENDING },
    });
    const recommendedCount = await this.prisma.booking.count({
      where: { status: BookingStatus.RECOMMENDED },
    });
    const rejectedCount = await this.prisma.booking.count({
      where: { status: BookingStatus.REJECTED },
    });

    const roomsCount = await this.prisma.room.count({ where: { isActive: true } });
    const floorsCount = await this.prisma.floor.count();

    const feedbacks = await this.prisma.feedback.findMany({
      select: { overallRating: true },
    });
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((acc, c) => acc + c.overallRating, 0) / feedbacks.length
        : 5.0;

    return {
      totalBookings,
      approvedCount,
      pendingCount,
      recommendedCount,
      rejectedCount,
      roomsCount,
      floorsCount,
      avgFeedbackRating: Number(avgRating.toFixed(2)),
      approvalRatePercent: totalBookings > 0 ? Math.round((approvedCount / totalBookings) * 100) : 0,
    };
  }
}
