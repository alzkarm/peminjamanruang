import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AcademicBulkService } from './academic-bulk.service';
import { CreateAcademicBulkDto } from './dto/create-academic-bulk.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';

@Controller('academic-bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicBulkController {
  constructor(private readonly academicBulkService: AcademicBulkService) {}

  @Post()
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async createBulk(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAcademicBulkDto,
  ) {
    return this.academicBulkService.createBulk(userId, dto);
  }

  @Get()
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async findAllGroups() {
    return this.academicBulkService.findAllGroups();
  }

  @Delete(':bulkGroupId')
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async deleteGroup(@Param('bulkGroupId') bulkGroupId: string) {
    return this.academicBulkService.deleteGroup(bulkGroupId);
  }
}
