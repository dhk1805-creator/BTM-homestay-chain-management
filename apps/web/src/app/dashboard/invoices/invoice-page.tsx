// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookingItem {
  id: string; status: string; checkInDate: string; checkOutDate: string;
  numGuests: number; totalAmount: string; currency: string; channelRef: string | null;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  unit: { name: string; type: string; building: { name: string; address: string; city: string; settings: any } };
  channel: { name: string } | null;
}

export default function InvoicePage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [vatRate, setVatRate] = useState(8);
  const [companyName, setCompanyName] = useState('');
  const [companyTax, setCompanyTax] = useState('');
  const [companyAddr, setCompanyAddr] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  useEffect(() => {
    apiFetch('/bookings').then(data => {
      const eligible = data.filter((b: any) => ['CHECKED_OUT', 'CHECKED_IN', 'CONFIRMED'].includes(b.status));
      setBookings(eligible);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const nights = (b: BookingItem) => Math.max(1, Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86400000));
  const subtotal = (b: BookingItem) => Number(b.totalAmount);
  const vatAmount = (b: BookingItem) => Math.round(subtotal(b) * vatRate / 100);
  const total = (b: BookingItem) => subtotal(b) + vatAmount(b);

  const fmtVND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const invoiceNo = (b: BookingItem) => 'INV-' + new Date().getFullYear() + '-' + (b.channelRef || b.id.slice(0, 6).toUpperCase());

  const printInvoice = () => {
    const w = window.open('', '_blank');
    if (!w || !selectedBooking) return;
    const b = selectedBooking;
    const s = b.unit?.building?.settings || {};
    const n = nights(b);
    const pricePerNight = Math.round(subtotal(b) / n);

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn ${invoiceNo(b)}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #185FA5}
      .logo{font-size:24px;font-weight:800;color:#185FA5}
      .logo-sub{font-size:12px;color:#666;margin-top:4px}
      .inv-title{text-align:right}
      .inv-title h1{font-size:28px;color:#185FA5;font-weight:800}
      .inv-title p{font-size:12px;color:#666;margin-top:4px}
      .info-row{display:flex;gap:40px;margin-bottom:24px}
      .info-box{flex:1}
      .info-box h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px}
      .info-box p{font-size:13px;line-height:1.6;color:#333}
      .info-box .bold{font-weight:700;color:#1a1a1a}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th{background:#f0f4f8;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid #ddd}
      td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
      .right{text-align:right}
      .total-section{margin-top:8px;border-top:2px solid #185FA5;padding-top:12px}
      .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
      .total-row.grand{font-size:18px;font-weight:800;color:#185FA5;padding:8px 0;border-top:1px solid #ddd;margin-top:4px}
      .footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between}
      .footer-col{text-align:center;flex:1}
      .footer-col h4{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:60px}
      .footer-col p{font-size:12px;font-weight:700;color:#333}
      .note{margin-top:30px;padding:12px;background:#f8f9fa;border-radius:6px;font-size:11px;color:#666;line-height:1.6}
      @media print{body{padding:20px} .no-print{display:none}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="logo">BTM HOMESTAY</div>
        <div class="logo-sub">${s.wifi_ssid ? b.unit.building.name : 'BTM 03 - Đà Nẵng'}<br>${b.unit.building.address || 'An Nhơn 15, An Hải Bắc'}, ${b.unit.building.city || 'Đà Nẵng'}<br>Hotline: ${s.manager_phone || '+84 901 234 567'}</div>
      </div>
      <div class="inv-title">
        <h1>HÓA ĐƠN</h1>
        <p>Số: ${invoiceNo(b)}<br>Ngày: ${fmtDate(new Date().toISOString())}</p>
      </div>
    </div>

    <div class="info-row">
      <div class="info-box">
        <h3>Thông tin khách hàng</h3>
        <p class="bold">${b.guest.firstName} ${b.guest.lastName}</p>
        <p>${b.guest.email}${b.guest.phone ? '<br>' + b.guest.phone : ''}</p>
        ${companyName ? `<p style="margin-top:8px"><strong>Công ty:</strong> ${companyName}</p>` : ''}
        ${companyTax ? `<p><strong>MST:</strong> ${companyTax}</p>` : ''}
        ${companyAddr ? `<p><strong>Địa chỉ:</strong> ${companyAddr}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Thông tin đặt phòng</h3>
        <p>Phòng: <span class="bold">${b.unit.name}</span><br>
        Check-in: <span class="bold">${fmtDate(b.checkInDate)}</span><br>
        Check-out: <span class="bold">${fmtDate(b.checkOutDate)}</span><br>
        Số khách: ${b.numGuests}<br>
        Mã booking: ${b.channelRef || b.id.slice(0, 8)}<br>
        Kênh: ${b.channel?.name || 'Direct'}</p>
      </div>
    </div>

    <table>
      <thead><tr><th>Mô tả</th><th>Số đêm</th><th class="right">Đơn giá/đêm</th><th class="right">Thành tiền</th></tr></thead>
      <tbody>
        <tr>
          <td>Phòng ${b.unit.name} — ${b.unit.type || 'Studio'}<br><span style="color:#888;font-size:11px">${fmtDate(b.checkInDate)} → ${fmtDate(b.checkOutDate)}</span></td>
          <td>${n}</td>
          <td class="right">${fmtVND(pricePerNight)}</td>
          <td class="right"><strong>${fmtVND(subtotal(b))}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="total-section" style="max-width:300px;margin-left:auto">
      <div class="total-row"><span>Tạm tính:</span><span>${fmtVND(subtotal(b))}</span></div>
      <div class="total-row"><span>VAT (${vatRate}%):</span><span>${fmtVND(vatAmount(b))}</span></div>
      <div class="total-row grand"><span>TỔNG CỘNG:</span><span>${fmtVND(total(b))}</span></div>
    </div>

    <div class="footer">
      <div class="footer-col">
        <h4>Khách hàng</h4>
        <p>${b.guest.firstName} ${b.guest.lastName}</p>
      </div>
      <div class="footer-col">
        <h4>Người lập</h4>
        <p>Admin HCMP</p>
      </div>
    </div>

    <div class="note">
      📌 Hóa đơn này được tạo tự động bởi hệ thống BTM Homestay Chain Management Platform.<br>
      Mọi thắc mắc vui lòng liên hệ: ${s.manager_phone || '+84 901 234 567'}
    </div>

    <div class="no-print" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="padding:12px 32px;background:#185FA5;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ In hóa đơn</button>
      <button onclick="window.close()" style="padding:12px 32px;background:#eee;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-left:8px">Đóng</button>
    </div>
    </body></html>`);
    w.document.close();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">🧾 Hóa đơn</h1>
        <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Xuất hóa đơn PDF cho khách · {bookings.length} booking có thể xuất</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT: Booking list */}
        <div className="col-span-1 space-y-2">
          <p className="text-xs font-bold uppercase mb-2" style={{color:'#3D5A80'}}>Chọn booking để xuất hóa đơn</p>
          {bookings.map((b, i) => (
            <div key={b.id} onClick={() => setSelectedBooking(b)}
              className="rounded-xl p-3 cursor-pointer transition hover:bg-white/[0.04]"
              style={{
                background: selectedBooking?.id === b.id ? 'rgba(59,130,246,0.1)' : '#0F1629',
                border: selectedBooking?.id === b.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                  style={{background: ['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#10B981,#3B82F6)'][i%3]}}>
                  {b.guest.firstName.charAt(0)}{b.guest.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{b.guest.firstName} {b.guest.lastName}</p>
                  <p className="text-xs" style={{color:'#3D5A80'}}>Phòng {b.unit.name} · {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</p>
                </div>
              </div>
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm" style={{color:'#3D5A80'}}>Chưa có booking nào để xuất hóa đơn</p>
            </div>
          )}
        </div>

        {/* RIGHT: Invoice preview */}
        <div className="col-span-2">
          {!selectedBooking ? (
            <div className="rounded-2xl p-12 text-center" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-5xl mb-4">🧾</p>
              <p className="text-lg font-bold text-white">Chọn booking bên trái để xem hóa đơn</p>
              <p className="text-sm mt-2" style={{color:'#3D5A80'}}>Hóa đơn sẽ được tạo tự động với thông tin booking</p>
            </div>
          ) : (
            <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              {/* Invoice preview */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">📄 Xem trước hóa đơn</h2>
                <span className="text-xs font-mono" style={{color:'#60A5FA'}}>{invoiceNo(selectedBooking)}</span>
              </div>

              <div className="rounded-xl p-5 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>KHÁCH HÀNG</p>
                    <p className="text-base font-bold text-white">{selectedBooking.guest.firstName} {selectedBooking.guest.lastName}</p>
                    <p className="text-sm" style={{color:'#4B6A8F'}}>{selectedBooking.guest.email}</p>
                    {selectedBooking.guest.phone && <p className="text-sm" style={{color:'#4B6A8F'}}>{selectedBooking.guest.phone}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-2" style={{color:'#3D5A80'}}>PHÒNG & THỜI GIAN</p>
                    <p className="text-base font-bold text-white">Phòng {selectedBooking.unit.name}</p>
                    <p className="text-sm" style={{color:'#4B6A8F'}}>{fmtDate(selectedBooking.checkInDate)} → {fmtDate(selectedBooking.checkOutDate)}</p>
                    <p className="text-sm" style={{color:'#4B6A8F'}}>{nights(selectedBooking)} đêm · {selectedBooking.numGuests} khách</p>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="rounded-xl p-4 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
                <div className="flex justify-between py-2">
                  <span className="text-sm" style={{color:'#94A3B8'}}>Tiền phòng ({nights(selectedBooking)} đêm)</span>
                  <span className="text-sm font-bold text-white">{fmtVND(subtotal(selectedBooking))}</span>
                </div>
                <div className="flex justify-between py-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{color:'#94A3B8'}}>VAT</span>
                    <select value={vatRate} onChange={e => setVatRate(Number(e.target.value))}
                      className="rounded-lg px-2 py-1 text-xs outline-none"
                      style={{background:'rgba(255,255,255,0.04)',color:'#60A5FA',border:'1px solid rgba(255,255,255,0.1)'}}>
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={8}>8%</option>
                      <option value={10}>10%</option>
                    </select>
                  </div>
                  <span className="text-sm font-bold text-white">{fmtVND(vatAmount(selectedBooking))}</span>
                </div>
                <div className="flex justify-between py-3 mt-2" style={{borderTop:'2px solid rgba(59,130,246,0.3)'}}>
                  <span className="text-base font-bold" style={{color:'#60A5FA'}}>TỔNG CỘNG</span>
                  <span className="text-xl font-black" style={{color:'#60A5FA'}}>{fmtVND(total(selectedBooking))}</span>
                </div>
              </div>

              {/* Company info (optional for VAT invoice) */}
              <div className="rounded-xl p-4 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
                <p className="text-xs font-bold mb-3" style={{color:'#3D5A80'}}>THÔNG TIN XUẤT HÓA ĐƠN CÔNG TY (tùy chọn)</p>
                <div className="grid grid-cols-3 gap-3">
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Tên công ty" className="rounded-lg px-3 py-2 text-sm outline-none"
                    style={{background:'rgba(255,255,255,0.04)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.1)'}} />
                  <input value={companyTax} onChange={e => setCompanyTax(e.target.value)}
                    placeholder="Mã số thuế" className="rounded-lg px-3 py-2 text-sm outline-none"
                    style={{background:'rgba(255,255,255,0.04)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.1)'}} />
                  <input value={companyAddr} onChange={e => setCompanyAddr(e.target.value)}
                    placeholder="Địa chỉ công ty" className="rounded-lg px-3 py-2 text-sm outline-none"
                    style={{background:'rgba(255,255,255,0.04)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.1)'}} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={printInvoice}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition active:scale-[0.98]"
                  style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
                  🖨️ In / Xuất PDF
                </button>
                <button onClick={() => {
                  printInvoice();
                  setSentMsg('Hóa đơn đã mở — gửi email thủ công từ file PDF');
                  setTimeout(() => setSentMsg(''), 3000);
                }}
                  className="px-6 py-3 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  style={{background:'rgba(16,185,129,0.15)',color:'#34D399',border:'1px solid rgba(16,185,129,0.25)'}}>
                  📧 In & Gửi email
                </button>
              </div>
              {sentMsg && <p className="text-sm mt-3 text-center" style={{color:'#34D399'}}>{sentMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
