import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('buildings')
  @ApiOperation({ summary: 'Get buildings with unit counts' })
  async getBuildings() {
    return this.dashboardService.getBuildings();
  }

  @Get('bookings/recent')
  @ApiOperation({ summary: 'Get recent bookings' })
  async getRecentBookings(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentBookings(limit ? parseInt(limit) : 10);
  }

  @Get('incidents/open')
  @ApiOperation({ summary: 'Get open incidents' })
  async getOpenIncidents() {
    return this.dashboardService.getOpenIncidents();
  }
}
