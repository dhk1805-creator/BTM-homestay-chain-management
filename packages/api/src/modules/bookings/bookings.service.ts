import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; unitId?: string; limit?: number }) {
    return this.prisma.booking.findMany({
      take: query?.limit || 50,
      where: {
        ...(query?.status && { status: query.status as any }),
        ...(query?.unitId && { unitId: query.unitId }),
      },
      orderBy: { checkInDate: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { name: true, floor: true, building: { select: { name: true, settings: true } } } },
        channel: { select: { name: true } },
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        unit: { include: { building: true, smartLock: true } },
        channel: true,
        checkin: true,
        checkout: true,
        accessCodes: true,
        incidents: true,
        conversations: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateStatus(id: string, status: string) {
    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status: status as any },
      include: { unit: true },
    });

    // Sync unit status
    if (status === 'CHECKED_IN') {
      await this.prisma.unit.update({
        where: { id: booking.unitId },
        data: { status: 'OCCUPIED' },
      });
    } else if (status === 'CHECKED_OUT') {
      await this.prisma.unit.update({
        where: { id: booking.unitId },
        data: { status: 'CLEANING' },
      });
    }

    return booking;
  }
}
