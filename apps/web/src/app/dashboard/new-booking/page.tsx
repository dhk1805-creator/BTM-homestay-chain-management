// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UnitData { id: string; name: string; floor: number; type: string; status: string; basePrice: string; }
interface GuestData { id: string; firstName: string; lastName: string; email: string; phone: string; }
interface ChannelData { id: string; name: string; }

export default function NewBookingPage() {
  const [units, setUnits] = useState<UnitData[]>([]);
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [guestMode, setGuestMode] = useState<'existing' | 'new'>('existing');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', email: '', phone: '', nationality: 'VN', preferredLang: 'vi' });
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numGuests, setNumGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [channelRef, setChannelRef] = useState('');
  // === Issue #6: Discount field (VND) ===
  const [discount, setDiscount] = useState('');
  const [createdBookingCode, setCreatedBookingCode] = useState('');
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [occupancyRate, setOccupancyRate] = useState(0);
  // Occupied room info
  const [occupiedUntil, setOccupiedUntil] = useState('');
  const [occupiedGuest, setOccupiedGuest] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/buildings'),
      apiFetch('/guests'),
      apiFetch('/bookings?limit=1').then(() => {
        return [{ id: '', name: '' }];
      }),
    ]).then(([bl, g]) => {
      const bld = bl[0];
      if (bld?.units) {
        setUnits(bld.units.filter((u: any) => u.name && u.name !== 'Owner').sort((a: any, b: any) => a.name.localeCompare(b.name)));
      }
      setGuests(g);
      if (bld?.settings?.pricing_rules) setPricingRules(bld.settings.pricing_rules);
      const occCount = bld?.units?.filter((u) => u.status === 'OCCUPIED').length || 0;
      const totalCount = bld?.units?.filter((u) => u.name !== 'Owner').length || 10;
      setOccupancyRate(Math.round((occCount / totalCount) * 100));
    }).catch(console.error).finally(() => setLoading(false));

    // Fetch channels directly from channels table
    apiFetch('/bookings/channels').then(chs => {
      setChannels(chs);
    }).catch(() => {});
  }, []);

  const selectedUnitData = units.find(u => u.id === selectedUnit);
  const nights = checkIn && checkOut ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;
  const rawBasePrice = Number(selectedUnitData?.basePrice) || 500000;
  const calcDynamicPrice = (base: number) => {
    if (!checkIn || pricingRules.length === 0) return base;
    let adj = 0;
    const d = new Date(checkIn);
    const day = d.getDay();
    const month = d.getMonth() + 1;
    const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
    for (const rule of pricingRules) {
      if (!rule.active) continue;
      let applies = false;
      if (rule.type === 'weekend' && (day === 5 || day === 6 || day === 0)) applies = true;
      if (rule.type === 'season') {
        const dd = d.getDate();
        if (rule.name.includes('hè') && month >= 6 && month <= 8) applies = true;
        if (rule.name.includes('Tết') && ((month === 1 && dd >= 25) || (month === 2 && dd <= 5))) applies = true;
        if (rule.name.includes('30/4') && ((month === 4 && dd >= 28) || (month === 5 && dd <= 3))) applies = true;
        // DIFF Pháo hoa Đà Nẵng: 30/5 → 11/7 (hàng năm)
        if (rule.name.includes('DIFF') && ((month === 5 && dd >= 30) || (month === 6) || (month === 7 && dd <= 11))) applies = true;
      }
      if (rule.type === 'occupancy') {
        if (rule.adjustment > 0 && rule.name.includes('80') && occupancyRate > 80) applies = true;
        if (rule.adjustment > 0 && rule.name.includes('90') && occupancyRate > 90) applies = true;
        if (rule.adjustment < 0 && rule.name.includes('30') && occupancyRate < 30) applies = true;
      }
      if (rule.type === 'earlybird' && daysUntil >= 30) applies = true;
      if (rule.type === 'lastminute' && daysUntil <= 3 && daysUntil >= 0) applies = true;
      if (applies) adj += rule.adjustment;
    }
    return Math.round(base * (1 + adj / 100));
  };
  const basePrice = calcDynamicPrice(rawBasePrice);
  const hasDynamic = basePrice !== rawBasePrice;
  const subtotal = nights * basePrice;
  const discountAmount = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setCreatedBookingCode('');

    if (!selectedUnit) return setError('Chọn phòng');
    if (!checkIn || !checkOut) return setError('Chọn ngày check-in và check-out');
    if (new Date(checkOut) <= new Date(checkIn)) return setError('Ngày check-out phải sau check-in');
    if (guestMode === 'existing' && !selectedGuest) return setError('Chọn khách');
    if (guestMode === 'new' && (!newGuest.firstName || !newGuest.lastName)) return setError('Nhập tên khách');
    if (!selectedChannel) return setError('Chọn kênh đặt phòng');
    if (discountAmount < 0) return setError('Giảm giá không hợp lệ');
    if (discountAmount > subtotal) return setError('Giảm giá không thể lớn hơn tổng tiền');

    setSaving(true);
    try {
      let guestId = selectedGuest;

      // Create new guest if needed
      if (guestMode === 'new') {
        const gRes = await apiFetch('/guests', {
          method: 'POST',
          body: JSON.stringify(newGuest),
        });
        guestId = gRes.id;
      }

      // Create booking
      const booking = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          unitId: selectedUnit,
          guestId,
          channelId: selectedChannel,
          channelRef: channelRef || null,
          status: 'CONFIRMED',
          checkInDate: new Date(checkIn).toISOString(),
          checkOutDate: new Date(checkOut).toISOString(),
          numGuests,
          totalAmount: totalAmount.toString(),
          currency: 'VND',
          specialRequests: discountAmount > 0
            ? `${specialRequests ? specialRequests + ' | ' : ''}Giảm giá: ${discountAmount.toLocaleString('vi-VN')}₫`
            : (specialRequests || null),
        }),
      });

      const bookingCode = booking.channelRef || channelRef || '—';
      setCreatedBookingCode(bookingCode);
      setSuccess(`✅ Booking tạo thành công! Mã booking: ${bookingCode} — Phòng ${selectedUnitData?.name} — ${nights} đêm — ${totalAmount.toLocaleString('vi-VN')} ₫${discountAmount > 0 ? ` (đã giảm ${discountAmount.toLocaleString('vi-VN')}₫)` : ''}`);

      // Reset form
      setSelectedGuest('');
      setSelectedUnit('');
      setCheckIn('');
      setCheckOut('');
      setNumGuests(1);
      setSpecialRequests('');
      setChannelRef('');
      setDiscount('');
      setNewGuest({ firstName: '', lastName: '', email: '', phone: '', nationality: 'VN', preferredLang: 'vi' });

    } catch (err: any) {
      setError(err.message || 'Lỗi tạo booking');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} />
    </div>
  );

  return (
    <div className="p-6 min-h-full" style={{ color: '#E2E8F0' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-white">➕ Tạo Booking mới</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>Thêm đặt phòng trực tiếp từ Dashboard</p>
        </div>

        {success && (
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-base font-bold" style={{ color: '#34D399' }}>{success}</p>
            {createdBookingCode && createdBookingCode !== '—' && (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm" style={{ color: '#3D5A80' }}>Mã check-in:</span>
                <span className="text-2xl font-black font-mono tracking-widest px-4 py-1 rounded-xl" style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>{createdBookingCode}</span>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-base font-bold" style={{ color: '#F87171' }}>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">

          {/* LEFT: Guest + Channel */}
          <div className="space-y-5">

            {/* Guest */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold text-white mb-4">👤 Thông tin khách</h3>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setGuestMode('existing')} className="px-4 py-2 rounded-xl text-sm font-bold transition"
                  style={guestMode === 'existing' ? { background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' } : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Khách cũ
                </button>
                <button onClick={() => setGuestMode('new')} className="px-4 py-2 rounded-xl text-sm font-bold transition"
                  style={guestMode === 'new' ? { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' } : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
                  + Khách mới
                </button>
              </div>

              {guestMode === 'existing' ? (
                <select value={selectedGuest} onChange={e => setSelectedGuest(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <option value="">— Chọn khách —</option>
                  {guests.map(g => (
                    <option key={g.id} value={g.id}>{g.firstName} {g.lastName} · {g.email}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Họ *" value={newGuest.firstName} onChange={e => setNewGuest({ ...newGuest, firstName: e.target.value })}
                      className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <input placeholder="Tên *" value={newGuest.lastName} onChange={e => setNewGuest({ ...newGuest, lastName: e.target.value })}
                      className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <input placeholder="Email" value={newGuest.email} onChange={e => setNewGuest({ ...newGuest, email: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <input placeholder="Số điện thoại" value={newGuest.phone} onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newGuest.nationality} onChange={e => setNewGuest({ ...newGuest, nationality: e.target.value })}
                      className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <option value="VN">🇻🇳 Việt Nam</option>
                      <option value="US">🇺🇸 Mỹ</option>
                      <option value="JP">🇯🇵 Nhật Bản</option>
                      <option value="KR">🇰🇷 Hàn Quốc</option>
                      <option value="CN">🇨🇳 Trung Quốc</option>
                      <option value="AU">🇦🇺 Úc</option>
                      <option value="GB">🇬🇧 Anh</option>
                      <option value="OTHER">Khác</option>
                    </select>
                    <select value={newGuest.preferredLang} onChange={e => setNewGuest({ ...newGuest, preferredLang: e.target.value })}
                      className="rounded-xl px-4 py-3 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ko">한국어</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Channel */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold text-white mb-4">📡 Kênh đặt phòng</h3>
              <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-3"
                style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="">— Chọn kênh —</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Mã check-in (6 số)</p>
              <div className="flex gap-2">
                <input placeholder="Mã check-in (6 số)" value={channelRef} onChange={e => setChannelRef(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                <button onClick={() => {
                  const code = String(Math.floor(100000 + Math.random() * 900000));
                  setChannelRef(code);
                }} className="px-4 py-3 rounded-xl text-sm font-bold transition active:scale-95"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)', whiteSpace: 'nowrap' }}>
                  🔄 Tự tạo
                </button>
              </div>
            </div>

            {/* Special requests */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold text-white mb-4">📝 Yêu cầu đặc biệt</h3>
              <textarea placeholder="Late check-in, extra pillows, baby bed..." value={specialRequests} onChange={e => setSpecialRequests(e.target.value)}
                rows={3} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          </div>

          {/* RIGHT: Room + Dates + Summary */}
          <div className="space-y-5">

            {/* Room selection */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold text-white mb-4">🛏️ Chọn phòng</h3>
              <div className="grid grid-cols-5 gap-2">
                {units.map(u => {
                  const isSelected = selectedUnit === u.id;
                  const isOccupied = u.status === 'OCCUPIED';
                  const isCleaning = u.status === 'CLEANING';
                  return (
                    <button key={u.id} onClick={() => {
                      setSelectedUnit(u.id);
                      setOccupiedUntil(''); setOccupiedGuest('');
                      if (u.status === 'OCCUPIED') {
                        apiFetch('/bookings?status=CHECKED_IN').then(bks => {
                          const active = bks.find(bk => (bk.unitId || bk.unit?.id) === u.id);
                          if (active) {
                            const coDate = new Date(active.checkOutDate);
                            setOccupiedUntil(coDate.toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric'}));
                            setOccupiedGuest(`${active.guest.firstName} ${active.guest.lastName}`);
                            // Auto set check-in to day after checkout
                            const nextDay = new Date(coDate);
                            nextDay.setDate(nextDay.getDate());
                            setCheckIn(nextDay.toISOString().split('T')[0]);
                          }
                        }).catch(()=>{});
                      }
                    }}
                      className="rounded-xl p-3 text-center transition active:scale-95"
                      style={isSelected
                        ? { background: 'linear-gradient(135deg,#3B82F6,#06B6D4)', border: '2px solid #60A5FA' }
                        : isOccupied
                          ? { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }
                          : isCleaning
                            ? { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className={`text-xl font-black ${isSelected ? 'text-white' : 'text-white'}`}
                        style={isOccupied ? { color: '#F87171' } : isCleaning ? { color: '#FCD34D' } : {}}>{u.name}</p>
                      <p className="text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#3D5A80' }}>
                        T{u.floor} · {isOccupied ? 'Đang ở' : isCleaning ? 'Dọn' : u.type}
                      </p>
                    </button>
                  );
                })}
              </div>
              {selectedUnitData && selectedUnitData.status === 'OCCUPIED' && (
                <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <p className="text-xs font-bold" style={{ color: '#FBBF24' }}>
                    ⚠️ Phòng {selectedUnitData.name} đang có khách {occupiedGuest ? `(${occupiedGuest})` : ''} ở đến ngày {occupiedUntil || '...'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#D97706' }}>
                    Chỉ có thể booking từ ngày {occupiedUntil || '...'} trở đi
                  </p>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-lg font-bold text-white mb-4">📅 Ngày lưu trú</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: '#3D5A80' }}>Check-in</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: '#3D5A80' }}>Check-out</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: '#3D5A80' }}>Số khách</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNumGuests(Math.max(1, numGuests - 1))} className="w-10 h-10 rounded-xl text-lg font-bold text-white"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>−</button>
                  <span className="text-2xl font-black text-white w-10 text-center">{numGuests}</span>
                  <button onClick={() => setNumGuests(Math.min(10, numGuests + 1))} className="w-10 h-10 rounded-xl text-lg font-bold text-white"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>+</button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(59,130,246,0.15)' }}>
              <h3 className="text-lg font-bold text-white mb-4">💰 Tổng kết</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#4B6A8F' }}>Phòng</span>
                  <span className="text-sm font-bold text-white">{selectedUnitData?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#4B6A8F' }}>Giá / đêm</span>
                  <span className="text-sm font-bold" style={{ color: hasDynamic ? '#F59E0B' : 'white' }}>
                    {hasDynamic && <span style={{ textDecoration: 'line-through', color: '#4B6A8F', marginRight: 6, fontSize: 12 }}>{rawBasePrice.toLocaleString('vi-VN')}</span>}
                    {basePrice.toLocaleString('vi-VN')} ₫
                    {hasDynamic && <span style={{ color: '#F59E0B', fontSize: 11, marginLeft: 4 }}>⚡</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#4B6A8F' }}>Số đêm</span>
                  <span className="text-sm font-bold text-white">{nights || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#4B6A8F' }}>Số khách</span>
                  <span className="text-sm font-bold text-white">{numGuests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#4B6A8F' }}>Tạm tính</span>
                  <span className="text-sm font-bold text-white">{subtotal > 0 ? `${subtotal.toLocaleString('vi-VN')} ₫` : '—'}</span>
                </div>

                {/* === GIẢM GIÁ — Issue #6 === */}
                <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>🏷️ Giảm giá (VND)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#3D5A80' }}>−</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      className="w-32 rounded-lg px-3 py-1.5 text-sm text-right outline-none font-bold"
                      style={{ background: '#080C18', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}
                    />
                    <span className="text-sm" style={{ color: '#3D5A80' }}>₫</span>
                  </div>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-end">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      Giảm {discountAmount.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                )}

                <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Tổng cộng</span>
                  <span className="text-2xl font-black" style={{ color: '#60A5FA' }}>
                    {totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')} ₫` : '—'}
                  </span>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={saving}
                className="w-full py-4 rounded-2xl text-lg font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)', boxShadow: '0 4px 24px rgba(59,130,246,0.3)' }}>
                {saving ? 'Đang tạo...' : '✅ Tạo Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
