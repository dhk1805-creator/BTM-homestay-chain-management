import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all buildings' })
  async findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get building detail' })
  async findOne(@Param('id') id: string) {
    return this.buildingsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create building' })
  async create(@Body() body: any) {
    return this.buildingsService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update building' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.buildingsService.update(id, body);
  }
}
