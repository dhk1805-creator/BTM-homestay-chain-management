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
    const incident = await this.prisma.incident.create({ data });

    // Auto-create surcharge if description contains PHÍ
    if (data.description && data.description.includes('PHÍ:')) {
      try {
        // Extract amount from "PHÍ: 100.000đ" or "PHÍ: 200.000đ"
        const match = data.description.match(/PHÍ:\s*([\d.]+)/);
        if (match) {
          const amountStr = match[1].replace(/\./g, '');
          const amount = parseInt(amountStr);
          if (amount > 0) {
            let surchargeType = 'OTHER';
            if (data.type === 'HOUSEKEEPING' || data.type === 'LINEN_CHANGE') surchargeType = 'HOUSEKEEPING';
            else if (data.type === 'LATE_CHECKOUT') surchargeType = 'LATE_CHECKOUT';

            await this.prisma.surcharge.create({
              data: {
                bookingId: data.bookingId || null,
                unitId: data.unitId,
                type: surchargeType,
                description: data.description,
                amount: amount,
                paidCash: true,
              },
            });
          }
        }
      } catch (e) {
        // Silently fail — surcharge creation is best-effort
        console.error('Auto-create surcharge failed:', e);
      }
    }

    return incident;
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
