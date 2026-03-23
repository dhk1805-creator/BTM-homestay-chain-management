import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(limit = 50) {
    return this.prisma.guest.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bookings: true, reviews: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.guest.findUnique({
      where: { id },
      include: {
        bookings: { orderBy: { checkInDate: 'desc' }, take: 10 },
        reviews: true,
        referralCodes: true,
      },
    });
  }
}
