import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurchargesService } from './surcharges.service';

@ApiTags('Surcharges')
@Controller('surcharges')
export class SurchargesController {
  constructor(private surchargesService: SurchargesService) {}

  @Get()
  @ApiOperation({ summary: 'List surcharges with filters' })
  async findAll(
    @Query('bookingId') bookingId?: string,
    @Query('unitId') unitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.surchargesService.findAll({ bookingId, unitId, from, to });
  }

  @Get('bill/:bookingId')
  @ApiOperation({ summary: 'Get surcharge bill for a booking' })
  async getBill(@Param('bookingId') bookingId: string) {
    return this.surchargesService.getBillByBooking(bookingId);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly surcharge summary' })
  async getMonthlySummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    return this.surchargesService.getMonthlySummary(y, m);
  }

  @Post()
  @ApiOperation({ summary: 'Create a surcharge' })
  async create(@Body() data: any) {
    return this.surchargesService.create(data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a surcharge' })
  async delete(@Param('id') id: string) {
    return this.surchargesService.delete(id);
  }
}
