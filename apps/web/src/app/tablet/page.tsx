// @ts-nocheck
'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function TabletPage() {
  const [tab, setTab] = useState('home');
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
          unitId: active.unit.id || active.unitId || '',
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
    if (serviceName === 'Late checkout' && !lateCheckoutConfirm) {
      setLateCheckoutConfirm(true);
      return;
    }
    try {
      const typeMap: Record<string,string> = {
        'Dọn phòng': 'HOUSEKEEPING', 'Thay đồ vải': 'LINEN_CHANGE', 'Late checkout': 'LATE_CHECKOUT',
        'Gọi xe': 'TRANSPORT', 'Báo sự cố': 'MAINTENANCE', 'Gợi ý ăn uống': 'INFO_REQUEST',
      };
      const priorityMap: Record<string,string> = {
        'Dọn phòng': 'medium', 'Thay đồ vải': 'medium', 'Late checkout': 'medium',
        'Gọi xe': 'medium', 'Báo sự cố': 'high', 'Gợi ý ăn uống': 'low',
      };
      if (serviceName && typeMap[serviceName]) {
        const desc = serviceName === 'Late checkout'
          ? `[Phòng ${guest.room}] Late checkout đến 14:00 — Phụ phí 200.000đ/giờ — Tính vào hóa đơn — Khách: ${guest.name}`
          : `[Phòng ${guest.room}] ${serviceName} — Khách: ${guest.name}`;
        await apiFetch('/incidents', { method: 'POST', body: JSON.stringify({
          unitId: guest.unitId, bookingId: guest.bookingId || undefined,
          type: typeMap[serviceName] || 'OTHER', priority: priorityMap[serviceName] || 'medium',
          description: desc,
        })});
      }
      if (serviceName === 'Late checkout') setLateCheckoutConfirm(false);
      setServiceAlert(done);
    } catch { setServiceAlert('❌ Lỗi gửi yêu cầu. Thử lại sau.'); }
    setTimeout(() => setServiceAlert(''), 5000);
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'Tổng quan' },
    { id: 'services', icon: '🛎️', label: 'Dịch vụ' },
    { id: 'explore', icon: '🗺️', label: 'Khám phá' },
    { id: 'room', icon: '🛏️', label: 'Phòng & Thiết bị' },
    { id: 'staff', icon: '👷', label: 'Dành cho NV' },
    { id: 'checkout', icon: '🚪', label: 'Check-out' },
  ];

  const [staffTasks, setStaffTasks] = useState<any[]>([]);

  const fetchStaffTasks = async () => {
    try {
      const [buildings, incidents] = await Promise.all([
        apiFetch('/dashboard/buildings'),
        apiFetch('/incidents?status=OPEN'),
      ]);
      const tasks: any[] = [];
      buildings.forEach((b: any) => {
        (b.units || []).forEach((u: any) => {
          if (u.status === 'CLEANING') tasks.push({ id: 'clean-'+u.id, room: u.name, floor: u.floor, building: b.name, kind: 'cleaning', label: 'Dọn phòng sau checkout', unitId: u.id, icon: '🧹', color: '#FBBF24' });
        });
      });
      const cfg: Record<string,{icon:string,label:string,color:string}> = {
        HOUSEKEEPING: { icon: '🧹', label: 'Dọn phòng', color: '#FBBF24' },
        LINEN_CHANGE: { icon: '🛏️', label: 'Thay đồ vải', color: '#A78BFA' },
        LATE_CHECKOUT: { icon: '⏰', label: 'Late checkout', color: '#22D3EE' },
        TRANSPORT: { icon: '🚕', label: 'Gọi xe', color: '#34D399' },
        MAINTENANCE: { icon: '🔧', label: 'Báo sự cố', color: '#F87171' },
        INFO_REQUEST: { icon: '🍜', label: 'Gợi ý ăn uống', color: '#60A5FA' },
      };
      incidents.forEach((inc: any) => {
        const c = cfg[inc.type] || { icon: '📋', label: inc.type, color: '#94A3B8' };
        tasks.push({ id: inc.id, room: inc.unit?.name || '?', floor: null, building: inc.unit?.building?.name || '', kind: 'incident', label: c.label, icon: c.icon, color: c.color, incidentId: inc.id, desc: inc.description, type: inc.type, createdAt: inc.createdAt });
      });
      setStaffTasks(tasks);
    } catch { setStaffTasks([]); }
  };

  useEffect(() => { if (tab === 'staff') fetchStaffTasks(); }, [tab]);

  const markDone = async (task: any) => {
    setHkLoading(task.id);
    try {
      if (task.kind === 'cleaning') {
        await apiFetch(`/buildings/units/${task.unitId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'AVAILABLE' }) });
      } else {
        await apiFetch(`/incidents/${task.incidentId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED' }) });
      }
      setStaffTasks(prev => prev.filter(t => t.id !== task.id));
      setServiceAlert(task.kind === 'cleaning' ? '✅ Phòng đã AVAILABLE!' : '✅ Đã hoàn thành!');
      setTimeout(() => setServiceAlert(''), 4000);
    } catch { setServiceAlert('❌ Lỗi cập nhật.'); setTimeout(() => setServiceAlert(''), 4000); }
    finally { setHkLoading(''); }
  };

  const services = [
    { icon: '🧹', name: 'Dọn phòng', desc: 'Gọi housekeeping dọn phòng', done: '✅ Đã gửi yêu cầu! Housekeeping sẽ đến trong 15-20 phút.' },
    { icon: '🛏️', name: 'Thay đồ vải', desc: 'Khăn, ga, gối mới', done: '✅ Đã ghi nhận! Khăn và ga mới sẽ được mang lên trong 15 phút.' },
    { icon: '⏰', name: 'Late checkout', desc: 'Gia hạn đến 14:00 (200k/giờ)', done: '✅ Late checkout đến 14:00 đã được ghi nhận. Phụ phí 200.000đ/giờ.' },
    { icon: '🚕', name: 'Gọi xe', desc: 'Taxi / Grab đến sân bay', done: '✅ Đang gọi Grab cho bạn. Xe sẽ đến trong 5-10 phút.' },
    { icon: '🍜', name: 'Gợi ý ăn uống', desc: 'Nhà hàng ngon gần đây', done: '🍜 Gợi ý:\n• Bún chả cá Thu — 200m\n• Mì Quảng Bà Vị — 400m\n• Pizza 4Ps — 1.5km\n• Cộng Cà Phê — 500m' },
    { icon: '🔧', name: 'Báo sự cố', desc: 'Thiết bị hỏng, cần sửa chữa', done: '✅ Đã tạo ticket sự cố. Quản lý sẽ liên hệ trong 15 phút.\n📞 Hotline: +84 901 234 567' },
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
              <h3 className="text-2xl font-black text-white mt-3">Late Checkout</h3>
              <p className="text-base mt-2" style={{ color: '#4B6A8F' }}>Gia hạn checkout đến 14:00</p>
            </div>
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: '#FBBF24' }}>💰 Phụ phí</p>
              <p className="text-3xl font-black text-white">200.000đ <span className="text-lg font-medium" style={{ color: '#4B6A8F' }}>/ giờ</span></p>
              <p className="text-sm mt-2" style={{ color: '#94A3B8' }}>Checkout tiêu chuẩn: 12:00 → Gia hạn đến 14:00</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Phụ phí tối đa: 400.000đ (2 giờ)</p>
              <p className="text-sm mt-3 font-semibold" style={{ color: '#FBBF24' }}>⚠️ Phụ phí sẽ được tính vào hóa đơn</p>
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
            <p className="text-sm font-bold text-white">Xin chào, {guest.name}</p>
            <p className="text-xs" style={{ color: '#3D5A80' }}>Check-out: {guest.checkOut}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-white">{time ? time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
            <p className="text-[10px]" style={{ color: '#263554' }}>{time ? time.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</p>
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
            <span className="text-sm font-bold block mt-2" style={{ color: '#F87171' }}>Khẩn cấp</span>
          </button>
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-auto p-6">

          {/* HOME */}
          {tab === 'home' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">Chào {guest.name}! 👋</h2>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#3D6FA8' }}>🔑 Phòng</p>
                  <p className="text-3xl font-black text-white mt-1">{guest.room}</p>
                  <p className="text-xs" style={{ color: '#60A5FA' }}>Tầng {guest.floor}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#0E7490' }}>📶 WiFi</p>
                  <p className="text-lg font-bold text-white mt-1">{building.wifi}</p>
                  <p className="text-sm font-mono" style={{ color: '#06B6D4' }}>{building.wifiPass}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#92720A' }}>⏰ Check-out</p>
                  <p className="text-lg font-bold text-white mt-1">25/03</p>
                  <p className="text-sm" style={{ color: '#FBBF24' }}>trước 12:00</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#1B7A5A' }}>📞 Hotline</p>
                  <p className="text-base font-bold text-white mt-1">{building.hotline}</p>
                  <p className="text-xs" style={{ color: '#34D399' }}>Quản lý tòa nhà</p>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3">⚡ Dịch vụ nhanh</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {services.map(s => (
                  <button key={s.name} onClick={() => handleService(s.done, s.name)}
                    className="rounded-2xl p-4 text-left transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-sm font-bold text-white mt-2">{s.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4B6A8F' }}>{s.desc}</p>
                  </button>
                ))}
              </div>

              <h3 className="text-lg font-bold text-white mb-3">🗺️ Khám phá Đà Nẵng</h3>
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
              <h2 className="text-2xl font-black text-white mb-6">🛎️ Dịch vụ</h2>
              <div className="grid grid-cols-3 gap-4">
                {services.map(s => (
                  <button key={s.name} onClick={() => handleService(s.done, s.name)}
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
              <h2 className="text-2xl font-black text-white mb-6">🗺️ Khám phá Đà Nẵng</h2>
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
                      <p className="text-xs mt-1" style={{ color: '#3B82F6' }}>Hỏi Lena →</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ROOM & EQUIPMENT */}
          {tab === 'room' && (
            <div>
              <h2 className="text-2xl font-black text-white mb-6">🛏️ Phòng & Thiết bị</h2>
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
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>← Quay lại</button>
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
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md text-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', color: '#3D5A80' }}>Lena đang tìm kiếm...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Hỏi thêm Lena..." className="flex-1 rounded-xl px-4 py-3 text-xl outline-none"
                    style={{ background: 'rgba(255,255,255,0.03)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.06)' }} />
                  <button onClick={sendChat} disabled={chatLoading}
                    className="px-6 py-3 rounded-xl text-xl font-bold text-white disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>Gửi</button>
                </div>
              </div>
            </div>
          )}

          {/* STAFF - Dành cho nhân viên */}
          {tab === 'staff' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">👷 Yêu cầu từ khách</h2>
                <button onClick={fetchStaffTasks} className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
                  🔄 Làm mới
                </button>
              </div>
              {staffTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <span className="text-6xl mb-4">✨</span>
                  <p className="text-xl font-bold text-white">Không có yêu cầu nào!</p>
                  <p className="text-sm mt-2" style={{ color: '#4B6A8F' }}>Tất cả đã được xử lý.</p>
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
                          {task.kind === 'cleaning' ? '🏠 Sau checkout' : '👤 Khách đang ở'}
                        </div>
                      </div>
                      <p className="text-sm font-semibold mb-4" style={{ color: task.color }}>{task.label}</p>
                      <button onClick={() => markDone(task)} disabled={hkLoading === task.id}
                        className="w-full py-4 rounded-xl text-lg font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${task.color}, ${task.color}CC)`, boxShadow: `0 4px 20px ${task.color}40` }}>
                        {hkLoading === task.id ? '⏳ Đang xử lý...' : '✅ Đã xong'}
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
                <h2 className="text-3xl font-black text-white mt-4 mb-2">Check-out</h2>
                <p className="text-base mb-6" style={{ color: '#4B6A8F' }}>Check-out trước {guest.checkOut}</p>
                <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-bold mb-3" style={{ color: '#94A3B8' }}>📝 Trước khi rời đi:</p>
                  <div className="space-y-2 text-base" style={{ color: '#CBD5E1' }}>
                    <p>✅ Kiểm tra đồ đạc cá nhân</p>
                    <p>✅ Để lại chìa khóa / thẻ từ trong phòng</p>
                    <p>✅ Đóng cửa sổ và cửa chính</p>
                    <p>✅ Tắt điều hòa và đèn</p>
                  </div>
                </div>
                <button onClick={() => quickChat('Tôi muốn check out phòng ' + guest.room)}
                  className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 24px rgba(239,68,68,.3)' }}>
                  🚪 Xác nhận Check-out
                </button>
                <p className="text-sm mt-4" style={{ color: '#3D5A80' }}>Hoặc ra Lobby dùng Kiosk để check-out</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}