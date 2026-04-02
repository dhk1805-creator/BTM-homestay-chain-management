import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; unitId?: string; limit?: number; channelId?: string }) {
    return this.prisma.booking.findMany({
      take: query?.limit || 50,
      where: {
        ...(query?.status && { status: query.status as any }),
        ...(query?.unitId && { unitId: query.unitId }),
        ...(query?.channelId && { channelId: query.channelId }),
      },
      orderBy: { checkInDate: 'desc' },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true, floor: true, building: { select: { name: true, settings: true } } } },
        channel: { select: { id: true, name: true } },
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

  // Validate no overlapping active bookings on same unit
  // Allows future bookings if dates don't overlap (e.g. guest in 1-20/4, new guest books 21/4-1/5)
  async validateNoOverlap(unitId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string) {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        unitId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
        // Overlap: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
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

  // === NEW: Update booking details (dates, price, room, numGuests) ===
  async updateBooking(id: string, data: { checkInDate?: string; checkOutDate?: string; totalAmount?: string; unitId?: string; numGuests?: number; specialRequests?: string }) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { unit: true } });
    if (!booking) throw new NotFoundException('Booking not found');

    const updateData: any = {};

    // Update dates
    if (data.checkInDate) updateData.checkInDate = new Date(data.checkInDate);
    if (data.checkOutDate) updateData.checkOutDate = new Date(data.checkOutDate);

    // Validate new dates don't overlap
    const newCheckIn = updateData.checkInDate || booking.checkInDate;
    const newCheckOut = updateData.checkOutDate || booking.checkOutDate;
    if (new Date(newCheckOut) <= new Date(newCheckIn)) {
      throw new BadRequestException('Ngày check-out phải sau check-in');
    }

    // Change room
    if (data.unitId && data.unitId !== booking.unitId) {
      await this.validateNoOverlap(data.unitId, newCheckIn, newCheckOut, id);
      updateData.unitId = data.unitId;

      // If currently checked in, update old unit to CLEANING and new unit to OCCUPIED
      if (booking.status === 'CHECKED_IN') {
        await this.prisma.unit.update({ where: { id: booking.unitId }, data: { status: 'CLEANING' } });
        await this.prisma.unit.update({ where: { id: data.unitId }, data: { status: 'OCCUPIED' } });
      }
    } else {
      // Same unit — validate overlap excluding self
      await this.validateNoOverlap(data.unitId || booking.unitId, newCheckIn, newCheckOut, id);
    }

    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.numGuests !== undefined) updateData.numGuests = data.numGuests;
    if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;

    return this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        guest: { select: { firstName: true, lastName: true } },
        unit: { select: { name: true } },
        channel: { select: { name: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    if (status === 'CHECKED_IN') {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { unit: true },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      if (booking.status === 'CHECKED_IN') {
        throw new ConflictException('Booking này đã được check-in rồi.');
      }
      if (booking.status !== 'CONFIRMED') {
        throw new BadRequestException(
          `Không thể check-in: booking đang ở trạng thái "${booking.status}". Cần xác nhận (CONFIRMED) trước.`
        );
      }

      // Only block if ANOTHER booking is checked in on same unit
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

    if (status === 'CHECKED_IN') {
      await this.prisma.unit.update({
        where: { id: updated.unitId },
        data: { status: 'OCCUPIED' },
      });
    } else if (status === 'CHECKED_OUT') {
      // Check if another booking is waiting on this unit
      const nextBooking = await this.prisma.booking.findFirst({
        where: { unitId: updated.unitId, status: 'CHECKED_IN', id: { not: id } },
      });
      if (!nextBooking) {
        await this.prisma.unit.update({
          where: { id: updated.unitId },
          data: { status: 'CLEANING' },
        });
      }
    }

    return updated;
  }
}
