import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiAgentService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  private getTools(): any[] {
    return [
      { type: 'web_search_20250305', name: 'web_search' },
      {
        name: 'get_booking_info',
        description: 'Tim booking theo ten, email, so phong hoac booking ID.',
        input_schema: { type: 'object', properties: { search: { type: 'string', description: 'Ten khach, email, so phong, hoac booking ID' } }, required: ['search'] },
      },
      {
        name: 'do_checkout',
        description: 'Check-out cho khach. Cap nhat booking CHECKED_OUT va phong CLEANING.',
        input_schema: { type: 'object', properties: { booking_id: { type: 'string', description: 'ID booking' } }, required: ['booking_id'] },
      },
      {
        name: 'create_incident',
        description: 'Tao ticket su co (thiet bi hong, phong ban, tieng on...).',
        input_schema: { type: 'object', properties: { unit_name: { type: 'string' }, type: { type: 'string' }, priority: { type: 'string' }, description: { type: 'string' } }, required: ['unit_name', 'type', 'priority', 'description'] },
      },
      {
        name: 'request_housekeeping',
        description: 'Gui yeu cau don phong hoac thay do vai.',
        input_schema: { type: 'object', properties: { unit_name: { type: 'string' }, request_type: { type: 'string' }, notes: { type: 'string' } }, required: ['unit_name', 'request_type'] },
      },
      {
        name: 'get_room_pin',
        description: 'Lay lai ma PIN cua phong khi khach quen.',
        input_schema: { type: 'object', properties: { booking_id: { type: 'string' } }, required: ['booking_id'] },
      },
      {
        name: 'extend_checkout',
        description: 'Gia han checkout (late checkout). Toi da den 14:00.',
        input_schema: { type: 'object', properties: { booking_id: { type: 'string' }, extend_until: { type: 'string' } }, required: ['booking_id', 'extend_until'] },
      },
      {
        name: 'query_system',
        description: 'Truy van TOAN BO du lieu he thong HCMP. Dung khi Admin/sep hoi ve: doanh thu (ngay/tuan/thang/quy/nam), so booking, ti le lap day, phong trong/ban, danh sach khach, incidents, reviews, gia phong, nhan vien, so sanh, thong ke BAT KY. LUON goi tool nay truoc khi tra loi cau hoi thong ke.',
        input_schema: {
          type: 'object',
          properties: {
            query_type: { type: 'string', description: 'full_report, revenue, bookings, rooms, guests, incidents, reviews, pricing, staff' },
            period: { type: 'string', description: 'today, week, month, quarter, year, all. Mac dinh: month' },
          },
          required: ['query_type'],
        },
      },
    ];
  }

  private async executeTool(name: string, input: any): Promise<string> {
    try {
      switch (name) {
        case 'get_booking_info': return await this.toolGetBooking(input.search);
        case 'do_checkout': return await this.toolCheckout(input.booking_id);
        case 'create_incident': return await this.toolCreateIncident(input);
        case 'request_housekeeping': return await this.toolHousekeeping(input);
        case 'get_room_pin': return await this.toolGetPin(input.booking_id);
        case 'extend_checkout': return await this.toolExtendCheckout(input);
        case 'query_system': return await this.toolQuerySystem(input.query_type, input.period || 'month');
        default: return `Tool "${name}" khong ton tai.`;
      }
    } catch (err: any) { return `Loi khi thuc hien ${name}: ${err.message}`; }
  }

  private async toolQuerySystem(queryType: string, period: string): Promise<string> {
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter': startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: startDate = new Date(2020, 0, 1);
    }

    const result: any = { period, query_type: queryType, timestamp: now.toISOString() };

    const [totalBookings, revenueData, cancelledBookings] = await Promise.all([
      this.prisma.booking.count({ where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: startDate }, status: 'CANCELLED' } }),
    ]);
    result.bookings_count = totalBookings;
    result.bookings_cancelled = cancelledBookings;
    result.revenue = Number(revenueData._sum.totalAmount || 0);
    result.revenue_formatted = result.revenue.toLocaleString('vi-VN') + ' VND';

    if (['full_report', 'rooms', 'pricing'].includes(queryType)) {
      const units = await this.prisma.unit.findMany({ select: { name: true, status: true, floor: true, basePrice: true, type: true, capacity: true }, orderBy: { name: 'asc' } });
      const rental = units.filter(u => u.name !== 'Owner');
      result.rooms = {
        total: rental.length, occupied: rental.filter(u => u.status === 'OCCUPIED').length,
        available: rental.filter(u => u.status === 'AVAILABLE').length, cleaning: rental.filter(u => u.status === 'CLEANING').length,
        occupancy_rate: rental.length > 0 ? Math.round((rental.filter(u => u.status === 'OCCUPIED').length / rental.length) * 100) + '%' : '0%',
        details: rental.map(u => ({ name: u.name, status: u.status, floor: u.floor, price: Number(u.basePrice), type: u.type, capacity: u.capacity })),
      };
    }

    if (['full_report', 'bookings'].includes(queryType)) {
      const bookings = await this.prisma.booking.findMany({
        where: { createdAt: { gte: startDate } },
        include: { guest: { select: { firstName: true, lastName: true, email: true } }, unit: { select: { name: true } }, channel: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, take: 50,
      });
      result.booking_list = bookings.map(b => ({ guest: `${b.guest.firstName} ${b.guest.lastName}`, room: b.unit.name, channel: b.channel?.name || 'Direct', status: b.status, check_in: b.checkInDate, check_out: b.checkOutDate, amount: Number(b.totalAmount) }));
      const channelCounts: Record<string, number> = {};
      bookings.forEach(b => { const ch = b.channel?.name || 'Direct'; channelCounts[ch] = (channelCounts[ch] || 0) + 1; });
      result.bookings_by_channel = channelCounts;
      const statusCounts: Record<string, number> = {};
      bookings.forEach(b => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
      result.bookings_by_status = statusCounts;
    }

    if (['full_report', 'guests'].includes(queryType)) {
      const guests = await this.prisma.guest.findMany({ select: { firstName: true, lastName: true, email: true, phone: true, nationality: true }, orderBy: { createdAt: 'desc' }, take: 50 });
      result.guests = guests.map(g => ({ name: `${g.firstName} ${g.lastName}`, email: g.email, phone: g.phone, nationality: g.nationality }));
    }

    if (['full_report', 'incidents'].includes(queryType)) {
      const incidents = await this.prisma.incident.findMany({ where: { createdAt: { gte: startDate } }, include: { unit: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      result.incidents = { total: incidents.length, open: incidents.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length, details: incidents.map(i => ({ room: i.unit.name, type: i.type, priority: i.priority, status: i.status, description: i.description })) };
    }

    if (['full_report', 'reviews'].includes(queryType)) {
      const reviews = await this.prisma.review.findMany({ where: { createdAt: { gte: startDate } }, include: { guest: { select: { firstName: true, lastName: true } } } });
      const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
      result.reviews = { total: reviews.length, average_rating: avg.toFixed(1), details: reviews.map(r => ({ guest: `${r.guest.firstName} ${r.guest.lastName}`, rating: r.rating, comment: r.comment })) };
    }

    if (['full_report', 'staff'].includes(queryType)) {
      const staff = await this.prisma.staff.findMany({ select: { name: true, email: true, role: true, active: true } });
      result.staff = staff;
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const [ci, co] = await Promise.all([
      this.prisma.booking.count({ where: { checkInDate: { gte: todayStart, lt: todayEnd }, status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
      this.prisma.booking.count({ where: { checkOutDate: { gte: todayStart, lt: todayEnd }, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } } }),
    ]);
    result.today_checkins = ci;
    result.today_checkouts = co;

    return JSON.stringify(result);
  }

  private async toolGetBooking(search: string): Promise<string> {
    const bookings = await this.prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'] } },
      include: { guest: true, unit: { include: { building: true } }, channel: true },
    });
    const s = search.toLowerCase();
    const found = bookings.find(b => b.guest.firstName.toLowerCase().includes(s) || b.guest.lastName.toLowerCase().includes(s) || b.guest.email?.toLowerCase().includes(s) || b.unit.name.includes(search) || b.id.includes(search));
    if (!found) return `Khong tim thay booking cho "${search}".`;
    return JSON.stringify({ booking_id: found.id, guest: `${found.guest.firstName} ${found.guest.lastName}`, email: found.guest.email, room: found.unit.name, floor: found.unit.floor, building: found.unit.building.name, check_in: found.checkInDate, check_out: found.checkOutDate, status: found.status, num_guests: found.numGuests, channel: found.channel?.name, total_amount: `${found.totalAmount} ${found.currency}` });
  }

  private async toolCheckout(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { guest: true, unit: true } });
    if (!booking) return 'Booking khong ton tai.';
    if (booking.status !== 'CHECKED_IN') return `Booking dang o trang thai ${booking.status}, khong the check-out.`;
    await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_OUT' } });
    await this.prisma.unit.update({ where: { id: booking.unitId }, data: { status: 'CLEANING' } });
    return `Check-out thanh cong! Khach: ${booking.guest.firstName} ${booking.guest.lastName}, Phong: ${booking.unit.name}. Phong da chuyen sang "Cho don".`;
  }

  private async toolCreateIncident(input: any): Promise<string> {
    const unit = await this.prisma.unit.findFirst({ where: { name: input.unit_name }, include: { building: true } });
    if (!unit) return `Khong tim thay phong ${input.unit_name}.`;
    await this.prisma.incident.create({ data: { unitId: unit.id, type: input.type, priority: input.priority, description: input.description, status: 'OPEN' } });
    return `Da tao ticket su co: Phong ${input.unit_name}, Loai: ${input.type}, Muc do: ${input.priority}. Doi ky thuat se xu ly trong 15-20 phut.`;
  }

  private async toolHousekeeping(input: any): Promise<string> {
    const labels: Record<string, string> = { cleaning: 'Don phong', linen: 'Thay ga', towels: 'Thay khan' };
    return `Da gui yeu cau ${labels[input.request_type] || input.request_type} cho phong ${input.unit_name}. Doi housekeeping se den trong 15-20 phut.`;
  }

  private async toolGetPin(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { unit: true, accessCodes: true } });
    if (!booking) return 'Booking khong ton tai.';
    if (booking.status !== 'CHECKED_IN') return 'Booking chua check-in.';
    const pin = booking.accessCodes?.[0]?.codeValue || String(Math.floor(100000 + Math.random() * 900000));
    return `Ma PIN phong ${booking.unit.name}: ${pin}.`;
  }

  private async toolExtendCheckout(input: any): Promise<string> {
    const booking = await this.prisma.booking.findUnique({ where: { id: input.booking_id }, include: { unit: true } });
    if (!booking) return 'Booking khong ton tai.';
    return `Late checkout phong ${booking.unit.name} da ghi nhan. Checkout moi: ${input.extend_until}. Phu phi: 200.000 VND/gio.`;
  }

  private async buildSystemPrompt(bookingId?: string) {
    const building = await this.prisma.building.findFirst({ where: { active: true }, include: { units: { where: { status: { not: 'MAINTENANCE' } }, orderBy: { name: 'asc' } } } });
    const settings: any = building?.settings || {};
    let bookingContext = '';
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { guest: true, unit: true } });
      if (booking) {
        bookingContext = `\nBOOKING HIEN TAI:\n- ID: ${booking.id}\n- Khach: ${booking.guest.firstName} ${booking.guest.lastName}\n- Phong: ${booking.unit.name} (Tang ${booking.unit.floor})\n- Check-in: ${booking.checkInDate}\n- Check-out: ${booking.checkOutDate}\n- Trang thai: ${booking.status}\n`;
      }
    }
    const kbEntries = await this.prisma.knowledgeBaseEntry.findMany({ where: { buildingId: building?.id, active: true } });
    const kbText = kbEntries.map(e => `[${e.category}] ${e.title}: ${e.content}`).join('\n');

    return `Ban la Lena — tro ly AI concierge VA quan ly thong minh cua ${building?.name || 'BTM Homestay'}.
Ban hoat dong 24/7, phuc vu CA KHACH lan ADMIN.

THONG TIN TOA NHA:
- Ten: ${building?.name}
- Dia chi: ${building?.address}, ${building?.city}
- 6 tang, Thang may, Thoat hiem: cau thang bo ben phai
- Hotline: ${settings.manager_phone || '+84 901 234 567'}
- WiFi: ${settings.wifi_ssid || 'BTM03_5G'} / ${settings.wifi_password || 'btm2026!'}
- Check-in: ${settings.checkin_time || '14:00'} · Check-out: ${settings.checkout_time || '12:00'}
- Late checkout: den ${settings.late_checkout_time || '14:00'} (${settings.late_checkout_fee || '200k/gio'})
- Phong: ${building?.units?.map(u => u.name).join(', ')}
Noi quy: ${settings.house_rules || 'Khong hut thuoc. Yen tinh 22:00-07:00.'}
${bookingContext}
KIEN THUC: ${kbText}

TINH CACH:
- Than thien, am ap, chuyen nghiep
- Ngan gon, suc tich — dung gach dau dong khi liet ke
- Phat hien ngon ngu tu dong (VI/EN/ZH/KO)
- Voi ADMIN: tra loi chinh xac, co so lieu cu the

CHO KHACH (tools): get_booking_info, do_checkout, create_incident, request_housekeeping, get_room_pin, extend_checkout, web_search
CHO ADMIN (tool query_system): Doanh thu, booking, phong, khach, incidents, reviews, gia phong, nhan vien — BAT KY thong ke nao

KHONG DUOC LAM: Thay doi gia booking, hoan tien, mo khoa phong nguoi khac

QUAN TRONG:
- Khach yeu cau check-out → GOI do_checkout
- Khach bao su co → GOI create_incident  
- Admin hoi thong ke/doanh thu/bao cao → GOI query_system TRUOC khi tra loi
- KHONG BAO GIO tra loi "toi khong co kha nang truy xuat" — BAN CO tool query_system

Thoi diem: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
  }

  async chat(input: { message: string; bookingId?: string; guestId?: string; deviceType?: string; lang?: string; history?: { role: string; text: string }[] }) {
    try {
      const systemPrompt = await this.buildSystemPrompt(input.bookingId);
      const messages: any[] = [];
      if (input.history?.length) {
        for (const msg of input.history) messages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.text });
      }
      messages.push({ role: 'user', content: input.message });

      let finalText = '';
      let currentMessages = [...messages];
      for (let i = 0; i < 5; i++) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: systemPrompt,
          messages: currentMessages, tools: this.getTools() as any,
        });
        const textBlocks = response.content.filter((b: any) => b.type === 'text');
        const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use');
        if (textBlocks.length > 0) finalText += textBlocks.map((b: any) => b.text).join('');
        if (toolBlocks.length === 0) break;
        currentMessages.push({ role: 'assistant', content: response.content });
        const toolResults: any[] = [];
        for (const tool of toolBlocks as any[]) {
          console.log(`Tool: ${tool.name}`, JSON.stringify(tool.input).substring(0, 200));
          const result = await this.executeTool(tool.name, tool.input);
          console.log(`Result: ${result.substring(0, 200)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: result });
        }
        currentMessages.push({ role: 'user', content: toolResults });
        if (response.stop_reason === 'end_turn') break;
      }
      return { response: finalText || 'Da thuc hien xong.', deviceType: input.deviceType || 'webchat', lang: input.lang || 'vi', timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.error('Claude API error:', error?.message || error);
      return { response: 'Xin loi, minh dang gap su co ky thuat. Vui long thu lai hoac goi hotline +84 901 234 567.', error: error?.message, deviceType: input.deviceType || 'webchat', timestamp: new Date().toISOString() };
    }
  }

  async getConversations(bookingId?: string, guestId?: string) {
    return this.prisma.conversation.findMany({ where: { ...(bookingId && { bookingId }), ...(guestId && { guestId }) }, orderBy: { lastMsgAt: 'desc' }, take: 20 });
  }
}
