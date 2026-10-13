import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { VerifyController } from './verify.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [SchedulingModule, NotificationsModule, StorageModule],
  controllers: [BookingsController, VerifyController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
