import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { AcademicBulkModule } from './academic-bulk/academic-bulk.module';
import { ReportsModule } from './reports/reports.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    AcademicBulkModule,
    ReportsModule,
    FeedbacksModule,
  ],
})
export class AppModule {}
