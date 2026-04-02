import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SurchargesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { bookingId?: string; unitId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (query?.bookingId) where.bookingId = query.bookingId;
    if (query?.unitId) where.unitId = query.unitId;
    if (query?.from || query?.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    return this.prisma.surcharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            channelRef: true,
            checkInDate: true,
            checkOutDate: true,
            guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        unit: {
          select: { name: true, floor: true, building: { select: { name: true } } },
        },
      },
    });
  }

  async create(data: {
    bookingId?: string;
    unitId: string;
    type: string;
    description?: string;
    amount: number;
    paidCash?: boolean;
    staffNote?: string;
  }) {
    return this.prisma.surcharge.create({
      data: {
        bookingId: data.bookingId || null,
        unitId: data.unitId,
        type: data.type,
        description: data.description || null,
        amount: data.amount,
        paidCash: data.paidCash !== undefined ? data.paidCash : true,
        staffNote: data.staffNote || null,
      },
      include: {
        unit: { select: { name: true } },
        booking: { select: { guest: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async getBillByBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        unit: { include: { building: true } },
        channel: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const surcharges = await this.prisma.surcharge.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    const total = surcharges.reduce((s, sc) => s + Number(sc.amount), 0);

    return {
      booking: {
        id: booking.id,
        channelRef: booking.channelRef,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        roomAmount: Number(booking.totalAmount),
        channel: booking.channel?.name || 'Direct',
      },
      guest: {
        name: `${booking.guest.firstName} ${booking.guest.lastName}`,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      building: {
        name: booking.unit.building.name,
        address: `${booking.unit.building.address}, ${booking.unit.building.city}`,
      },
      room: booking.unit.name,
      surcharges: surcharges.map(sc => ({
        id: sc.id,
        type: sc.type,
        description: sc.description,
        amount: Number(sc.amount),
        paidCash: sc.paidCash,
        date: sc.createdAt,
      })),
      totalSurcharge: total,
      generatedAt: new Date().toISOString(),
    };
  }

  async getMonthlySummary(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const surcharges = await this.prisma.surcharge.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        booking: {
          select: {
            channelRef: true,
            guest: { select: { firstName: true, lastName: true } },
          },
        },
        unit: { select: { name: true } },
      },
    });

    const total = surcharges.reduce((s, sc) => s + Number(sc.amount), 0);
    const byType: Record<string, number> = {};
    surcharges.forEach(sc => {
      byType[sc.type] = (byType[sc.type] || 0) + Number(sc.amount);
    });

    return {
      year,
      month,
      count: surcharges.length,
      total,
      byType,
      items: surcharges.map(sc => ({
        id: sc.id,
        date: sc.createdAt,
        room: sc.unit.name,
        guest: sc.booking ? `${sc.booking.guest.firstName} ${sc.booking.guest.lastName}` : '—',
        bookingCode: sc.booking?.channelRef || '—',
        type: sc.type,
        description: sc.description,
        amount: Number(sc.amount),
        paidCash: sc.paidCash,
      })),
    };
  }

  async delete(id: string) {
    return this.prisma.surcharge.delete({ where: { id } });
  }
}
