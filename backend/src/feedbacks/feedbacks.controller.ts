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
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbacksService.create(userId, dto);
  }

  @Get()
  async findAll() {
    return this.feedbacksService.findAll();
  }

  @Get('room/:roomId')
  async findByRoom(@Param('roomId') roomId: string) {
    return this.feedbacksService.findByRoom(roomId);
  }
}
