'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function fmtVND(n: number) { return n >= 1e6 ? `${Math.round(n/1e6)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : `${n}`; }

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch('/dashboard/stats'), apiFetch('/bookings?limit=50')])
      .then(([s, b]) => { setStats(s); setBookings(b); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  const checkedOut = bookings.filter(b => b.status === 'CHECKED_OUT').length;
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
  const checkedIn = bookings.filter(b => b.status === 'CHECKED_IN').length;
  const totalRevenue = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const channels = ['AirBnB','Booking.com','Direct','Agoda','Zalo/Facebook'];

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">📈 Báo cáo</h1>
        <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Tổng quan hiệu suất vận hành</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {icon:'💰',label:'Tổng doanh thu',value:`₫ ${fmtVND(totalRevenue)}`,sub:`${bookings.length} bookings`,color:'#60A5FA'},
          {icon:'🏠',label:'Tỉ lệ lấp đầy',value:`${stats?.occupancyRate || 0}%`,sub:`${stats?.totalUnits || 0} phòng`,color:'#34D399'},
          {icon:'⭐',label:'Rating TB',value:stats?.avgRating?.toFixed(1) || '0',sub:`${stats?.totalReviews || 0} reviews`,color:'#FBBF24'},
          {icon:'⚠️',label:'Incidents mở',value:`${stats?.openIncidents || 0}`,sub:'đang xử lý',color:'#F87171'},
        ].map(m=>(
          <div key={m.label} className="rounded-2xl p-5" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-base font-semibold mb-2" style={{color:'#94A3B8'}}>{m.icon} {m.label}</p>
            <p className="text-3xl font-extrabold text-white">{m.value}</p>
            <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-6 text-center" style={{background:'#0F1629',border:'1px solid rgba(59,130,246,0.15)'}}>
          <p className="text-4xl font-black" style={{color:'#60A5FA'}}>{confirmed}</p>
          <p className="text-base font-semibold mt-2" style={{color:'#94A3B8'}}>Đã xác nhận</p>
        </div>
        <div className="rounded-2xl p-6 text-center" style={{background:'#0F1629',border:'1px solid rgba(16,185,129,0.15)'}}>
          <p className="text-4xl font-black" style={{color:'#34D399'}}>{checkedIn}</p>
          <p className="text-base font-semibold mt-2" style={{color:'#94A3B8'}}>Đang lưu trú</p>
        </div>
        <div className="rounded-2xl p-6 text-center" style={{background:'#0F1629',border:'1px solid rgba(148,163,184,0.1)'}}>
          <p className="text-4xl font-black" style={{color:'#94A3B8'}}>{checkedOut}</p>
          <p className="text-base font-semibold mt-2" style={{color:'#94A3B8'}}>Đã check-out</p>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
        <h3 className="text-lg font-bold text-white mb-5">📊 Booking theo kênh</h3>
        <div className="space-y-3">
          {channels.map(ch => {
            const count = bookings.filter(b => b.channel?.name === ch).length;
            const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
            return (
              <div key={ch} className="flex items-center gap-4">
                <span className="text-sm font-semibold w-32" style={{color:'#94A3B8'}}>{ch}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.04)'}}>
                  <div className="h-full rounded-full" style={{width:`${pct}%`,background:'linear-gradient(90deg,#3B82F6,#06B6D4)',transition:'width 0.5s'}} />
                </div>
                <span className="text-sm font-bold w-20 text-right" style={{color:'#60A5FA'}}>{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
