import { Module } from '@nestjs/common';
import { AcademicBulkService } from './academic-bulk.service';
import { AcademicBulkController } from './academic-bulk.controller';

@Module({
  controllers: [AcademicBulkController],
  providers: [AcademicBulkService],
  exports: [AcademicBulkService],
})
export class AcademicBulkModule {}
