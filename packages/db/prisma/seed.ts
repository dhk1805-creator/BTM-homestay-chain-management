import { PrismaClient, UnitType, UnitStatus, BookingStatus, StaffRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Seeding HCMP database...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'btm-homestay' },
    update: {},
    create: {
      name: 'BTM Homestay Chain',
      slug: 'btm-homestay',
      settings: {
        defaultCurrency: 'VND',
        defaultLang: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      },
    },
  });
  console.log('✅ Organization:', org.name);

  // 2. Building — BTM 03 Đà Nẵng (6 tầng)
  const building = await prisma.building.create({
    data: {
      orgId: org.id,
      name: 'BTM 03 - Đà Nẵng',
      address: 'No.03 An Nhơn 15, An Hải Bắc',
      city: 'Đà Nẵng',
      lat: 16.0544,
      lng: 108.2022,
      description: 'Tòa nhà 6 tầng gần biển Mỹ Khê. 10 căn hộ cho thuê (tầng 2-6), tiện nghi đầy đủ.',
      amenities: ['WiFi', 'Điều hòa', 'Bếp đầy đủ', 'Máy giặt', 'Ban công', 'Giữ xe', 'Thang máy', 'Tủ lạnh'],
      settings: {
        wifi_ssid: 'BTM03_5G',
        wifi_password: 'btm2026!',
        checkin_time: '14:00',
        checkout_time: '12:00',
        early_checkin_time: '11:00',
        late_checkout_time: '14:00',
        late_checkout_fee: '200000 VND/giờ',
        escalation_eta_minutes: 15,
        ai_name: 'Lena',
        manager_phone: '+84901234567',
        house_rules: [
          'Không hút thuốc trong phòng (phạt 500.000đ)',
          'Giờ yên tĩnh 22:00 - 07:00',
          'Không tổ chức tiệc',
          'Thú cưng cần báo trước và đặt cọc thêm',
          'Giữ vệ sinh chung khu vực hành lang và thang máy',
        ].join('\n'),
        total_floors: 6,
        rental_floors: '2-6',
        owner_unit: 'Tầng 1',
      },
    },
  });
  console.log('✅ Building:', building.name);

  // 3. Units — 11 căn hộ
  // Tầng 2-6: mỗi tầng 2 căn (x.1 và x.2) = 10 căn cho thuê
  // + 1 căn chủ ở tầng 1
  const unitConfigs = [
    // Tầng 2 — Studio
    { name: '2.1', type: UnitType.STUDIO,    floor: 2, capacity: 2, basePrice: 550000,  status: UnitStatus.AVAILABLE },
    { name: '2.2', type: UnitType.STUDIO,    floor: 2, capacity: 2, basePrice: 550000,  status: UnitStatus.OCCUPIED },
    // Tầng 3 — Studio
    { name: '3.1', type: UnitType.STUDIO,    floor: 3, capacity: 2, basePrice: 600000,  status: UnitStatus.AVAILABLE },
    { name: '3.2', type: UnitType.STUDIO,    floor: 3, capacity: 2, basePrice: 600000,  status: UnitStatus.AVAILABLE },
    // Tầng 4 — Apartment
    { name: '4.1', type: UnitType.APARTMENT, floor: 4, capacity: 4, basePrice: 800000,  status: UnitStatus.AVAILABLE },
    { name: '4.2', type: UnitType.APARTMENT, floor: 4, capacity: 4, basePrice: 800000,  status: UnitStatus.CLEANING },
    // Tầng 5 — Apartment
    { name: '5.1', type: UnitType.APARTMENT, floor: 5, capacity: 4, basePrice: 850000,  status: UnitStatus.AVAILABLE },
    { name: '5.2', type: UnitType.APARTMENT, floor: 5, capacity: 4, basePrice: 850000,  status: UnitStatus.OCCUPIED },
    // Tầng 6 — Suite (view đẹp)
    { name: '6.1', type: UnitType.SUITE,     floor: 6, capacity: 6, basePrice: 1200000, status: UnitStatus.AVAILABLE },
    { name: '6.2', type: UnitType.SUITE,     floor: 6, capacity: 6, basePrice: 1200000, status: UnitStatus.AVAILABLE },
    // Tầng 1 — Căn chủ ở (MAINTENANCE = ẩn khỏi booking)
    { name: 'Owner', type: UnitType.APARTMENT, floor: 1, capacity: 0, basePrice: 0, status: UnitStatus.MAINTENANCE },
  ];

  const units: any[] = [];
  for (const cfg of unitConfigs) {
    const unit = await prisma.unit.create({
      data: { buildingId: building.id, currency: 'VND', ...cfg },
    });
    units.push(unit);
  }
  const rentalUnits = units.filter(u => u.name !== 'Owner');
  console.log('✅ Units:', units.length, 'total (10 cho thuê + 1 chủ ở)');

  // 4. Smart Locks cho 10 căn cho thuê
  for (const unit of rentalUnits) {
    await prisma.smartLock.create({
      data: {
        unitId: unit.id,
        provider: 'ttlock',
        deviceId: `TTL-BTM03-${unit.name.replace('.', '')}`,
        model: 'TTLock Pro 3S',
        online: true,
      },
    });
  }
  console.log('✅ Smart Locks: 10 devices');

  // 5. Staff
  await prisma.staff.create({
    data: {
      orgId: org.id,
      name: 'Admin HCMP',
      email: 'admin@btm-homestay.com',
      password: hashPassword('Admin@123'),
      phone: '+84900000001',
      role: StaffRole.CHAIN_ADMIN,
    },
  });

  await prisma.staff.create({
    data: {
      orgId: org.id,
      buildingId: building.id,
      name: 'Nguyễn Văn Quản Lý',
      email: 'manager@btm-homestay.com',
      password: hashPassword('Admin@123'),
      phone: '+84901234567',
      role: StaffRole.BUILDING_MANAGER,
    },
  });

  const housekeeper = await prisma.staff.create({
    data: {
      orgId: org.id,
      buildingId: building.id,
      name: 'Trần Thị Dọn Phòng',
      email: 'housekeeping@btm-homestay.com',
      password: hashPassword('Admin@123'),
      phone: '+84909876543',
      role: StaffRole.HOUSEKEEPING,
    },
  });
  console.log('✅ Staff: admin + manager + housekeeping');

  // 6. Channels
  const channels = await Promise.all([
    prisma.channel.create({ data: { name: 'AirBnB', type: 'ota' } }),
    prisma.channel.create({ data: { name: 'Booking.com', type: 'ota' } }),
    prisma.channel.create({ data: { name: 'Direct', type: 'direct' } }),
    prisma.channel.create({ data: { name: 'Agoda', type: 'ota' } }),
    prisma.channel.create({ data: { name: 'Zalo/Facebook', type: 'social' } }),
  ]);
  console.log('✅ Channels:', channels.length);

  // 7. Demo guests + bookings
  const guest1 = await prisma.guest.create({
    data: { orgId: org.id, firstName: 'Minh', lastName: 'Nguyễn', email: 'minh.nguyen@gmail.com', phone: '+84912345678', nationality: 'VN', preferredLang: 'vi' },
  });
  const guest2 = await prisma.guest.create({
    data: { orgId: org.id, firstName: 'James', lastName: 'Wilson', email: 'james.wilson@outlook.com', phone: '+61400123456', nationality: 'AU', preferredLang: 'en', airbnbRating: 4.8 },
  });
  const guest3 = await prisma.guest.create({
    data: { orgId: org.id, firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@yahoo.co.jp', phone: '+81901234567', nationality: 'JP', preferredLang: 'en' },
  });
  const guest4 = await prisma.guest.create({
    data: { orgId: org.id, firstName: 'Lan', lastName: 'Trần', email: 'lan.tran@gmail.com', phone: '+84987654321', nationality: 'VN', preferredLang: 'vi' },
  });

  // Booking 1: Minh đang ở 2.2 (CHECKED_IN)
  await prisma.booking.create({
    data: {
      unitId: units[1].id, guestId: guest1.id, channelId: channels[0].id,
      channelRef: 'ABNB-2026-0312', status: BookingStatus.CHECKED_IN,
      checkInDate: new Date('2026-03-21T14:00:00+07:00'),
      checkOutDate: new Date('2026-03-25T12:00:00+07:00'),
      numGuests: 2, totalAmount: 2200000, specialRequests: 'Extra pillows',
    },
  });

  // Booking 2: James sắp check-in 5.2 (CONFIRMED)
  await prisma.booking.create({
    data: {
      unitId: units[7].id, guestId: guest2.id, channelId: channels[0].id,
      channelRef: 'ABNB-2026-0315', status: BookingStatus.CONFIRMED,
      checkInDate: new Date('2026-03-24T14:00:00+07:00'),
      checkOutDate: new Date('2026-03-28T12:00:00+07:00'),
      numGuests: 1, totalAmount: 3400000,
    },
  });

  // Booking 3: Yuki đặt 6.1 tuần tới (CONFIRMED)
  await prisma.booking.create({
    data: {
      unitId: units[8].id, guestId: guest3.id, channelId: channels[1].id,
      channelRef: 'BDC-2026-8821', status: BookingStatus.CONFIRMED,
      checkInDate: new Date('2026-03-27T14:00:00+07:00'),
      checkOutDate: new Date('2026-03-30T12:00:00+07:00'),
      numGuests: 2, totalAmount: 3600000, specialRequests: 'Late check-in ~21:00',
    },
  });

  // Booking 4: Lan đã checkout 4.1 (CHECKED_OUT)
  const pastBooking = await prisma.booking.create({
    data: {
      unitId: units[4].id, guestId: guest4.id, channelId: channels[2].id,
      status: BookingStatus.CHECKED_OUT,
      checkInDate: new Date('2026-03-18T14:00:00+07:00'),
      checkOutDate: new Date('2026-03-21T12:00:00+07:00'),
      numGuests: 3, totalAmount: 2400000,
    },
  });

  await prisma.review.create({
    data: {
      bookingId: pastBooking.id, guestId: guest4.id, channel: 'airbnb',
      rating: 5, comment: 'Phòng sạch đẹp, AI concierge rất tiện lợi! Sẽ quay lại.', published: true,
    },
  });
  console.log('✅ Guests: 4 | Bookings: 4 | Reviews: 1');

  // 8. Knowledge Base (15 entries)
  const kbEntries = [
    { category: 'faq', title: 'WiFi', content: 'Mạng WiFi: BTM03_5G\nMật khẩu: btm2026!\nNếu yếu, thử BTM03_2G.' },
    { category: 'faq', title: 'Giờ check-in/out', content: 'Check-in: từ 14:00\nCheck-out: trước 12:00\nEarly check-in (từ 11:00): miễn phí nếu phòng trống\nLate checkout: 200k/giờ, tối đa 14:00' },
    { category: 'faq', title: 'Giặt đồ', content: 'Máy giặt tầng 1 cạnh thang máy. Bột giặt có sẵn.' },
    { category: 'faq', title: 'Đỗ xe', content: 'Xe máy: tầng 1 miễn phí. Ô tô: bãi xe 50m (25k/ngày).' },
    { category: 'faq', title: 'Rác', content: 'Thùng rác cuối hành lang mỗi tầng. Phân loại: xanh=tái chế, đen=rác thường.' },
    { category: 'device_guide', title: 'Điều hòa', content: 'Remote gắn tường. ON/OFF → COOL → 24-26°C. Tắt khi ra ngoài.' },
    { category: 'device_guide', title: 'TV', content: 'Smart TV có YouTube, Netflix. Remote trên bàn. Cast qua Chromecast.' },
    { category: 'device_guide', title: 'Bếp', content: 'Bếp từ 2 vùng nấu. Bật công tắc tổng bên phải. Nồi chảo tủ dưới, gia vị tủ trên.' },
    { category: 'device_guide', title: 'Bình nóng lạnh', content: 'Công tắc đèn đỏ trong phòng tắm. Đợi 5-10 phút. Tắt sau khi dùng.' },
    { category: 'local_info', title: 'Cà phê', content: 'The Workshop 300m · Cộng Cà Phê 500m · 43 Factory 800m' },
    { category: 'local_info', title: 'Nhà hàng', content: 'Bún chả cá Thu 200m · Mì Quảng Bà Vị 400m · Pizza 4Ps 1.5km' },
    { category: 'local_info', title: 'Biển', content: 'Biển Mỹ Khê 800m (đi bộ 10 phút). Đẹp nhất sáng sớm & chiều tối.' },
    { category: 'local_info', title: 'Siêu thị', content: 'Vinmart+ 150m · Big C 2km · Pharmacity 200m · ATM VCB 100m' },
    { category: 'local_info', title: 'Di chuyển', content: 'Sân bay ĐN: 5km/15p/80-100k. Hội An: 30km/250k grab.' },
    { category: 'house_rules', title: 'Nội quy', content: 'Không hút thuốc (phạt 500k). Yên tĩnh 22:00-07:00. Không tiệc. Khóa cửa khi ra.' },
  ];
  for (const entry of kbEntries) {
    await prisma.knowledgeBaseEntry.create({ data: { buildingId: building.id, ...entry } });
  }
  console.log('✅ Knowledge Base:', kbEntries.length, 'entries');

  // 9. Demo incident
  await prisma.incident.create({
    data: {
      unitId: units[5].id, type: 'maintenance', status: 'OPEN', priority: 'medium',
      description: 'Điều hòa phòng 4.2 kêu to, cần kiểm tra gas',
      assignedTo: housekeeper.id,
    },
  });
  console.log('✅ Incidents: 1');

  console.log('\n🎉 Seeding hoàn tất!');
  console.log('   🛏️  10 phòng cho thuê: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2');
  console.log('   🏠 1 căn chủ ở: tầng 1');
  console.log('   📧 admin@btm-homestay.com / Admin@123');
  console.log('   📧 manager@btm-homestay.com / Admin@123');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
