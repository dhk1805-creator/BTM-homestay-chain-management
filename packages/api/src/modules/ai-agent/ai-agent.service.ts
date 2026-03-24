// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiAgentService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ============================================
  // TOOL DEFINITIONS
  // ============================================
  private getTools(): any[] {
    return [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
      {
        name: 'get_booking_info',
        description: 'Láº¥y thÃ´ng tin booking cá»§a khÃ¡ch theo tÃªn, email, sá»‘ phÃ²ng hoáº·c booking ID. DÃ¹ng khi khÃ¡ch há»i vá» booking, phÃ²ng, check-in/out date.',
        input_schema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'TÃªn khÃ¡ch, email, sá»‘ phÃ²ng (vd: 2.2), hoáº·c booking ID' },
          },
          required: ['search'],
        },
      },
      {
        name: 'do_checkout',
        description: 'Thá»±c hiá»‡n check-out cho khÃ¡ch. Cáº­p nháº­t booking â†’ CHECKED_OUT vÃ  phÃ²ng â†’ CLEANING. DÃ¹ng khi khÃ¡ch yÃªu cáº§u check-out.',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID cá»§a booking cáº§n check-out' },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Táº¡o ticket sá»± cá»‘ (thiáº¿t bá»‹ há»ng, phÃ²ng báº©n, tiáº¿ng á»“n...). ThÃ´ng bÃ¡o cho quáº£n lÃ½.',
        input_schema: {
          type: 'object',
          properties: {
            unit_name: { type: 'string', description: 'Sá»‘ phÃ²ng (vd: 2.2, 4.1)' },
            type: { type: 'string', description: 'Loáº¡i: maintenance, noise, cleaning, security, other' },
            priority: { type: 'string', description: 'high, medium, low' },
            description: { type: 'string', description: 'MÃ´ táº£ sá»± cá»‘ chi tiáº¿t' },
          },
          required: ['unit_name', 'type', 'priority', 'description'],
        },
      },
      {
        name: 'request_housekeeping',
        description: 'Gá»­i yÃªu cáº§u dá»n phÃ²ng hoáº·c thay Ä‘á»“ váº£i (khÄƒn, ga, gá»‘i). Äá»™i housekeeping sáº½ Ä‘áº¿n trong 15-20 phÃºt.',
        input_schema: {
          type: 'object',
          properties: {
            unit_name: { type: 'string', description: 'Sá»‘ phÃ²ng (vd: 2.2)' },
            request_type: { type: 'string', description: 'cleaning (dá»n phÃ²ng), linen (thay Ä‘á»“ váº£i), towels (thay khÄƒn)' },
            notes: { type: 'string', description: 'Ghi chÃº thÃªm' },
          },
          required: ['unit_name', 'request_type'],
        },
      },
      {
        name: 'get_room_pin',
        description: 'Láº¥y láº¡i mÃ£ PIN cá»­a phÃ²ng khi khÃ¡ch quÃªn. Cáº§n xÃ¡c minh booking trÆ°á»›c.',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID booking Ä‘á»ƒ xÃ¡c minh' },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'extend_checkout',
        description: 'Gia háº¡n checkout (late checkout). Tá»‘i Ä‘a Ä‘áº¿n 14:00, phá»¥ phÃ­ 200.000 VND/giá».',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID booking' },
            extend_until: { type: 'string', description: 'Giá» mong muá»‘n, vd: 14:00' },
          },
          required: ['booking_id', 'extend_until'],
        },
      },
      {
        name: 'query_system',
        description: 'Truy van toan bo du lieu he thong: doanh thu, bookings, phong, khach, incidents, reviews, gia, nhan vien. Dung khi Admin hoi bat ky thong ke nao.',
        input_schema: {
          type: 'object',
          properties: {
            query_type: { type: 'string', description: 'Loai query: revenue | bookings | rooms | guests | incidents | reviews | staff | prices | all_stats' },
            period: { type: 'string', description: 'Khoang thoi gian: today | week | month | all' },
          },
          required: ['query_type'],
        },
      },
    ];
  }

  // ============================================
  // TOOL EXECUTION
  // ============================================
  private async executeTool(name: string, input: any): Promise<string> {
    try {
      switch (name) {
        case 'get_booking_info':
          return await this.toolGetBooking(input.search);
        case 'do_checkout':
          return await this.toolCheckout(input.booking_id);
        case 'create_incident':
          return await this.toolCreateIncident(input);
        case 'request_housekeeping':
          return await this.toolHousekeeping(input);
        case 'get_room_pin':
          return await this.toolGetPin(input.booking_id);
        case 'extend_checkout':
          return await this.toolExtendCheckout(input);
        case 'query_system':
          return await this.toolQuerySystem(input.query_type, input.period || 'month');
        default:
          return `Tool "${name}" khÃ´ng tá»“n táº¡i.`;
      }
    } catch (err: any) {
      return `Lá»—i khi thá»±c hiá»‡n ${name}: ${err.message}`;
    }
  }

  private async toolGetBooking(search: string): Promise<string> {
    const bookings = await this.prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      include: {
        guest: true,
        unit: { include: { building: true } },
        channel: true,
      },
    });

    const found = bookings.find(b =>
      b.guest.firstName.toLowerCase().includes(search.toLowerCase()) ||
      b.guest.lastName.toLowerCase().includes(search.toLowerCase()) ||
      b.guest.email?.toLowerCase().includes(search.toLowerCase()) ||
      b.unit.name.includes(search) ||
      b.id.includes(search) ||
      b.channelRef?.toLowerCase().includes(search.toLowerCase())
    );

    if (!found) return `KhÃ´ng tÃ¬m tháº¥y booking cho "${search}".`;

    return JSON.stringify({
      booking_id: found.id,
      guest: `${found.guest.firstName} ${found.guest.lastName}`,
      email: found.guest.email,
      phone: found.guest.phone,
      room: found.unit.name,
      floor: found.unit.floor,
      building: found.unit.building.name,
      check_in: found.checkInDate,
      check_out: found.checkOutDate,
      status: found.status,
      num_guests: found.numGuests,
      channel: found.channel?.name,
      total_amount: `${found.totalAmount} ${found.currency}`,
    });
  }

  private async toolCheckout(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, unit: { include: { building: true } } },
    });

    if (!booking) return 'Booking khÃ´ng tá»“n táº¡i.';
    if (booking.status !== 'CHECKED_IN') return `Booking Ä‘ang á»Ÿ tráº¡ng thÃ¡i ${booking.status}, khÃ´ng thá»ƒ check-out.`;

    await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_OUT' } });
    await this.prisma.unit.update({ where: { id: booking.unitId }, data: { status: 'CLEANING' } });

    return `âœ… Check-out phÃ²ng ${booking.unit.name} thÃ nh cÃ´ng! Tráº¡ng thÃ¡i: CHECKED_OUT. PhÃ²ng chuyá»ƒn sang CLEANING. KhÃ¡ch: ${booking.guest.firstName} ${booking.guest.lastName}.`;
  }

  private async toolCreateIncident(input: any): Promise<string> {
    const unit = await this.prisma.unit.findFirst({
      where: { name: input.unit_name },
      include: { building: true },
    });

    if (!unit) return `KhÃ´ng tÃ¬m tháº¥y phÃ²ng ${input.unit_name}.`;

    const incident = await this.prisma.incident.create({
      data: {
        unitId: unit.id,
        type: input.type,
        priority: input.priority,
        description: input.description,
        status: 'OPEN',
      },
    });

    return `âœ… ÄÃ£ táº¡o ticket sá»± cá»‘ #${incident.id.slice(0, 8)}.\nPhÃ²ng: ${input.unit_name}\nLoáº¡i: ${input.type}\nÆ¯u tiÃªn: ${input.priority}\nMÃ´ táº£: ${input.description}\nÄá»™i ká»¹ thuáº­t sáº½ xá»­ lÃ½ sá»›m nháº¥t.`;
  }

  private async toolHousekeeping(input: any): Promise<string> {
    const typeLabels: Record<string, string> = {
      cleaning: 'Dá»n phÃ²ng',
      linen: 'Thay ga, gá»‘i',
      towels: 'Thay khÄƒn táº¯m',
    };
    return `âœ… ÄÃ£ gá»­i yÃªu cáº§u ${typeLabels[input.request_type] || input.request_type} cho phÃ²ng ${input.unit_name}. ${input.notes ? `Ghi chÃº: ${input.notes}. ` : ''}Housekeeping sáº½ Ä‘áº¿n trong 15-20 phÃºt.`;
  }

  private async toolGetPin(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { unit: true, accessCodes: true },
    });

    if (!booking) return 'Booking khÃ´ng tá»“n táº¡i.';
    if (booking.status !== 'CHECKED_IN') return 'Booking chÆ°a check-in, khÃ´ng cÃ³ mÃ£ PIN.';

    const pin = booking.accessCodes?.[0]?.codeValue || String(Math.floor(100000 + Math.random() * 900000));
    return `ðŸ”‘ MÃ£ PIN phÃ²ng ${booking.unit.name}: ${pin}. MÃ£ cÃ³ hiá»‡u lá»±c Ä‘áº¿n khi check-out.`;
  }

  private async toolExtendCheckout(input: any): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.booking_id },
      include: { unit: true },
    });

    if (!booking) return 'Booking khÃ´ng tá»“n táº¡i.';
    return `âœ… Late checkout phÃ²ng ${booking.unit.name} Ä‘Ã£ Ä‘Æ°á»£c ghi nháº­n. Checkout má»›i: ${input.extend_until}. Phá»¥ phÃ­: 200.000 VND/giá». Tá»•ng phá»¥ phÃ­ sáº½ tÃ­nh khi checkout.`;
  }

  // ============================================
  // SYSTEM PROMPT
  // ============================================
  private async buildSystemPrompt(bookingId?: string) {
    const building = await this.prisma.building.findFirst({
      where: { active: true },
      include: { units: { where: { status: { not: 'MAINTENANCE' } }, orderBy: { name: 'asc' } } },
    });

    const settings: any = building?.settings || {};

    let bookingContext = '';
    if (bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { guest: true, unit: { include: { building: true } } },
      });
      if (booking) {
        bookingContext = `
BOOKING HIá»†N Táº I:
- ID: ${booking.id}
- KhÃ¡ch: ${booking.guest.firstName} ${booking.guest.lastName}
- PhÃ²ng: ${booking.unit.name} (Táº§ng ${booking.unit.floor})
- Check-in: ${booking.checkInDate.toLocaleDateString('vi-VN')}
- Check-out: ${booking.checkOutDate.toLocaleDateString('vi-VN')}
- Tráº¡ng thÃ¡i: ${booking.status}
- Sá»‘ khÃ¡ch: ${booking.numGuests}
`;
      }
    }

    const kbEntries = await this.prisma.knowledgeBaseEntry.findMany({
      where: { buildingId: building?.id, active: true },
    });
    const kbText = kbEntries.map(e => `[${e.category}] ${e.title}: ${e.content}`).join('\n');

    return `Báº¡n lÃ  Lena â€” trá»£ lÃ½ AI concierge cá»§a ${building?.name || 'BTM Homestay'}, thuá»™c chuá»—i BTM Homestay Chain.
Báº¡n hoáº¡t Ä‘á»™ng 24/7, thay tháº¿ hoÃ n toÃ n nhÃ¢n viÃªn lá»… tÃ¢n.

THÃ”NG TIN TÃ’A NHÃ€:
- TÃªn: ${building?.name}
- Äá»‹a chá»‰: ${building?.address}, ${building?.city}
- 6 táº§ng Â· Thang mÃ¡y Â· ThoÃ¡t hiá»ƒm: cáº§u thang bá»™ bÃªn pháº£i
- Hotline quáº£n lÃ½: ${settings.manager_phone || '+84 901 234 567'}
- WiFi: ${settings.wifi_ssid || 'BTM03_5G'} / Password: ${settings.wifi_password || 'btm2026!'}
- Check-in: ${settings.checkin_time || '14:00'} Â· Check-out: ${settings.checkout_time || '12:00'}
- Late checkout: Ä‘áº¿n ${settings.late_checkout_time || '14:00'} (${settings.late_checkout_fee || '200k/giá»'})
- PhÃ²ng: ${building?.units?.map(u => u.name).join(', ')}

Ná»™i quy: ${settings.house_rules || 'KhÃ´ng hÃºt thuá»‘c. YÃªn tÄ©nh 22:00-07:00.'}

${bookingContext}

KIáº¾N THá»¨C: ${kbText}

TÃNH CÃCH:
- ThÃ¢n thiá»‡n, áº¥m Ã¡p, chuyÃªn nghiá»‡p
- Ngáº¯n gá»n, sÃºc tÃ­ch â€” tráº£ lá»i tá»‘i Ä‘a 5-7 dÃ²ng, dÃ¹ng gáº¡ch Ä‘áº§u dÃ²ng
- PhÃ¡t hiá»‡n ngÃ´n ngá»¯ tá»± Ä‘á»™ng
- Káº¿t thÃºc má»—i lÆ°á»£t: há»i ngáº¯n xem khÃ¡ch cáº§n gÃ¬ thÃªm
- Sau khi khÃ¡ch check-in, Tá»° Äá»˜NG giá»›i thiá»‡u pháº¡m vi há»— trá»£

CÃ“ THá»‚ LÃ€M (qua tools):
âœ“ TÃ¬m booking (get_booking_info)
âœ“ Check-out cho khÃ¡ch (do_checkout) â€” Cáº¬P NHáº¬T THáº¬T trong database
âœ“ Táº¡o ticket sá»± cá»‘ (create_incident) â€” Cáº¬P NHáº¬T THáº¬T
âœ“ Gá»i housekeeping (request_housekeeping)
âœ“ Láº¥y mÃ£ PIN phÃ²ng (get_room_pin)
âœ“ Late checkout (extend_checkout)
âœ“ TÃ¬m kiáº¿m web (thá»i tiáº¿t, nhÃ  hÃ ng, du lá»‹ch, giÃ¡ vÃ©, thuÃª xe...)

KHÃ”NG ÄÆ¯á»¢C LÃ€M (escalate):
âœ— Thay Ä‘á»•i giÃ¡ booking
âœ— HoÃ n tiá»n / discount
âœ— Má»Ÿ khÃ³a phÃ²ng ngÆ°á»i khÃ¡c
âœ— Cam káº¿t sá»­a chá»¯a thá»i gian cá»¥ thá»ƒ

QUAN TRá»ŒNG: Khi khÃ¡ch yÃªu cáº§u check-out, HÃƒY Gá»ŒI TOOL do_checkout ngay. Khi khÃ¡ch bÃ¡o sá»± cá»‘, Gá»ŒI TOOL create_incident. Khi khÃ¡ch cáº§n dá»n phÃ²ng, Gá»ŒI TOOL request_housekeeping. KHÃ”NG chá»‰ tráº£ lá»i báº±ng lá»i.

Thá»i Ä‘iá»ƒm: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
  }

  // ============================================
  // MAIN CHAT (with tool calling loop)
  // ============================================
  async chat(input: {
    message: string;
    bookingId?: string;
    guestId?: string;
    deviceType?: string;
    lang?: string;
    history?: { role: string; text: string }[];
  }) {
    try {
      const systemPrompt = await this.buildSystemPrompt(input.bookingId);

      const messages: any[] = [];
      if (input.history && input.history.length > 0) {
        for (const msg of input.history) {
          messages.push({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text,
          });
        }
      }
      messages.push({ role: 'user', content: input.message });

      // Tool calling loop (max 5 iterations)
      let finalText = '';
      let currentMessages = [...messages];
      
      for (let i = 0; i < 5; i++) {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: systemPrompt,
          messages: currentMessages,
          tools: this.getTools() as any,
        });

        // Collect text and tool_use blocks
        const textBlocks = response.content.filter((b: any) => b.type === 'text');
        const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use');

        if (textBlocks.length > 0) {
          finalText += textBlocks.map((b: any) => b.text).join('');
        }

        // If no tool calls, we're done
        if (toolBlocks.length === 0) break;

        // Execute tools and continue conversation
        const assistantContent = response.content;
        currentMessages.push({ role: 'assistant', content: assistantContent });

        const toolResults: any[] = [];
        for (const tool of toolBlocks) {
          console.log(`ðŸ”§ Tool call: ${tool.name}`, JSON.stringify(tool.input));
          const result = await this.executeTool(tool.name, tool.input);
          console.log(`âœ… Tool result: ${result.substring(0, 100)}...`);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: result,
          });
        }

        currentMessages.push({ role: 'user', content: toolResults });

        // If stop_reason is end_turn after tools, get final response
        if (response.stop_reason === 'end_turn') break;
      }

      return {
        response: finalText || 'ÄÃ£ thá»±c hiá»‡n xong.',
        deviceType: input.deviceType || 'webchat',
        lang: input.lang || 'vi',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Claude API error:', error?.message || error);
      return {
        response: 'Xin lá»—i, mÃ¬nh Ä‘ang gáº·p sá»± cá»‘ ká»¹ thuáº­t. Vui lÃ²ng thá»­ láº¡i hoáº·c gá»i hotline +84 901 234 567.',
        error: error?.message,
        deviceType: input.deviceType || 'webchat',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getConversations(bookingId?: string, guestId?: string) {
    return this.prisma.conversation.findMany({
      where: {
        ...(bookingId && { bookingId }),
        ...(guestId && { guestId }),
      },
      orderBy: { lastMsgAt: 'desc' },
      take: 20,
    });
  }

  private async toolQuerySystem(queryType: string, period: string): Promise<string> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ps = period === 'today' ? todayStart : period === 'week' ? weekStart : period === 'month' ? monthStart : new Date(0);
    try {
      if (queryType === 'revenue' || queryType === 'all_stats') {
        const rev = await this.prisma.booking.aggregate({ _sum: { totalAmount: true }, _count: true, where: { createdAt: { gte: ps }, status: { not: 'CANCELLED' } } });
        const ci = await this.prisma.booking.count({ where: { status: 'CHECKED_IN' } });
        const tu = await this.prisma.unit.count({ where: { name: { not: 'Owner' } } });
        const oc = await this.prisma.unit.count({ where: { status: 'OCCUPIED' } });
        if (queryType === 'revenue') return JSON.stringify({ revenue: Number(rev._sum.totalAmount||0), bookings: rev._count, period, checkedIn: ci, occupancy: oc+'/'+tu });
        const inc = await this.prisma.incident.count({ where: { status: { in: ['OPEN','IN_PROGRESS'] } } });
        const rv = await this.prisma.review.aggregate({ _avg: { rating: true }, _count: true });
        const bks = await this.prisma.booking.findMany({ where: { createdAt: { gte: ps } }, include: { guest: true, unit: true }, orderBy: { createdAt: 'desc' }, take: 20 });
        const rms = await this.prisma.unit.findMany({ where: { name: { not: 'Owner' } }, select: { name: true, status: true, floor: true, type: true, basePrice: true } });
        return JSON.stringify({ revenue: Number(rev._sum.totalAmount||0), bookingCount: rev._count, period, checkedIn: ci, occupancy: oc+'/'+tu, openIncidents: inc, avgRating: rv._avg.rating, totalReviews: rv._count, bookings: bks.map(b=>({guest:(b.guest?.firstName||'')+' '+(b.guest?.lastName||''),room:b.unit?.name,status:b.status,amount:Number(b.totalAmount)})), rooms: rms });
      }
      if (queryType === 'bookings') {
        const bks = await this.prisma.booking.findMany({ where: { createdAt: { gte: ps } }, include: { guest: true, unit: true, channel: true }, orderBy: { createdAt: 'desc' }, take: 30 });
        return JSON.stringify(bks.map(b=>({guest:(b.guest?.firstName||'')+' '+(b.guest?.lastName||''),room:b.unit?.name,status:b.status,amount:Number(b.totalAmount),channel:b.channel?.name,checkIn:b.checkInDate,checkOut:b.checkOutDate,ref:b.channelRef})));
      }
      if (queryType === 'rooms') {
        const rms = await this.prisma.unit.findMany({ where: { name: { not: 'Owner' } }, select: { name: true, status: true, floor: true, type: true, basePrice: true, capacity: true } });
        return JSON.stringify(rms);
      }
      if (queryType === 'guests') {
        const gs = await this.prisma.booking.findMany({ where: { status: 'CHECKED_IN' }, include: { guest: true, unit: true } });
        return JSON.stringify({ checkedInCount: gs.length, guests: gs.map(b=>({name:(b.guest?.firstName||'')+' '+(b.guest?.lastName||''),room:b.unit?.name,checkOut:b.checkOutDate})) });
      }
      if (queryType === 'incidents') {
        const incs = await this.prisma.incident.findMany({ include: { unit: true, assignedStaff: true }, orderBy: { createdAt: 'desc' }, take: 20 });
        return JSON.stringify(incs.map(i=>({desc:i.description,room:i.unit?.name,status:i.status,priority:i.priority,staff:i.assignedStaff?.name})));
      }
      if (queryType === 'reviews') {
        const rvs = await this.prisma.review.findMany({ include: { guest: true }, orderBy: { createdAt: 'desc' }, take: 20 });
        return JSON.stringify(rvs.map(r=>({guest:(r.guest?.firstName||'')+' '+(r.guest?.lastName||''),rating:r.rating,comment:r.comment})));
      }
      if (queryType === 'staff') {
        const st = await this.prisma.staff.findMany({ select: { name: true, email: true, role: true, active: true } });
        return JSON.stringify(st);
      }
      if (queryType === 'prices') {
        const us = await this.prisma.unit.findMany({ where: { name: { not: 'Owner' } }, select: { name: true, type: true, basePrice: true, capacity: true, floor: true } });
        return JSON.stringify(us);
      }
      return JSON.stringify({ error: 'Unknown query type' });
    } catch (e: any) { return JSON.stringify({ error: e.message }); }
  }

}
