'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookingData {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  guest: { firstName: string; lastName: string };
  unit: { name: string; floor: number };
  channel: { name: string } | null;
}

interface UnitData {
  id: string;
  name: string;
  floor: number;
  status: string;
  basePrice: string;
  type: string;
}

const statusColors: Record<string, string> = {
  CONFIRMED: '#3B82F6',
  CHECKED_IN: '#10B981',
  CHECKED_OUT: '#64748B',
  PENDING: '#F59E0B',
  CANCELLED: '#EF4444',
};

const statusLabels: Record<string, string> = {
  CONFIRMED: 'Xác nhận',
  CHECKED_IN: 'Đang ở',
  CHECKED_OUT: 'Đã trả',
  PENDING: 'Chờ',
  CANCELLED: 'Hủy',
};

export default function CalendarPage() {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; booking: BookingData } | null>(null);

  const DAYS = 21; // Show 3 weeks
  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    Promise.all([
      apiFetch('/bookings?limit=100'),
      apiFetch('/dashboard/buildings'),
    ]).then(([b, bl]) => {
      setBookings(b);
      const bld = bl[0];
      if (bld?.units) {
        const rental = bld.units
          .filter((u: any) => u.name && u.name !== 'Owner')
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setUnits(rental);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const navigateWeek = (dir: number) => {
    setStartDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  // Find booking for a unit on a specific date
  const getBookingForCell = (unitName: string, date: Date): BookingData | null => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.find(b => {
      if (b.status === 'CANCELLED') return false;
      const bUnit = b.unit?.name;
      if (bUnit !== unitName) return false;
      const cin = new Date(b.checkInDate).toISOString().split('T')[0];
      const cout = new Date(b.checkOutDate).toISOString().split('T')[0];
      return dateStr >= cin && dateStr < cout;
    }) || null;
  };

  // Calculate booking bar position
  const getBookingBar = (booking: BookingData, unitName: string) => {
    const cin = new Date(booking.checkInDate);
    cin.setHours(0, 0, 0, 0);
    const cout = new Date(booking.checkOutDate);
    cout.setHours(0, 0, 0, 0);
    const startMs = startDate.getTime();
    const endMs = startMs + DAYS * 86400000;

    const barStart = Math.max(cin.getTime(), startMs);
    const barEnd = Math.min(cout.getTime(), endMs);

    if (barStart >= barEnd) return null;

    const left = ((barStart - startMs) / (DAYS * 86400000)) * 100;
    const width = ((barEnd - barStart) / (DAYS * 86400000)) * 100;
    const nights = Math.ceil((cout.getTime() - cin.getTime()) / 86400000);

    return { left, width, nights };
  };

  // Get unique bookings per unit for rendering bars
  const getUnitBookings = (unitName: string): BookingData[] => {
    const seen = new Set<string>();
    return bookings.filter(b => {
      if (b.status === 'CANCELLED' || b.unit?.name !== unitName || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} />
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col" style={{ color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-white">📅 Lịch đặt phòng</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>
            {units.length} phòng · {bookings.filter(b => b.status !== 'CANCELLED').length} bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateWeek(-1)} className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.06)' }}>← Trước</button>
          <button onClick={goToday} className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}>Hôm nay</button>
          <button onClick={() => navigateWeek(1)} className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.06)' }}>Sau →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-shrink-0">
        {Object.entries(statusLabels).filter(([k]) => k !== 'CANCELLED').map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm" style={{ background: statusColors[k] }} />
            <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          <span className="text-xs font-semibold" style={{ color: '#64748B' }}>Trống</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="overflow-auto h-full">
          <table className="w-full border-collapse" style={{ minWidth: DAYS * 55 + 100 }}>
            {/* Date headers */}
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 px-3 py-3 text-left text-sm font-bold" style={{ background: '#0B1120', minWidth: 100, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Phòng
                </th>
                {dates.map((d, i) => (
                  <th key={i} className="px-1 py-2 text-center" style={{
                    background: isToday(d) ? 'rgba(59,130,246,0.12)' : '#0B1120',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    minWidth: 55,
                  }}>
                    <p className="text-[10px] font-bold" style={{ color: isWeekend(d) ? '#F87171' : '#4B6A8F' }}>
                      {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-extrabold ${isToday(d) ? 'text-white' : ''}`} style={!isToday(d) ? { color: isWeekend(d) ? '#FCA5A5' : '#94A3B8' } : {}}>
                      {d.getDate()}
                    </p>
                    <p className="text-[9px]" style={{ color: '#2D4263' }}>
                      {d.toLocaleDateString('vi-VN', { month: 'short' })}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Room rows */}
            <tbody>
              {units.map((unit, rowIdx) => {
                const unitBookings = getUnitBookings(unit.name);
                return (
                  <tr key={unit.id}>
                    {/* Room label */}
                    <td className="sticky left-0 z-10 px-3 py-2" style={{
                      background: rowIdx % 2 === 0 ? '#0D1424' : '#0F1629',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}>
                      <p className="text-base font-black text-white">{unit.name}</p>
                      <p className="text-[10px]" style={{ color: '#3D5A80' }}>T{unit.floor} · {unit.type}</p>
                    </td>

                    {/* Date cells with booking bars */}
                    {dates.map((d, colIdx) => {
                      const booking = getBookingForCell(unit.name, d);
                      const cin = booking ? new Date(booking.checkInDate) : null;
                      const isStart = cin && cin.toISOString().split('T')[0] === d.toISOString().split('T')[0];

                      return (
                        <td key={colIdx} className="relative px-0 py-1" style={{
                          background: isToday(d)
                            ? 'rgba(59,130,246,0.06)'
                            : rowIdx % 2 === 0 ? '#0D1424' : '#0F1629',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          borderRight: '1px solid rgba(255,255,255,0.02)',
                          height: 48,
                        }}>
                          {booking && isStart && (() => {
                            const bar = getBookingBar(booking, unit.name);
                            if (!bar) return null;
                            const color = statusColors[booking.status] || '#64748B';
                            const nights = bar.nights;
                            return (
                              <div
                                className="absolute top-1 bottom-1 rounded-lg flex items-center px-2 cursor-pointer transition-all hover:brightness-125 z-5"
                                style={{
                                  left: 0,
                                  width: `calc(${(bar.width / (100 / DAYS)) * 55}px - 2px)`,
                                  background: color,
                                  boxShadow: `0 2px 8px ${color}40`,
                                  minWidth: 50,
                                }}
                                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, booking })}
                                onMouseLeave={() => setTooltip(null)}
                              >
                                <span className="text-[11px] font-bold text-white truncate">
                                  {booking.guest.firstName} {booking.guest.lastName.charAt(0)}.
                                  {nights > 1 ? ` (${nights}đ)` : ''}
                                </span>
                              </div>
                            );
                          })()}
                          {!booking && (
                            <div className="absolute inset-1 rounded" style={{ background: 'rgba(255,255,255,0.01)' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 rounded-xl p-4 pointer-events-none" style={{
          left: tooltip.x + 10,
          top: tooltip.y - 10,
          background: '#1A2340',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxWidth: 280,
        }}>
          <p className="text-sm font-bold text-white">{tooltip.booking.guest.firstName} {tooltip.booking.guest.lastName}</p>
          <p className="text-xs mt-1" style={{ color: '#4B6A8F' }}>
            Phòng {tooltip.booking.unit.name} · Tầng {tooltip.booking.unit.floor}
          </p>
          <div className="flex gap-3 mt-2">
            <div>
              <p className="text-[10px]" style={{ color: '#3D5A80' }}>Check-in</p>
              <p className="text-xs font-bold text-white">{new Date(tooltip.booking.checkInDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: '#3D5A80' }}>Check-out</p>
              <p className="text-xs font-bold text-white">{new Date(tooltip.booking.checkOutDate).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: statusColors[tooltip.booking.status] }} />
            <span className="text-xs font-bold" style={{ color: statusColors[tooltip.booking.status] }}>
              {statusLabels[tooltip.booking.status]}
            </span>
            {tooltip.booking.channel && <span className="text-xs" style={{ color: '#3D5A80' }}>· {tooltip.booking.channel.name}</span>}
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div className="flex gap-4 mt-4 flex-shrink-0">
        {[
          { label: 'Tổng phòng', value: units.length, color: '#94A3B8' },
          { label: 'Đang ở', value: bookings.filter(b => b.status === 'CHECKED_IN').length, color: '#10B981' },
          { label: 'Sắp đến', value: bookings.filter(b => b.status === 'CONFIRMED').length, color: '#3B82F6' },
          { label: 'Đã trả', value: bookings.filter(b => b.status === 'CHECKED_OUT').length, color: '#64748B' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-2 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold" style={{ color: '#4B6A8F' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
