// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const typeCfg = {
  HOUSEKEEPING: { icon: '🧹', label: 'Dọn phòng / Đồ vải', color: '#FBBF24' },
  LATE_CHECKOUT: { icon: '⏰', label: 'Late checkout', color: '#22D3EE' },
  OTHER: { icon: '📋', label: 'Khác', color: '#94A3B8' },
};

function fmtVND(n) { return Number(n).toLocaleString('vi-VN') + '₫'; }
function fmtDate(d) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtTime(d) { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }

export default function SurchargesPage() {
  const [surcharges, setSurcharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [summary, setSummary] = useState(null);
  const [billBookingId, setBillBookingId] = useState('');
  const [billData, setBillData] = useState(null);
  const [showBill, setShowBill] = useState(false);

  // Manual add surcharge
  const [showAdd, setShowAdd] = useState(false);
  const [addUnit, setAddUnit] = useState('');
  const [addType, setAddType] = useState('HOUSEKEEPING');
  const [addAmount, setAddAmount] = useState('100000');
  const [addDesc, setAddDesc] = useState('');
  const [addBookingId, setAddBookingId] = useState('');
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [addMsg, setAddMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [y, m] = month.split('-').map(Number);
      const from = new Date(y, m - 1, 1).toISOString();
      const to = new Date(y, m, 0, 23, 59, 59).toISOString();
      const [sc, sm, bl, bk] = await Promise.all([
        apiFetch(`/surcharges?from=${from}&to=${to}`),
        apiFetch(`/surcharges/monthly?year=${y}&month=${m}`),
        apiFetch('/dashboard/buildings'),
        apiFetch('/bookings?limit=50'),
      ]);
      setSurcharges(sc);
      setSummary(sm);
      if (bl[0]?.units) setUnits(bl[0].units.filter(u => u.name !== 'Owner'));
      setBookings(bk);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [month]);

  const loadBill = async (bookingId) => {
    try {
      const bill = await apiFetch(`/surcharges/bill/${bookingId}`);
      setBillData(bill);
      setShowBill(true);
    } catch (e) { alert('Lỗi: ' + e.message); }
  };

  const printBill = () => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w || !billData) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill phụ phí</title>
<style>
  body{font-family:sans-serif;padding:20px;max-width:380px;margin:0 auto;font-size:13px;color:#222}
  h2{text-align:center;margin:0 0 4px;font-size:16px}
  .sub{text-align:center;color:#666;margin:0 0 12px;font-size:11px}
  .line{border-top:1px dashed #ccc;margin:8px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:3px 4px;vertical-align:top}
  .r{text-align:right}
  .b{font-weight:700}
  .total{border-top:2px solid #222;padding-top:6px;font-size:15px}
  .footer{text-align:center;color:#999;margin-top:16px;font-size:10px}
  @media print{body{padding:10px}}
</style></head><body>
<h2>${billData.building.name}</h2>
<p class="sub">${billData.building.address}</p>
<div class="line"></div>
<h2>BILL PHỤ PHÍ</h2>
<p class="sub">Thanh toán tiền mặt</p>
<div class="line"></div>
<table>
  <tr><td>Khách:</td><td class="r b">${billData.guest.name}</td></tr>
  <tr><td>Phòng:</td><td class="r">${billData.room}</td></tr>
  <tr><td>Mã booking:</td><td class="r">${billData.booking.channelRef || '—'}</td></tr>
  <tr><td>Check-in:</td><td class="r">${new Date(billData.booking.checkIn).toLocaleDateString('vi-VN')}</td></tr>
  <tr><td>Check-out:</td><td class="r">${new Date(billData.booking.checkOut).toLocaleDateString('vi-VN')}</td></tr>
</table>
<div class="line"></div>
<table>
  <tr class="b"><td>Mục</td><td class="r">Số tiền</td></tr>
  ${billData.surcharges.map(sc => `<tr><td>${sc.description || sc.type}</td><td class="r">${Number(sc.amount).toLocaleString('vi-VN')}₫</td></tr>`).join('')}
</table>
<div class="line"></div>
<table>
  <tr class="total b"><td>TỔNG CỘNG:</td><td class="r">${Number(billData.totalSurcharge).toLocaleString('vi-VN')}₫</td></tr>
</table>
<p class="sub" style="margin-top:8px">Hình thức: Tiền mặt</p>
<div class="line"></div>
<p class="footer">Ngày xuất: ${new Date().toLocaleString('vi-VN')}<br>Cảm ơn quý khách!</p>
</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const addSurcharge = async () => {
    if (!addUnit || !addAmount) { setAddMsg('Chọn phòng và nhập số tiền'); return; }
    setAddMsg('');
    try {
      await apiFetch('/surcharges', {
        method: 'POST',
        body: JSON.stringify({
          unitId: addUnit,
          bookingId: addBookingId || undefined,
          type: addType,
          description: addDesc || `Phụ phí ${typeCfg[addType]?.label || addType}`,
          amount: Number(addAmount),
          paidCash: true,
        }),
      });
      setShowAdd(false);
      setAddDesc(''); setAddAmount('100000');
      loadData();
    } catch (e) { setAddMsg('Lỗi: ' + e.message); }
  };

  const deleteSurcharge = async (id) => {
    if (!confirm('Xóa phụ phí này?')) return;
    try {
      await apiFetch(`/surcharges/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) { alert('Lỗi: ' + e.message); }
  };

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#E2E8F0', fontSize: '14px', width: '100%', outline: 'none' };

  return (
    <div className="p-6 min-h-full" style={{ color: '#E2E8F0' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">💵 Phụ phí tiền mặt</h1>
          <p className="text-sm mt-1" style={{ color: '#3D5A80' }}>Dọn phòng, late checkout, phụ phí khác — thu tiền mặt</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="rounded-xl px-4 py-2 text-sm outline-none"
            style={{ background: '#0F1629', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.08)' }} />
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>
            + Thêm phụ phí
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#122B4A,#0A1E3D)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <p className="text-xs font-bold" style={{ color: '#60A5FA' }}>Tổng thu tiền mặt</p>
            <p className="text-2xl font-extrabold text-white mt-1">₫ {fmtVND(summary.total)}</p>
            <p className="text-xs mt-1" style={{ color: '#3D6FA8' }}>{summary.count} khoản</p>
          </div>
          {Object.entries(summary.byType || {}).map(([type, amount]) => {
            const cfg = typeCfg[type] || typeCfg.OTHER;
            return (
              <div key={type} className="rounded-2xl p-5" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</p>
                <p className="text-xl font-extrabold text-white mt-1">₫ {fmtVND(amount)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 max-w-lg w-full mx-4" style={{ background: '#0F1629', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 className="text-lg font-bold text-white mb-4">+ Thêm phụ phí tiền mặt</h3>
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Phòng</p>
                <select value={addUnit} onChange={e => setAddUnit(e.target.value)} style={inputStyle}>
                  <option value="">Chọn phòng...</option>
                  {units.map(u => <option key={u.id} value={u.id}>P.{u.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Booking (tùy chọn)</p>
                <select value={addBookingId} onChange={e => setAddBookingId(e.target.value)} style={inputStyle}>
                  <option value="">Không gắn booking</option>
                  {bookings.filter(b => ['CHECKED_IN', 'CONFIRMED'].includes(b.status)).map(b => (
                    <option key={b.id} value={b.id}>{b.guest.firstName} {b.guest.lastName} — P.{b.unit.name} ({b.channelRef})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Loại</p>
                  <select value={addType} onChange={e => setAddType(e.target.value)} style={inputStyle}>
                    <option value="HOUSEKEEPING">🧹 Dọn phòng / Đồ vải</option>
                    <option value="LATE_CHECKOUT">⏰ Late checkout</option>
                    <option value="OTHER">📋 Khác</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Số tiền (VND)</p>
                  <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="100000" style={inputStyle} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#3D5A80' }}>Ghi chú</p>
                <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="VD: Dọn phòng khi đang ở" style={inputStyle} />
              </div>
            </div>
            {addMsg && <p className="text-sm mb-3" style={{ color: '#F87171' }}>{addMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#4B6A8F', border: '1px solid rgba(255,255,255,0.08)' }}>Hủy</button>
              <button onClick={addSurcharge} className="flex-1 py-3 rounded-xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#06B6D4)' }}>💵 Tạo phụ phí</button>
            </div>
          </div>
        </div>
      )}

      {/* Bill modal */}
      {showBill && billData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 max-w-md w-full mx-4" style={{ background: '#0F1629', border: '1px solid rgba(251,191,36,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">🧾 Bill phụ phí</h3>
              <button onClick={() => setShowBill(false)} className="text-xl" style={{ color: '#4B6A8F' }}>✕</button>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-bold text-white">{billData.guest.name}</p>
              <p className="text-xs" style={{ color: '#4B6A8F' }}>Phòng {billData.room} · Mã: {billData.booking.channelRef || '—'}</p>
              <p className="text-xs" style={{ color: '#4B6A8F' }}>{fmtDate(billData.booking.checkIn)} → {fmtDate(billData.booking.checkOut)}</p>
            </div>
            <div className="space-y-2 mb-4">
              {billData.surcharges.map((sc, i) => {
                const cfg = typeCfg[sc.type] || typeCfg.OTHER;
                return (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="text-sm text-white">{cfg.icon} {sc.description || cfg.label}</p>
                      <p className="text-[10px]" style={{ color: '#4B6A8F' }}>{fmtDate(sc.date)} {fmtTime(sc.date)}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: cfg.color }}>{fmtVND(sc.amount)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <p className="text-sm font-bold" style={{ color: '#FBBF24' }}>Tổng cộng (tiền mặt)</p>
              <p className="text-xl font-extrabold" style={{ color: '#FBBF24' }}>{fmtVND(billData.totalSurcharge)}</p>
            </div>
            <button onClick={printBill} className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#EF4444)' }}>🖨️ In bill / Xuất PDF</button>
          </div>
        </div>
      )}

      {/* Surcharges list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #1E293B', borderTopColor: '#3B82F6' }} /></div>
      ) : surcharges.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">💵</p>
          <p className="text-lg font-bold text-white">Chưa có phụ phí nào trong tháng này</p>
          <p className="text-sm mt-2" style={{ color: '#3D5A80' }}>Phụ phí sẽ tự động tạo khi khách yêu cầu dọn phòng/late checkout có phí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {surcharges.map(sc => {
            const cfg = typeCfg[sc.type] || typeCfg.OTHER;
            return (
              <div key={sc.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#0F1629', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{sc.description || cfg.label}</p>
                  <p className="text-xs" style={{ color: '#4B6A8F' }}>
                    P.{sc.unit.name} · {sc.booking ? `${sc.booking.guest.firstName} ${sc.booking.guest.lastName}` : '—'}
                    {sc.booking?.channelRef && <span className="ml-1 font-mono text-[10px] px-1 rounded" style={{ color: '#FBBF24', background: 'rgba(251,191,36,0.1)' }}>{sc.booking.channelRef}</span>}
                    <span className="ml-2">{fmtDate(sc.createdAt)} {fmtTime(sc.createdAt)}</span>
                  </p>
                </div>
                <p className="text-lg font-extrabold flex-shrink-0" style={{ color: cfg.color }}>{fmtVND(sc.amount)}</p>
                <span className="text-xs px-2 py-1 rounded-full font-bold flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399' }}>💵 Tiền mặt</span>
                {sc.booking && (
                  <button onClick={() => loadBill(sc.booking.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}>
                    🧾 Bill
                  </button>
                )}
                <button onClick={() => deleteSurcharge(sc.id)} className="px-2 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
