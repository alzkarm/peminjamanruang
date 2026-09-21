import { Module } from '@nestjs/common';
import { AcademicBulkService } from './academic-bulk.service';
import { AcademicBulkController } from './academic-bulk.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  controllers: [AcademicBulkController],
  providers: [AcademicBulkService],
  exports: [AcademicBulkService],
})
export class AcademicBulkModule {}
