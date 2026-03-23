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
      totalBuildings,
      totalUnits,
      totalBookings,
      occupiedUnits,
      todayCheckins,
      todayCheckouts,
      openIncidents,
      reviews,
      monthlyBookings,
    ] = await Promise.all([
      this.prisma.building.count({ where: { active: true } }),
      this.prisma.unit.count(),
      this.prisma.booking.count(),
      this.prisma.unit.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.booking.count({
        where: {
          checkInDate: { gte: todayStart, lt: todayEnd },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      }),
      this.prisma.booking.count({
        where: {
          checkOutDate: { gte: todayStart, lt: todayEnd },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
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
      totalBuildings,
      totalUnits,
      totalBookings,
      occupancyRate,
      revenueThisMonth: Number(monthlyBookings._sum.totalAmount || 0),
      todayCheckins,
      todayCheckouts,
      openIncidents,
      avgRating: reviews._avg.rating ? Math.round(reviews._avg.rating * 100) / 100 : 0,
      totalReviews: reviews._count,
    };
  }

  async getBuildings() {
    return this.prisma.building.findMany({
      where: { active: true },
      include: {
        _count: { select: { units: true } },
       units: {
  select: { id: true, name: true, status: true, floor: true },
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
