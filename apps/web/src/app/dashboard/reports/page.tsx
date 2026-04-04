// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Stats {
  totalBuildings: number; totalUnits: number; totalBookings: number;
  occupancyRate: number; revenueThisMonth: number;
  todayCheckins: number; todayCheckouts: number;
  openIncidents: number; avgRating: number; totalReviews: number;
}
interface BuildingData { id: string; name: string; city: string; units: { id: string; name: string; status: string }[]; }
interface Booking { id: string; status: string; checkInDate: string; checkOutDate: string; totalAmount: string; guest: { firstName: string; lastName: string }; unit: { name: string; building: { name: string } }; channel: { name: string } | null; }
interface Incident { id: string; priority: string; description: string; status: string; createdAt: string; unit: { name: string; building: { name: string } }; }

function fmtVND(n: number) { return n >= 1e9 ? `${(n/1e9).toFixed(1)} ty` : n >= 1e6 ? `${Math.round(n/1e6)}M` : n >= 1e3 ? `${Math.round(n/1e3)}K` : `${n}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 60 ? `${m} phut truoc` : m < 1440 ? `${Math.floor(m/60)}h truoc` : `${Math.floor(m/1440)} ngay truoc`; }

const Box = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`rounded-2xl ${className}`} style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)', ...style }}>{children}</div>
);

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDate] = useState(new Date());
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState('all');
  const [channelList, setChannelList] = useState<{id:string;name:string;type:string}[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/dashboard/buildings'),
      apiFetch('/bookings?limit=200'),
      apiFetch('/dashboard/incidents/open'),
      apiFetch('/bookings/channels'),
    ]).then(([s, bl, b, i, chs]) => {
      setStats(s); setBuildings(bl); setBookings(b); setIncidents(i); setChannelList(chs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const askAI = async () => {
    if (!aiQuestion.trim() || !stats) return;
    setAiLoading(true);
    setAiAnswer('');
    try {
      const reportContext = buildReportContext();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: `Ban la Lena, AI Agent quan ly homestay BTM 03 Da Nang. Day la du lieu bao cao hom nay:\n\n${reportContext}\n\nAdmin hoi: ${aiQuestion}\n\nTra loi ngan gon, chinh xac, bang tieng Viet. Dung so lieu cu the tu bao cao.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'Khong co phan hoi';
      setAiAnswer(text);
    } catch (e: any) {
      setAiAnswer('Loi ket noi AI: ' + e.message);
    }
    setAiLoading(false);
  };

  const buildReportContext = () => {
    const units = buildings[0]?.units?.filter(u => u.name !== 'Owner') || [];
    const occ = units.filter(u => u.status === 'OCCUPIED').length;
    const avl = units.filter(u => u.status === 'AVAILABLE').length;
    const cln = units.filter(u => u.status === 'CLEANING').length;
    const todayBookings = bookings.filter(b => {
      const ci = new Date(b.checkInDate).toDateString();
      const co = new Date(b.checkOutDate).toDateString();
      const today = new Date().toDateString();
      return ci === today || co === today;
    });

    return `Ngay: ${reportDate.toLocaleDateString('vi-VN')}
Doanh thu thang: ${fmtVND(stats?.revenueThisMonth || 0)} VND
Tong booking: ${stats?.totalBookings}
Ti le lap day: ${stats?.occupancyRate}%
Phong trong: ${avl}, Dang o: ${occ}, Don phong: ${cln}
Check-in hom nay: ${stats?.todayCheckins}, Check-out: ${stats?.todayCheckouts}
Incidents mo: ${stats?.openIncidents}
Rating TB: ${stats?.avgRating?.toFixed(1)} (${stats?.totalReviews} danh gia)
Booking hom nay: ${todayBookings.map(b => `${b.guest.firstName} ${b.guest.lastName} - Phong ${b.unit.name} - ${b.status}`).join('; ')}
Incidents: ${incidents.map(i => `${i.description} (${i.priority}) - Phong ${i.unit.name}`).join('; ')}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} />
    </div>
  );

  if (!stats) return (
    <div className="flex items-center justify-center h-full">
      <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <p className="text-red-400 font-bold text-xl mb-2">Loi ket noi API</p>
      </div>
    </div>
  );

  const bld = buildings[0];
  const units = bld?.units?.filter(u => u.name && u.name !== 'Owner') || [];
  const occ = units.filter(u => u.status === 'OCCUPIED').length;
  const avl = units.filter(u => u.status === 'AVAILABLE').length;
  const cln = units.filter(u => u.status === 'CLEANING').length;
  const maint = units.filter(u => u.status === 'MAINTENANCE').length;

  const todayStr = new Date().toDateString();
  const todayCheckins = bookings.filter(b => new Date(b.checkInDate).toDateString() === todayStr);
  const todayCheckouts = bookings.filter(b => new Date(b.checkOutDate).toDateString() === todayStr);

  const confirmedBookings = filteredBookings.filter(b => b.status === 'CONFIRMED').length;
  const checkedInBookings = filteredBookings.filter(b => b.status === 'CHECKED_IN').length;
  const checkedOutBookings = bookings.filter(b => b.status === 'CHECKED_OUT').length;

  // Filter bookings by channel
  const filteredBookings = channelFilter === 'all' ? bookings
    : channelFilter === 'internal' ? bookings.filter(b => b.channel?.name === 'Nội bộ')
    : bookings.filter(b => b.channel?.id === channelFilter);

  // Revenue calculations — exclude "Nội bộ" from taxable revenue
  const totalRevenue = bookings.filter(b => b.channel?.name !== 'Nội bộ' && b.status !== 'CANCELLED').reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const internalRevenue = bookings.filter(b => b.channel?.name === 'Nội bộ').reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const filteredRevenue = filteredBookings.filter(b => b.status !== 'CANCELLED').reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  const channels = channelList.map(c => c.name);

  return (
    <div className="h-full overflow-y-auto p-5" style={{ color: '#E2E8F0' }}>
      <div className="flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">📊 Bao cao hang ngay</h1>
            <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>
              Tong ket ngay {reportDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm px-4 py-2 rounded-xl font-medium" style={{ color: '#34D399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              ⏰ Cap nhat luc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* === CHANNEL FILTER === */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setChannelFilter('all')}
            className="px-4 py-2 rounded-xl text-sm font-bold transition"
            style={channelFilter==='all'?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
            Tất cả
          </button>
          {channelList.map(ch => (
            <button key={ch.id} onClick={() => setChannelFilter(ch.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={channelFilter===ch.id?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:
                ch.type==='internal'?{background:'rgba(251,191,36,0.08)',color:'#FBBF24',border:'1px solid rgba(251,191,36,0.2)'}:
                {background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
              {ch.name}{ch.type==='internal'?' 🏠':''}
            </button>
          ))}
        </div>

        {/* Revenue notice for internal */}
        {channelFilter !== 'all' && channelList.find(c => c.id === channelFilter)?.type === 'internal' && (
          <div className="rounded-xl p-3" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
            <p className="text-xs font-bold" style={{color:'#FBBF24'}}>🏠 Kênh Nội bộ — Doanh thu kênh này KHÔNG tính vào báo cáo thuế/doanh thu chính</p>
          </div>
        )}

        {/* === MUC 1: DOANH THU === */}
        <Box className="p-5">
          <h2 className="text-lg font-bold text-white mb-4">💰 1. Doanh thu & Booking</h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#122B4A,#0A1E3D)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>{channelFilter === 'all' ? 'Doanh thu (thuế)' : `Doanh thu ${channelList.find(c=>c.id===channelFilter)?.name||''}`}</p>
              <p className="text-2xl font-extrabold text-white mt-1">₫ {fmtVND(channelFilter === 'all' ? totalRevenue : filteredRevenue)}</p>
              {channelFilter === 'all' && internalRevenue > 0 && <p className="text-[10px] mt-0.5" style={{color:'#FBBF24'}}>+ Nội bộ: ₫{fmtVND(internalRevenue)}</p>}
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>Tong booking</p>
              <p className="text-2xl font-extrabold text-white mt-1">{filteredBookings.length}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>Da xac nhan</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: '#60A5FA' }}>{confirmedBookings}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>Dang luu tru</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: '#34D399' }}>{checkedInBookings}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>Booking theo kenh</p>
            <div className="space-y-2">
              {channels.map(ch => {
                const count = bookings.filter(b => b.channel?.name === ch).length;
                const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-28" style={{ color: '#94A3B8' }}>{ch}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3B82F6,#06B6D4)', transition: 'width 0.5s' }} />
                    </div>
                    <span className="text-xs font-bold w-16 text-right" style={{ color: '#60A5FA' }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Box>

        {/* === MUC 2: TINH TRANG PHONG === */}
        <Box className="p-5">
          <h2 className="text-lg font-bold text-white mb-4">🏠 2. Tinh trang phong</h2>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Tong phong', value: units.length, color: '#E2E8F0', bg: 'rgba(255,255,255,0.04)' },
              { label: 'Trong', value: avl, color: '#4ADE80', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Dang o', value: occ, color: '#F87171', bg: 'rgba(239,68,68,0.1)' },
              { label: 'Don phong', value: cln, color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
              { label: 'Bao tri', value: maint, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4 text-center" style={{ background: item.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: '#94A3B8' }}>{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm font-semibold" style={{ color: '#94A3B8' }}>Ti le lap day:</p>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${stats.occupancyRate}%`, background: stats.occupancyRate >= 70 ? 'linear-gradient(90deg,#10B981,#34D399)' : stats.occupancyRate >= 40 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#EF4444,#F87171)' }} />
            </div>
            <span className="text-sm font-extrabold" style={{ color: stats.occupancyRate >= 70 ? '#34D399' : stats.occupancyRate >= 40 ? '#FBBF24' : '#F87171' }}>{stats.occupancyRate}%</span>
          </div>
          {/* Room list */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {units.map(u => {
              const isOcc = u.status === 'OCCUPIED';
              const isCln = u.status === 'CLEANING';
              const color = isOcc ? '#F87171' : isCln ? '#FBBF24' : '#4ADE80';
              const bg = isOcc ? 'rgba(239,68,68,0.1)' : isCln ? 'rgba(251,191,36,0.1)' : 'rgba(16,185,129,0.1)';
              const label = isOcc ? 'Dang o' : isCln ? 'Don' : 'Trong';
              return (
                <div key={u.id} className="rounded-lg p-2 text-center" style={{ background: bg, border: `1px solid ${color}30` }}>
                  <p className="text-sm font-bold" style={{ color }}>{u.name}</p>
                  <p className="text-[10px]" style={{ color, opacity: 0.7 }}>{label}</p>
                </div>
              );
            })}
          </div>
        </Box>

        {/* === MUC 3: CHECK-IN/OUT HOM NAY === */}
        <div className="grid grid-cols-2 gap-4">
          <Box className="p-5">
            <h2 className="text-lg font-bold text-white mb-3">🚪 3a. Check-in hom nay ({stats.todayCheckins})</h2>
            {todayCheckins.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#3D5A80' }}>Khong co check-in hom nay</p>
            ) : (
              <div className="space-y-2">
                {todayCheckins.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg,#10B981,#3B82F6)', color: '#fff' }}>
                      {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.guest.firstName} {b.guest.lastName}</p>
                      <p className="text-xs" style={{ color: '#3D5A80' }}>Phong {b.unit.name} · {b.channel?.name || 'Direct'}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>Check-in</span>
                  </div>
                ))}
              </div>
            )}
          </Box>

          <Box className="p-5">
            <h2 className="text-lg font-bold text-white mb-3">🚪 3b. Check-out hom nay ({stats.todayCheckouts})</h2>
            {todayCheckouts.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: '#3D5A80' }}>Khong co check-out hom nay</p>
            ) : (
              <div className="space-y-2">
                {todayCheckouts.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(148,163,184,0.06)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg,#64748B,#94A3B8)', color: '#fff' }}>
                      {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.guest.firstName} {b.guest.lastName}</p>
                      <p className="text-xs" style={{ color: '#3D5A80' }}>Phong {b.unit.name} · {b.channel?.name || 'Direct'}</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}>Check-out</span>
                  </div>
                ))}
              </div>
            )}
          </Box>
        </div>

        {/* === MUC 4: INCIDENTS === */}
        <Box className="p-5">
          <h2 className="text-lg font-bold text-white mb-3">⚠️ 4. Incidents / Su co ({incidents.length})</h2>
          {incidents.length === 0 ? (
            <div className="flex items-center gap-3 py-4 justify-center">
              <span className="text-2xl">✅</span>
              <p className="text-base font-bold" style={{ color: '#34D399' }}>Khong co su co nao dang mo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map(inc => {
                const dot = inc.priority === 'high' ? '#EF4444' : inc.priority === 'medium' ? '#FBBF24' : '#34D399';
                const bg = inc.priority === 'high' ? 'rgba(239,68,68,0.08)' : inc.priority === 'medium' ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.08)';
                const label = inc.priority === 'high' ? 'Khan cap' : inc.priority === 'medium' ? 'Trung binh' : 'Thap';
                return (
                  <div key={inc.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: bg }}>
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dot, boxShadow: `0 0 8px ${dot}50` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{inc.description}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#3D5A80' }}>Phong {inc.unit.name} · {inc.unit.building.name} · {timeAgo(inc.createdAt)}</p>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{ background: `${dot}20`, color: dot }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Box>

        {/* === MUC 5: DANH GIA === */}
        <Box className="p-5">
          <h2 className="text-lg font-bold text-white mb-3">⭐ 5. Danh gia cua khach</h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-white">{stats.avgRating.toFixed(1)}</p>
              <div className="flex gap-0.5 mt-1 justify-center">{[1, 2, 3, 4, 5].map(i => <span key={i} className="text-lg">{i <= Math.round(stats.avgRating) ? '⭐' : '☆'}</span>)}</div>
              <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>{stats.totalReviews} danh gia</p>
            </div>
            <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <p className="text-sm" style={{ color: '#FBBF24' }}>
                {stats.avgRating >= 4.5 ? '🎉 Danh gia tuyet voi! Khach hang rat hai long voi dich vu.' :
                  stats.avgRating >= 4.0 ? '👍 Danh gia tot. Co the cai thien them mot so diem.' :
                    stats.avgRating >= 3.0 ? '⚠️ Danh gia trung binh. Can xem xet feedback de cai thien.' :
                      '🚨 Danh gia thap. Can hanh dong gap de nang cao chat luong.'}
              </p>
            </div>
          </div>
        </Box>

        {/* === MUC 6: AI AGENT LENA === */}
        <Box className="p-5">
          <h2 className="text-lg font-bold text-white mb-3">🤖 6. AI Agent Lena</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#34D399' }}>Online</p>
              <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>Trang thai</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#60A5FA' }}>24/7</p>
              <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>Hoat dong</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#A78BFA' }}>Claude</p>
              <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>AI Engine</p>
            </div>
          </div>
        </Box>

        {/* === HOI LENA VE BAO CAO === */}
        <Box className="p-5" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10B981,#3B82F6)' }}>
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Hoi Lena ve bao cao</h2>
              <p className="text-xs" style={{ color: '#3D5A80' }}>Lena co toan quyen truy cap du lieu de tra loi cau hoi cua ban</p>
            </div>
          </div>

          {aiAnswer && (
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#34D399' }}>Lena tra loi:</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#E2E8F0' }}>{aiAnswer}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAI()}
              placeholder="VD: Hom nay co bao nhieu khach check-in? Doanh thu thang nay the nao?..."
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
            />
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="rounded-xl px-5 py-3 text-sm font-bold"
              style={{ background: aiLoading ? '#1E293B' : 'linear-gradient(135deg,#10B981,#3B82F6)', color: '#fff', border: 'none', cursor: aiLoading ? 'wait' : 'pointer' }}
            >
              {aiLoading ? 'Dang hoi...' : 'Hoi Lena'}
            </button>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              'Tong ket tinh hinh hom nay',
              'Phong nao dang trong?',
              'Co su co nao can xu ly?',
              'Doanh thu thang nay the nao?',
            ].map(q => (
              <button
                key={q}
                onClick={() => { setAiQuestion(q); }}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}
              >
                {q}
              </button>
            ))}
          </div>
        </Box>

        {/* Footer */}
        <div className="text-center py-3">
          <p className="text-xs" style={{ color: '#3D5A80' }}>
            Bao cao tu dong cap nhat moi lan tai trang · HCMP v1.0 · BTM Homestay
          </p>
        </div>
      </div>
    </div>
  );
}
