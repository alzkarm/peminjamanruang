import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN_UMUM, Role.ADMIN_LPF, Role.ADMIN_UNIV, Role.YAYASAN, Role.ADMIN_YAYASAN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  async invite(@Body() dto: InviteUserDto) {
    return this.usersService.invite(dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN_UMUM)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
