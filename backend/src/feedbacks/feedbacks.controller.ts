import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role } from '@/common/types';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  async create(
    @CurrentUser() currentUser: { id: string; role: Role },
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbacksService.create(currentUser.id, dto, currentUser.role);
  }

  @Get('my')
  async findMyFeedbacks(@CurrentUser('id') userId: string) {
    return this.feedbacksService.findByUser(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async findAll() {
    return this.feedbacksService.findAll();
  }

  @Get('room/:roomId')
  async findByRoom(@Param('roomId') roomId: string) {
    return this.feedbacksService.findByRoom(roomId);
  }
}
