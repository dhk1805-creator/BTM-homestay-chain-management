'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UnitData {
  id: string; name: string; floor: number; type: string; basePrice: string; status: string;
}

interface PricingRule {
  id: string;
  name: string;
  type: 'weekend' | 'season' | 'occupancy' | 'lastminute' | 'earlybird';
  adjustment: number; // percentage: +20 = +20%, -10 = -10%
  active: boolean;
  conditions: string;
}

const defaultRules: PricingRule[] = [
  { id: '1', name: 'Cuối tuần (T6-CN)', type: 'weekend', adjustment: 25, active: true, conditions: 'Thứ 6, Thứ 7, Chủ nhật' },
  { id: '2', name: 'Cao điểm hè (T6-T8)', type: 'season', adjustment: 40, active: true, conditions: 'Tháng 6 → Tháng 8' },
  { id: '3', name: 'Tết Nguyên Đán', type: 'season', adjustment: 80, active: true, conditions: '25/01 → 05/02' },
  { id: '4', name: 'Lễ 30/4 - 1/5', type: 'season', adjustment: 50, active: true, conditions: '28/04 → 03/05' },
  { id: '5', name: 'Lấp đầy > 80%', type: 'occupancy', adjustment: 20, active: true, conditions: 'Tỉ lệ lấp đầy trên 80%' },
  { id: '6', name: 'Lấp đầy > 90%', type: 'occupancy', adjustment: 35, active: true, conditions: 'Tỉ lệ lấp đầy trên 90%' },
  { id: '7', name: 'Lấp đầy < 30%', type: 'occupancy', adjustment: -15, active: true, conditions: 'Tỉ lệ lấp đầy dưới 30%' },
  { id: '8', name: 'Đặt sớm 30+ ngày', type: 'earlybird', adjustment: -10, active: true, conditions: 'Đặt trước 30 ngày trở lên' },
  { id: '9', name: 'Last minute (< 3 ngày)', type: 'lastminute', adjustment: 15, active: false, conditions: 'Đặt trong vòng 3 ngày' },
];

