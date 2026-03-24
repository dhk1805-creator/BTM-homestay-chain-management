import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../common/prisma.service';

function generateCheckinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'BTM-' + code;
}

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private bookingsService: BookingsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List bookings' })
  async findAll(
    @Query('status') status?: string,
    @Query('unitId') unitId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingsService.findAll({
      status,
      unitId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.bookingsService.updateStatus(id, body.status);
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking' })
  async create(@Body() data: any) {
    let checkinCode = data.channelRef || null;
    if (!checkinCode) {
      for (let attempt = 0; attempt < 5; attempt++) {
        checkinCode = generateCheckinCode();
        const existing = await this.prisma.booking.findFirst({ where: { channelRef: checkinCode } });
        if (!existing) break;
      }
    }

    return this.prisma.booking.create({
      data: {
        unitId: data.unitId,
        guestId: data.guestId,
        channelId: data.channelId,
        channelRef: checkinCode,
        status: data.status || 'PENDING',
        checkInDate: new Date(data.checkInDate),
        checkOutDate: new Date(data.checkOutDate),
        numGuests: data.numGuests || 1,
        totalAmount: data.totalAmount || '0',
        currency: data.currency || 'VND',
        specialRequests: data.specialRequests || null,
      },
    });
  }
}
