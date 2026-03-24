// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getUser, logout } from '@/lib/api';

function fmtVND(n) { return n >= 1e9 ? `${(n/1e9).toFixed(1)} tỷ` : n >= 1e6 ? `${Math.round(n/1e6)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : `${n}`; }

const stCfg = {
  CONFIRMED:{l:'Đã xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA'},
  CHECKED_IN:{l:'Đã check-in',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
  CHECKED_OUT:{l:'Đã check-out',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  PENDING:{l:'Chờ xác nhận',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
  CANCELLED:{l:'Đã hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
};

export default function MobileDashboard() {
  const [stats, setStats] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/dashboard/buildings'),
      apiFetch('/dashboard/bookings/recent?limit=10'),
      apiFetch('/dashboard/incidents/open'),
    ]).then(([s,bl,b,i]) => { setStats(s); setBuildings(bl); setBookings(b); setIncidents(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{background:'#080C16'}}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} />
    </div>
  );

  const bld = buildings[0];
  const units = bld?.units?.filter(u => u.name !== 'Owner') || [];
  const occ = units.filter(u => u.status === 'OCCUPIED').length;
  const avl = units.filter(u => u.status === 'AVAILABLE').length;

  return (
    <div className="min-h-screen" style={{background:'#080C16',color:'#E2E8F0'}}>

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{background:'#0D1220',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.9)"/>
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)"/>
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">BTM Homestay</p>
            <p className="text-[10px]" style={{color:'#3D5A80'}}>{user?.name} · {user?.role === 'CHAIN_ADMIN' ? 'Admin' : user?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats?.openIncidents > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>
              {stats.openIncidents} ⚠️
            </span>
          )}
          <button onClick={logout} className="p-1.5 rounded-lg" style={{color:'#3D5A80'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-24">

        {tab === 'home' && stats && (
          <>
            {/* Metrics 2x2 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl p-3" style={{background:'linear-gradient(135deg,#122B4A,#0A1E3D)',border:'1px solid rgba(59,130,246,0.25)'}}>
                <p className="text-[10px] font-bold" style={{color:'#60A5FA'}}>Doanh thu tháng</p>
                <p className="text-xl font-black text-white">₫ {fmtVND(stats.revenueThisMonth)}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] font-bold" style={{color:'#94A3B8'}}>Lấp đầy</p>
                <p className="text-xl font-black text-white">{stats.occupancyRate}%</p>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${stats.occupancyRate}%`,background:stats.occupancyRate>=70?'#10B981':'#F59E0B'}} />
                </div>
              </div>
              <div className="rounded-xl p-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] font-bold" style={{color:'#94A3B8'}}>Hôm nay</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black" style={{color:'#34D399'}}>{stats.todayCheckins}</span>
                  <span className="text-xs" style={{color:'#3D5A80'}}>in</span>
                  <span className="text-xl font-black" style={{color:'#94A3B8'}}>{stats.todayCheckouts}</span>
                  <span className="text-xs" style={{color:'#3D5A80'}}>out</span>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[10px] font-bold" style={{color:'#94A3B8'}}>Đánh giá</p>
                <p className="text-xl font-black text-white">{stats.avgRating.toFixed(1)} ⭐</p>
              </div>
            </div>

            {/* Room grid compact */}
            <div className="rounded-xl p-3 mb-4" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-xs font-bold mb-2 text-white">Sơ đồ phòng · {bld?.name}</p>
              <div className="space-y-1.5">
                {[6,5,4,3,2].map(fl => {
                  const fu = units.filter(u => u.name?.startsWith(`${fl}.`));
                  if (!fu.length) return null;
                  return (
                    <div key={fl} className="flex gap-1.5">
                      <div className="w-6 rounded flex items-center justify-center text-[10px] font-bold" style={{color:'#4B6A8F'}}>{fl}F</div>
                      {fu.map(u => {
                        const isOcc = u.status === 'OCCUPIED';
                        const isCln = u.status === 'CLEANING';
                        return (
                          <div key={u.id} className="flex-1 rounded-lg py-2 text-center"
                            style={{
                              background: isOcc ? '#2E0A0A' : isCln ? '#2E2206' : '#0A2E1A',
                              border: `1.5px solid ${isOcc ? '#DC2626' : isCln ? '#D97706' : '#16A34A'}`,
                            }}>
                            <p className="text-sm font-black" style={{color: isOcc ? '#FCA5A5' : isCln ? '#FCD34D' : '#4ADE80'}}>{u.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 pt-2" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <span className="text-[10px] font-bold" style={{color:'#4ADE80'}}>● Trống ({avl})</span>
                <span className="text-[10px] font-bold" style={{color:'#FCA5A5'}}>● Đang ở ({occ})</span>
              </div>
            </div>

            {/* Recent bookings */}
            <div className="rounded-xl p-3 mb-4" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-xs font-bold mb-2 text-white">Booking gần nhất</p>
              <div className="space-y-1.5">
                {bookings.slice(0,5).map((b,i) => {
                  const sc = stCfg[b.status] || stCfg.PENDING;
                  return (
                    <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg" style={{background:'rgba(255,255,255,0.02)'}}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                        style={{background:['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#10B981,#3B82F6)'][i%3]}}>
                        {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{b.guest.firstName} {b.guest.lastName}</p>
                        <p className="text-[10px]" style={{color:'#3D5A80'}}>P.{b.unit.name} · {b.channelRef || ''}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:sc.bg,color:sc.c}}>{sc.l}</span>
                    </div>
                  );
                })}
                {bookings.length === 0 && <p className="text-xs text-center py-4" style={{color:'#3D5A80'}}>Chưa có booking</p>}
              </div>
            </div>

            {/* Incidents */}
            {incidents.length > 0 && (
              <div className="rounded-xl p-3 mb-4" style={{background:'#0F1629',border:'1px solid rgba(239,68,68,0.15)'}}>
                <p className="text-xs font-bold mb-2" style={{color:'#F87171'}}>⚠️ Incidents ({incidents.length})</p>
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-start gap-2 p-2 rounded-lg mb-1" style={{background:'rgba(255,255,255,0.02)'}}>
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{background: inc.priority==='high'?'#EF4444':'#FBBF24'}} />
                    <div>
                      <p className="text-xs font-semibold text-white">{inc.description}</p>
                      <p className="text-[10px]" style={{color:'#3D5A80'}}>P.{inc.unit.name} · {inc.unit.building.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'bookings' && (
          <>
            <p className="text-sm font-bold text-white mb-3">📅 Tất cả Bookings</p>
            <div className="space-y-1.5">
              {bookings.map((b,i) => {
                const sc = stCfg[b.status] || stCfg.PENDING;
                return (
                  <div key={b.id} className="rounded-xl p-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                        style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
                        {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{b.guest.firstName} {b.guest.lastName}</p>
                        <p className="text-[10px]" style={{color:'#3D5A80'}}>{b.guest.email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:sc.bg,color:sc.c}}>{sc.l}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{color:'#4B6A8F'}}>
                      <span>P.{b.unit.name}</span>
                      <span>{new Date(b.checkInDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})} → {new Date(b.checkOutDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</span>
                      <span className="ml-auto font-bold" style={{color:'#60A5FA'}}>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'rooms' && (
          <>
            <p className="text-sm font-bold text-white mb-3">🏢 Phòng · {bld?.name}</p>
            <div className="space-y-1.5">
              {units.map(u => {
                const isOcc = u.status === 'OCCUPIED';
                const isCln = u.status === 'CLEANING';
                return (
                  <div key={u.id} className="rounded-xl p-3 flex items-center gap-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                      style={{
                        background: isOcc ? '#2E0A0A' : isCln ? '#2E2206' : '#0A2E1A',
                        border: `2px solid ${isOcc ? '#DC2626' : isCln ? '#D97706' : '#16A34A'}`,
                        color: isOcc ? '#FCA5A5' : isCln ? '#FCD34D' : '#4ADE80',
                      }}>
                      {u.name}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{u.type || 'Studio'} · Tầng {u.floor}</p>
                      <p className="text-xs" style={{color: isOcc ? '#FCA5A5' : isCln ? '#FCD34D' : '#4ADE80'}}>
                        {isOcc ? '● Đang ở' : isCln ? '● Dọn phòng' : '● Trống'}
                      </p>
                    </div>
                    {u.basePrice && <p className="ml-auto text-xs font-bold" style={{color:'#60A5FA'}}>{Number(u.basePrice).toLocaleString('vi-VN')}₫</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'ai' && (
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
            <iframe src="/dashboard/ai-agent" className="w-full border-0" style={{height:'calc(100vh - 160px)',background:'#080C16'}} />
          </div>
        )}
      </div>

      {/* Bottom nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 px-2" style={{background:'#0D1220',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        {[
          {id:'home',icon:'📊',label:'Tổng quan'},
          {id:'bookings',icon:'📅',label:'Bookings'},
          {id:'rooms',icon:'🏢',label:'Phòng'},
          {id:'ai',icon:'🤖',label:'Lena AI'},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition"
            style={tab === t.id ? {background:'rgba(59,130,246,0.1)'} : {}}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-[10px] font-bold" style={{color: tab === t.id ? '#60A5FA' : '#3D5A80'}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
