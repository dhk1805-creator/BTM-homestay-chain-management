import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PostStayService implements OnModuleInit {
  private timer: any;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Check for pending jobs every 30 seconds
    this.timer = setInterval(() => this.processJobs(), 30000);
    console.log('📬 Post-stay automation started (checking every 30s)');
  }

  // ============================================
  // CREATE JOBS AFTER CHECKOUT
  // ============================================
  async createPostStayJobs(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, unit: { include: { building: true } } },
    });

    if (!booking) return;

    const now = new Date();
    const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`;
    const buildingName = booking.unit.building.name;
    const roomName = booking.unit.name;

    // Generate referral code
    const referralCode = `BTM${Math.floor(1000 + Math.random() * 9000)}`;

    // Create referral in DB
    await this.prisma.referralCode.create({
      data: {
        guestId: booking.guest.id,
        code: referralCode,
        discountPct: 10,
        usesMax: 3,
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    // Job 1: Thank you email — immediately
    await this.prisma.postStayJob.create({
      data: {
        bookingId,
        jobType: 'thank_you_email',
        scheduledAt: now,
        channel: 'email',
        payload: {
          to: booking.guest.email,
          guestName,
          buildingName,
          roomName,
          subject: `Cảm ơn ${booking.guest.firstName} đã ở ${buildingName}! 🏠`,
          body: `Chào ${booking.guest.firstName},\n\nCảm ơn bạn đã chọn ${buildingName} cho chuyến đi Đà Nẵng!\n\nPhòng: ${roomName}\nCheck-in: ${booking.checkInDate.toLocaleDateString('vi-VN')}\nCheck-out: ${booking.checkOutDate.toLocaleDateString('vi-VN')}\n\nChúng mình hy vọng bạn đã có kỳ nghỉ tuyệt vời. Hẹn gặp lại! 😊\n\n— Lena & đội ngũ BTM Homestay`,
        },
      },
    });

    // Job 2: Review request — after 2 hours
    await this.prisma.postStayJob.create({
      data: {
        bookingId,
        jobType: 'review_request',
        scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        channel: 'email',
        payload: {
          to: booking.guest.email,
          guestName,
          buildingName,
          subject: `${booking.guest.firstName} ơi, đánh giá giúp mình nhé! ⭐`,
          body: `Chào ${booking.guest.firstName},\n\nBạn vừa checkout khỏi ${buildingName}. Mình rất muốn biết trải nghiệm của bạn!\n\n⭐ Hãy dành 1 phút đánh giá trên AirBnB nhé — mỗi review đều giúp mình cải thiện dịch vụ.\n\nLink review: https://airbnb.com/review (demo)\n\nCảm ơn bạn rất nhiều! 🙏\n\n— Lena`,
        },
      },
    });

    // Job 3: Referral code — after 6 hours
    await this.prisma.postStayJob.create({
      data: {
        bookingId,
        jobType: 'referral_code',
        scheduledAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        channel: 'email',
        payload: {
          to: booking.guest.email,
          guestName,
          buildingName,
          referralCode,
          subject: `🎁 Giảm 10% cho lần đặt phòng tiếp theo — dành riêng cho ${booking.guest.firstName}!`,
          body: `Chào ${booking.guest.firstName},\n\nĐể cảm ơn bạn đã ở ${buildingName}, mình tặng bạn mã giảm giá:\n\n🎁 Mã: ${referralCode}\n💰 Giảm: 10%\n📅 Hạn dùng: 90 ngày\n👥 Chia sẻ cho bạn bè: mỗi mã dùng được 3 lần\n\nĐặt phòng trực tiếp tại BTM Homestay để sử dụng mã nhé!\n\n— Lena & BTM Homestay`,
        },
      },
    });

    // Job 4: Satisfaction survey — after 24 hours
    await this.prisma.postStayJob.create({
      data: {
        bookingId,
        jobType: 'satisfaction_survey',
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        channel: 'email',
        payload: {
          to: booking.guest.email,
          guestName,
          buildingName,
          subject: `Khảo sát ngắn — giúp ${buildingName} tốt hơn 📋`,
          body: `Chào ${booking.guest.firstName},\n\nMình muốn hỏi nhanh 3 câu:\n\n1. Bạn đánh giá trải nghiệm tổng thể bao nhiêu điểm (1-5)?\n2. Điều gì bạn thích nhất?\n3. Điều gì mình cần cải thiện?\n\nTrả lời ngắn gọn qua email này nhé. Mọi ý kiến đều quý giá! 🙏\n\n— Lena`,
        },
      },
    });

    // Job 5: Re-booking suggestion — after 7 days
    await this.prisma.postStayJob.create({
      data: {
        bookingId,
        jobType: 'rebooking_suggestion',
        scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        channel: 'email',
        payload: {
          to: booking.guest.email,
          guestName,
          buildingName,
          referralCode,
          subject: `Nhớ Đà Nẵng không ${booking.guest.firstName}? 🏖️ Đặt phòng lại nào!`,
          body: `Chào ${booking.guest.firstName},\n\nĐã 1 tuần rồi nhỉ! Nhớ biển Mỹ Khê, nhớ Bà Nà, nhớ mì Quảng không? 😄\n\n${buildingName} luôn chào đón bạn quay lại!\n\n🎁 Dùng mã ${referralCode} để được giảm 10%.\n\nĐặt phòng ngay: https://btm-homestay.com (demo)\n\nHẹn gặp lại! 🏠\n\n— Lena`,
        },
      },
    });

    console.log(`📬 Created 5 post-stay jobs for booking ${bookingId} (${guestName})`);
    return { jobs: 5, referralCode };
  }

  // ============================================
  // PROCESS PENDING JOBS
  // ============================================
  async processJobs() {
    const now = new Date();
    const pendingJobs = await this.prisma.postStayJob.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      include: {
        booking: { include: { guest: true } },
      },
      take: 10,
    });

    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      const payload = job.payload as any;

      // MOCK: Log to console instead of sending email
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`📧 [MOCK EMAIL] ${job.jobType.toUpperCase()}`);
      console.log('═══════════════════════════════════════════');
      console.log(`To: ${payload.to}`);
      console.log(`Subject: ${payload.subject}`);
      console.log('---');
      console.log(payload.body);
      console.log('═══════════════════════════════════════════');
      console.log('');

      // Mark as sent
      await this.prisma.postStayJob.update({
        where: { id: job.id },
        data: { status: 'sent', sentAt: now },
      });
    }

    console.log(`📬 Processed ${pendingJobs.length} post-stay jobs`);
  }

  // ============================================
  // GET JOBS STATUS (for dashboard)
  // ============================================
  async getJobs(bookingId?: string) {
    return this.prisma.postStayJob.findMany({
      where: bookingId ? { bookingId } : undefined,
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      include: {
        booking: { select: { id: true, guest: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
  }
}
