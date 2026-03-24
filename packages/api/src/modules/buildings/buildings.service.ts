import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.building.findMany({
      where: { active: true },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            buildingId: true,
          },
        },
        _count: { select: { units: true, staff: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.building.findUnique({
      where: { id },
      include: {
        units: {
          select: {
            id: true, name: true, type: true, floor: true,
            capacity: true, basePrice: true, currency: true,
            status: true, photos: true,
          },
          orderBy: { name: 'asc' },
        },
        staff: {
          select: { id: true, name: true, email: true, role: true, active: true },
        },
        _count: { select: { units: true, staff: true } },
      },
    });
  }

  async create(data: any) {
    return this.prisma.building.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.building.update({ where: { id }, data });
  }
}
