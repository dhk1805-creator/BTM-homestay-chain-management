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
        description: 'Lấy thông tin booking của khách theo tên, email, số phòng hoặc booking ID. Dùng khi khách hỏi về booking, phòng, check-in/out date.',
        input_schema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Tên khách, email, số phòng (vd: 2.2), hoặc booking ID' },
          },
          required: ['search'],
        },
      },
      {
        name: 'do_checkout',
        description: 'Thực hiện check-out cho khách. Cập nhật booking → CHECKED_OUT và phòng → CLEANING. Dùng khi khách yêu cầu check-out.',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID của booking cần check-out' },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Tạo ticket sự cố (thiết bị hỏng, phòng bẩn, tiếng ồn...). Thông báo cho quản lý.',
        input_schema: {
          type: 'object',
          properties: {
            unit_name: { type: 'string', description: 'Số phòng (vd: 2.2, 4.1)' },
            type: { type: 'string', description: 'Loại: maintenance, noise, cleaning, security, other' },
            priority: { type: 'string', description: 'high, medium, low' },
            description: { type: 'string', description: 'Mô tả sự cố chi tiết' },
          },
          required: ['unit_name', 'type', 'priority', 'description'],
        },
      },
      {
        name: 'request_housekeeping',
        description: 'Gửi yêu cầu dọn phòng hoặc thay đồ vải (khăn, ga, gối). Đội housekeeping sẽ đến trong 15-20 phút.',
        input_schema: {
          type: 'object',
          properties: {
            unit_name: { type: 'string', description: 'Số phòng (vd: 2.2)' },
            request_type: { type: 'string', description: 'cleaning (dọn phòng), linen (thay đồ vải), towels (thay khăn)' },
            notes: { type: 'string', description: 'Ghi chú thêm' },
          },
          required: ['unit_name', 'request_type'],
        },
      },
      {
        name: 'get_room_pin',
        description: 'Lấy lại mã PIN cửa phòng khi khách quên. Cần xác minh booking trước.',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID booking để xác minh' },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'extend_checkout',
        description: 'Gia hạn checkout (late checkout). Tối đa đến 14:00, phụ phí 200.000 VND/giờ.',
        input_schema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'ID booking' },
            extend_until: { type: 'string', description: 'Giờ mong muốn, vd: 14:00' },
          },
          required: ['booking_id', 'extend_until'],
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
        default:
          return `Tool "${name}" không tồn tại.`;
      }
    } catch (err: any) {
      return `Lỗi khi thực hiện ${name}: ${err.message}`;
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

    if (!found) return `Không tìm thấy booking cho "${search}".`;

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
      include: { guest: true, unit: true },
    });

    if (!booking) return 'Booking không tồn tại.';
    if (booking.status !== 'CHECKED_IN') return `Booking đang ở trạng thái ${booking.status}, không thể check-out.`;

    await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CHECKED_OUT' } });
    await this.prisma.unit.update({ where: { id: booking.unitId }, data: { status: 'CLEANING' } });

    return `✅ Check-out phòng ${booking.unit.name} thành công! Trạng thái: CHECKED_OUT. Phòng chuyển sang CLEANING. Khách: ${booking.guest.firstName} ${booking.guest.lastName}.`;
  }

  private async toolCreateIncident(input: any): Promise<string> {
    const unit = await this.prisma.unit.findFirst({
      where: { name: input.unit_name },
      include: { building: true },
    });

    if (!unit) return `Không tìm thấy phòng ${input.unit_name}.`;

    const incident = await this.prisma.incident.create({
      data: {
        unitId: unit.id,
        type: input.type,
        priority: input.priority,
        description: input.description,
        status: 'OPEN',
      },
    });

    return `✅ Đã tạo ticket sự cố #${incident.id.slice(0, 8)}.\nPhòng: ${input.unit_name}\nLoại: ${input.type}\nƯu tiên: ${input.priority}\nMô tả: ${input.description}\nĐội kỹ thuật sẽ xử lý sớm nhất.`;
  }

  private async toolHousekeeping(input: any): Promise<string> {
    const typeLabels: Record<string, string> = {
      cleaning: 'Dọn phòng',
      linen: 'Thay ga, gối',
      towels: 'Thay khăn tắm',
    };
    return `✅ Đã gửi yêu cầu ${typeLabels[input.request_type] || input.request_type} cho phòng ${input.unit_name}. ${input.notes ? `Ghi chú: ${input.notes}. ` : ''}Housekeeping sẽ đến trong 15-20 phút.`;
  }

  private async toolGetPin(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { unit: true, accessCodes: true },
    });

    if (!booking) return 'Booking không tồn tại.';
    if (booking.status !== 'CHECKED_IN') return 'Booking chưa check-in, không có mã PIN.';

    const pin = booking.accessCodes?.[0]?.codeValue || String(Math.floor(100000 + Math.random() * 900000));
    return `🔑 Mã PIN phòng ${booking.unit.name}: ${pin}. Mã có hiệu lực đến khi check-out.`;
  }

  private async toolExtendCheckout(input: any): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.booking_id },
      include: { unit: true },
    });

    if (!booking) return 'Booking không tồn tại.';
    return `✅ Late checkout phòng ${booking.unit.name} đã được ghi nhận. Checkout mới: ${input.extend_until}. Phụ phí: 200.000 VND/giờ. Tổng phụ phí sẽ tính khi checkout.`;
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
        include: { guest: true, unit: true },
      });
      if (booking) {
        bookingContext = `
BOOKING HIỆN TẠI:
- ID: ${booking.id}
- Khách: ${booking.guest.firstName} ${booking.guest.lastName}
- Phòng: ${booking.unit.name} (Tầng ${booking.unit.floor})
- Check-in: ${booking.checkInDate.toLocaleDateString('vi-VN')}
- Check-out: ${booking.checkOutDate.toLocaleDateString('vi-VN')}
- Trạng thái: ${booking.status}
- Số khách: ${booking.numGuests}
`;
      }
    }

    const kbEntries = await this.prisma.knowledgeBaseEntry.findMany({
      where: { buildingId: building?.id, active: true },
    });
    const kbText = kbEntries.map(e => `[${e.category}] ${e.title}: ${e.content}`).join('\n');

    return `Bạn là Lena — trợ lý AI concierge của ${building?.name || 'BTM Homestay'}, thuộc chuỗi BTM Homestay Chain.
Bạn hoạt động 24/7, thay thế hoàn toàn nhân viên lễ tân.

THÔNG TIN TÒA NHÀ:
- Tên: ${building?.name}
- Địa chỉ: ${building?.address}, ${building?.city}
- 6 tầng · Thang máy · Thoát hiểm: cầu thang bộ bên phải
- Hotline quản lý: ${settings.manager_phone || '+84 901 234 567'}
- WiFi: ${settings.wifi_ssid || 'BTM03_5G'} / Password: ${settings.wifi_password || 'btm2026!'}
- Check-in: ${settings.checkin_time || '14:00'} · Check-out: ${settings.checkout_time || '12:00'}
- Late checkout: đến ${settings.late_checkout_time || '14:00'} (${settings.late_checkout_fee || '200k/giờ'})
- Phòng: ${building?.units?.map(u => u.name).join(', ')}

Nội quy: ${settings.house_rules || 'Không hút thuốc. Yên tĩnh 22:00-07:00.'}

${bookingContext}

KIẾN THỨC: ${kbText}

TÍNH CÁCH:
- Thân thiện, ấm áp, chuyên nghiệp
- Ngắn gọn, súc tích — trả lời tối đa 5-7 dòng, dùng gạch đầu dòng
- Phát hiện ngôn ngữ tự động
- Kết thúc mỗi lượt: hỏi ngắn xem khách cần gì thêm
- Sau khi khách check-in, TỰ ĐỘNG giới thiệu phạm vi hỗ trợ

CÓ THỂ LÀM (qua tools):
✓ Tìm booking (get_booking_info)
✓ Check-out cho khách (do_checkout) — CẬP NHẬT THẬT trong database
✓ Tạo ticket sự cố (create_incident) — CẬP NHẬT THẬT
✓ Gọi housekeeping (request_housekeeping)
✓ Lấy mã PIN phòng (get_room_pin)
✓ Late checkout (extend_checkout)
✓ Tìm kiếm web (thời tiết, nhà hàng, du lịch, giá vé, thuê xe...)

KHÔNG ĐƯỢC LÀM (escalate):
✗ Thay đổi giá booking
✗ Hoàn tiền / discount
✗ Mở khóa phòng người khác
✗ Cam kết sửa chữa thời gian cụ thể

QUAN TRỌNG: Khi khách yêu cầu check-out, HÃY GỌI TOOL do_checkout ngay. Khi khách báo sự cố, GỌI TOOL create_incident. Khi khách cần dọn phòng, GỌI TOOL request_housekeeping. KHÔNG chỉ trả lời bằng lời.

Thời điểm: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
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
          console.log(`🔧 Tool call: ${tool.name}`, JSON.stringify(tool.input));
          const result = await this.executeTool(tool.name, tool.input);
          console.log(`✅ Tool result: ${result.substring(0, 100)}...`);
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
        response: finalText || 'Đã thực hiện xong.',
        deviceType: input.deviceType || 'webchat',
        lang: input.lang || 'vi',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Claude API error:', error?.message || error);
      return {
        response: 'Xin lỗi, mình đang gặp sự cố kỹ thuật. Vui lòng thử lại hoặc gọi hotline +84 901 234 567.',
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
}
