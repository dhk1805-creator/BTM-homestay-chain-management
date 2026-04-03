import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.incident.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        unit: { select: { name: true, building: { select: { name: true } } } },
        booking: { select: { id: true, guest: { select: { firstName: true, lastName: true } } } },
        assignedStaff: { select: { name: true } },
      },
    });
  }

  async create(data: { unitId: string; bookingId?: string; type: string; priority: string; description: string }) {
    return this.prisma.incident.create({ data });
  }

  async updateStatus(id: string, status: string, assignedTo?: string) {
    return this.prisma.incident.update({
      where: { id },
      data: {
        status: status as any,
        ...(assignedTo && { assignedTo }),
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });
  }
}
