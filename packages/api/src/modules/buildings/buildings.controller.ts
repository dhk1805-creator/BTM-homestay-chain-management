import { Controller, Get, Post, Put, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { PrismaService } from '../../common/prisma.service';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(
    private buildingsService: BuildingsService,
    private prisma: PrismaService,
  ) {}

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

  @Patch('units/:unitId/status')
  @ApiOperation({ summary: 'Update unit status (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE)' })
  async updateUnitStatus(
    @Param('unitId') unitId: string,
    @Body() body: { status: string },
  ) {
    return this.prisma.unit.update({
      where: { id: unitId },
      data: { status: body.status as any },
    });
  }
}
