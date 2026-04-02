// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookingItem {
  id: string; status: string; checkInDate: string; checkOutDate: string;
  numGuests: number; totalAmount: string; currency: string; channelRef: string | null;
  unitId: string;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  unit: { id: string; name: string; floor: number; building: { name: string } };
  channel: { id: string; name: string } | null;
}

const stCfg = {
  PENDING:{l:'Chờ xác nhận',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
  CONFIRMED:{l:'Đã xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA'},
  CHECKED_IN:{l:'Đã check-in',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
  CHECKED_OUT:{l:'Đã check-out',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  CANCELLED:{l:'Đã hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
};

const avGr = ['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#F59E0B,#EF4444)','linear-gradient(135deg,#10B981,#3B82F6)','linear-gradient(135deg,#EC4899,#F97316)'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState('');
  const [units, setUnits] = useState<any[]>([]);

  // Edit modal
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
    if (!confirm(`Bạn chắc chắn muốn ${label} booking này?`)) return;
    setUpdating(id);
    try {
      await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadBookings();
    } catch (e) { alert('Lỗi: ' + (e as any).message); }
    setUpdating('');
  };

  const openEdit = (b: BookingItem) => {
    setEditBooking(b);
    setEditCheckIn(new Date(b.checkInDate).toISOString().split('T')[0]);
    setEditCheckOut(new Date(b.checkOutDate).toISOString().split('T')[0]);
    setEditAmount(b.totalAmount);
    setEditGuests(b.numGuests);
    setEditUnit(b.unitId || b.unit?.id || '');
    setEditMsg('');
  };

  const saveEdit = async () => {
    if (!editBooking) return;
    setEditSaving(true); setEditMsg('');
    try {
      await apiFetch(`/bookings/${editBooking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          checkInDate: new Date(editCheckIn).toISOString(),
          checkOutDate: new Date(editCheckOut).toISOString(),
          totalAmount: editAmount,
          numGuests: editGuests,
          unitId: editUnit,
        }),
      });
      setEditMsg('✅ Cập nhật thành công!');
      loadBookings();
      setTimeout(() => setEditBooking(null), 1000);
    } catch (e: any) { setEditMsg('❌ ' + e.message); }
    setEditSaving(false);
  };

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">📅 Bookings</h1>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{bookings.length} đơn đặt phòng</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{v:'',l:'Tất cả'},{v:'PENDING',l:'Chờ xác nhận'},{v:'CONFIRMED',l:'Đã xác nhận'},{v:'CHECKED_IN',l:'Đang ở'},{v:'CHECKED_OUT',l:'Đã trả'},{v:'CANCELLED',l:'Đã hủy'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)} className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={filter===f.v?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
          <div className="rounded-2xl p-6 max-w-lg w-full mx-4" style={{background:'#0F1629',border:'1px solid rgba(59,130,246,0.2)'}}>
            <h3 className="text-lg font-bold text-white mb-4">✏️ Sửa Booking — {editBooking.guest.firstName} {editBooking.guest.lastName}</h3>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Check-in</p>
                  <input type="date" value={editCheckIn} onChange={e=>setEditCheckIn(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Check-out</p>
                  <input type="date" value={editCheckOut} onChange={e=>setEditCheckOut(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Phòng</p>
                <select value={editUnit} onChange={e=>setEditUnit(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {units.map(u => <option key={u.id} value={u.id}>P.{u.name} (T{u.floor}) — {u.status}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Giá tổng (VND)</p>
                  <input type="number" value={editAmount} onChange={e=>setEditAmount(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Số khách</p>
                  <input type="number" value={editGuests} onChange={e=>setEditGuests(Number(e.target.value))} min={1} max={10}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{background:'#080C18',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
              </div>
            </div>
            {editMsg && <p className="text-sm mb-3" style={{color:editMsg.includes('✅')?'#34D399':'#F87171'}}>{editMsg}</p>}
            <div className="flex gap-3">
              <button onClick={()=>setEditBooking(null)} className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{background:'rgba(255,255,255,0.04)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.08)'}}>Hủy</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40"
                style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>{editSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-bold text-white">Chưa có booking nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b,i) => {
            const sc = stCfg[b.status] || stCfg.PENDING;
            const isUp = updating === b.id;
            return (
              <div key={b.id} className="rounded-2xl p-5 flex items-center gap-4 transition hover:bg-white/[0.02]"
                style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)',opacity:isUp?0.5:1}}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{background:avGr[i%avGr.length]}}>
                  {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{b.guest.firstName} {b.guest.lastName}</p>
                  <p className="text-sm" style={{color:'#4B6A8F'}}>{b.guest.email}</p>
                </div>
                <div className="text-center px-2 flex-shrink-0">
                  <p className="text-[10px] font-bold mb-0.5" style={{color:'#3D5A80'}}>Mã booking</p>
                  <p className="text-base font-black font-mono tracking-widest px-2 py-0.5 rounded-lg"
                    style={{color:'#FBBF24',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)'}}>
                    {b.channelRef || '—'}
                  </p>
                </div>
                <div className="text-center px-3">
                  <p className="text-lg font-black text-white">{b.unit.name}</p>
                  <p className="text-xs" style={{color:'#4B6A8F'}}>{b.unit.building.name}</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-sm font-semibold text-white">{new Date(b.checkInDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</p>
                  <p className="text-xs" style={{color:'#4B6A8F'}}>→ {new Date(b.checkOutDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-sm font-bold" style={{color:'#60A5FA'}}>{b.channel?.name || 'Direct'}</p>
                </div>
                <div className="text-right px-2">
                  <p className="text-sm font-bold text-white">{Number(b.totalAmount).toLocaleString('vi-VN')}₫</p>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full font-bold flex-shrink-0" style={{background:sc.bg,color:sc.c}}>{sc.l}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  {/* Edit button — for active bookings */}
                  {['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status) && (
                    <button onClick={()=>openEdit(b)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{background:'rgba(139,92,246,0.15)',color:'#A78BFA',border:'1px solid rgba(139,92,246,0.25)'}}>
                      ✏️ Sửa
                    </button>
                  )}
                  {b.status === 'PENDING' && (
                    <button onClick={()=>updateStatus(b.id,'CONFIRMED','xác nhận')} disabled={isUp}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(16,185,129,0.15)',color:'#34D399',border:'1px solid rgba(16,185,129,0.25)'}}>
                      ✓ Xác nhận
                    </button>
                  )}
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <button onClick={()=>updateStatus(b.id,'CANCELLED','hủy')} disabled={isUp}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(239,68,68,0.15)',color:'#F87171',border:'1px solid rgba(239,68,68,0.25)'}}>
                      ✗ Hủy
                    </button>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <button onClick={()=>updateStatus(b.id,'CHECKED_IN','check-in')} disabled={isUp}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA',border:'1px solid rgba(59,130,246,0.25)'}}>
                      🚪 Check-in
                    </button>
                  )}
                  {b.status === 'CHECKED_IN' && (
                    <button onClick={()=>updateStatus(b.id,'CHECKED_OUT','check-out')} disabled={isUp}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(148,163,184,0.15)',color:'#94A3B8',border:'1px solid rgba(148,163,184,0.25)'}}>
                      📤 Check-out
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
