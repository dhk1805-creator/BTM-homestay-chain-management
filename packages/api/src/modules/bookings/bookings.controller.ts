import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../common/prisma.service';

function generateCheckinCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private bookingsService: BookingsService,
    private prisma: PrismaService,
  ) {}

  @Get('channels')
  @ApiOperation({ summary: 'List all booking channels' })
  async listChannels() {
    return this.prisma.channel.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List bookings' })
  async findAll(
    @Query('status') status?: string,
    @Query('unitId') unitId?: string,
    @Query('limit') limit?: string,
    @Query('channelId') channelId?: string,
  ) {
    return this.bookingsService.findAll({
      status,
      unitId,
      channelId,
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

  // === NEW: Update booking details (dates, price, room, guests) ===
  @Patch(':id')
  @ApiOperation({ summary: 'Update booking details' })
  async updateBooking(@Param('id') id: string, @Body() body: any) {
    return this.bookingsService.updateBooking(id, body);
  }

  @Post()
  @ApiOperation({ summary: 'Create new booking' })
  async create(@Body() data: any) {
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);
    await this.bookingsService.validateNoOverlap(data.unitId, checkInDate, checkOutDate);

    let checkinCode = data.channelRef || null;
    if (!checkinCode) {
      for (let attempt = 0; attempt < 10; attempt++) {
        checkinCode = generateCheckinCode();
        const existing = await this.prisma.booking.findFirst({ where: { channelRef: checkinCode } });
        if (!existing) break;
      }
    } else {
      const existingCode = await this.prisma.booking.findFirst({
        where: { channelRef: checkinCode, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
      });
      if (existingCode) {
        for (let attempt = 0; attempt < 10; attempt++) {
          checkinCode = generateCheckinCode();
          const existing = await this.prisma.booking.findFirst({ where: { channelRef: checkinCode } });
          if (!existing) break;
        }
      }
    }

    return this.prisma.booking.create({
      data: {
        unitId: data.unitId,
        guestId: data.guestId,
        channelId: data.channelId,
        channelRef: checkinCode,
        status: data.status || 'PENDING',
        checkInDate,
        checkOutDate,
        numGuests: data.numGuests || 1,
        totalAmount: data.totalAmount || '0',
        currency: data.currency || 'VND',
        specialRequests: data.specialRequests || null,
      },
    });
  }
}
