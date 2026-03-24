// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookingItem {
  id: string; status: string; checkInDate: string; checkOutDate: string;
  numGuests: number; totalAmount: string; currency: string;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  unit: { name: string; building: { name: string } };
  channel: { name: string } | null;
}

const stCfg = {
  PENDING:{l:'Chờ xác nhận',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
  CONFIRMED:{l:'Đã xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA'},
  CHECKED_IN:{l:'Đang ở',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
  CHECKED_OUT:{l:'Đã trả',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  CANCELLED:{l:'Đã hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
};

const avGr = ['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#F59E0B,#EF4444)','linear-gradient(135deg,#10B981,#3B82F6)','linear-gradient(135deg,#EC4899,#F97316)'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState('');

  const loadBookings = () => {
    setLoading(true);
    apiFetch(`/bookings${filter ? `?status=${filter}` : ''}`).then(setBookings).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [filter]);

  const updateStatus = async (id: string, status: string, label: string) => {
    if (!confirm(`Bạn chắc chắn muốn ${label} booking này?`)) return;
    setUpdating(id);
    try {
      await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadBookings();
    } catch (e) {
      alert('Lỗi: ' + (e as any).message);
    }
    setUpdating('');
  };

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">📅 Bookings</h1>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{bookings.length} đơn đặt phòng</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{v:'',l:'Tất cả'},{v:'PENDING',l:'Chờ'},{v:'CONFIRMED',l:'Xác nhận'},{v:'CHECKED_IN',l:'Đang ở'},{v:'CHECKED_OUT',l:'Đã trả'},{v:'CANCELLED',l:'Đã hủy'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)} className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={filter===f.v?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

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
