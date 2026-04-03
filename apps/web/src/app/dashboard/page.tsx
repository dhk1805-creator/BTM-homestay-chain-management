// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { apiFetch } from '@/lib/api';

interface Stats {
  totalBuildings: number; totalUnits: number; totalBookings: number;
  occupancyRate: number; revenueThisMonth: number;
  todayCheckins: number; todayCheckouts: number;
  openIncidents: number; avgRating: number; totalReviews: number;
}
interface BuildingData { id: string; name: string; city: string; _count: { units: number }; units: { id: string; name: string; status: string }[]; }
interface RecentBooking { id: string; status: string; checkInDate: string; checkOutDate: string; totalAmount: string; channelRef: string | null; guest: { firstName: string; lastName: string }; unit: { name: string; building: { name: string } }; channel: { name: string } | null; }
interface OpenIncident { id: string; priority: string; description: string; createdAt: string; unit: { name: string; building: { name: string } }; }

function fmtVND(n: number) { return n >= 1e9 ? `${(n/1e9).toFixed(1)} tỷ` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : `${n}`; }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m}p` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; }

const stCfg: Record<string,{l:string;bg:string;c:string}> = {
  CONFIRMED:{l:'Đã xác nhận',bg:'rgba(59,130,246,0.15)',c:'#60A5FA'},
  CHECKED_IN:{l:'Đã check-in',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
  CHECKED_OUT:{l:'Đã check-out',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  PENDING:{l:'Chờ xác nhận',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
  CANCELLED:{l:'Đã hủy',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
};

const avGr = ['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#F59E0B,#EF4444)','linear-gradient(135deg,#10B981,#3B82F6)','linear-gradient(135deg,#EC4899,#F97316)','linear-gradient(135deg,#06B6D4,#8B5CF6)'];
const barColors = ['#3B82F6','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EC4899','#EF4444'];

const Box = ({children,className='',style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}) => (
  <div className={`rounded-2xl ${className}`} style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)',...style}}>{children}</div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats|null>(null);
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [incidents, setIncidents] = useState<OpenIncident[]>([]);
  const [revenueChart, setRevenueChart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/dashboard/buildings'),
      apiFetch('/dashboard/bookings/recent?limit=5'),
      apiFetch('/dashboard/incidents/open'),
      apiFetch('/dashboard/revenue-chart').catch(() => null),
    ]).then(([s,bl,b,i,rc]) => { setStats(s); setBuildings(bl); setBookings(b); setIncidents(i); if (rc) setRevenueChart(rc); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      Promise.all([
        apiFetch('/dashboard/stats'),
        apiFetch('/dashboard/buildings'),
        apiFetch('/dashboard/bookings/recent?limit=5'),
        apiFetch('/dashboard/incidents/open'),
      ]).then(([s,bl,b,i]) => { setStats(s); setBuildings(bl); setBookings(b); setIncidents(i); }).catch(()=>{});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-12 h-12 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} />
    </div>
  );
  if (error || !stats) return (
    <div className="flex items-center justify-center h-full">
      <div className="rounded-2xl p-10 text-center" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
        <p className="text-red-400 font-bold text-xl mb-2">Lỗi kết nối API</p>
        <p className="text-red-300">{error}</p>
      </div>
    </div>
  );

  const bld = buildings[0];
  const units = bld?.units?.filter(u => u.name && u.name !== 'Owner') || [];
  const occ = units.filter(u => u.status === 'OCCUPIED').length;
  const avl = units.filter(u => u.status === 'AVAILABLE').length;
  const cln = units.filter(u => u.status === 'CLEANING').length;

  // REAL chart data from API (fallback to empty if not loaded)
  const rvData = revenueChart?.chartData || Array.from({length:7},(_,i) => ({ l: ['CN','T2','T3','T4','T5','T6','T7'][i], now: 0, prev: 0 }));
  const totalThisWeek = revenueChart?.totalThisWeek || 0;
  const totalLastWeek = revenueChart?.totalLastWeek || 0;
  const weekDiff = totalThisWeek - totalLastWeek;
  const weekPct = totalLastWeek > 0 ? Math.round((weekDiff / totalLastWeek) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto p-5" style={{color:'#E2E8F0'}}>
      <div className="flex flex-col gap-5 min-h-0">

        {/* === ROW 1: Header === */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Tổng quan chuỗi</h1>
            <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{stats.totalBuildings} tòa nhà · {units.length} phòng cho thuê</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm px-4 py-2 rounded-xl font-medium" style={{color:'#94A3B8',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
              📅 {new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'})}
            </div>
            {stats.openIncidents > 0 && (
              <a href="/dashboard/incidents" className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl" style={{background:'rgba(239,68,68,0.15)',color:'#F87171',border:'1px solid rgba(239,68,68,0.25)'}}>
                🔴 {stats.openIncidents} incident
              </a>
            )}
          </div>
        </div>

        {/* === ROW 2: 4 Metric Cards === */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,#122B4A,#0A1E3D)',border:'1px solid rgba(59,130,246,0.25)'}}>
            <div className="absolute -top-8 -right-8 w-28 h-28 opacity-10 rounded-full" style={{background:'radial-gradient(circle,#3B82F6,transparent)'}} />
            <p className="text-sm font-semibold mb-1" style={{color:'#60A5FA'}}>💰 Doanh thu tháng</p>
            <p className="text-3xl font-extrabold text-white">₫ {fmtVND(stats.revenueThisMonth)}</p>
            <p className="text-xs mt-1" style={{color:'#3D6FA8'}}>từ {stats.totalBookings} bookings</p>
          </div>
          <Box className="p-5">
            <p className="text-sm font-semibold mb-1" style={{color:'#94A3B8'}}>🏠 Tỉ lệ lấp đầy</p>
            <p className="text-3xl font-extrabold text-white">{stats.occupancyRate}<span className="text-xl" style={{color:'#3D5A80'}}>%</span></p>
            <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
              <div className="h-full rounded-full" style={{width:`${stats.occupancyRate}%`,background:stats.occupancyRate>=70?'linear-gradient(90deg,#10B981,#34D399)':stats.occupancyRate>=40?'linear-gradient(90deg,#F59E0B,#FBBF24)':'linear-gradient(90deg,#EF4444,#F87171)',transition:'width 1s'}} />
            </div>
            <p className="text-xs mt-1" style={{color:'#3D5A80'}}>{occ} / {units.length} phòng đang ở</p>
          </Box>
          <Box className="p-5">
            <p className="text-sm font-semibold mb-1" style={{color:'#94A3B8'}}>🚪 Hôm nay</p>
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-3xl font-extrabold" style={{color:'#34D399'}}>{stats.todayCheckins}</p>
                <p className="text-xs font-bold" style={{color:'#10B981'}}>check-in</p>
              </div>
              <span className="text-2xl" style={{color:'#1E293B'}}>/</span>
              <div>
                <p className="text-3xl font-extrabold" style={{color:'#94A3B8'}}>{stats.todayCheckouts}</p>
                <p className="text-xs font-bold" style={{color:'#64748B'}}>check-out</p>
              </div>
            </div>
          </Box>
          <Box className="p-5">
            <p className="text-sm font-semibold mb-1" style={{color:'#94A3B8'}}>⭐ Đánh giá</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-white">{stats.avgRating.toFixed(1)}</p>
              <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><span key={i} className="text-base">{i<=Math.round(stats.avgRating)?'⭐':'☆'}</span>)}</div>
            </div>
            <p className="text-xs mt-1" style={{color:'#3D5A80'}}>{stats.totalReviews} đánh giá</p>
          </Box>
        </div>

        {/* === ROW 3: Chart + Room Grid === */}
        <div className="grid grid-cols-5 gap-4">
          <Box className="col-span-3 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-white">📊 Doanh thu tuần này vs tuần trước</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-bold" style={{color:'#60A5FA'}}>Tuần này: ₫{fmtVND(totalThisWeek)}</span>
                  <span className="text-xs" style={{color:'#4B6A8F'}}>vs</span>
                  <span className="text-xs font-bold" style={{color:'#64748B'}}>Tuần trước: ₫{fmtVND(totalLastWeek)}</span>
                  {totalLastWeek > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    background: weekDiff >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: weekDiff >= 0 ? '#34D399' : '#F87171',
                  }}>{weekDiff >= 0 ? '↑' : '↓'} {Math.abs(weekPct)}%</span>}
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full" style={{background:'rgba(148,163,184,0.4)'}} />
                  <span className="text-[10px] font-bold" style={{color:'#64748B'}}>Tuần trước</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full" style={{background:'#3B82F6'}} />
                  <span className="text-[10px] font-bold" style={{color:'#60A5FA'}}>Tuần này</span>
                </div>
              </div>
            </div>
            <div className="flex-1" style={{minHeight:'240px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rvData} margin={{top:20,right:5,left:-15,bottom:0}} barGap={2} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="l" tick={{fill:'#94A3B8',fontSize:12,fontWeight:700}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#3D5A80',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={(v) => fmtVND(v)} width={45} />
                  <Tooltip
                    contentStyle={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#E2E8F0',fontSize:'12px',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}
                    formatter={(v,n) => [`₫${Number(v).toLocaleString('vi-VN')}`, n==='now'?'Tuần này':'Tuần trước']}
                    labelStyle={{color:'#60A5FA',fontWeight:700,marginBottom:4}}
                    cursor={{fill:'rgba(255,255,255,0.03)'}}
                  />
                  <Bar dataKey="prev" name="Tuần trước" radius={[4,4,0,0]} maxBarSize={32}>
                    {rvData.map((d,i) => <Cell key={i} fill="rgba(148,163,184,0.2)" />)}
                  </Bar>
                  <Bar dataKey="now" name="Tuần này" radius={[6,6,0,0]} maxBarSize={32}
                    label={{position:'top',fill:'#94A3B8',fontSize:9,fontWeight:700,formatter:(v)=>fmtVND(v)}}>
                    {rvData.map((d,i) => <Cell key={i} fill={barColors[i%7]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Box>

          <Box className="col-span-2 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">🏢 Sơ đồ phòng</h3>
              <span className="text-xs" style={{color:'#3D5A80'}}>{bld?.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[6,5,4,3,2].map(fl => {
                const fu = units.filter(u => u.name && u.name.startsWith(`${fl}.`));
                if (!fu.length) return null;
                return (
                  <div key={fl} className="flex items-stretch gap-1.5">
                    <div className="w-8 rounded-lg flex items-center justify-center font-extrabold text-xs" style={{background:'rgba(255,255,255,0.03)',color:'#4B6A8F'}}>{fl}F</div>
                    {fu.map(u => {
                      const isOcc = u.status === 'OCCUPIED'; const isCln = u.status === 'CLEANING';
                      let bg = '#0A2E1A', bc = '#16A34A', gc = 'rgba(22,163,74,0.3)', tc = '#4ADE80', si = '✓', st = 'Trống';
                      if (isOcc) { bg='#2E0A0A'; bc='#DC2626'; gc='rgba(220,38,38,0.3)'; tc='#FCA5A5'; si='●'; st='Đang ở'; }
                      else if (isCln) { bg='#2E2206'; bc='#D97706'; gc='rgba(217,119,6,0.3)'; tc='#FCD34D'; si='◐'; st='Dọn phòng'; }
                      return (
                        <div key={u.id} className="flex-1 rounded-lg cursor-pointer transition-all duration-300 hover:scale-[1.03] relative overflow-hidden"
                          style={{ background:bg, border:`2px solid ${bc}`, boxShadow:`0 0 8px ${gc}`, padding:'8px 4px' }}>
                          <div className="absolute inset-0 opacity-20" style={{background:`radial-gradient(ellipse at 50% 0%, ${bc} 0%, transparent 70%)`}} />
                          <div className="relative z-10 text-center">
                            <p className="text-lg font-black" style={{color:tc}}>{u.name}</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <span className="text-[10px]">{si}</span>
                              <span className="text-[10px] font-bold" style={{color:tc,opacity:0.8}}>{st}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="flex items-stretch gap-1.5">
                <div className="w-8 rounded-lg flex items-center justify-center font-extrabold text-xs" style={{background:'rgba(255,255,255,0.03)',color:'#4B6A8F'}}>1F</div>
                <div className="flex-1 rounded-lg py-2 text-center" style={{background:'rgba(100,116,139,0.06)',border:'2px dashed rgba(100,116,139,0.2)'}}>
                  <span className="text-xs font-bold" style={{color:'#475569'}}>🏠 Căn chủ ở</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#0A2E1A',border:'2px solid #16A34A'}} /><span className="text-xs font-semibold" style={{color:'#4ADE80'}}>Trống ({avl})</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#2E0A0A',border:'2px solid #DC2626'}} /><span className="text-xs font-semibold" style={{color:'#FCA5A5'}}>Đang ở ({occ})</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#2E2206',border:'2px solid #D97706'}} /><span className="text-xs font-semibold" style={{color:'#FCD34D'}}>Dọn ({cln})</span></div>
            </div>
          </Box>
        </div>

        {/* === ROW 4: Bookings + Incidents === */}
        <div className="grid grid-cols-2 gap-4">
          <Box className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">📋 Booking gần nhất</h3>
              <a href="/dashboard/bookings" className="text-xs font-bold" style={{color:'#60A5FA'}}>Xem tất cả →</a>
            </div>
            <div className="space-y-1">
              {bookings.length===0?<p className="text-center py-4" style={{color:'#3D5A80'}}>Chưa có booking</p>:
              bookings.map((b,i)=>{
                const sc=stCfg[b.status]||stCfg.PENDING;
                return(
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.02] transition">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0" style={{background:avGr[i%avGr.length]}}>
                      {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {b.guest.firstName} {b.guest.lastName}
                        {b.channelRef && <span className="ml-2 font-mono text-xs px-1.5 py-0.5 rounded" style={{color:'#FBBF24',background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)'}}>{b.channelRef}</span>}
                      </p>
                      <p className="text-xs" style={{color:'#3D5A80'}}>
                        Phòng {b.unit.name} · {new Date(b.checkInDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}→{new Date(b.checkOutDate).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}
                        {b.channel&&<span> · {b.channel.name}</span>}
                      </p>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{background:sc.bg,color:sc.c}}>{sc.l}</span>
                  </div>
                );
              })}
            </div>
          </Box>

          <Box className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">🚨 Incidents mở</h3>
              <a href="/dashboard/incidents" className="text-xs font-bold" style={{color:'#60A5FA'}}>Quản lý →</a>
            </div>
            <div>
              {incidents.length===0?(
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{background:'rgba(16,185,129,0.1)'}}><span className="text-2xl">✅</span></div>
                  <p className="text-base font-bold text-white">Tuyệt vời!</p>
                  <p className="text-xs" style={{color:'#3D5A80'}}>Không có incident mở</p>
                </div>
              ):(
                <div className="space-y-1">
                  {incidents.map(inc=>{
                    const dot=inc.priority==='high'?'#EF4444':inc.priority==='medium'?'#FBBF24':'#34D399';
                    const bl2=inc.priority==='high'?'rgba(239,68,68,0.15)':inc.priority==='medium'?'rgba(251,191,36,0.15)':'rgba(16,185,129,0.15)';
                    const bt=inc.priority==='high'?'#F87171':inc.priority==='medium'?'#FBBF24':'#34D399';
                    const lb=inc.priority==='high'?'Khẩn':inc.priority==='medium'?'Trung bình':'Thấp';
                    return(
                      <div key={inc.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition cursor-pointer">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{background:dot,boxShadow:`0 0 8px ${dot}50`}} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{inc.description}</p>
                          <p className="text-xs mt-0.5" style={{color:'#3D5A80'}}>Phòng {inc.unit.name} · {inc.unit.building.name} · {timeAgo(inc.createdAt)}</p>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{background:bl2,color:bt}}>{lb}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Box>
        </div>

        {/* === ROW 5: Footer stats === */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {icon:'🤖',label:'AI Agent',value:'Lena — Online',color:'#34D399'},
            {icon:'📡',label:'Kênh',value:'6 kênh hoạt động',color:'#60A5FA'},
            {icon:'👥',label:'Tổng khách',value:`${stats.totalBookings} lượt đặt`,color:'#FBBF24'},
            {icon:'🔒',label:'Smart Locks',value:`${units.length} thiết bị`,color:'#A78BFA'},
          ].map(item=>(
            <div key={item.label} className="rounded-xl p-3 flex items-center gap-3" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="text-[11px] font-medium" style={{color:'#3D5A80'}}>{item.label}</p>
                <p className="text-sm font-bold" style={{color:item.color}}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
