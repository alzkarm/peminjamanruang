import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, QueryRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async findAll(@Query() query: QueryRoomDto) {
    return this.roomsService.findAll(query);
  }

  @Get('floors')
  async getFloors() {
    return this.roomsService.getFloors();
  }

  @Get('availability')
  async checkAvailability(
    @Query('roomId') roomId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.roomsService.checkAvailability(
      roomId,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get('schedule')
  async getPublicSchedule(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.roomsService.findPublicSchedule(
      new Date(startTime),
      new Date(endTime),
      roomId,
    );
  }

  @Get('recent-submissions')
  async getRecentSubmissions(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20) : 5;
    return this.roomsService.getRecentSubmissions(parsedLimit);
  }

  @Post('smart-search')
  async smartSearch(
    @Body()
    body: {
      date: string;
      startTime: string;
      endTime: string;
      minCapacity?: number;
      facilities?: string[];
      building?: string;
    },
  ) {
    return this.roomsService.smartSearch(body);
  }

  @Get('maintenance/list')
  async getMaintenances() {
    return this.roomsService.getMaintenances();
  }

  @Post('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async createMaintenance(
    @CurrentUser() currentUser: { fullName: string },
    @Body()
    body: {
      roomId: string;
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
    },
  ) {
    return this.roomsService.createMaintenance({
      roomId: body.roomId,
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      createdBy: currentUser?.fullName || 'Petugas LPF',
    });
  }

  @Delete('maintenance/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async removeMaintenance(@Param('id') id: string) {
    return this.roomsService.removeMaintenance(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: import('./dto/create-room.dto').UpdateRoomDto,
  ) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  async remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async toggleStatus(@Param('id') id: string) {
    return this.roomsService.toggleStatus(id);
  }
}
