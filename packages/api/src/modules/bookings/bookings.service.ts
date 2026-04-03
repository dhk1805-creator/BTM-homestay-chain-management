// @ts-nocheck
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { status?: string; unitId?: string; limit?: number; channelId?: string }) {
    const bookings = await this.prisma.booking.findMany({
      take: query?.limit || 50,
      where: {
        ...(query?.status && { status: query.status as any }),
        ...(query?.unitId && { unitId: query.unitId }),
        ...(query?.channelId && { channelId: query.channelId }),
      },
      orderBy: { checkInDate: 'desc' },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        unit: { select: { id: true, name: true, floor: true, building: { select: { name: true, settings: true } } } },
        channel: { select: { id: true, name: true } },
      },
    });

    const guestIds = [...new Set(bookings.map(b => b.guest.id))];
    const guestCounts = await this.prisma.booking.groupBy({
      by: ['guestId'],
      where: { guestId: { in: guestIds }, status: { not: 'CANCELLED' } },
      _count: true,
    });
    const countMap: Record<string, number> = {};
    guestCounts.forEach(gc => { countMap[gc.guestId] = gc._count; });

    return bookings.map(b => ({ ...b, guestBookingCount: countMap[b.guest.id] || 1 }));
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true, unit: { include: { building: true, smartLock: true } },
        channel: true, checkin: true, checkout: true,
        accessCodes: true, incidents: true, conversations: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async validateNoOverlap(unitId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string) {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        unitId, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        ...(excludeBookingId && { id: { not: excludeBookingId } }),
        checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate },
      },
      include: { guest: { select: { firstName: true, lastName: true } }, unit: { select: { name: true } } },
    });
    if (overlapping) {
      throw new ConflictException(
        `Phòng ${overlapping.unit.name} đã có booking (${overlapping.guest.firstName} ${overlapping.guest.lastName}, ${new Date(overlapping.checkInDate).toLocaleDateString('vi-VN')}→${new Date(overlapping.checkOutDate).toLocaleDateString('vi-VN')}, trạng thái: ${overlapping.status}).`
      );
    }
  }

  async updateBooking(id: string, data: { checkInDate?: string; checkOutDate?: string; totalAmount?: string; unitId?: string; numGuests?: number; specialRequests?: string }) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { unit: true } });
    if (!booking) throw new NotFoundException('Booking not found');
    const updateData: any = {};
    if (data.checkInDate) updateData.checkInDate = new Date(data.checkInDate);
    if (data.checkOutDate) updateData.checkOutDate = new Date(data.checkOutDate);
    const newCheckIn = updateData.checkInDate || booking.checkInDate;
    const newCheckOut = updateData.checkOutDate || booking.checkOutDate;
    if (new Date(newCheckOut) <= new Date(newCheckIn)) throw new BadRequestException('Ngày check-out phải sau check-in');

    if (data.unitId && data.unitId !== booking.unitId) {
      await this.validateNoOverlap(data.unitId, newCheckIn, newCheckOut, id);
      updateData.unitId = data.unitId;
      if (booking.status === 'CHECKED_IN') {
        await this.prisma.unit.update({ where: { id: booking.unitId }, data: { status: 'CLEANING' } });
        await this.prisma.unit.update({ where: { id: data.unitId }, data: { status: 'OCCUPIED' } });
      }
    } else {
      await this.validateNoOverlap(data.unitId || booking.unitId, newCheckIn, newCheckOut, id);
    }

    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.numGuests !== undefined) updateData.numGuests = data.numGuests;
    if (data.specialRequests !== undefined) updateData.specialRequests = data.specialRequests;

    return this.prisma.booking.update({
      where: { id }, data: updateData,
      include: { guest: { select: { firstName: true, lastName: true } }, unit: { select: { name: true } }, channel: { select: { name: true } } },
    });
  }

  async updateStatus(id: string, status: string) {
    if (status === 'CHECKED_IN') {
      const booking = await this.prisma.booking.findUnique({ where: { id }, include: { unit: true } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === 'CHECKED_IN') throw new ConflictException('Booking này đã được check-in rồi.');
      if (booking.status !== 'CONFIRMED') throw new BadRequestException(`Không thể check-in: booking đang ở trạng thái "${booking.status}". Cần xác nhận trước.`);

      // Validate ngày check-in: không cho check-in sớm hơn ngày booking (cho phép sớm 3h, tức từ 11:00 nếu check-in 14:00)
      const now = new Date();
      const checkInDate = new Date(booking.checkInDate);
      const earliestCheckin = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate(), 0, 0, 0); // 00:00 ngày check-in
      if (now < earliestCheckin) {
        const cinStr = checkInDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        throw new BadRequestException(`Chưa đến ngày check-in. Booking này check-in ngày ${cinStr}. Vui lòng quay lại đúng ngày.`);
      }

      // Validate không check-in sau ngày checkout
      const checkOutDate = new Date(booking.checkOutDate);
      if (now >= checkOutDate) {
        throw new BadRequestException('Booking này đã quá hạn check-in (đã qua ngày check-out).');
      }

      if (booking.unit.status === 'OCCUPIED') {
        const activeBooking = await this.prisma.booking.findFirst({
          where: { unitId: booking.unitId, status: 'CHECKED_IN', id: { not: id } },
          include: { guest: { select: { firstName: true, lastName: true } } },
        });
        if (activeBooking) throw new ConflictException(`Phòng ${booking.unit.name} đang có khách (${activeBooking.guest.firstName} ${activeBooking.guest.lastName}). Cần check-out trước.`);
      }
    }

    if (status === 'CHECKED_OUT') {
      const booking = await this.prisma.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === 'CHECKED_OUT') throw new ConflictException('Booking này đã được check-out rồi.');
      if (booking.status !== 'CHECKED_IN') throw new BadRequestException(`Không thể check-out: booking đang ở trạng thái "${booking.status}". Cần check-in trước.`);
    }

    const updated = await this.prisma.booking.update({
      where: { id }, data: { status: status as any }, include: { unit: true },
    });

    if (status === 'CHECKED_IN') {
      await this.prisma.unit.update({ where: { id: updated.unitId }, data: { status: 'OCCUPIED' } });

      // Auto-create checkin record
      try {
        await this.prisma.checkin.create({ data: { bookingId: id, verifiedBy: 'admin' } });
      } catch (e) { /* checkin already exists */ }
    } else if (status === 'CHECKED_OUT') {
      // Auto-create checkout record
      try {
        await this.prisma.checkout.create({
          data: { bookingId: id, verifiedBy: 'admin', paymentSettled: true, roomOk: true },
        });
      } catch (e) { /* checkout already exists */ }

      // Update unit status
      const nextBooking = await this.prisma.booking.findFirst({
        where: { unitId: updated.unitId, status: 'CHECKED_IN', id: { not: id } },
      });
      if (!nextBooking) {
        await this.prisma.unit.update({ where: { id: updated.unitId }, data: { status: 'CLEANING' } });
      }
    }

    return updated;
  }
}
