// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalBuildings, totalUnits, totalBookings, occupiedUnits,
      todayCheckins, todayCheckouts, openIncidents, reviews, monthlyBookings,
    ] = await Promise.all([
      this.prisma.building.count({ where: { active: true } }),
      this.prisma.unit.count(),
      this.prisma.booking.count(),
      this.prisma.unit.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.booking.count({
        where: { checkInDate: { gte: todayStart, lt: todayEnd }, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }),
      this.prisma.booking.count({
        where: { checkOutDate: { gte: todayStart, lt: todayEnd }, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
      }),
      this.prisma.incident.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      }),
    ]);

    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

    return {
      totalBuildings, totalUnits, totalBookings, occupancyRate,
      revenueThisMonth: Number(monthlyBookings._sum.totalAmount || 0),
      todayCheckins, todayCheckouts, openIncidents,
      avgRating: reviews._avg.rating ? Math.round(reviews._avg.rating * 100) / 100 : 0,
      totalReviews: reviews._count,
    };
  }

  async getRevenueChart() {
    const now = new Date();
    const days14ago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        checkInDate: { lte: now },
        checkOutDate: { gte: days14ago },
      },
      select: { checkInDate: true, checkOutDate: true, totalAmount: true },
    });

    const result = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(days14ago.getTime() + i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

      let dailyRevenue = 0;
      bookings.forEach(b => {
        const cin = new Date(b.checkInDate);
        const cout = new Date(b.checkOutDate);
        const nights = Math.max(1, Math.ceil((cout.getTime() - cin.getTime()) / 86400000));
        const perNight = Number(b.totalAmount) / nights;
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const cinDate = new Date(cin.getFullYear(), cin.getMonth(), cin.getDate());
        const coutDate = new Date(cout.getFullYear(), cout.getMonth(), cout.getDate());
        if (checkDate >= cinDate && checkDate < coutDate) dailyRevenue += perNight;
      });

      result.push({ date: dateStr, label: i >= 7 ? (i === 13 ? 'Nay' : dayNames[date.getDay()]) : dayNames[date.getDay()], week: i < 7 ? 'prev' : 'now', revenue: Math.round(dailyRevenue) });
    }

    const lastWeek = result.slice(0, 7);
    const thisWeek = result.slice(7, 14);

    return {
      chartData: thisWeek.map((d, i) => ({ l: d.label, now: d.revenue, prev: lastWeek[i]?.revenue || 0, date: d.date })),
      totalThisWeek: thisWeek.reduce((s, d) => s + d.revenue, 0),
      totalLastWeek: lastWeek.reduce((s, d) => s + d.revenue, 0),
    };
  }

  // Khai bao luu tru — full BCA fields
  async getGuestDeclaration(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { gte: fromDate, lte: toDate },
      },
      include: {
        guest: {
          select: {
            firstName: true, lastName: true, email: true, phone: true,
            nationality: true, gender: true, dateOfBirth: true,
            idType: true, idNumber: true, idIssuedDate: true, idIssuedPlace: true, idExpiryDate: true,
            address: true, visaNumber: true, visaType: true, entryDate: true, entryPort: true,
          },
        },
        unit: { select: { name: true, building: { select: { name: true, address: true } } } },
        channel: { select: { name: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });

    return bookings.map((b, i) => ({
      stt: i + 1,
      guestName: `${b.guest.firstName} ${b.guest.lastName}`,
      gender: b.guest.gender || '',
      dateOfBirth: b.guest.dateOfBirth || null,
      nationality: b.guest.nationality || 'Viet Nam',
      idType: b.guest.idType || 'CCCD',
      idNumber: b.guest.idNumber || '',
      idIssuedDate: b.guest.idIssuedDate || null,
      idIssuedPlace: b.guest.idIssuedPlace || '',
      idExpiryDate: b.guest.idExpiryDate || null,
      address: b.guest.address || '',
      visaNumber: b.guest.visaNumber || '',
      visaType: b.guest.visaType || '',
      entryDate: b.guest.entryDate || null,
      entryPort: b.guest.entryPort || '',
      email: b.guest.email || '',
      phone: b.guest.phone || '',
      roomName: b.unit.name,
      buildingName: b.unit.building.name,
      buildingAddress: b.unit.building.address,
      checkIn: b.checkInDate,
      checkOut: b.checkOutDate,
      numGuests: b.numGuests,
      channel: b.channel?.name || 'Direct',
      bookingRef: b.channelRef || '',
    }));
  }

  async getBuildings() {
    return this.prisma.building.findMany({
      where: { active: true },
      include: {
        _count: { select: { units: true } },
        units: {
          select: { id: true, name: true, status: true, floor: true, type: true, capacity: true, basePrice: true, currency: true },
          orderBy: { name: 'asc' as const },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRecentBookings(limit = 10) {
    return this.prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true } },
        unit: { select: { name: true, building: { select: { name: true } } } },
        channel: { select: { name: true } },
      },
    });
  }

  async getOpenIncidents() {
    return this.prisma.incident.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        unit: { select: { name: true, building: { select: { name: true } } } },
        assignedStaff: { select: { name: true } },
      },
    });
  }
}
