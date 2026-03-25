// @ts-nocheck
'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function TabletPage() {
  const [tab, setTab] = useState('home');
  const [lang, setLang] = useState('vi');
  const [messages, setMessages] = useState<{role:string;text:string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [time, setTime] = useState<Date|null>(null);
  const [serviceAlert, setServiceAlert] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [guest, setGuest] = useState<any>({ name: 'Đang tải...', room: '...', floor: 0, checkOut: '...', bookingId: '', unitId: '' });
  const [building, setBuilding] = useState<any>({ wifi: '...', wifiPass: '...', hotline: '+84 901 234 567' });
  const [hkLoading, setHkLoading] = useState('');
  const [lateCheckoutConfirm, setLateCheckoutConfirm] = useState(false);
  const [transportForm, setTransportForm] = useState(false);
  const [transportDest, setTransportDest] = useState('');
  const [transportType, setTransportType] = useState('');
  const [transportResult, setTransportResult] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    Promise.all([
      apiFetch('/bookings?status=CHECKED_IN'),
      apiFetch('/buildings'),
    ]).then(([bookings, buildings]: any) => {
      let active = roomParam ? bookings.find((b: any) => b.unit?.name === roomParam) : bookings[0];
      if (active) {
        setGuest({
          name: `${active.guest.firstName} ${active.guest.lastName}`,
          room: active.unit.name,
          floor: active.unit.floor || 0,
          checkOut: new Date(active.checkOutDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + (buildings[0]?.settings?.checkout_time || '12:00'),
          bookingId: active.id,
          unitId: active.unitId || active.unit?.id || '',
        });
      } else {
        setGuest({ name: 'Chưa có khách check-in', room: '--', floor: 0, checkOut: '--', bookingId: '', unitId: '' });
      }
      if (buildings.length > 0) {
        const s = buildings[0].settings || {};
        setBuilding({ wifi: s.wifi_ssid || 'BTM03_5G', wifiPass: s.wifi_password || 'btm2026!', hotline: s.manager_phone || '+84 901 234 567' });
      }
    }).catch(() => setGuest({ name: 'Lỗi kết nối', room: '--', floor: 0, checkOut: '--', bookingId: '' }));
  }, []);


  useEffect(() => { setTime(new Date()); const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  // Poll for transport result from kiosk staff
  useEffect(() => {
    if (!guest.unitId) return;
    const poll = setInterval(async () => {
      try {
        const incidents = await apiFetch('/incidents?status=RESOLVED');
        const found = incidents.find((inc: any) => inc.type === 'TRANSPORT' && (inc.unitId === guest.unitId || inc.unit?.id === guest.unitId) && inc.description?.includes('KẾT QUẢ:'));
        if (found && !transportResult) {
          const result = found.description.split('KẾT QUẢ:')[1]?.trim() || 'Đã xử lý';
          setTransportResult('🚕 ' + result);
          setTimeout(() => setTransportResult(''), 20000);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(poll);
  }, [guest.unitId, transportResult]);

  const quickChat = (msg: string) => {
    setMessages([{ role: 'ai', text: 'Mình đang tìm thông tin cho bạn... 🔍' }]);
    setTab('chat');
    setChatLoading(true);
    apiFetch('/agent/chat', { method: 'POST', body: JSON.stringify({ message: msg, deviceType: 'tablet', lang: 'vi' }) })
      .then(res => setMessages([{ role: 'user', text: msg }, { role: 'ai', text: res.response }]))
      .catch(() => setMessages([{ role: 'user', text: msg }, { role: 'ai', text: 'Lỗi kết nối.' }]))
      .finally(() => { setChatLoading(false); setChatInput(''); });
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput(''); setChatLoading(true);
    setMessages(p => [...p, { role: 'user', text: msg }]);
    try {
      const res = await apiFetch('/agent/chat', { method: 'POST', body: JSON.stringify({ message: msg, deviceType: 'tablet', lang: 'vi', history: messages.slice(-6) }) });
      setMessages(p => [...p, { role: 'ai', text: res.response }]);
    } catch { setMessages(p => [...p, { role: 'ai', text: 'Lỗi kết nối.' }]); }
    finally { setChatLoading(false); }
  };

  const handleService = async (done: string, serviceName?: string) => {
    if (!guest.unitId) { setServiceAlert(done); setTimeout(() => setServiceAlert(''), 5000); return; }
    if (serviceName === 'Late checkout' && !lateCheckoutConfirm) { setLateCheckoutConfirm(true); return; }
    if (serviceName === 'Gọi xe' && !transportForm) { setTransportForm(true); return; }
    if (serviceName === 'Gợi ý ăn uống') { quickChat('Gợi ý nhà hàng ngon gần BTM 03 Đà Nẵng, kèm khoảng cách và món đặc sản'); return; }
    try {
      const typeMap: Record<string,string> = {
        'Dọn phòng': 'HOUSEKEEPING', 'Thay đồ vải': 'LINEN_CHANGE', 'Late checkout': 'LATE_CHECKOUT',
        'Gọi xe': 'TRANSPORT', 'Báo sự cố': 'MAINTENANCE',
      };
      const priorityMap: Record<string,string> = {
        'Dọn phòng': 'medium', 'Thay đồ vải': 'medium', 'Late checkout': 'medium',
        'Gọi xe': 'high', 'Báo sự cố': 'high',
      };
      if (serviceName && typeMap[serviceName]) {
        let desc = `[Phòng ${guest.room}] ${serviceName} — Khách: ${guest.name}`;
        if (serviceName === 'Late checkout') desc = `[Phòng ${guest.room}] Late checkout đến 14:00 — Phụ phí 200.000đ/giờ — Tính vào hóa đơn — Khách: ${guest.name}`;
        if (serviceName === 'Gọi xe') desc = `[Phòng ${guest.room}] Gọi xe: ${transportType} → ${transportDest} — Khách: ${guest.name}`;
        await apiFetch('/incidents', { method: 'POST', body: JSON.stringify({
          unitId: guest.unitId, bookingId: guest.bookingId || undefined,
          type: typeMap[serviceName], priority: priorityMap[serviceName] || 'medium',
          description: desc,
        })});
      }
      if (serviceName === 'Late checkout') setLateCheckoutConfirm(false);
      if (serviceName === 'Gọi xe') { setTransportForm(false); setTransportDest(''); setTransportType(''); }
      setServiceAlert(done);
    } catch { setServiceAlert('❌ Lỗi gửi yêu cầu.'); }
    setTimeout(() => setServiceAlert(''), 5000);
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: t.ov },
    { id: 'services', icon: '🛎️', label: t.svc },
    { id: 'explore', icon: '🗺️', label: t.exp.split(' ')[0] },
    { id: 'room', icon: '🛏️', label: t.rm },
    { id: 'staff', icon: '👷', label: t.stf },
    { id: 'checkout', icon: '🚪', label: t.co },
  ];

  const [staffTasks, setStaffTasks] = useState<any[]>([]);

  const fetchStaffTasks = async () => {
    if (!guest.unitId) { setStaffTasks([]); return; }
    try {
      const [buildings, incidents, bookings] = await Promise.all([
        apiFetch('/dashboard/buildings'),
        apiFetch('/incidents?status=OPEN'),
        apiFetch('/bookings?status=CHECKED_IN'),
      ]);
      const tasks: any[] = [];
      const occupiedUnitIds = new Set(bookings.map((b: any) => b.unitId || b.unit?.id));
      // Only show CLEANING for THIS unit if no active booking
      buildings.forEach((b: any) => {
        (b.units || []).forEach((u: any) => {
          if (u.id === guest.unitId && u.status === 'CLEANING' && !occupiedUnitIds.has(u.id)) {
            tasks.push({ id: 'clean-'+u.id, room: u.name, floor: u.floor, building: b.name, kind: 'cleaning', label: 'Dọn phòng sau checkout', unitId: u.id, icon: '🧹', color: '#FBBF24' });
          }
        });
      });
      const cfg: Record<string,{icon:string,label:string,color:string}> = {
        HOUSEKEEPING: { icon: '🧹', label: 'Dọn phòng', color: '#FBBF24' },
        LINEN_CHANGE: { icon: '🛏️', label: 'Thay đồ vải', color: '#A78BFA' },
        LATE_CHECKOUT: { icon: '⏰', label: 'Late checkout', color: '#22D3EE' },
        TRANSPORT: { icon: '🚕', label: 'Gọi xe', color: '#34D399' },
        MAINTENANCE: { icon: '🔧', label: 'Báo sự cố', color: '#F87171' },
      };
      // Only show incidents for THIS unit
      incidents.filter((inc: any) => inc.unitId === guest.unitId || inc.unit?.id === guest.unitId).forEach((inc: any) => {
        const c = cfg[inc.type] || { icon: '📋', label: inc.type, color: '#94A3B8' };
        tasks.push({ id: inc.id, room: inc.unit?.name || guest.room, floor: null, building: inc.unit?.building?.name || '', kind: 'incident', label: c.label, icon: c.icon, color: c.color, incidentId: inc.id, desc: inc.description, type: inc.type, createdAt: inc.createdAt });
      });
      setStaffTasks(tasks);
    } catch { setStaffTasks([]); }
  };

  useEffect(() => { if (tab === 'staff') fetchStaffTasks(); }, [tab]);

  const markDone = async (task: any) => {
    setHkLoading(task.id);
    try {
      if (task.kind === 'cleaning') {
        // Double-check: only set AVAILABLE if no active booking in this unit
        const bookings = await apiFetch('/bookings?status=CHECKED_IN');
        const hasGuest = bookings.some((b: any) => (b.unitId || b.unit?.id) === task.unitId);
        if (hasGuest) {
          // Guest still in room — just set back to OCCUPIED, not AVAILABLE
          await apiFetch(`/buildings/units/${task.unitId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'OCCUPIED' }) });
          setServiceAlert('✅ ' + t.dn + ' — ' + t.gIn);
        } else {
          await apiFetch(`/buildings/units/${task.unitId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'AVAILABLE' }) });
          setServiceAlert('✅ AVAILABLE!');
        }
      } else {
        await apiFetch(`/incidents/${task.incidentId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) });
        setServiceAlert('✅ ' + t.dn);
      }
      setStaffTasks(prev => prev.filter(t => t.id !== task.id));
      setTimeout(() => setServiceAlert(''), 4000);
    } catch { setServiceAlert('❌ Error'); setTimeout(() => setServiceAlert(''), 4000); }
    finally { setHkLoading(''); }
  };

  const TX: Record<string,Record<string,string>> = {
    vi:{hello:'Xin chào',room:'Phòng',floor:'Tầng',co:'Check-out',ht:'Hotline',mgr:'Quản lý',qk:'Dịch vụ nhanh',exp:'Khám phá Đà Nẵng',svc:'Dịch vụ',rm:'Phòng & Thiết bị',stf:'Dành cho NV',ov:'Tổng quan',ph:'Hỏi thêm Lena...',send:'Gửi',back:'← Quay lại',coBefore:'Check-out trước',bl:'Trước khi rời đi:',ci:'Kiểm tra đồ đạc',lk:'Để lại chìa khóa trong phòng',cw:'Đóng cửa sổ và cửa chính',off:'Tắt điều hòa và đèn',cfCo:'Xác nhận Check-out',orK:'Hoặc ra Lobby dùng Kiosk',em:'Khẩn cấp',stTitle:'Yêu cầu từ khách',ref:'Làm mới',noT:'Không có yêu cầu nào!',allD:'Tất cả đã được xử lý.',aCO:'Sau checkout',gIn:'Khách đang ở',dn:'Đã xong',proc:'Đang xử lý...',ltT:'Late Checkout',ltS:'Gia hạn checkout đến 14:00',ltF:'Phụ phí',pH:'/ giờ',std:'Checkout tiêu chuẩn: 12:00 → Gia hạn đến 14:00',mxF:'Phụ phí tối đa: 400.000đ (2 giờ)',fI:'Phụ phí sẽ được tính vào hóa đơn',can:'Hủy',cfm:'Xác nhận',trT:'Gọi xe',vT:'Loại xe',dest:'Điểm đến',dPh:'VD: Sân bay Đà Nẵng, Hội An...',cV:'Gọi xe',aL:'{t.aL}',lS:'Lena đang tìm kiếm...',on:'Online',
      sc:'Dọn phòng',scD:'Gọi housekeeping dọn phòng',scR:'✅ Đã gửi yêu cầu! Housekeeping sẽ đến trong 15-20 phút.',sl:'Thay đồ vải',slD:'Khăn, ga, gối mới',slR:'✅ Đã ghi nhận! 15 phút.',slt:'Late checkout',sltD:'Gia hạn đến 14:00 (200k/giờ)',sltR:'✅ Late checkout đến 14:00 đã xác nhận. Phụ phí 200.000đ/giờ.',st2:'Gọi xe',st2D:'Taxi / Grab đến sân bay',st2R:'✅ Đã gửi yêu cầu gọi xe!',sf:'Gợi ý ăn uống',sfD:'Nhà hàng ngon gần đây',si:'Báo sự cố',siD:'Thiết bị hỏng, cần sửa chữa',siR:'✅ Đã tạo ticket sự cố. Quản lý sẽ liên hệ 15 phút.\n📞 +84 901 234 567'},
    en:{hello:'Hello',room:'Room',floor:'Floor',co:'Check-out',ht:'Hotline',mgr:'Manager',qk:'Quick Services',exp:'Explore Da Nang',svc:'Services',rm:'Room & Equipment',stf:'For Staff',ov:'Overview',ph:'Ask Lena...',send:'Send',back:'← Back',coBefore:'Check-out before',bl:'Before you leave:',ci:'Check your belongings',lk:'Leave key/card in room',cw:'Close windows and door',off:'Turn off AC and lights',cfCo:'Confirm Check-out',orK:'Or use the Lobby Kiosk',em:'Emergency',stTitle:'Guest Requests',ref:'Refresh',noT:'No requests!',allD:'All handled.',aCO:'After checkout',gIn:'Guest in room',dn:'Done',proc:'Processing...',ltT:'Late Checkout',ltS:'Extend checkout to 14:00',ltF:'Surcharge',pH:'/ hour',std:'Standard: 12:00 → Extended to 14:00',mxF:'Max: 400,000đ (2 hours)',fI:'Surcharge added to invoice',can:'Cancel',cfm:'Confirm',trT:'Book a Ride',vT:'Vehicle type',dest:'Destination',dPh:'E.g. Da Nang Airport, Hoi An...',cV:'Book Ride',aL:'Ask Lena →',lS:'Lena is searching...',on:'Online',
      sc:'Housekeeping',scD:'Request cleaning',scR:'✅ Sent! 15-20 mins.',sl:'Fresh Linens',slD:'New towels & sheets',slR:'✅ Noted! 15 mins.',slt:'Late checkout',sltD:'Extend to 14:00 (200k/hr)',sltR:'✅ Late checkout confirmed.',st2:'Book a Ride',st2D:'Taxi/Grab to airport',st2R:'✅ Ride request sent!',sf:'Food Tips',sfD:'Nearby restaurants',si:'Report Issue',siD:'Equipment broken',siR:'✅ Ticket created. Manager within 15 mins.'},
    zh:{hello:'您好',room:'房间',floor:'楼层',co:'退房',ht:'热线',mgr:'管理员',qk:'快捷服务',exp:'探索岘港',svc:'服务',rm:'房间与设备',stf:'员工',ov:'概览',ph:'问Lena...',send:'发送',back:'← 返回',coBefore:'退房前',bl:'离开前：',ci:'检查物品',lk:'留下钥匙',cw:'关闭门窗',off:'关闭空调灯',cfCo:'确认退房',orK:'或用大堂自助机',em:'紧急',stTitle:'客人请求',ref:'刷新',noT:'无请求！',allD:'已处理。',aCO:'退房后',gIn:'在住',dn:'完成',proc:'处理中...',ltT:'延迟退房',ltS:'延至14:00',ltF:'附加费',pH:'/ 小时',std:'标准: 12:00 → 14:00',mxF:'最高: 400,000đ',fI:'计入账单',can:'取消',cfm:'确认',trT:'叫车',vT:'车型',dest:'目的地',dPh:'如：岘港机场...',cV:'叫车',aL:'问Lena →',lS:'Lena搜索中...',on:'在线',
      sc:'清洁',scD:'呼叫清洁',scR:'✅ 已发送！15-20分钟。',sl:'更换床品',slD:'新毛巾床单',slR:'✅ 已记录！15分钟。',slt:'延迟退房',sltD:'延至14:00 (20万/时)',sltR:'✅ 已确认。',st2:'叫车',st2D:'出租/Grab',st2R:'✅ 已发送！',sf:'美食推荐',sfD:'附近餐厅',si:'报告问题',siD:'设备故障',siR:'✅ 已创建工单。'},
    ko:{hello:'안녕하세요',room:'방',floor:'층',co:'체크아웃',ht:'핫라인',mgr:'관리자',qk:'빠른 서비스',exp:'다낭 탐험',svc:'서비스',rm:'방 & 장비',stf:'직원용',ov:'개요',ph:'Lena에게...',send:'보내기',back:'← 뒤로',coBefore:'체크아웃 전',bl:'떠나기 전:',ci:'소지품 확인',lk:'키/카드 남기기',cw:'창문/문 닫기',off:'에어컨/조명 끄기',cfCo:'체크아웃 확인',orK:'또는 로비 키오스크',em:'긴급',stTitle:'고객 요청',ref:'새로고침',noT:'요청 없음!',allD:'모두 처리됨.',aCO:'체크아웃 후',gIn:'투숙 중',dn:'완료',proc:'처리 중...',ltT:'레이트 체크아웃',ltS:'14:00까지 연장',ltF:'추가비',pH:'/ 시간',std:'표준: 12:00 → 14:00',mxF:'최대: 400,000đ',fI:'청구서에 포함',can:'취소',cfm:'확인',trT:'차량 호출',vT:'차량 유형',dest:'목적지',dPh:'예: 공항, 호이안...',cV:'호출',aL:'Lena에게 →',lS:'Lena 검색 중...',on:'온라인',
      sc:'청소',scD:'객실 청소',scR:'✅ 요청됨! 15-20분.',sl:'린넨 교체',slD:'새 수건/시트',slR:'✅ 기록됨! 15분.',slt:'레이트 체크아웃',sltD:'14:00 연장 (20만/시간)',sltR:'✅ 확인됨.',st2:'차량 호출',st2D:'택시/Grab',st2R:'✅ 요청 완료!',sf:'맛집 추천',sfD:'근처 레스토랑',si:'문제 신고',siD:'장비 고장',siR:'✅ 티켓 생성. 15분 내 연락.'},
  };
  const t = TX[lang] || TX.vi;

  const services = [
    { icon: '🧹', name: t.sc, desc: t.scD, done: t.scR, key: 'Dọn phòng' },
    { icon: '🛏️', name: t.sl, desc: t.slD, done: t.slR, key: 'Thay đồ vải' },
    { icon: '⏰', name: t.slt, desc: t.sltD, done: t.sltR, key: 'Late checkout' },
    { icon: '🚕', name: t.st2, desc: t.st2D, done: t.st2R, key: 'Gọi xe' },
    { icon: '🍜', name: t.sf, desc: t.sfD, done: '', key: 'Gợi ý ăn uống' },
    { icon: '🔧', name: t.si, desc: t.siD, done: t.siR, key: 'Báo sự cố' },
  ];

  const explore = [
    { icon: '🏖️', name: 'Biển Mỹ Khê', msg: 'Cho mình thông tin về biển Mỹ Khê', img: '/mykhe.jpg' },
    { icon: '⛰️', name: 'Bà Nà Hills', msg: 'Giá vé và cách đi Bà Nà Hills', img: '/bana.jpg' },
    { icon: '🏛️', name: 'Phố cổ Hội An', msg: 'Hướng dẫn đi Hội An từ đây', img: '/hoian.png' },
    { icon: '🏔️', name: 'Ngũ Hành Sơn', msg: 'Thông tin tham quan Ngũ Hành Sơn', img: '/nguhanhson.jpg' },
    { icon: '⛳', name: 'Sân Golf', msg: 'Sân golf gần đây và giá chơi', img: '/golf.jpg' },
    { icon: '💆', name: 'Spa & Massage', msg: 'Spa massage tốt gần đây và giá', img: '/massage.jpg' },
    { icon: '🛵', name: 'Thuê xe máy', msg: 'Giá thuê xe máy ở Đà Nẵng', img: '/spa.png' },
    { icon: '🚲', name: 'Thuê xe đạp', msg: 'Thuê xe đạp ở đâu gần đây', img: '/xedap.webp' },
  ];

  const roomItems = [
    { icon: '❄️', name: 'Điều hòa', brand: 'Daikin Inverter', desc: 'Remote gắn tường. ON/OFF → COOL → 24-26°C. Tắt khi ra ngoài.' },
    { icon: '📺', name: 'Smart TV 55"', brand: 'Samsung Crystal UHD', desc: 'YouTube, Netflix có sẵn. Remote trên bàn. Cast qua Chromecast.' },
    { icon: '🍳', name: 'Bếp từ', brand: 'Bosch 2 vùng nấu', desc: 'Bật công tắc tổng bên phải. Nồi chảo tủ dưới, gia vị tủ trên.' },
    { icon: '🚿', name: 'Bình nóng lạnh', brand: 'Ariston 30L', desc: 'Công tắc đèn đỏ trong phòng tắm. Đợi 5-10 phút.' },
    { icon: '👕', name: 'Máy giặt', brand: 'LG Inverter 9kg', desc: 'Tầng 1 cạnh thang máy. Bột giặt và nước xả có sẵn.' },
    { icon: '🛋️', name: 'Sofa', brand: 'Italia — Da thật', desc: 'Sofa góc L, da bò Italia. Giữ sạch, không để đồ ướt lên.' },
    { icon: '🛏️', name: 'Giường', brand: 'Italia — Nệm cao cấp', desc: 'Nệm lò xo túi Italia. Ga trải giường cotton Ai Cập 400TC.' },
    { icon: '🗄️', name: 'Tủ quần áo', brand: 'Italia — Gỗ sồi', desc: 'Tủ gỗ sồi Italia. Móc áo và két sắt bên trong.' },
    { icon: '📶', name: 'WiFi', brand: 'Mesh Router', desc: 'SSID: BTM03_5G / Password: btm2026! / Tốc độ: 100Mbps' },
    { icon: '🔑', name: 'Smart Lock', brand: 'TTLock Pro 3S', desc: 'Mã PIN đã cấp khi check-in. Tự khóa sau 5 giây.' },
    { icon: '🧊', name: 'Tủ lạnh', brand: 'Samsung Inverter', desc: 'Tủ lạnh mini-bar. Nước miễn phí. Đồ uống tính phí theo bảng giá.' },
    { icon: '☕', name: 'Ấm siêu tốc', brand: 'Philips 1.7L', desc: 'Trà, cà phê gói miễn phí trên kệ. Nước đóng chai trong tủ lạnh.' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{ background: '#060A14' }}>

      {/* SERVICE ALERT */}
      {serviceAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-8 py-4 text-lg font-bold text-white whitespace-pre-wrap max-w-xl text-center"
          style={{ background: 'linear-gradient(135deg,#10B981,#06B6D4)', boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
          {serviceAlert}
        </div>
      )}

      {/* LATE CHECKOUT CONFIRMATION */}
      {lateCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-3xl p-8 max-w-md w-full mx-4" style={{ background: '#0F1629', border: '1px solid rgba(6,182,212,0.2)' }}>
            <div className="text-center mb-6">
              <span className="text-5xl">⏰</span>
              <h3 className="text-2xl font-black text-white mt-3">{t.ltT}</h3>
              <p className="text-base mt-2" style={{ color: '#4B6A8F' }}>{t.ltS}</p>
            </div>
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: '#FBBF24' }}>💰 {t.ltF}</p>
              <p className="text-3xl font-black text-white">200.000đ <span className="text-lg font-medium" style={{ color: '#4B6A8F' }}>/ giờ</span></p>
              <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>{t.std}</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>{t.mxF}</p>
              <p className="text-sm mt-3 font-semibold" style={{ color: '#FBBF24' }}>⚠️ {t.fI}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLateCheckoutConfirm(false)}
                className="flex-1 py-4 rounded-xl text-base font-bold transition active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.08)' }}>
                Hủy
              </button>
              <button onClick={() => handleService('✅ Late checkout đến 14:00 đã xác nhận.\nPhụ phí 200.000đ/giờ sẽ tính vào hóa đơn.', 'Late checkout')}
                className="flex-1 py-4 rounded-xl text-base font-black text-white transition active:scale-95"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}>
                ⏰ Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSPORT FORM */}
      {transportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-3xl p-8 max-w-md w-full mx-4" style={{ background: '#0F1629', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="text-center mb-6">
              <span className="text-5xl">🚕</span>
              <h3 className="text-2xl font-black text-white mt-3">{t.trT}</h3>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: '#94A3B8' }}>{t.vT}</p>
                <div className="flex gap-2">
                  {['Grab Car', 'Grab Bike', 'Taxi', 'Xe sân bay'].map(t => (
                    <button key={t} onClick={() => setTransportType(t)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition active:scale-95"
                      style={transportType === t ? { background: 'linear-gradient(135deg,#10B981,#06B6D4)', color: 'white' } : { background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: '#94A3B8' }}>{t.dest}</p>
                <input value={transportDest} onChange={e => setTransportDest(e.target.value)}
                  placeholder={t.dPh}
                  className="w-full rounded-xl px-4 py-3 text-base outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTransportForm(false); setTransportDest(''); setTransportType(''); }}
                className="flex-1 py-4 rounded-xl text-base font-bold transition active:scale-95"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.08)' }}>
                Hủy
              </button>
              <button onClick={() => handleService('✅ Đã gửi yêu cầu gọi xe!\nStaff sẽ phản hồi kết quả ngay trên tablet.', 'Gọi xe')}
                disabled={!transportType || !transportDest.trim()}
                className="flex-1 py-4 rounded-xl text-base font-black text-white transition active:scale-95 disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg,#10B981,#06B6D4)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
                🚕 Gọi xe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSPORT RESULT FROM KIOSK */}
      {transportResult && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-8 py-5 text-lg font-bold text-white whitespace-pre-wrap max-w-xl text-center"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.5)' }}>
          {transportResult}
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{ background: '#0A0F1D', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <img src="/lena.png" alt="Lena" className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-white font-bold text-base">BTM 03 · Phòng {guest.room}</p>
            <p className="text-xs" style={{ color: '#3D5A80' }}>Lena · AI Concierge · 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-white">{t.hello}, {guest.name}</p>
            <p className="text-xs" style={{ color: '#3D5A80' }}>{t.co}: {guest.checkOut}</p>
          </div>
          <div className="flex gap-1.5">
            {[{c:'vi',l:'🇻🇳'},{c:'en',l:'🇬🇧'},{c:'zh',l:'🇨🇳'},{c:'ko',l:'🇰🇷'}].map(x=>(
              <button key={x.c} onClick={()=>setLang(x.c)} className="px-2.5 py-1.5 rounded-lg text-sm transition"
                style={lang===x.c?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,.03)',color:'#3D5A80'}}>
                {x.l}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{time ? time.toLocaleTimeString(lang==='vi'?'vi-VN':'en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
            <p className="text-[10px]" style={{ color: '#263554' }}>{time ? time.toLocaleDateString(lang==='vi'?'vi-VN':'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</p>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* SIDEBAR */}
        <div className="w-48 flex flex-col items-center py-4 gap-2 flex-shrink-0" style={{ background: '#0A0F1D', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className="w-40 py-4 rounded-xl text-center transition"
              style={tab === n.id ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' } : { border: '1px solid transparent' }}>
              <span className="text-5xl block">{n.icon}</span>
              <span className="text-sm font-bold block mt-2" style={{ color: tab === n.id ? '#60A5FA' : '#3D5A80' }}>{n.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button className="w-40 py-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <span className="text-4xl block">🚨</span>
            <span className="text-sm font-bold block mt-2" style={{ color: '#F87171' }}>{t.em}</span>
          </button>
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-auto p-6">

          {/* HOME */}
          {tab === 'home' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">{t.welcome} {guest.name}! 👋</h2>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#3D6FA8' }}>🔑 {t.room}</p>
                  <p className="text-3xl font-black text-white mt-1">{guest.room}</p>
                  <p className="text-xs" style={{ color: '#60A5FA' }}>{t.floor} {guest.floor}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#0E7490' }}>📶 {t.wifi}</p>
                  <p className="text-lg font-bold text-white mt-1">{building.wifi}</p>
                  <p className="text-sm font-mono" style={{ color: '#06B6D4' }}>{building.wifiPass}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#92720A' }}>⏰ {t.co}</p>
                  <p className="text-lg font-bold text-white mt-1">25/03</p>
                  <p className="text-sm" style={{ color: '#FBBF24' }}>before 12:00</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#1B7A5A' }}>📞 {t.ht}</p>
                  <p className="text-base font-bold text-white mt-1">{building.hotline}</p>
                  <p className="text-xs" style={{ color: '#34D399' }}>{t.mgr}</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3">{t.qk}</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {services.map(s => (
                  <button key={s.name} onClick={() => handleService(s.done, s.key)}
                    className="rounded-2xl p-4 text-left transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-sm font-bold text-white mt-2">{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4B6A8F' }}>{s.desc}</p>
                  </button>
                ))}
              </div>

              <h3 className="text-lg font-bold text-white mb-3">{t.exp}</h3>
              <div className="grid grid-cols-2 gap-3">
                {explore.slice(0, 4).map(e => (
                  <button key={e.name} onClick={() => quickChat(e.msg)}
                    className="rounded-2xl overflow-hidden text-left transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url(${e.img})` }}>
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #0F1629 100%)' }} />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-white">{e.icon} {e.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SERVICES */}
          {tab === 'services' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">{t.svc}</h2>
              <div className="grid grid-cols-3 gap-4">
                {services.map(s => (
                  <button key={s.name} onClick={() => handleService(s.done, s.key)}
                    className="rounded-2xl p-6 text-left transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-4xl">{s.icon}</span>
                    <p className="text-lg font-bold text-white mt-3">{s.name}</p>
                    <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EXPLORE */}
          {tab === 'explore' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">{t.exp}</h2>
              <div className="grid grid-cols-2 gap-4">
                {explore.map(e => (
                  <button key={e.name} onClick={() => quickChat(e.msg)}
                    className="rounded-2xl overflow-hidden text-left transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="h-52 bg-cover bg-center relative" style={{ backgroundImage: `url(${e.img})` }}>
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0F1629 100%)' }} />
                      <span className="absolute bottom-2 left-3 text-2xl">{e.icon}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-lg font-bold text-white">{e.name}</p>
                      <p className="text-xs mt-1" style={{ color: '#3B82F6' }}>{t.aL}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ROOM & EQUIPMENT */}
          {tab === 'room' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">{t.rm}</h2>
              <div className="grid grid-cols-2 gap-4">
                {roomItems.map(item => (
                  <div key={item.name} className="rounded-2xl p-5 flex items-start gap-4"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-3xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-lg font-bold text-white">{item.name}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: '#60A5FA' }}>{item.brand}</p>
                      <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT (from explore/quickChat) */}
          {tab === 'chat' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <img src="/lena.png" alt="Lena" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="text-lg font-bold text-white">Lena · AI Concierge</p>
                  <p className="text-xs" style={{ color: '#10B981' }}>● Online · Web Search enabled</p>
                </div>
                <div className="flex-1" />
                <button onClick={() => setTab('explore')} className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>{t.back}</button>
              </div>
              <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 p-4 space-y-3 overflow-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={'flex gap-2 ' + (m.role === 'user' ? 'justify-end' : '')}>
                      {m.role === 'ai' && <img src="/lena.png" alt="Lena" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />}
                      <div className={'w-full px-4 py-3 rounded-2xl text-xl leading-relaxed whitespace-pre-wrap ' + (m.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md')}
                        style={m.role === 'user' ? { background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: 'white' } : { background: 'rgba(255,255,255,0.04)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-2">
                      <img src="/lena.png" alt="Lena" className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md text-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', color: '#3D5A80' }}>{t.lS}</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder={t.ph} className="flex-1 rounded-xl px-4 py-3 text-xl outline-none"
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.06)' }} />
                  <button onClick={sendChat} disabled={chatLoading}
                    className="px-6 py-3 rounded-xl text-xl font-bold text-white disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>{t.send}</button>
                </div>
              </div>
            </div>
          )}

          {/* STAFF - Dành cho nhân viên */}
          {tab === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">{t.stTitle}</h2>
                <button onClick={fetchStaffTasks} className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
                  🔄 Làm mới
                </button>
              </div>
              {staffTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <span className="text-6xl mb-4">✨</span>
                  <p className="text-xl font-bold text-white">{t.noT}</p>
                  <p className="text-sm mt-2" style={{ color: '#4B6A8F' }}>{t.allD}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {staffTasks.map(task => (
                    <div key={task.id} className="rounded-2xl p-5" style={{ background: '#0F1629', border: `1px solid ${task.color}33` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{task.icon}</span>
                          <div>
                            <p className="text-2xl font-black text-white">Phòng {task.room}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#4B6A8F' }}>{task.building}{task.floor ? ` · Tầng ${task.floor}` : ''}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${task.color}1A`, color: task.color, border: `1px solid ${task.color}33` }}>
                          {task.kind === 'cleaning' ? t.aCO : t.gIn}
                        </div>
                      </div>
                      <p className="text-sm font-semibold mb-4" style={{ color: task.color }}>{task.label}</p>
                      <button onClick={() => markDone(task)} disabled={hkLoading === task.id}
                        className="w-full py-4 rounded-xl text-lg font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${task.color}, ${task.color}CC)`, boxShadow: `0 4px 20px ${task.color}40` }}>
                        {hkLoading === task.id ? t.proc : '✅ Đã xong'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHECKOUT */}
          {tab === 'checkout' && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center max-w-md">
                <span className="text-6xl">🚪</span>
                <h2 className="text-3xl font-black text-white mt-4 mb-2">{t.co}</h2>
                <p className="text-base mb-6" style={{ color: '#4B6A8F' }}>{t.coBefore} {guest.checkOut}</p>
                <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-bold mb-3" style={{ color: '#94A3B8' }}>📝 {t.bl}</p>
                  <div className="space-y-2 text-base" style={{ color: '#CBD5E1' }}>
                    <p>✅ {t.ci}</p>
                    <p>✅ {t.lk}</p>
                    <p>✅ {t.cw}</p>
                    <p>✅ {t.off}</p>
                  </div>
                </div>
                <button onClick={() => quickChat('Tôi muốn check out phòng ' + guest.room)}
                  className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 24px rgba(239,68,68,.3)' }}>
                  🚪 Xác nhận Check-out
                </button>
                <p className="text-sm mt-4" style={{ color: '#3D5A80' }}>{t.orK}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}