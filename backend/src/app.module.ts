import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { AcademicBulkModule } from './academic-bulk/academic-bulk.module';
import { ReportsModule } from './reports/reports.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { CbtRoomModule } from './cbt-room/cbt-room.module';
import { UsersModule } from './users/users.module';
import { FacultiesModule } from './faculties/faculties.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { NotificationsModule } from './notifications/notifications.module';

const activeEnv = process.env.NODE_ENV || 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${activeEnv}.local`,
        `.env.${activeEnv}`,
        '.env.local',
        '.env',
        `backend/.env.${activeEnv}.local`,
        `backend/.env.${activeEnv}`,
        'backend/.env.local',
        'backend/.env',
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    BookingsModule,
    AcademicBulkModule,
    ReportsModule,
    FeedbacksModule,
    CbtRoomModule,
    FacultiesModule,
    FacilitiesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
