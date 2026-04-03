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

  // Real revenue chart data — last 14 days from actual bookings
  async getRevenueChart() {
    const now = new Date();
    const days14ago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);

    // Get all non-cancelled bookings that overlap with last 14 days
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { not: 'CANCELLED' },
        checkInDate: { lte: now },
        checkOutDate: { gte: days14ago },
      },
      select: {
        checkInDate: true,
        checkOutDate: true,
        totalAmount: true,
        channelId: true,
        channel: { select: { name: true, type: true } },
      },
    });

    // Build 14-day array
    const result = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(days14ago.getTime() + i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayLabel = dayNames[date.getDay()];

      let dailyRevenue = 0;
      let dailySurcharges = 0;

      // Calculate revenue: distribute totalAmount evenly across stay nights
      bookings.forEach(b => {
        const cin = new Date(b.checkInDate);
        const cout = new Date(b.checkOutDate);
        const nights = Math.max(1, Math.ceil((cout.getTime() - cin.getTime()) / 86400000));
        const perNight = Number(b.totalAmount) / nights;

        // Check if this date falls within the booking stay
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const cinDate = new Date(cin.getFullYear(), cin.getMonth(), cin.getDate());
        const coutDate = new Date(cout.getFullYear(), cout.getMonth(), cout.getDate());

        if (checkDate >= cinDate && checkDate < coutDate) {
          dailyRevenue += perNight;
        }
      });

      result.push({
        date: dateStr,
        label: i >= 7 ? (i === 13 ? 'Nay' : dayLabel) : dayLabel,
        week: i < 7 ? 'prev' : 'now',
        revenue: Math.round(dailyRevenue),
      });
    }

    // Split into this week vs last week
    const lastWeek = result.slice(0, 7);
    const thisWeek = result.slice(7, 14);

    const chartData = thisWeek.map((d, i) => ({
      l: d.label,
      now: d.revenue,
      prev: lastWeek[i]?.revenue || 0,
      date: d.date,
    }));

    const totalThisWeek = thisWeek.reduce((s, d) => s + d.revenue, 0);
    const totalLastWeek = lastWeek.reduce((s, d) => s + d.revenue, 0);

    return {
      chartData,
      totalThisWeek,
      totalLastWeek,
    };
  }

  // Get surcharges for revenue chart (daily cash income)
  async getSurchargesChart() {
    const now = new Date();
    const days7ago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    try {
      const surcharges = await this.prisma.surcharge.findMany({
        where: {
          createdAt: { gte: days7ago },
          paidCash: true,
        },
        select: { amount: true, createdAt: true },
      });

      const dailyMap: Record<string, number> = {};
      surcharges.forEach(s => {
        const dateStr = new Date(s.createdAt).toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + Number(s.amount);
      });

      return dailyMap;
    } catch (e) {
      return {};
    }
  }

  // Khai bao luu tru — guest declaration for police
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
        guest: true,
        unit: { select: { name: true, building: { select: { name: true, address: true } } } },
        channel: { select: { name: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });

    return bookings.map((b, i) => ({
      stt: i + 1,
      guestName: `${b.guest.firstName} ${b.guest.lastName}`,
      nationality: b.guest.nationality || 'Viet Nam',
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
          select: {
            id: true, name: true, status: true, floor: true,
            type: true, capacity: true, basePrice: true, currency: true,
          },
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
