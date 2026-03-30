import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; unitId?: string; limit?: number }) {
    return this.prisma.booking.findMany({
      take: query?.limit || 50,
      where: {
        ...(query?.status && { status: query.status as any }),
        ...(query?.unitId && { unitId: query.unitId }),
      },
      orderBy: { checkInDate: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true, floor: true, building: { select: { name: true, settings: true } } } },
        channel: { select: { name: true } },
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        unit: { include: { building: true, smartLock: true } },
        channel: true,
        checkin: true,
        checkout: true,
        accessCodes: true,
        incidents: true,
        conversations: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // === Issue #8: Validate no overlapping active bookings on same unit ===
  async validateNoOverlap(unitId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string) {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        unitId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
        // Overlap condition: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        unit: { select: { name: true } },
      },
    });
    if (overlapping) {
      const guestName = `${overlapping.guest.firstName} ${overlapping.guest.lastName}`;
      const unitName = overlapping.unit.name;
      const cin = new Date(overlapping.checkInDate).toLocaleDateString('vi-VN');
      const cout = new Date(overlapping.checkOutDate).toLocaleDateString('vi-VN');
      throw new ConflictException(
        `Phòng ${unitName} đã có booking (${guestName}, ${cin}→${cout}, trạng thái: ${overlapping.status}). Không thể tạo booking trùng ngày.`
      );
    }
  }

  async updateStatus(id: string, status: string) {
    // === Issue #8: Validate before check-in ===
    if (status === 'CHECKED_IN') {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { unit: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      // Prevent double check-in: only CONFIRMED bookings can be checked in
      if (booking.status === 'CHECKED_IN') {
        throw new ConflictException('Booking này đã được check-in rồi.');
      }
      if (booking.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Không thể check-in: booking đang ở trạng thái "${booking.status}". Cần xác nhận (CONFIRMED) trước.`
        );
      }

      // Prevent check-in if unit already OCCUPIED by another booking
      if (booking.unit.status === 'OCCUPIED') {
        const activeBooking = await this.prisma.booking.findFirst({
          where: {
            unitId: booking.unitId,
            status: 'CHECKED_IN',
            id: { not: id },
          },
          include: { guest: { select: { firstName: true, lastName: true } } },
        });
        if (activeBooking) {
          throw new ConflictException(
            `Phòng ${booking.unit.name} đang có khách (${activeBooking.guest.firstName} ${activeBooking.guest.lastName}). Cần check-out trước.`
          );
        }
      }
    }

    // === Issue #8: Validate before check-out ===
    if (status === 'CHECKED_OUT') {
      const booking = await this.prisma.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === 'CHECKED_OUT') {
        throw new ConflictException('Booking này đã được check-out rồi.');
      }
      if (booking.status !== 'CHECKED_IN') {
        throw new BadRequestException(
          `Không thể check-out: booking đang ở trạng thái "${booking.status}". Cần check-in trước.`
        );
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: status as any },
      include: { unit: true },
    });

    // Sync unit status
    if (status === 'CHECKED_IN') {
      await this.prisma.unit.update({
        where: { id: updated.unitId },
        data: { status: 'OCCUPIED' },
      });
    } else if (status === 'CHECKED_OUT') {
      await this.prisma.unit.update({
        where: { id: updated.unitId },
        data: { status: 'CLEANING' },
      });
    }

    return updated;
  }
}