const typeConfig: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  weekend: { icon: '📅', label: 'Cuối tuần', color: '#60A5FA', bg: 'rgba(59,130,246,0.1)' },
  season: { icon: '🌴', label: 'Mùa/Lễ', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  occupancy: { icon: '📊', label: 'Lấp đầy', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  earlybird: { icon: '🐦', label: 'Đặt sớm', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  lastminute: { icon: '⚡', label: 'Last minute', color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
};

export default function PricingPage() {
  const [units, setUnits] = useState<UnitData[]>([]);
  const [rules, setRules] = useState<PricingRule[]>(defaultRules);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [occupancyRate, setOccupancyRate] = useState(18);

  useEffect(() => {
    apiFetch('/dashboard/buildings').then(bl => {
      const bld = bl[0];
      if (bld?.units) {
        const rental = bld.units.filter((u: any) => u.name && u.name !== 'Owner').sort((a: any, b: any) => a.name.localeCompare(b.name));
        setUnits(rental);
        const occ = rental.filter((u: any) => u.status === 'OCCUPIED').length;
        setOccupancyRate(Math.round((occ / rental.length) * 100));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  // Calculate dynamic price for a unit on selected date
  const calcPrice = (basePrice: number): { finalPrice: number; appliedRules: string[]; totalAdj: number } => {
    let totalAdj = 0;
    const appliedRules: string[] = [];
    const day = selectedDate.getDay();
    const month = selectedDate.getMonth() + 1;

    for (const rule of rules) {
      if (!rule.active) continue;

      let applies = false;
      if (rule.type === 'weekend' && (day === 5 || day === 6 || day === 0)) applies = true;
      if (rule.type === 'season') {
        if (rule.id === '2' && month >= 6 && month <= 8) applies = true;
        if (rule.id === '3' && month === 1) applies = true;
        if (rule.id === '4' && month === 4) applies = true;
      }
      if (rule.type === 'occupancy') {
        if (rule.id === '5' && occupancyRate > 80) applies = true;
        if (rule.id === '6' && occupancyRate > 90) applies = true;
        if (rule.id === '7' && occupancyRate < 30) applies = true;
      }

      if (applies) {
        totalAdj += rule.adjustment;
        appliedRules.push(rule.name);
      }
    }

    const finalPrice = Math.round(basePrice * (1 + totalAdj / 100));
    return { finalPrice, appliedRules, totalAdj };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} />
    </div>
  );

  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 5 || selectedDate.getDay() === 6;

  return (
    <div className="p-6 min-h-full" style={{ color: '#E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">💰 Dynamic Pricing</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>Giá tự động theo mùa, cuối tuần, tỉ lệ lấp đầy</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-sm" style={{ color: '#4B6A8F' }}>Xem ngày:</span>
            <input type="date" value={selectedDate.toISOString().split('T')[0]}
              onChange={e => setSelectedDate(new Date(e.target.value))}
              className="bg-transparent text-white text-sm font-bold outline-none" />
          </div>
          <div className="rounded-xl px-4 py-2" style={{ background: occupancyRate > 80 ? 'rgba(16,185,129,0.15)' : occupancyRate < 30 ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-sm font-bold" style={{ color: occupancyRate > 80 ? '#34D399' : occupancyRate < 30 ? '#F87171' : '#FBBF24' }}>
              Lấp đầy: {occupancyRate}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* LEFT: Pricing Rules */}
        <div className="col-span-1">
          <h3 className="text-lg font-bold text-white mb-4">📋 Quy tắc giá</h3>
          <div className="space-y-2">
            {rules.map(rule => {
              const tc = typeConfig[rule.type];
              return (
                <div key={rule.id} className="rounded-xl p-4 transition"
                  style={{ background: rule.active ? '#0F1629' : 'rgba(255,255,255,0.01)', border: `1px solid ${rule.active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`, opacity: rule.active ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tc.icon}</span>
                      <span className="text-sm font-bold text-white">{rule.name}</span>
                    </div>
                    <button onClick={() => toggleRule(rule.id)}
                      className="w-10 h-5 rounded-full transition relative"
                      style={{ background: rule.active ? '#10B981' : '#1E293B' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: rule.active ? 22 : 2 }} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                    <span className="text-lg font-black" style={{ color: rule.adjustment >= 0 ? '#F87171' : '#34D399' }}>
                      {rule.adjustment >= 0 ? '+' : ''}{rule.adjustment}%
                    </span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#3D5A80' }}>{rule.conditions}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Price Preview */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              💵 Giá phòng ngày {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {isWeekend && <span className="text-sm ml-2 px-2 py-0.5 rounded-lg font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>Cuối tuần</span>}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {units.map(unit => {
              const base = Number(unit.basePrice) || 500000;
              const { finalPrice, appliedRules, totalAdj } = calcPrice(base);
              const changed = totalAdj !== 0;

              return (
                <div key={unit.id} className="rounded-xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xl font-black text-white">{unit.name}</p>
                      <p className="text-xs" style={{ color: '#3D5A80' }}>T{unit.floor} · {unit.type}</p>
                    </div>
                    {changed && (
                      <span className="text-sm font-black px-2.5 py-1 rounded-lg" style={{
                        background: totalAdj > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        color: totalAdj > 0 ? '#F87171' : '#34D399',
                      }}>
                        {totalAdj > 0 ? '↑' : '↓'} {Math.abs(totalAdj)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-3 mb-2">
                    {changed && (
                      <span className="text-base line-through" style={{ color: '#3D5A80' }}>
                        {base.toLocaleString('vi-VN')}
                      </span>
                    )}
                    <span className="text-2xl font-black" style={{ color: changed ? (totalAdj > 0 ? '#F87171' : '#34D399') : '#E2E8F0' }}>
                      {finalPrice.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-sm" style={{ color: '#3D5A80' }}>₫/đêm</span>
                  </div>

                  {appliedRules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {appliedRules.map(r => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748B' }}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Revenue estimate */}
          <div className="mt-5 rounded-xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 className="text-base font-bold text-white mb-3">📊 Ước tính doanh thu</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs" style={{ color: '#3D5A80' }}>Giá gốc / đêm</p>
                <p className="text-xl font-black text-white">
                  ₫ {Math.round(units.reduce((s, u) => s + ((Number(u.basePrice) || 500000) || 500000), 0) / 1000)}K
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: '#3D5A80' }}>Giá dynamic / đêm</p>
                <p className="text-xl font-black" style={{ color: '#60A5FA' }}>
                  ₫ {Math.round(units.reduce((s, u) => s + calcPrice((Number(u.basePrice) || 500000)).finalPrice, 0) / 1000)}K
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: '#3D5A80' }}>Chênh lệch</p>
                {(() => {
                  const base = units.reduce((s, u) => s + ((Number(u.basePrice) || 500000) || 500000), 0);
                  const dynamic = units.reduce((s, u) => s + calcPrice((Number(u.basePrice) || 500000)).finalPrice, 0);
                  const diff = dynamic - base;
                  return (
                    <p className="text-xl font-black" style={{ color: diff >= 0 ? '#34D399' : '#F87171' }}>
                      {diff >= 0 ? '+' : ''}{Math.round(diff / 1000)}K ₫
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
