// @ts-nocheck
import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurchargesService } from './surcharges.service';

@ApiTags('Surcharges')
@Controller('surcharges')
export class SurchargesController {
  constructor(private surchargesService: SurchargesService) {}

  @Get()
  @ApiOperation({ summary: 'List surcharges with optional filters' })
  async findAll(
    @Query('bookingId') bookingId?: string,
    @Query('unitId') unitId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.surchargesService.findAll({ bookingId, unitId, from, to });
  }

  @Post()
  @ApiOperation({ summary: 'Create a surcharge' })
  async create(
    @Body() body: {
      bookingId?: string;
      unitId: string;
      type: string;
      description?: string;
      amount: number;
      paidCash?: boolean;
      note?: string;
    },
  ) {
    return this.surchargesService.create(body);
  }

  @Get('bill/:bookingId')
  @ApiOperation({ summary: 'Get bill for a booking (room + surcharges)' })
  async getBill(@Param('bookingId') bookingId: string) {
    return this.surchargesService.getBill(bookingId);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly surcharges summary for tax' })
  async getMonthlySummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.surchargesService.getMonthlySummary(
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a surcharge' })
  async remove(@Param('id') id: string) {
    return this.surchargesService.remove(id);
  }
}
