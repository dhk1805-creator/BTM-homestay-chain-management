// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch, getUser, logout } from '@/lib/api';

function fmtVND(n) { return n >= 1e9 ? `${(n/1e9).toFixed(1)} tỷ` : n >= 1e6 ? `${Math.round(n/1e6)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : `${n}`; }
function timeAgo(d) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}p` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; }

const stCfg = {
  CONFIRMED:{l:'Xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA',icon:'✓'},
  CHECKED_IN:{l:'Check-in',bg:'rgba(16,185,129,0.15)',c:'#34D399',icon:'🟢'},
  CHECKED_OUT:{l:'Check-out',bg:'rgba(148,163,184,0.1)',c:'#94A3B8',icon:'📤'},
  PENDING:{l:'Chờ',bg:'rgba(251,191,36,0.15)',c:'#FBBF24',icon:'⏳'},
  CANCELLED:{l:'Hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171',icon:'✗'},
};

export default function MobileDashboard() {
  const [stats, setStats] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('');
  const [updating, setUpdating] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);
    loadData();
    const iv = setInterval(loadData, 15000);
    return () => clearInterval(iv);
  }, []);

  const loadData = () => {
    Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/dashboard/buildings'),
      apiFetch('/dashboard/bookings/recent?limit=10'),
      apiFetch('/dashboard/incidents/open'),
      apiFetch('/bookings?limit=50'),
    ]).then(([s,bl,b,i,ab]) => { setStats(s); setBuildings(bl); setBookings(b); setIncidents(i); setAllBookings(ab); })
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  const doRefresh = () => { setRefreshing(true); loadData(); };

  const updateBookingStatus = async (id, status, label) => {
    if (!confirm(`${label}?`)) return;
    setUpdating(id);
    try {
      await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      loadData();
    } catch (e) { alert('Lỗi: ' + e.message); }
    setUpdating('');
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{background:'#080C16'}}>
      <div className="w-8 h-8 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} />
    </div>
  );

  const bld = buildings[0];
  const units = bld?.units?.filter(u => u.name !== 'Owner') || [];
  const occ = units.filter(u => u.status === 'OCCUPIED').length;
  const avl = units.filter(u => u.status === 'AVAILABLE').length;
  const cln = units.filter(u => u.status === 'CLEANING').length;
  const filteredBookings = bookingFilter ? allBookings.filter(b => b.status === bookingFilter) : allBookings;

  return (
    <div className="h-[100dvh] w-screen flex flex-col overflow-hidden" style={{background:'#080C16',color:'#E2E8F0'}}>

      {/* === HEADER — compact === */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between" style={{background:'#0D1220',borderBottom:'1px solid rgba(255,255,255,0.06)',paddingTop:'max(8px, env(safe-area-inset-top))'}}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
            <span className="text-xs font-black text-white">B</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs truncate">BTM Homestay</p>
            <p className="text-[9px] truncate" style={{color:'#3D5A80'}}>{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {stats?.openIncidents > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>
              {stats.openIncidents}⚠️
            </span>
          )}
          <button onClick={doRefresh} className="p-1 rounded" style={{color: refreshing ? '#3B82F6' : '#3D5A80'}}>
            <span className={`text-sm ${refreshing ? 'animate-spin inline-block' : ''}`}>🔄</span>
          </button>
          <button onClick={logout} className="p-1 rounded" style={{color:'#3D5A80'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* === CONTENT === */}
      <div className="flex-1 overflow-auto">

        {/* ===== TAB: HOME — Dashboard Shortcut ===== */}
        {tab === 'home' && stats && (
          <div className="px-3 py-3">
            {/* 4 metrics — single row, ultra compact */}
            <div className="flex gap-1.5 mb-3">
              <div className="flex-1 rounded-lg p-2" style={{background:'linear-gradient(135deg,#122B4A,#0A1E3D)',border:'1px solid rgba(59,130,246,0.2)'}}>
                <p className="text-[8px] font-bold" style={{color:'#60A5FA'}}>DOANH THU</p>
                <p className="text-base font-black text-white">₫{fmtVND(stats.revenueThisMonth)}</p>
              </div>
              <div className="flex-1 rounded-lg p-2" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[8px] font-bold" style={{color:'#94A3B8'}}>LẤP ĐẦY</p>
                <p className="text-base font-black text-white">{stats.occupancyRate}%</p>
              </div>
              <div className="flex-1 rounded-lg p-2" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <p className="text-[8px] font-bold" style={{color:'#34D399'}}>IN/OUT</p>
                <p className="text-base font-black"><span style={{color:'#34D399'}}>{stats.todayCheckins}</span><span style={{color:'#3D5A80'}}>/</span><span style={{color:'#94A3B8'}}>{stats.todayCheckouts}</span></p>
              </div>
            </div>

            {/* Room grid — ultra compact */}
            <div className="rounded-lg p-2 mb-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-white">Sơ đồ phòng</p>
                <div className="flex gap-2">
                  <span className="text-[8px] font-bold" style={{color:'#4ADE80'}}>●{avl}</span>
                  <span className="text-[8px] font-bold" style={{color:'#FCA5A5'}}>●{occ}</span>
                  <span className="text-[8px] font-bold" style={{color:'#FCD34D'}}>●{cln}</span>
                </div>
              </div>
              <div className="space-y-1">
                {[6,5,4,3,2].map(fl => {
                  const fu = units.filter(u => u.name?.startsWith(`${fl}.`));
                  if (!fu.length) return null;
                  return (
                    <div key={fl} className="flex gap-1">
                      <div className="w-5 flex items-center justify-center text-[8px] font-bold" style={{color:'#4B6A8F'}}>{fl}</div>
                      {fu.map(u => {
                        const isOcc = u.status === 'OCCUPIED';
                        const isCln = u.status === 'CLEANING';
                        return (
                          <div key={u.id} className="flex-1 rounded py-1 text-center"
                            style={{background: isOcc ? '#2E0A0A' : isCln ? '#2E2206' : '#0A2E1A', border: `1px solid ${isOcc ? '#DC2626' : isCln ? '#D97706' : '#16A34A'}`}}>
                            <p className="text-[11px] font-black" style={{color: isOcc ? '#FCA5A5' : isCln ? '#FCD34D' : '#4ADE80'}}>{u.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent bookings — compact list */}
            <div className="rounded-lg p-2 mb-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-white">Booking gần nhất</p>
                <button onClick={() => setTab('bookings')} className="text-[9px] font-bold" style={{color:'#60A5FA'}}>Xem tất cả →</button>
              </div>
              {bookings.length === 0 ? (
                <p className="text-[10px] text-center py-3" style={{color:'#3D5A80'}}>Chưa có booking</p>
              ) : bookings.slice(0,4).map(b => {
                const sc = stCfg[b.status] || stCfg.PENDING;
                return (
                  <div key={b.id} className="flex items-center gap-2 py-1.5" style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">
                        {b.guest.firstName} {b.guest.lastName}
                        {b.channelRef && <span className="ml-1 font-mono text-[9px] px-1 rounded" style={{color:'#FBBF24',background:'rgba(251,191,36,0.1)'}}>{b.channelRef}</span>}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold flex-shrink-0" style={{color:'#4B6A8F'}}>P.{b.unit.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:sc.bg,color:sc.c}}>{sc.l}</span>
                  </div>
                );
              })}
            </div>

            {/* Incidents */}
            {incidents.length > 0 && (
              <div className="rounded-lg p-2" style={{background:'#0F1629',border:'1px solid rgba(239,68,68,0.15)'}}>
                <p className="text-[10px] font-bold mb-1" style={{color:'#F87171'}}>⚠️ Incidents ({incidents.length})</p>
                {incidents.slice(0,3).map(inc => (
                  <div key={inc.id} className="flex items-start gap-1.5 py-1" style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{background: inc.priority==='high'?'#EF4444':'#FBBF24'}} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{inc.description}</p>
                      <p className="text-[8px]" style={{color:'#3D5A80'}}>P.{inc.unit.name} · {timeAgo(inc.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: BOOKINGS — Full booking management ===== */}
        {tab === 'bookings' && (
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">📅 Bookings</p>
              <p className="text-[10px]" style={{color:'#3D5A80'}}>{filteredBookings.length} đơn</p>
            </div>
            {/* Filter pills — horizontal scroll */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1" style={{WebkitOverflowScrolling:'touch'}}>
              {[{v:'',l:'Tất cả'},{v:'PENDING',l:'Chờ'},{v:'CONFIRMED',l:'Xác nhận'},{v:'CHECKED_IN',l:'Đang ở'},{v:'CHECKED_OUT',l:'Đã trả'},{v:'CANCELLED',l:'Hủy'}].map(f => (
                <button key={f.v} onClick={() => setBookingFilter(f.v)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition"
                  style={bookingFilter===f.v?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
                  {f.l}
                </button>
              ))}
            </div>
            {/* Booking list */}
            <div className="space-y-1.5">
              {filteredBookings.length === 0 ? (
                <p className="text-xs text-center py-8" style={{color:'#3D5A80'}}>Không có booking</p>
              ) : filteredBookings.map(b => {
                const sc = stCfg[b.status] || stCfg.PENDING;
                const isUp = updating === b.id;
                const nights = Math.max(1, Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86400000));
                return (
                  <div key={b.id} className="rounded-lg p-2.5" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)',opacity:isUp?0.5:1}}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{b.guest.firstName} {b.guest.lastName}</p>
                        <p className="text-[9px]" style={{color:'#4B6A8F'}}>{b.guest.email}</p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{background:sc.bg,color:sc.c}}>{sc.icon} {sc.l}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] mb-2" style={{color:'#4B6A8F'}}>
                      <span className="font-bold text-white">P.{b.unit.name}</span>
                      <span>{new Date(b.checkInDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}→{new Date(b.checkOutDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</span>
                      <span>{nights}đ</span>
                      {b.channelRef && <span className="font-mono px-1 rounded" style={{color:'#FBBF24',background:'rgba(251,191,36,0.08)'}}>{b.channelRef}</span>}
                      <span className="ml-auto font-bold text-white">{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      {b.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateBookingStatus(b.id,'CONFIRMED','Xác nhận')} disabled={isUp}
                            className="flex-1 py-1.5 rounded text-[10px] font-bold" style={{background:'rgba(16,185,129,0.15)',color:'#34D399'}}>✓ Xác nhận</button>
                          <button onClick={() => updateBookingStatus(b.id,'CANCELLED','Hủy booking')} disabled={isUp}
                            className="py-1.5 px-2 rounded text-[10px] font-bold" style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>✗</button>
                        </>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => updateBookingStatus(b.id,'CHECKED_IN','Check-in')} disabled={isUp}
                            className="flex-1 py-1.5 rounded text-[10px] font-bold" style={{background:'rgba(59,130,246,0.15)',color:'#60A5FA'}}>🚪 Check-in</button>
                          <button onClick={() => updateBookingStatus(b.id,'CANCELLED','Hủy booking')} disabled={isUp}
                            className="py-1.5 px-2 rounded text-[10px] font-bold" style={{background:'rgba(239,68,68,0.15)',color:'#F87171'}}>✗</button>
                        </>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <button onClick={() => updateBookingStatus(b.id,'CHECKED_OUT','Check-out')} disabled={isUp}
                          className="flex-1 py-1.5 rounded text-[10px] font-bold" style={{background:'rgba(148,163,184,0.15)',color:'#94A3B8'}}>📤 Check-out</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== TAB: HOUSEKEEPING ===== */}
        {tab === 'housekeeping' && (
          <div className="px-3 py-3">
            <p className="text-sm font-bold text-white mb-2">🧹 Housekeeping</p>
            {/* Quick summary */}
            <div className="flex gap-1.5 mb-3">
              <div className="flex-1 rounded-lg p-2 text-center" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.15)'}}>
                <p className="text-lg font-black" style={{color:'#4ADE80'}}>{avl}</p>
                <p className="text-[8px] font-bold" style={{color:'#10B981'}}>Trống</p>
              </div>
              <div className="flex-1 rounded-lg p-2 text-center" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)'}}>
                <p className="text-lg font-black" style={{color:'#FCA5A5'}}>{occ}</p>
                <p className="text-[8px] font-bold" style={{color:'#EF4444'}}>Đang ở</p>
              </div>
              <div className="flex-1 rounded-lg p-2 text-center" style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.15)'}}>
                <p className="text-lg font-black" style={{color:'#FCD34D'}}>{cln}</p>
                <p className="text-[8px] font-bold" style={{color:'#FBBF24'}}>Cần dọn</p>
              </div>
            </div>
            {/* Room list */}
            <div className="space-y-1">
              {units.map(u => {
                const isOcc = u.status === 'OCCUPIED';
                const isCln = u.status === 'CLEANING';
                const isAvl = u.status === 'AVAILABLE';
                const statusColor = isOcc ? '#FCA5A5' : isCln ? '#FCD34D' : '#4ADE80';
                const statusLabel = isOcc ? 'Đang ở' : isCln ? 'Cần dọn' : 'Sẵn sàng';
                return (
                  <div key={u.id} className="rounded-lg p-2 flex items-center gap-2" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{background: isOcc?'#2E0A0A':isCln?'#2E2206':'#0A2E1A', border:`1.5px solid ${isOcc?'#DC2626':isCln?'#D97706':'#16A34A'}`, color: statusColor}}>
                      {u.name}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white">T{u.floor} · {u.type || 'Studio'}</p>
                      <span className="text-[9px] font-bold" style={{color:statusColor}}>● {statusLabel}</span>
                    </div>
                    {isCln && (
                      <button onClick={async () => {
                        try {
                          const bks = await apiFetch('/bookings?status=CHECKED_IN');
                          const hasGuest = bks.some(bk => (bk.unitId || bk.unit?.id) === u.id);
                          await apiFetch('/buildings/units/'+u.id+'/status', {method:'PATCH',body:JSON.stringify({status: hasGuest ? 'OCCUPIED' : 'AVAILABLE'})});
                          loadData();
                        } catch(e) { alert('Lỗi: '+e.message); }
                      }} className="px-2.5 py-1.5 rounded text-[10px] font-bold flex-shrink-0" style={{background:'rgba(16,185,129,0.15)',color:'#34D399',border:'1px solid rgba(16,185,129,0.25)'}}>
                        ✅ Xong
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== TAB: REPORTS — Báo cáo ngày ===== */}
        {tab === 'reports' && stats && (
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">📈 Báo cáo hôm nay</p>
              <p className="text-[10px]" style={{color:'#3D5A80'}}>{new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}</p>
            </div>

            {/* Revenue highlight */}
            <div className="rounded-lg p-3 mb-3" style={{background:'linear-gradient(135deg,#122B4A,#0A1E3D)',border:'1px solid rgba(59,130,246,0.25)'}}>
              <p className="text-[9px] font-bold" style={{color:'#60A5FA'}}>DOANH THU THÁNG</p>
              <p className="text-2xl font-black text-white">₫ {fmtVND(stats.revenueThisMonth)}</p>
              <p className="text-[10px] mt-0.5" style={{color:'#3D6FA8'}}>Từ {stats.totalBookings} bookings</p>
            </div>

            {/* Stats table */}
            <div className="rounded-lg p-2.5 mb-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              {[
                {l:'Check-in hôm nay',v:stats.todayCheckins,c:'#34D399'},
                {l:'Check-out hôm nay',v:stats.todayCheckouts,c:'#94A3B8'},
                {l:'Tỷ lệ lấp đầy',v:`${stats.occupancyRate}%`,c:'white'},
                {l:'Incidents mở',v:stats.openIncidents,c:stats.openIncidents>0?'#F87171':'#34D399'},
                {l:'Đánh giá TB',v:`${stats.avgRating.toFixed(1)} ⭐`,c:'white'},
                {l:'Tổng bookings',v:stats.totalBookings,c:'white'},
              ].map((r,i) => (
                <div key={r.l} className="flex items-center justify-between py-1.5" style={i<5?{borderBottom:'1px solid rgba(255,255,255,0.04)'}:{}}>
                  <span className="text-[11px]" style={{color:'#94A3B8'}}>{r.l}</span>
                  <span className="text-xs font-bold" style={{color:r.c}}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Room status */}
            <div className="rounded-lg p-2.5 mb-3" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-[10px] font-bold mb-2 text-white">Trạng thái phòng</p>
              <div className="flex gap-1.5">
                <div className="flex-1 rounded p-2 text-center" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.15)'}}>
                  <p className="text-lg font-black" style={{color:'#4ADE80'}}>{avl}</p>
                  <p className="text-[8px] font-bold" style={{color:'#10B981'}}>Trống</p>
                </div>
                <div className="flex-1 rounded p-2 text-center" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)'}}>
                  <p className="text-lg font-black" style={{color:'#FCA5A5'}}>{occ}</p>
                  <p className="text-[8px] font-bold" style={{color:'#EF4444'}}>Đang ở</p>
                </div>
                <div className="flex-1 rounded p-2 text-center" style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.15)'}}>
                  <p className="text-lg font-black" style={{color:'#FCD34D'}}>{cln}</p>
                  <p className="text-[8px] font-bold" style={{color:'#FBBF24'}}>Dọn phòng</p>
                </div>
              </div>
            </div>

            <a href="/dashboard" className="block rounded-lg p-2.5 text-center text-xs font-bold transition active:scale-[0.98]"
              style={{background:'rgba(59,130,246,0.1)',color:'#60A5FA',border:'1px solid rgba(59,130,246,0.2)'}}>
              📊 Mở Dashboard đầy đủ →
            </a>
          </div>
        )}
      </div>

      {/* === BOTTOM NAV — 4 tabs, compact === */}
      <div className="flex-shrink-0 flex items-center justify-around py-1.5 px-1" style={{background:'#0D1220',borderTop:'1px solid rgba(255,255,255,0.06)',paddingBottom:'max(6px, env(safe-area-inset-bottom))'}}>
        {[
          {id:'home',icon:'📊',label:'Tổng quan'},
          {id:'bookings',icon:'📅',label:'Bookings'},
          {id:'housekeeping',icon:'🧹',label:'Dọn phòng'},
          {id:'reports',icon:'📈',label:'Báo cáo'},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition"
            style={tab === t.id ? {background:'rgba(59,130,246,0.1)'} : {}}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[9px] font-bold" style={{color: tab === t.id ? '#60A5FA' : '#3D5A80'}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
