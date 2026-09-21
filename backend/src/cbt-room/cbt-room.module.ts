import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CbtRoomController } from './cbt-room.controller';
import { CbtRoomService } from './cbt-room.service';

@Module({
  imports: [PrismaModule],
  controllers: [CbtRoomController],
  providers: [CbtRoomService],
  exports: [CbtRoomService],
})
export class CbtRoomModule {}
