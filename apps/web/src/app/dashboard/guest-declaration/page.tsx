// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function fmtDate(d: string) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function GuestDeclarationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  async function loadData() {
    setLoading(true);
    try {
      const result = await apiFetch(`/dashboard/guest-declaration?from=${fromDate}&to=${toDate}`);
      setData(result);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function exportCSV() {
    if (!data.length) return;
    let csv = '\uFEFF';
    csv += `KHAI BÁO LƯU TRÚ - ${fmtDate(fromDate)} đến ${fmtDate(toDate)}\n`;
    csv += `Cơ sở lưu trú: BTM 03 - Đà Nẵng\n`;
    csv += `Địa chỉ: No.03 An Nhơn 15, An Hải Bắc, Đà Nẵng\n`;
    csv += `Ngày xuất: ${fmtDateTime(new Date().toISOString())}\n\n`;
    csv += `STT,Họ tên,Quốc tịch,Email,Số điện thoại,Phòng,Ngày đến,Ngày đi,Số khách,Kênh đặt,Mã booking\n`;
    data.forEach(g => {
      csv += `${g.stt},"${g.guestName}",${g.nationality},${g.email},${g.phone},${g.roomName},${fmtDate(g.checkIn)},${fmtDate(g.checkOut)},${g.numGuests},${g.channel},${g.bookingRef}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Khai_bao_luu_tru_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printDeclaration() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Khai báo lưu trú</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;color:#000;padding:30px;max-width:1000px;margin:0 auto;font-size:13px}
      .header{text-align:center;margin-bottom:20px}
      .header h1{font-size:16px;text-transform:uppercase;font-weight:bold;margin-bottom:4px}
      .header h2{font-size:14px;font-weight:bold;margin-bottom:8px}
      .header p{font-size:12px;margin:2px 0}
      table{width:100%;border-collapse:collapse;margin:15px 0}
      th,td{border:1px solid #000;padding:5px 6px;text-align:left;font-size:11px}
      th{background:#f0f0f0;font-weight:bold;text-align:center}
      .footer{margin-top:30px;display:flex;justify-content:space-between}
      .footer div{text-align:center;width:45%}
      .footer h4{font-size:12px;margin-bottom:60px}
      .footer p{font-size:12px;font-weight:bold}
      .info{margin-bottom:15px;font-size:12px;line-height:1.8}
      @media print{body{padding:15px} .no-print{display:none}}
    </style></head><body>
    <div class="header">
      <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
      <p>Độc lập – Tự do – Hạnh phúc</p>
      <p>———————</p>
      <h2>DANH SÁCH KHÁCH LƯU TRÚ</h2>
      <p>Từ ngày ${fmtDate(fromDate)} đến ngày ${fmtDate(toDate)}</p>
    </div>
    <div class="info">
      <p><strong>Cơ sở lưu trú:</strong> BTM 03 - Đà Nẵng</p>
      <p><strong>Địa chỉ:</strong> No.03 An Nhơn 15, An Hải Bắc, Sơn Trà, Đà Nẵng</p>
      <p><strong>Điện thoại:</strong> +84 901 234 567</p>
    </div>
    <table>
      <tr>
        <th>STT</th><th>Họ và tên</th><th>Quốc tịch</th><th>Email</th><th>SĐT</th>
        <th>Phòng</th><th>Ngày đến</th><th>Ngày đi</th><th>Số khách</th><th>Ghi chú</th>
      </tr>
      ${data.map(g => `<tr>
        <td style="text-align:center">${g.stt}</td>
        <td>${g.guestName}</td>
        <td>${g.nationality}</td>
        <td>${g.email}</td>
        <td>${g.phone}</td>
        <td style="text-align:center">${g.roomName}</td>
        <td style="text-align:center">${fmtDate(g.checkIn)}</td>
        <td style="text-align:center">${fmtDate(g.checkOut)}</td>
        <td style="text-align:center">${g.numGuests}</td>
        <td>${g.channel}</td>
      </tr>`).join('')}
    </table>
    <p style="font-size:12px;margin-top:10px"><strong>Tổng số khách:</strong> ${data.length}</p>
    <div class="footer">
      <div><h4>Người lập</h4><p>Admin HCMP</p></div>
      <div><h4>Xác nhận của cơ sở</h4><p>BTM 03 - Đà Nẵng</p></div>
    </div>
    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()" style="padding:10px 30px;background:#185FA5;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">In / Lưu PDF</button>
    </div>
    </body></html>`);
    w.document.close();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">🏛️ Khai báo lưu trú</h1>
          <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>Xuất danh sách khách lưu trú cho công an địa phương</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#4B6A8F' }}>Từ ngày</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#4B6A8F' }}>Đến ngày</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm text-white" style={{ background: '#080C16', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="pt-5">
          <button onClick={loadData} className="px-5 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(56,138,221,0.15)', border: '1px solid rgba(56,138,221,0.3)' }}>
            {loading ? '...' : 'Xem'}
          </button>
        </div>
        {data.length > 0 && <>
          <div className="pt-5">
            <button onClick={exportCSV} className="px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              📥 Xuất CSV
            </button>
          </div>
          <div className="pt-5">
            <button onClick={printDeclaration} className="px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #185FA5, #3B82F6)' }}>
              🖨️ In / PDF
            </button>
          </div>
        </>}
      </div>

      {/* Summary */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Tổng khách</p>
            <p className="text-2xl font-bold text-white mt-1">{data.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Quốc tịch</p>
            <p className="text-2xl font-bold text-white mt-1">{[...new Set(data.map(g => g.nationality))].length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Kỳ báo cáo</p>
            <p className="text-lg font-bold text-white mt-1">{fmtDate(fromDate)} → {fmtDate(toDate)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>
            <p className="text-4xl mb-3">🏛️</p>
            <p>Không có khách trong kỳ này</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['STT', 'Họ tên', 'Quốc tịch', 'Email', 'SĐT', 'Phòng', 'Ngày đến', 'Ngày đi', 'Số khách', 'Kênh', 'Mã'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#3D5A80' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(g => (
                <tr key={g.stt} className="hover:bg-white/[0.02] transition" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 text-sm text-white/50 text-center">{g.stt}</td>
                  <td className="px-4 py-3 text-sm text-white font-medium">{g.guestName}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{g.nationality}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{g.email}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{g.phone}</td>
                  <td className="px-4 py-3 text-sm text-white font-medium">{g.roomName}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{fmtDate(g.checkIn)}</td>
                  <td className="px-4 py-3 text-sm text-white/70">{fmtDate(g.checkOut)}</td>
                  <td className="px-4 py-3 text-sm text-white/70 text-center">{g.numGuests}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{g.channel}</td>
                  <td className="px-4 py-3">
                    {g.bookingRef && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.15)', color: '#FBBF24' }}>{g.bookingRef}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
