import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';

@ApiTags('Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Get()
  @ApiOperation({ summary: 'List incidents' })
  async findAll(@Query('status') status?: string) {
    return this.incidentsService.findAll(status);
  }

  @Post()
  @ApiOperation({ summary: 'Create incident' })
  async create(@Body() body: { unitId: string; bookingId?: string; type: string; priority: string; description: string }) {
    return this.incidentsService.create(body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update incident status' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string; assignedTo?: string }) {
    return this.incidentsService.updateStatus(id, body.status, body.assignedTo);
  }
}
