import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/create-facility.dto';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  async findAll(@Query('onlyActive') onlyActive?: string) {
    return this.facilitiesService.findAll(onlyActive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.facilitiesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilitiesService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    return this.facilitiesService.toggleStatus(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.facilitiesService.remove(id);
  }
}
