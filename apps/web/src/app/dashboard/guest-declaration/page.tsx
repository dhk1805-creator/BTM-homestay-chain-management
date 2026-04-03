// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function fmtDate(d: string) { if (!d) return '—'; return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function GuestDeclarationPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  async function loadData() {
    setLoading(true);
    try { setData(await apiFetch(`/dashboard/guest-declaration?from=${fromDate}&to=${toDate}`)); } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function exportCSV() {
    if (!data.length) return;
    let csv = '\uFEFF';
    csv += `KHAI BÁO LƯU TRÚ - ${fmtDate(fromDate)} đến ${fmtDate(toDate)}\n`;
    csv += `Cơ sở lưu trú: BTM 03 - Đà Nẵng\n`;
    csv += `Địa chỉ: No.03 An Nhơn 15, An Hải Bắc, Sơn Trà, Đà Nẵng\n`;
    csv += `Ngày xuất: ${fmtDateTime(new Date().toISOString())}\n\n`;
    csv += `STT,Họ tên,Giới tính,Ngày sinh,Quốc tịch,Loại GT,Số CCCD/Hộ chiếu,Ngày cấp,Nơi cấp,Ngày hết hạn,Số Visa,Loại Visa,Ngày nhập cảnh,Cửa khẩu,Địa chỉ thường trú,Email,SĐT,Phòng,Ngày đến,Ngày đi,Số khách,Kênh,Mã booking\n`;
    data.forEach(g => {
      csv += `${g.stt},"${g.guestName}",${g.gender || ''},${fmtDate(g.dateOfBirth)},${g.nationality},${g.idType || ''},${g.idNumber || ''},${fmtDate(g.idIssuedDate)},${g.idIssuedPlace || ''},${fmtDate(g.idExpiryDate)},${g.visaNumber || ''},${g.visaType || ''},${fmtDate(g.entryDate)},${g.entryPort || ''},"${g.address || ''}",${g.email},${g.phone},${g.roomName},${fmtDate(g.checkIn)},${fmtDate(g.checkOut)},${g.numGuests},${g.channel},${g.bookingRef}\n`;
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

    const vnGuests = data.filter(g => !g.nationality || g.nationality === 'Viet Nam' || g.nationality === 'Việt Nam' || g.nationality === 'VN');
    const foreignGuests = data.filter(g => g.nationality && g.nationality !== 'Viet Nam' && g.nationality !== 'Việt Nam' && g.nationality !== 'VN');

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Khai báo lưu trú</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;color:#000;padding:25px;max-width:1200px;margin:0 auto;font-size:12px}
      .header{text-align:center;margin-bottom:20px}
      .header h1{font-size:14px;text-transform:uppercase;font-weight:bold;margin-bottom:4px}
      .header h2{font-size:13px;font-weight:bold;margin-bottom:6px}
      .header p{font-size:11px;margin:2px 0}
      .section-title{font-size:13px;font-weight:bold;margin:20px 0 8px;text-transform:uppercase;background:#f0f0f0;padding:6px 10px}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th,td{border:1px solid #000;padding:4px 5px;text-align:left;font-size:10px;vertical-align:top}
      th{background:#e8e8e8;font-weight:bold;text-align:center;font-size:9px}
      .info{margin-bottom:15px;font-size:11px;line-height:1.8}
      .footer{margin-top:30px;display:flex;justify-content:space-between}
      .footer div{text-align:center;width:45%}
      .footer h4{font-size:11px;margin-bottom:50px}
      .footer p{font-size:11px;font-weight:bold}
      .center{text-align:center}
      @media print{body{padding:10px;font-size:10px} .no-print{display:none} th,td{font-size:9px;padding:3px 4px}}
    </style></head><body>
    <div class="header">
      <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
      <p>Độc lập – Tự do – Hạnh phúc</p>
      <p>————————</p>
      <h2>SỔ ĐĂNG KÝ LƯU TRÚ</h2>
      <p>(Theo Luật Cư trú 2020 và Thông tư 55/2021/TT-BCA)</p>
      <p>Từ ngày ${fmtDate(fromDate)} đến ngày ${fmtDate(toDate)}</p>
    </div>
    <div class="info">
      <p><strong>Cơ sở lưu trú:</strong> BTM 03 - Đà Nẵng (Homestay)</p>
      <p><strong>Địa chỉ:</strong> No.03 An Nhơn 15, An Hải Bắc, Sơn Trà, TP. Đà Nẵng</p>
      <p><strong>Người đại diện:</strong> ......................................  <strong>SĐT:</strong> +84 901 234 567</p>
    </div>

    ${vnGuests.length > 0 ? `
    <div class="section-title">I. KHÁCH VIỆT NAM</div>
    <table>
      <tr>
        <th style="width:30px">STT</th>
        <th>Họ và tên</th>
        <th>Giới tính</th>
        <th>Ngày sinh</th>
        <th>Số CCCD/CMND</th>
        <th>Ngày cấp</th>
        <th>Nơi cấp</th>
        <th>Địa chỉ thường trú</th>
        <th>Phòng</th>
        <th>Ngày đến</th>
        <th>Ngày đi</th>
        <th>Số khách</th>
      </tr>
      ${vnGuests.map((g, i) => `<tr>
        <td class="center">${i + 1}</td>
        <td><strong>${g.guestName}</strong></td>
        <td class="center">${g.gender || ''}</td>
        <td class="center">${fmtDate(g.dateOfBirth)}</td>
        <td class="center">${g.idNumber || ''}</td>
        <td class="center">${fmtDate(g.idIssuedDate)}</td>
        <td>${g.idIssuedPlace || ''}</td>
        <td>${g.address || ''}</td>
        <td class="center">${g.roomName}</td>
        <td class="center">${fmtDate(g.checkIn)}</td>
        <td class="center">${fmtDate(g.checkOut)}</td>
        <td class="center">${g.numGuests}</td>
      </tr>`).join('')}
    </table>` : ''}

    ${foreignGuests.length > 0 ? `
    <div class="section-title">II. KHÁCH NƯỚC NGOÀI (Mẫu NA17)</div>
    <table>
      <tr>
        <th style="width:30px">STT</th>
        <th>Họ và tên</th>
        <th>Giới tính</th>
        <th>Ngày sinh</th>
        <th>Quốc tịch</th>
        <th>Số hộ chiếu</th>
        <th>Ngày cấp</th>
        <th>Ngày hết hạn</th>
        <th>Số Visa</th>
        <th>Loại Visa</th>
        <th>Ngày nhập cảnh</th>
        <th>Cửa khẩu</th>
        <th>Phòng</th>
        <th>Ngày đến</th>
        <th>Ngày đi</th>
      </tr>
      ${foreignGuests.map((g, i) => `<tr>
        <td class="center">${i + 1}</td>
        <td><strong>${g.guestName}</strong></td>
        <td class="center">${g.gender || ''}</td>
        <td class="center">${fmtDate(g.dateOfBirth)}</td>
        <td>${g.nationality}</td>
        <td class="center">${g.idNumber || ''}</td>
        <td class="center">${fmtDate(g.idIssuedDate)}</td>
        <td class="center">${fmtDate(g.idExpiryDate)}</td>
        <td class="center">${g.visaNumber || ''}</td>
        <td class="center">${g.visaType || ''}</td>
        <td class="center">${fmtDate(g.entryDate)}</td>
        <td>${g.entryPort || ''}</td>
        <td class="center">${g.roomName}</td>
        <td class="center">${fmtDate(g.checkIn)}</td>
        <td class="center">${fmtDate(g.checkOut)}</td>
      </tr>`).join('')}
    </table>` : ''}

    <p style="font-size:11px;margin-top:12px"><strong>Tổng số khách:</strong> ${data.length} (Việt Nam: ${vnGuests.length}, Nước ngoài: ${foreignGuests.length})</p>

    <div class="footer">
      <div><h4>Người lập báo cáo</h4><p>.............................</p></div>
      <div><h4>Đại diện cơ sở lưu trú</h4><p>BTM 03 - Đà Nẵng</p></div>
    </div>

    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()" style="padding:10px 30px;background:#185FA5;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">In / Lưu PDF</button>
    </div>
    </body></html>`);
    w.document.close();
  }

  const vnCount = data.filter(g => !g.nationality || g.nationality === 'Viet Nam' || g.nationality === 'Việt Nam' || g.nationality === 'VN').length;
  const foreignCount = data.length - vnCount;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">🏛️ Khai báo lưu trú</h1>
          <p className="text-sm mt-1" style={{ color: '#4B6A8F' }}>Xuất danh sách khách theo chuẩn BCA — Luật Cư trú 2020 & Thông tư 55/2021/TT-BCA</p>
        </div>
      </div>

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
            {loading ? '...' : '🔍 Xem'}
          </button>
        </div>
        {data.length > 0 && <>
          <div className="pt-5">
            <button onClick={exportCSV} className="px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>📥 Xuất CSV</button>
          </div>
          <div className="pt-5">
            <button onClick={printDeclaration} className="px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #185FA5, #3B82F6)' }}>🖨️ In / PDF</button>
          </div>
        </>}
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Tổng khách</p>
            <p className="text-2xl font-bold text-white mt-1">{data.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Khách Việt Nam</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{vnCount}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Khách nước ngoài</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{foreignCount}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#4B6A8F' }}>Có CCCD/Passport</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{data.filter(g => g.idNumber).length} / {data.length}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1220', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? <div className="p-12 text-center" style={{ color: '#4B6A8F' }}>Đang tải...</div>
        : data.length === 0 ? <div className="p-12 text-center" style={{ color: '#4B6A8F' }}><p className="text-4xl mb-3">🏛️</p><p>Không có khách trong kỳ này</p></div>
        : <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '1400px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['STT','Họ tên','Giới tính','Ngày sinh','Quốc tịch','Loại GT','Số CCCD/HC','Ngày cấp','Nơi cấp','Hết hạn','Visa','Phòng','Ngày đến','Ngày đi','SĐT'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[10px] font-bold uppercase whitespace-nowrap" style={{ color: '#3D5A80' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(g => {
                  const isForeign = g.nationality && g.nationality !== 'Viet Nam' && g.nationality !== 'Việt Nam' && g.nationality !== 'VN';
                  const hasId = !!g.idNumber;
                  return (
                    <tr key={g.stt} className="hover:bg-white/[0.02] transition" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-3 py-3 text-sm text-white/50 text-center">{g.stt}</td>
                      <td className="px-3 py-3 text-sm text-white font-medium whitespace-nowrap">{g.guestName}</td>
                      <td className="px-3 py-3 text-sm text-white/70">{g.gender || '—'}</td>
                      <td className="px-3 py-3 text-sm text-white/70 whitespace-nowrap">{fmtDate(g.dateOfBirth)}</td>
                      <td className="px-3 py-3 text-sm">
                        {isForeign ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24' }}>{g.nationality}</span>
                        : <span className="text-white/60">VN</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-white/60">{g.idType || '—'}</td>
                      <td className="px-3 py-3 text-sm font-mono" style={{ color: hasId ? '#60A5FA' : '#F87171' }}>{g.idNumber || 'Chưa có'}</td>
                      <td className="px-3 py-3 text-sm text-white/60 whitespace-nowrap">{fmtDate(g.idIssuedDate)}</td>
                      <td className="px-3 py-3 text-sm text-white/60 max-w-[120px] truncate">{g.idIssuedPlace || '—'}</td>
                      <td className="px-3 py-3 text-sm text-white/60 whitespace-nowrap">{fmtDate(g.idExpiryDate)}</td>
                      <td className="px-3 py-3 text-sm text-white/60">{g.visaNumber || '—'}</td>
                      <td className="px-3 py-3 text-sm text-white font-medium">{g.roomName}</td>
                      <td className="px-3 py-3 text-sm text-white/70 whitespace-nowrap">{fmtDate(g.checkIn)}</td>
                      <td className="px-3 py-3 text-sm text-white/70 whitespace-nowrap">{fmtDate(g.checkOut)}</td>
                      <td className="px-3 py-3 text-sm text-white/60">{g.phone || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>

      {data.length > 0 && data.some(g => !g.idNumber) && (
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>⚠️ Lưu ý: Một số khách chưa có thông tin CCCD/Hộ chiếu. Vui lòng cập nhật thông tin khách trong mục "Khách hàng" trước khi nộp khai báo lưu trú.</p>
        </div>
      )}
    </div>
  );
}
