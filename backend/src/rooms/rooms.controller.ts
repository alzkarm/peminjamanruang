import {
  Controller,
  Get,
  Post,
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN_UNIV, Role.ADMIN_YAYASAN)
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }
}
