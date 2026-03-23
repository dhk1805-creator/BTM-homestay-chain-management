import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.building.findMany({
      where: { active: true },
      include: {
        _count: { select: { units: true, staff: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        units: { orderBy: { name: 'asc' } },
        staff: { select: { id: true, name: true, email: true, role: true, phone: true } },
      },
    });
    if (!building) throw new NotFoundException('Building not found');
    return building;
  }

  async create(data: any) {
    return this.prisma.building.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.building.update({ where: { id }, data });
  }
}
