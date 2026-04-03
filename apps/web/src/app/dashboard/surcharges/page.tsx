// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const TYPES = [
  { value: 'HOUSEKEEPING', label: 'Dọn phòng', color: '#3B82F6' },
  { value: 'LATE_CHECKOUT', label: 'Late Checkout', color: '#F59E0B' },
  { value: 'LINEN_CHANGE', label: 'Thay đồ vải', color: '#8B5CF6' },
  { value: 'DAMAGE', label: 'Hư hỏng', color: '#EF4444' },
  { value: 'OTHER', label: 'Khác', color: '#6B7280' },
];

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SurchargesPage() {
  const [surcharges, setSurcharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'create' | 'monthly'>('list');

  // Create form
  const [units, setUnits] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({ unitId: '', bookingId: '', type: 'HOUSEKEEPING', amount: 100000, description: '', paidCash: true, note: '' });
  const [creating, setCreating] = useState(false);

  // Monthly
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  useEffect(() => {
    loadSurcharges();
    loadUnits();
  }, []);

  async function loadSurcharges() {
    setLoading(true);
    try {
      const data = await apiFetch('/surcharges');
      setSurcharges(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadUnits() {
    try {
      const buildings = await apiFetch('/dashboard/buildings');
      const allUnits: any[] = [];
      buildings.forEach((b: any) => {
        (b.units || []).forEach((u: any) => {
          allUnits.push({ ...u, buildingName: b.name });
        });
      });
      setUnits(allUnits);
    } catch (e) { console.error(e); }
  }

  async function loadBookingsForUnit(unitId: string) {
    try {
      const data = await apiFetch(`/bookings?unitId=${unitId}&status=CHECKED_IN`);
      setBookings(data);
      if (data.length > 0) setForm(f => ({ ...f, bookingId: data[0].id }));
      else setForm(f => ({ ...f, bookingId: '' }));
    } catch (e) { setBookings([]); }
  }

  async function handleCreate() {
    if (!form.unitId || form.amount <= 0) return;
    setCreating(true);
    try {
      await apiFetch('/surcharges', {
        method: 'POST',
        body: JSON.stringify({
          unitId: form.unitId,
          bookingId: form.bookingId || undefined,
          type: form.type,
          amount: form.amount,
          description: form.description,
          paidCash: form.paidCash,
          note: form.note || undefined,
        }),
      });
      setForm({ unitId: '', bookingId: '', type: 'HOUSEKEEPING', amount: 100000, description: '', paidCash: true, note: '' });
      setBookings([]);
      setTab('list');
      loadSurcharges();
    } catch (e) { alert('Lỗi tạo phụ phí: ' + (e as any).message); }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa phụ phí này?')) return;
    try {
      await apiFetch(`/surcharges/${id}`, { method: 'DELETE' });
      loadSurcharges();
    } catch (e) { alert('Lỗi xóa: ' + (e as any).message); }
  }

  async function loadMonthly() {
    setLoadingMonthly(true);
    try {
      const data = await apiFetch(`/surcharges/monthly?year=${monthYear.year}&month=${monthYear.month}`);
      setMonthlyData(data);
    } catch (e) { console.error(e); }
    setLoadingMonthly(false);
  }

  function getTypeInfo(type: string) {
    return TYPES.find(t => t.value === type) || TYPES[4];
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">💵 Phụ phí tiền mặt</h1>
          <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>Quản lý phụ phí dọn phòng, late checkout, hư hỏng...</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'list', label: 'Danh sách', icon: '📋' },
          { key: 'create', label: 'Tạo phụ phí', icon: '➕' },
          { key: 'monthly', label: 'Tổng kê tháng', icon: '📊' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'monthly' && !monthlyData) loadMonthly(); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.key
              ? { background: 'rgba(56,138,221,0.15)', border: '1px solid rgba(56,138,221,0.3)', color: '#60A5FA' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#4B6A8F' }
            }>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB: List */}
      {tab === 'list' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          {loading ? (
            <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>Đang tải...</div>
          ) : surcharges.length === 0 ? (
            <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>
              <p className="text-4xl mb-3">💵</p>
              <p>Chưa có phụ phí nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Thời gian</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Phòng</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Khách</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Loại</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Mô tả</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Số tiền</th>
                  <th className="text-center px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>TM</th>
                  <th className="text-center px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}></th>
                </tr>
              </thead>
              <tbody>
                {surcharges.map((s, i) => {
                  const typeInfo = getTypeInfo(s.type);
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-5 py-3.5 text-sm text-white/70">{formatDate(s.createdAt)}</td>
                      <td className="px-5 py-3.5 text-sm text-white font-medium">{s.unit?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-white/70">
                        {s.booking?.guest ? `${s.booking.guest.firstName} ${s.booking.guest.lastName}` : '—'}
                        {s.booking?.channelRef && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.15)', color: '#FBBF24' }}>{s.booking.channelRef}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: typeInfo.color + '20', color: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/60 max-w-[200px] truncate">{s.description || s.note || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
                      <td className="px-5 py-3.5 text-center">
                        {s.paidCash ? <span className="text-emerald-400 text-sm">✓</span> : <span className="text-red-400 text-sm">✗</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => handleDelete(s.id)} className="text-red-400/50 hover:text-red-400 transition text-sm">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan={5} className="px-5 py-4 text-sm font-bold text-white">Tổng cộng ({surcharges.length} phụ phí)</td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-emerald-400">
                    {formatVND(surcharges.reduce((sum: number, s: any) => sum + Number(s.amount), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* TAB: Create */}
      {tab === 'create' && (
        <div className="max-w-lg rounded-2xl p-6" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-bold text-white mb-5">Tạo phụ phí mới</h2>

          {/* Unit */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Phòng *</label>
            <select value={form.unitId} onChange={e => { setForm(f => ({ ...f, unitId: e.target.value, bookingId: '' })); if (e.target.value) loadBookingsForUnit(e.target.value); }}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">Chọn phòng...</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.status})</option>)}
            </select>
          </div>

          {/* Booking (auto-load) */}
          {bookings.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Booking đang ở</label>
              <select value={form.bookingId} onChange={e => setForm(f => ({ ...f, bookingId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
                {bookings.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.guest?.firstName} {b.guest?.lastName} — {b.channelRef || b.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Loại phụ phí</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => {
                  let defaultAmount = 0;
                  if (t.value === 'HOUSEKEEPING') defaultAmount = 100000;
                  else if (t.value === 'LATE_CHECKOUT') defaultAmount = 200000;
                  else if (t.value === 'LINEN_CHANGE') defaultAmount = 100000;
                  setForm(f => ({ ...f, type: t.value, amount: defaultAmount || f.amount }));
                }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={form.type === t.value
                    ? { background: t.color + '25', color: t.color, border: `1px solid ${t.color}50` }
                    : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }
                  }>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Số tiền (VNĐ) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="100000" step={10000} />
            <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>{formatVND(form.amount)}</p>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Mô tả</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="VD: Dọn phòng khi đang ở, Late checkout 2 giờ..." />
          </div>

          {/* Note */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Ghi chú</label>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Ghi chú thêm (tùy chọn)" />
          </div>

          {/* Paid Cash */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paidCash} onChange={e => setForm(f => ({ ...f, paidCash: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span className="text-sm text-white">Đã thu tiền mặt</span>
            </label>
          </div>

          {/* Submit */}
          <button onClick={handleCreate} disabled={creating || !form.unitId || form.amount <= 0}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}>
            {creating ? 'Đang tạo...' : `Tạo phụ phí — ${formatVND(form.amount)}`}
          </button>
        </div>
      )}

      {/* TAB: Monthly */}
      {tab === 'monthly' && (
        <div className="rounded-2xl p-6" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-white">Tổng kê tháng</h2>
            <select value={monthYear.month} onChange={e => setMonthYear(m => ({ ...m, month: parseInt(e.target.value) }))}
              className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
            </select>
            <select value={monthYear.year} onChange={e => setMonthYear(m => ({ ...m, year: parseInt(e.target.value) }))}
              className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={loadMonthly} className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'rgba(56,138,221,0.15)', border: '1px solid rgba(56,138,221,0.3)' }}>
              {loadingMonthly ? '...' : 'Xem'}
            </button>
          </div>

          {monthlyData && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium" style={{ color: '#4B6A8F' }}>Tổng phụ phí</p>
                  <p className="text-xl font-bold text-white mt-1">{monthlyData.summary.totalRecords}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium" style={{ color: '#4B6A8F' }}>Tổng tiền</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{formatVND(monthlyData.summary.totalAmount)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium" style={{ color: '#4B6A8F' }}>Thu tiền mặt</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{formatVND(monthlyData.summary.totalCash)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-medium" style={{ color: '#4B6A8F' }}>Theo loại</p>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(monthlyData.summary.byType || {}).map(([type, info]: any) => (
                      <p key={type} className="text-xs"><span style={{ color: getTypeInfo(type).color }}>{getTypeInfo(type).label}</span>: <span className="text-white">{info.count} ({formatVND(info.total)})</span></p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detail table */}
              {monthlyData.surcharges?.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Ngày</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Phòng</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Khách</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Loại</th>
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.surcharges.map((s: any) => (
                      <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3 text-sm text-white/70">{formatDate(s.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-white">{s.unit?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-white/70">
                          {s.booking?.guest ? `${s.booking.guest.firstName} ${s.booking.guest.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: getTypeInfo(s.type).color + '20', color: getTypeInfo(s.type).color }}>
                            {getTypeInfo(s.type).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center py-8" style={{ color: '#4B6A8F' }}>Không có phụ phí trong tháng {monthYear.month}/{monthYear.year}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
