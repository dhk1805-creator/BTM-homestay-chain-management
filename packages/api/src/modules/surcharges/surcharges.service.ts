// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SurchargesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { bookingId?: string; unitId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (filters?.bookingId) where.bookingId = filters.bookingId;
    if (filters?.unitId) where.unitId = filters.unitId;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    return this.prisma.surcharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        unit: { select: { name: true, building: { select: { name: true } } } },
        booking: {
          select: {
            id: true,
            channelRef: true,
            guest: { select: { firstName: true, lastName: true } },
          },
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
    note?: string;
  }) {
    return this.prisma.surcharge.create({
      data: {
        bookingId: data.bookingId || null,
        unitId: data.unitId,
        type: data.type || 'OTHER',
        description: data.description || '',
        amount: data.amount,
        paidCash: data.paidCash !== undefined ? data.paidCash : true,
        note: data.note || null,
      },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.surcharge.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      include: {
        unit: { select: { name: true } },
      },
    });
  }

  // Bill chỉ gồm phụ phí tiền mặt — tiền phòng khách đã trả qua OTA
  async getBill(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { name: true, building: { select: { name: true, address: true } } } },
        channel: { select: { name: true, type: true } },
      },
    });

    if (!booking) return null;

    const surcharges = await this.prisma.surcharge.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    const totalSurcharges = surcharges.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalCash = surcharges.filter(s => s.paidCash).reduce((sum, s) => sum + Number(s.amount), 0);

    return {
      booking,
      surcharges,
      summary: {
        totalSurcharges,
        totalCash,
        totalItems: surcharges.length,
      },
    };
  }

  async getMonthlySummary(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const surcharges = await this.prisma.surcharge.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        unit: { select: { name: true } },
        booking: {
          select: {
            channelRef: true,
            guest: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalAmount = surcharges.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalCash = surcharges.filter(s => s.paidCash).reduce((sum, s) => sum + Number(s.amount), 0);

    const byType: Record<string, { count: number; total: number }> = {};
    surcharges.forEach(s => {
      if (!byType[s.type]) byType[s.type] = { count: 0, total: 0 };
      byType[s.type].count++;
      byType[s.type].total += Number(s.amount);
    });

    return {
      year,
      month,
      surcharges,
      summary: {
        totalRecords: surcharges.length,
        totalAmount,
        totalCash,
        byType,
      },
    };
  }

  async remove(id: string) {
    return this.prisma.surcharge.delete({ where: { id } });
  }
}
