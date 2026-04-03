// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookingItem {
  id: string; status: string; checkInDate: string; checkOutDate: string;
  numGuests: number; totalAmount: string; currency: string; channelRef: string | null;
  unitId: string; guestBookingCount?: number;
  guest: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  unit: { id: string; name: string; floor: number; building: { name: string } };
  channel: { id: string; name: string } | null;
}

const stCfg: Record<string,{l:string;bg:string;c:string}> = {
  PENDING:{l:'Chờ xác nhận',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
  CONFIRMED:{l:'Đã xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA'},
  CHECKED_IN:{l:'Đang ở',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
  CHECKED_OUT:{l:'Đã trả',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  CANCELLED:{l:'Đã hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [editBooking, setEditBooking] = useState<BookingItem | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editGuests, setEditGuests] = useState(1);
  const [editUnit, setEditUnit] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/bookings${filter ? `?status=${filter}` : '?limit=100'}`),
      apiFetch('/dashboard/buildings'),
    ]).then(([b, bl]) => {
      setBookings(b);
      if (bl[0]?.units) setUnits(bl[0].units.filter((u: any) => u.name !== 'Owner'));
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [filter]);

  const updateStatus = async (id: string, status: string, label: string) => {
    if (!confirm(`${label} booking này?`)) return;
    setUpdating(id);
    try { await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); loadBookings(); } catch (e) { alert('Lỗi: ' + (e as any).message); }
    setUpdating('');
  };

  const openEdit = (b: BookingItem) => {
    setEditBooking(b);
    setEditCheckIn(new Date(b.checkInDate).toISOString().split('T')[0]);
    setEditCheckOut(new Date(b.checkOutDate).toISOString().split('T')[0]);
    setEditAmount(b.totalAmount); setEditGuests(b.numGuests);
    setEditUnit(b.unitId || b.unit?.id || ''); setEditMsg('');
  };

  const saveEdit = async () => {
    if (!editBooking) return;
    setEditSaving(true); setEditMsg('');
    try {
      await apiFetch(`/bookings/${editBooking.id}`, { method: 'PATCH', body: JSON.stringify({ checkInDate: new Date(editCheckIn).toISOString(), checkOutDate: new Date(editCheckOut).toISOString(), totalAmount: editAmount, numGuests: editGuests, unitId: editUnit }) });
      setEditMsg('✅ Cập nhật thành công!'); loadBookings();
      setTimeout(() => setEditBooking(null), 800);
    } catch (e: any) { setEditMsg('❌ ' + e.message); }
    setEditSaving(false);
  };

  const fmtD = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const fmtVND = (n: string | number) => Number(n).toLocaleString('vi-VN');

  // Stats
  const newGuests = bookings.filter(b => (b.guestBookingCount || 1) <= 1).length;
  const returningGuests = bookings.filter(b => (b.guestBookingCount || 1) > 1).length;

  return (
    <div className="p-6 min-h-full" style={{ color: '#E2E8F0' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">📅 Bookings</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>
            {bookings.length} đơn · Khách mới: {newGuests} · Khách cũ: {returningGuests}
            {bookings.length > 0 && <span> · Tỷ lệ quay lại: {Math.round(returningGuests / bookings.length * 100)}%</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ v: '', l: 'Tất cả' }, { v: 'PENDING', l: 'Chờ xác nhận' }, { v: 'CONFIRMED', l: 'Đã xác nhận' }, { v: 'CHECKED_IN', l: 'Đang ở' }, { v: 'CHECKED_OUT', l: 'Đã trả' }, { v: 'CANCELLED', l: 'Đã hủy' }].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={filter === f.v ? { background: 'linear-gradient(135deg,#3B82F6,#06B6D4)', color: 'white' } : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 max-w-lg w-full mx-4" style={{ background: '#0F1629', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 className="text-lg font-bold text-white mb-4">✏️ Sửa Booking — {editBooking.guest.firstName} {editBooking.guest.lastName}</h3>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Check-in</p>
                  <input type="date" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                <div><p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Check-out</p>
                  <input type="date" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
              </div>
              <div><p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Phòng</p>
                <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {units.map(u => <option key={u.id} value={u.id}>P.{u.name} (T{u.floor}) — {u.status}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Giá tổng (VND)</p>
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
                <div><p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Số khách</p>
                  <input type="number" value={editGuests} onChange={e => setEditGuests(Number(e.target.value))} min={1} max={10} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#080C18', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} /></div>
              </div>
            </div>
            {editMsg && <p className="text-sm mb-3" style={{ color: editMsg.includes('✅') ? '#34D399' : '#F87171' }}>{editMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEditBooking(null)} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.08)' }}>Hủy</button>
              <button onClick={saveEdit} disabled={editSaving} className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>{editSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16"><p className="text-5xl mb-4">📅</p><p className="text-lg font-bold text-white">Chưa có booking nào</p></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '1100px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th className="text-left px-4 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Khách</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Mã</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Phòng</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Check-in</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Check-out</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Kênh</th>
                  <th className="text-right px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Giá</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Khách</th>
                  <th className="text-center px-2 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Trạng thái</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#3D5A80' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const sc = stCfg[b.status] || stCfg.PENDING;
                  const isUp = updating === b.id;
                  const count = b.guestBookingCount || 1;
                  const isNew = count <= 1;
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', opacity: isUp ? 0.5 : 1 }}>
                      {/* Khách */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-white whitespace-nowrap">{b.guest.firstName} {b.guest.lastName}</p>
                        <p className="text-[11px]" style={{ color: '#4B6A8F' }}>{b.guest.phone || b.guest.email}</p>
                      </td>
                      {/* Mã */}
                      <td className="px-2 py-3 text-center">
                        {b.channelRef ? <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>{b.channelRef}</span>
                        : <span className="text-xs" style={{ color: '#3D5A80' }}>—</span>}
                      </td>
                      {/* Phòng */}
                      <td className="px-2 py-3 text-center">
                        <span className="text-base font-black text-white">{b.unit.name}</span>
                      </td>
                      {/* Check-in */}
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <span className="text-sm text-white">{fmtD(b.checkInDate)}</span>
                      </td>
                      {/* Check-out */}
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <span className="text-sm text-white/70">{fmtD(b.checkOutDate)}</span>
                      </td>
                      {/* Kênh */}
                      <td className="px-2 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: '#60A5FA' }}>{b.channel?.name || 'Direct'}</span>
                      </td>
                      {/* Giá */}
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <span className="text-sm font-bold text-white">{fmtVND(b.totalAmount)}₫</span>
                      </td>
                      {/* Khách mới/cũ */}
                      <td className="px-2 py-3 text-center">
                        {isNew ? (
                          <span className="text-[11px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(6,182,212,0.15)', color: '#22D3EE' }}>Mới</span>
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24' }}>Cũ ({count})</span>
                        )}
                      </td>
                      {/* Trạng thái */}
                      <td className="px-2 py-3 text-center">
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap" style={{ background: sc.bg, color: sc.c }}>{sc.l}</span>
                      </td>
                      {/* Thao tác */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          {b.status === 'PENDING' && <>
                            <button onClick={() => updateStatus(b.id, 'CONFIRMED', 'Xác nhận')} disabled={isUp} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>✓</button>
                            <button onClick={() => updateStatus(b.id, 'CANCELLED', 'Hủy')} disabled={isUp} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>✗</button>
                          </>}
                          {b.status === 'CONFIRMED' && <>
                            <button onClick={() => updateStatus(b.id, 'CHECKED_IN', 'Check-in')} disabled={isUp} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}>🚪 In</button>
                            <button onClick={() => updateStatus(b.id, 'CANCELLED', 'Hủy')} disabled={isUp} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>✗</button>
                          </>}
                          {b.status === 'CHECKED_IN' && (
                            <button onClick={() => updateStatus(b.id, 'CHECKED_OUT', 'Check-out')} disabled={isUp} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.25)' }}>📤 Out</button>
                          )}
                          {['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) && (
                            <button onClick={() => openEdit(b)} className="px-2 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>✏️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
