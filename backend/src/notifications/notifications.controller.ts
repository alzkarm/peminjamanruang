import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/types';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get()
  async list(@Req() req: Request & { user: { id?: string; sub?: string } }, @Query() query: ListNotificationsQueryDto) {
    const user = req.user;
    const userId = user.id ?? user.sub ?? '';
    const items = await this.notifications.listForUser(userId, query.limit ?? 20);
    const unread = await this.notifications.unreadCount(userId);
    return { items, unread };
  }

  @Get('queue-counts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async queueCounts(@Req() req: Request & { user: { role?: Role } }) {
    const role = req.user?.role === Role.SUPERADMIN ? Role.SUPERADMIN : Role.ADMIN;
    return this.notifications.queueCounts(role);
  }
  @Patch('read-all')
  async readAll(@Req() req: Request & { user: { id?: string; sub?: string } }) {
    const userId = req.user.id ?? req.user.sub ?? '';
    await this.notifications.markAllRead(userId);
    return { ok: true };
  }

  @Patch(':id/read')
  async readOne(@Req() req: Request & { user: { id?: string; sub?: string } }, @Param('id') id: string) {
    const userId = req.user.id ?? req.user.sub ?? '';
    await this.notifications.markOneRead(userId, id);
    return { ok: true };
  }
}
