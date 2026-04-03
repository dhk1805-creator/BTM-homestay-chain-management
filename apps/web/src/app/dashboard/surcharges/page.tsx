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

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }
function formatDate(d: string) { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatDateShort(d: string) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function getTypeInfo(type: string) { return TYPES.find(t => t.value === type) || TYPES[4]; }

function printBillPDF(bill: any) {
  const w = window.open('', '_blank');
  if (!w || !bill) return;
  const { booking, surcharges, summary } = bill;
  const guest = booking.guest;
  const unit = booking.unit;
  const building = unit?.building;
  const channel = booking.channel;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000));
  const billNo = 'BILL-' + new Date().getFullYear() + '-' + (booking.channelRef || booking.id.slice(0, 6).toUpperCase());

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill ${billNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #D97706}
    .logo{font-size:22px;font-weight:800;color:#D97706}
    .logo-sub{font-size:12px;color:#666;margin-top:4px}
    .inv-title{text-align:right}
    .inv-title h1{font-size:26px;color:#D97706;font-weight:800}
    .inv-title p{font-size:12px;color:#666;margin-top:4px}
    .info-row{display:flex;gap:40px;margin-bottom:24px}
    .info-box{flex:1}
    .info-box h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px}
    .info-box p{font-size:13px;line-height:1.6;color:#333}
    .bold{font-weight:700;color:#1a1a1a}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#FEF3C7;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#92400E;border-bottom:2px solid #F59E0B}
    td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
    .right{text-align:right}
    .total-section{margin-top:12px;border-top:2px solid #D97706;padding-top:12px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .total-row.grand{font-size:18px;font-weight:800;color:#D97706;padding:8px 0;border-top:1px solid #ddd;margin-top:4px}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#FEF3C7;color:#92400E}
    .cash-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#D1FAE5;color:#065F46}
    .section-title{font-size:14px;font-weight:700;color:#D97706;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between}
    .footer-col{text-align:center;flex:1}
    .footer-col h4{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:60px}
    .footer-col p{font-size:12px;font-weight:700;color:#333}
    .note{margin-top:30px;padding:12px;background:#FFFBEB;border-radius:6px;font-size:11px;color:#92400E;line-height:1.6;border:1px solid #FDE68A}
    @media print{body{padding:20px} .no-print{display:none}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="logo">${building?.name || 'BTM Homestay'}</div>
      <div class="logo-sub">${building?.address || ''}</div>
      <div class="logo-sub">Homestay Chain Management Platform</div>
    </div>
    <div class="inv-title">
      <h1>BILL PHỤ PHÍ</h1>
      <p>Số: ${billNo}</p>
      <p>Ngày: ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>
  </div>
  <div class="info-row">
    <div class="info-box">
      <h3>Thông tin khách</h3>
      <p class="bold">${guest?.firstName || ''} ${guest?.lastName || ''}</p>
      <p>${guest?.email || ''}</p>
      <p>${guest?.phone || ''}</p>
    </div>
    <div class="info-box">
      <h3>Thông tin lưu trú</h3>
      <p><span class="bold">Phòng:</span> ${unit?.name || ''}</p>
      <p><span class="bold">Check-in:</span> ${formatDateShort(booking.checkInDate)}</p>
      <p><span class="bold">Check-out:</span> ${formatDateShort(booking.checkOutDate)}</p>
      <p><span class="bold">Số đêm:</span> ${nights}</p>
      <p><span class="bold">Kênh:</span> ${channel?.name || 'Direct'}</p>
      ${booking.channelRef ? `<p><span class="bold">Mã booking:</span> <span class="badge">${booking.channelRef}</span></p>` : ''}
    </div>
  </div>
  <div class="section-title">Chi tiết tiền phòng</div>
  <table>
    <tr><th>Mô tả</th><th class="right">Số tiền</th></tr>
    <tr><td>Tiền phòng ${unit?.name || ''} — ${nights} đêm (thanh toán qua ${channel?.name || 'OTA'})</td><td class="right bold">${formatVND(summary.roomCharge)}</td></tr>
  </table>
  ${surcharges.length > 0 ? `
  <div class="section-title">Chi tiết phụ phí (tiền mặt)</div>
  <table>
    <tr><th>STT</th><th>Loại</th><th>Mô tả</th><th>Thời gian</th><th class="right">Số tiền</th><th>TT</th></tr>
    ${surcharges.map((s: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${getTypeInfo(s.type).label}</td>
      <td>${s.description || s.note || ''}</td>
      <td>${formatDate(s.createdAt)}</td>
      <td class="right bold">${formatVND(Number(s.amount))}</td>
      <td>${s.paidCash ? '<span class="cash-badge">Tiền mặt</span>' : 'CK'}</td>
    </tr>`).join('')}
  </table>` : '<p style="color:#999;margin:20px 0;">Không có phụ phí phát sinh.</p>'}
  <div class="total-section">
    <div class="total-row"><span>Tiền phòng (qua ${channel?.name || 'OTA'})</span><span>${formatVND(summary.roomCharge)}</span></div>
    <div class="total-row"><span>Tổng phụ phí tiền mặt</span><span>${formatVND(summary.totalSurcharges)}</span></div>
    <div class="total-row grand"><span>TỔNG CỘNG</span><span>${formatVND(summary.grandTotal)}</span></div>
    ${summary.totalCash > 0 ? `<div class="total-row" style="color:#065F46;font-weight:600"><span>Đã thu tiền mặt</span><span>${formatVND(summary.totalCash)}</span></div>` : ''}
  </div>
  <div class="note">
    <strong>Ghi chú:</strong> Tiền phòng đã được thanh toán qua kênh ${channel?.name || 'OTA'}. Các khoản phụ phí được thu bằng tiền mặt tại chỗ. Bill này chỉ ghi nhận các khoản thu phụ phí, không thay thế hóa đơn VAT.
  </div>
  <div class="footer">
    <div class="footer-col"><h4>Khách hàng</h4><p>${guest?.firstName || ''} ${guest?.lastName || ''}</p></div>
    <div class="footer-col"><h4>Quản lý</h4><p>BTM Homestay</p></div>
  </div>
  <div class="no-print" style="text-align:center;margin-top:30px">
    <button onclick="window.print()" style="padding:12px 32px;background:#D97706;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">In / Lưu PDF</button>
  </div>
  </body></html>`);
  w.document.close();
}

function exportMonthlyExcel(monthlyData: any) {
  if (!monthlyData || !monthlyData.surcharges) return;
  const { year, month, surcharges, summary } = monthlyData;
  let csv = '\uFEFF';
  csv += `TỔNG KÊ PHỤ PHÍ TIỀN MẶT - THÁNG ${month}/${year}\n`;
  csv += `BTM 03 - Đà Nẵng\n`;
  csv += `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
  csv += `TỔNG HỢP\n`;
  csv += `Tổng số phụ phí,${summary.totalRecords}\n`;
  csv += `Tổng tiền,"${summary.totalAmount}"\n`;
  csv += `Tổng thu tiền mặt,"${summary.totalCash}"\n\n`;
  csv += `THEO LOẠI\n`;
  csv += `Loại,Số lượng,Tổng tiền\n`;
  Object.entries(summary.byType || {}).forEach(([type, info]: any) => {
    csv += `${getTypeInfo(type).label},${info.count},"${info.total}"\n`;
  });
  csv += `\nCHI TIẾT\n`;
  csv += `STT,Ngày,Phòng,Khách,Mã booking,Loại,Mô tả,Số tiền,Tiền mặt\n`;
  surcharges.forEach((s: any, i: number) => {
    const gn = s.booking?.guest ? `${s.booking.guest.firstName} ${s.booking.guest.lastName}` : '';
    csv += `${i + 1},${formatDate(s.createdAt)},${s.unit?.name || ''},${gn},${s.booking?.channelRef || ''},${getTypeInfo(s.type).label},"${s.description || s.note || ''}","${Number(s.amount)}",${s.paidCash ? 'Có' : 'Không'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Phu_phi_thang_${month}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SurchargesPage() {
  const [surcharges, setSurcharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'create' | 'monthly' | 'bill'>('list');
  const [units, setUnits] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({ unitId: '', bookingId: '', type: 'HOUSEKEEPING', amount: 100000, description: '', paidCash: true, note: '' });
  const [creating, setCreating] = useState(false);
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [selectedBillBooking, setSelectedBillBooking] = useState('');
  const [billData, setBillData] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);

  useEffect(() => { loadSurcharges(); loadUnits(); }, []);

  async function loadSurcharges() {
    setLoading(true);
    try { setSurcharges(await apiFetch('/surcharges')); } catch (e) { console.error(e); }
    setLoading(false);
  }
  async function loadUnits() {
    try {
      const buildings = await apiFetch('/dashboard/buildings');
      const au: any[] = [];
      buildings.forEach((b: any) => (b.units || []).forEach((u: any) => au.push({ ...u, buildingName: b.name })));
      setUnits(au);
    } catch (e) { console.error(e); }
  }
  async function loadBookingsForUnit(unitId: string) {
    try {
      const data = await apiFetch(`/bookings?unitId=${unitId}&status=CHECKED_IN`);
      setBookings(data);
      setForm(f => ({ ...f, bookingId: data.length > 0 ? data[0].id : '' }));
    } catch (e) { setBookings([]); }
  }
  async function loadAllBookings() {
    try {
      const data = await apiFetch('/bookings');
      setAllBookings(data.filter((b: any) => ['CHECKED_IN', 'CHECKED_OUT'].includes(b.status)));
    } catch (e) { console.error(e); }
  }
  async function handleCreate() {
    if (!form.unitId || form.amount <= 0) return;
    setCreating(true);
    try {
      await apiFetch('/surcharges', { method: 'POST', body: JSON.stringify({ unitId: form.unitId, bookingId: form.bookingId || undefined, type: form.type, amount: form.amount, description: form.description, paidCash: form.paidCash, note: form.note || undefined }) });
      setForm({ unitId: '', bookingId: '', type: 'HOUSEKEEPING', amount: 100000, description: '', paidCash: true, note: '' });
      setBookings([]); setTab('list'); loadSurcharges();
    } catch (e) { alert('Lỗi: ' + (e as any).message); }
    setCreating(false);
  }
  async function handleDelete(id: string) {
    if (!confirm('Xóa phụ phí này?')) return;
    try { await apiFetch(`/surcharges/${id}`, { method: 'DELETE' }); loadSurcharges(); } catch (e) { alert('Lỗi: ' + (e as any).message); }
  }
  async function loadMonthly() {
    setLoadingMonthly(true);
    try { setMonthlyData(await apiFetch(`/surcharges/monthly?year=${monthYear.year}&month=${monthYear.month}`)); } catch (e) { console.error(e); }
    setLoadingMonthly(false);
  }
  async function loadBill(bid: string) {
    if (!bid) return;
    setLoadingBill(true);
    try { setBillData(await apiFetch(`/surcharges/bill/${bid}`)); } catch (e) { console.error(e); }
    setLoadingBill(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">💵 Phụ phí tiền mặt</h1>
          <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>Quản lý phụ phí dọn phòng, late checkout, hư hỏng...</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'list', label: 'Danh sách', icon: '📋' },
          { key: 'create', label: 'Tạo phụ phí', icon: '➕' },
          { key: 'bill', label: 'Xuất Bill', icon: '🧾' },
          { key: 'monthly', label: 'Tổng kê tháng', icon: '📊' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'monthly' && !monthlyData) loadMonthly(); if (t.key === 'bill' && allBookings.length === 0) loadAllBookings(); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.key ? { background: 'rgba(56,138,221,0.15)', border: '1px solid rgba(56,138,221,0.3)', color: '#60A5FA' } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#4B6A8F' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          {loading ? <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>Đang tải...</div>
          : surcharges.length === 0 ? <div className="p-12 text-center" style={{ color: '#4B6A8F' }}><p className="text-4xl mb-3">💵</p><p>Chưa có phụ phí nào</p></div>
          : <table className="w-full">
              <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Thời gian','Phòng','Khách','Loại','Mô tả'].map(h => <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>{h}</th>)}
                <th className="text-right px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Số tiền</th>
                <th className="text-center px-5 py-3.5 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>TM</th>
                <th className="px-5 py-3.5"></th>
              </tr></thead>
              <tbody>{surcharges.map(s => {
                const ti = getTypeInfo(s.type);
                return <tr key={s.id} className="hover:bg-white/[0.02] transition" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-5 py-3.5 text-sm text-white/70">{formatDate(s.createdAt)}</td>
                  <td className="px-5 py-3.5 text-sm text-white font-medium">{s.unit?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-white/70">{s.booking?.guest ? `${s.booking.guest.firstName} ${s.booking.guest.lastName}` : '—'}{s.booking?.channelRef && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.15)', color: '#FBBF24' }}>{s.booking.channelRef}</span>}</td>
                  <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: ti.color + '20', color: ti.color }}>{ti.label}</span></td>
                  <td className="px-5 py-3.5 text-sm text-white/60 max-w-[200px] truncate">{s.description || s.note || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
                  <td className="px-5 py-3.5 text-center">{s.paidCash ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                  <td className="px-5 py-3.5 text-center"><button onClick={() => handleDelete(s.id)} className="text-red-400/50 hover:text-red-400 transition text-sm">🗑️</button></td>
                </tr>;
              })}</tbody>
              <tfoot><tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                <td colSpan={5} className="px-5 py-4 text-sm font-bold text-white">Tổng cộng ({surcharges.length} phụ phí)</td>
                <td className="px-5 py-4 text-sm text-right font-bold text-emerald-400">{formatVND(surcharges.reduce((s: number, x: any) => s + Number(x.amount), 0))}</td>
                <td colSpan={2}></td>
              </tr></tfoot>
            </table>}
        </div>
      )}

      {tab === 'create' && (
        <div className="max-w-lg rounded-2xl p-6" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-bold text-white mb-5">Tạo phụ phí mới</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Phòng *</label>
            <select value={form.unitId} onChange={e => { setForm(f => ({ ...f, unitId: e.target.value, bookingId: '' })); if (e.target.value) loadBookingsForUnit(e.target.value); }}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">Chọn phòng...</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.status})</option>)}
            </select>
          </div>
          {bookings.length > 0 && <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Booking đang ở</label>
            <select value={form.bookingId} onChange={e => setForm(f => ({ ...f, bookingId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.guest?.firstName} {b.guest?.lastName} — {b.channelRef || b.id.slice(0, 8)}</option>)}
            </select>
          </div>}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Loại phụ phí</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => { const da = t.value === 'HOUSEKEEPING' || t.value === 'LINEN_CHANGE' ? 100000 : t.value === 'LATE_CHECKOUT' ? 200000 : form.amount; setForm(f => ({ ...f, type: t.value, amount: da })); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={form.type === t.value ? { background: t.color + '25', color: t.color, border: `1px solid ${t.color}50` } : { background: 'rgba(255,255,255,0.03)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Số tiền (VNĐ) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }} step={10000} />
            <p className="text-xs mt-1" style={{ color: '#3D5A80' }}>{formatVND(form.amount)}</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Mô tả</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="VD: Dọn phòng khi đang ở..." />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#4B6A8F' }}>Ghi chú</label>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="Tùy chọn" />
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paidCash} onChange={e => setForm(f => ({ ...f, paidCash: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-white">Đã thu tiền mặt</span>
            </label>
          </div>
          <button onClick={handleCreate} disabled={creating || !form.unitId || form.amount <= 0}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}>
            {creating ? 'Đang tạo...' : `Tạo phụ phí — ${formatVND(form.amount)}`}
          </button>
        </div>
      )}

      {tab === 'bill' && (
        <div className="rounded-2xl p-6" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-lg font-bold text-white mb-5">🧾 Xuất Bill phụ phí theo Booking</h2>
          <div className="flex items-center gap-4 mb-6">
            <select value={selectedBillBooking} onChange={e => { setSelectedBillBooking(e.target.value); if (e.target.value) loadBill(e.target.value); }}
              className="flex-1 max-w-md px-4 py-2.5 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">Chọn booking...</option>
              {allBookings.map((b: any) => <option key={b.id} value={b.id}>{b.channelRef || b.id.slice(0, 8)} — {b.guest?.firstName} {b.guest?.lastName} — {b.unit?.name} ({b.status})</option>)}
            </select>
          </div>
          {loadingBill && <p style={{ color: '#4B6A8F' }}>Đang tải...</p>}
          {billData && !loadingBill && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#4B6A8F' }}>Tiền phòng</p>
                  <p className="text-lg font-bold text-white mt-1">{formatVND(billData.summary.roomCharge)}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#3D5A80' }}>qua {billData.booking.channel?.name || 'OTA'}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-xs" style={{ color: '#4B6A8F' }}>Phụ phí tiền mặt</p>
                  <p className="text-lg font-bold text-amber-400 mt-1">{formatVND(billData.summary.totalSurcharges)}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#3D5A80' }}>{billData.surcharges.length} khoản</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-xs" style={{ color: '#4B6A8F' }}>Tổng cộng</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{formatVND(billData.summary.grandTotal)}</p>
                </div>
              </div>
              {billData.surcharges.length > 0 && (
                <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full">
                    <thead><tr style={{ background: 'rgba(245,158,11,0.08)' }}>
                      {['Loại','Mô tả','Thời gian'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#D97706' }}>{h}</th>)}
                      <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: '#D97706' }}>Số tiền</th>
                    </tr></thead>
                    <tbody>{billData.surcharges.map((s: any) => (
                      <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: getTypeInfo(s.type).color + '20', color: getTypeInfo(s.type).color }}>{getTypeInfo(s.type).label}</span></td>
                        <td className="px-4 py-3 text-sm text-white/70">{s.description || s.note || '—'}</td>
                        <td className="px-4 py-3 text-sm text-white/50">{formatDate(s.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <button onClick={() => printBillPDF(billData)} className="px-6 py-3 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                🖨️ In Bill / Lưu PDF
              </button>
            </div>
          )}
          {!billData && !loadingBill && !selectedBillBooking && <p className="text-center py-8" style={{ color: '#4B6A8F' }}>Chọn booking để xem bill phụ phí</p>}
        </div>
      )}

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
            {monthlyData && <button onClick={() => exportMonthlyExcel(monthlyData)} className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>📥 Xuất Excel</button>}
          </div>
          {monthlyData && <>
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
            {monthlyData.surcharges?.length > 0 ? (
              <table className="w-full">
                <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Ngày','Phòng','Khách','Loại'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>{h}</th>)}
                  <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>Số tiền</th>
                </tr></thead>
                <tbody>{monthlyData.surcharges.map((s: any) => (
                  <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-sm text-white/70">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-white">{s.unit?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/70">{s.booking?.guest ? `${s.booking.guest.firstName} ${s.booking.guest.lastName}` : '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: getTypeInfo(s.type).color + '20', color: getTypeInfo(s.type).color }}>{getTypeInfo(s.type).label}</span></td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p className="text-center py-8" style={{ color: '#4B6A8F' }}>Không có phụ phí trong tháng {monthYear.month}/{monthYear.year}</p>}
          </>}
        </div>
      )}
    </div>
  );
}
