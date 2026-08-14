import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService, ReportFilterDto } from './reports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export/excel')
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async exportExcel(@Query() filter: ReportFilterDto, @Res() res: Response) {
    return this.reportsService.exportBookingsToExcelStream(res, filter);
  }

  @Get('summary')
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async getSummary() {
    return this.reportsService.getSummaryMetrics();
  }
}
