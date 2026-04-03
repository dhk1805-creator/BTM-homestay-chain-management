// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const TYPES = [
  { value: 'HOUSEKEEPING', label: 'Dọn phòng', color: '#3B82F6' },
  { value: 'LATE_CHECKOUT', label: 'Late Checkout', color: '#F59E0B' },
  { value: 'LINEN_CHANGE', label: 'Thay đồ vải', color: '#8B5CF6' },
  { value: 'DAMAGE', label: 'Hư hỏng', color: '#EF4444' },
  { value: 'SMOKING', label: 'Hút thuốc', color: '#DC2626' },
  { value: 'DIRTY', label: 'Làm bẩn phòng', color: '#EA580C' },
  { value: 'OTHER', label: 'Khác', color: '#6B7280' },
];

function formatVND(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }
function formatDate(d: string) { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatDateShort(d: string) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function getTypeInfo(type: string) { return TYPES.find(t => t.value === type) || TYPES[6]; }

// ===== BILL PDF — chỉ phụ phí =====
function printBillPDF(bill: any) {
  const w = window.open('', '_blank');
  if (!w || !bill) return;
  const { booking, surcharges, summary } = bill;
  const guest = booking.guest; const unit = booking.unit; const building = unit?.building; const channel = booking.channel;
  const nights = Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000));
  const billNo = 'SC-' + new Date().getFullYear() + '-' + (booking.channelRef || booking.id.slice(0, 6).toUpperCase());
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill ${billNo}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #D97706}.logo{font-size:22px;font-weight:800;color:#D97706}.logo-sub{font-size:12px;color:#666;margin-top:4px}.inv-title{text-align:right}.inv-title h1{font-size:24px;color:#D97706;font-weight:800}.inv-title p{font-size:12px;color:#666;margin-top:4px}.info-row{display:flex;gap:40px;margin-bottom:24px}.info-box{flex:1}.info-box h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px}.info-box p{font-size:13px;line-height:1.6;color:#333}.bold{font-weight:700;color:#1a1a1a}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#FEF3C7;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#92400E;border-bottom:2px solid #F59E0B}td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}.right{text-align:right}.total-section{margin-top:12px;border-top:2px solid #D97706;padding-top:12px}.total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.total-row.grand{font-size:20px;font-weight:800;color:#D97706;padding:10px 0;border-top:1px solid #ddd;margin-top:4px}.cash-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#D1FAE5;color:#065F46}.note{margin-top:30px;padding:12px;background:#FFFBEB;border-radius:6px;font-size:11px;color:#92400E;line-height:1.6;border:1px solid #FDE68A}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between}.footer-col{text-align:center;flex:1}.footer-col h4{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:60px}.footer-col p{font-size:12px;font-weight:700;color:#333}@media print{body{padding:20px}.no-print{display:none}}</style></head><body>
  <div class="header"><div><div class="logo">${building?.name||'BTM Homestay'}</div><div class="logo-sub">${building?.address||''}</div></div><div class="inv-title"><h1>BILL PHỤ PHÍ</h1><p>Số: ${billNo}</p><p>Ngày: ${new Date().toLocaleDateString('vi-VN')}</p></div></div>
  <div class="info-row"><div class="info-box"><h3>Khách</h3><p class="bold">${guest?.firstName||''} ${guest?.lastName||''}</p><p>${guest?.email||''}</p><p>${guest?.phone||''}</p></div><div class="info-box"><h3>Lưu trú</h3><p><span class="bold">Phòng:</span> ${unit?.name||''}</p><p><span class="bold">Check-in:</span> ${formatDateShort(booking.checkInDate)}</p><p><span class="bold">Check-out:</span> ${formatDateShort(booking.checkOutDate)}</p><p><span class="bold">Kênh:</span> ${channel?.name||'Direct'}</p></div></div>
  ${surcharges.length>0?`<table><tr><th>STT</th><th>Loại</th><th>Mô tả</th><th>Thời gian</th><th class="right">Số tiền</th><th>TT</th></tr>${surcharges.map((s:any,i:number)=>`<tr><td style="text-align:center">${i+1}</td><td>${getTypeInfo(s.type).label}</td><td>${s.description||s.note||''}</td><td>${formatDate(s.createdAt)}</td><td class="right bold">${formatVND(Number(s.amount))}</td><td>${s.paidCash?'<span class="cash-badge">Tiền mặt</span>':'CK'}</td></tr>`).join('')}</table><div class="total-section"><div class="total-row grand"><span>TỔNG PHỤ PHÍ</span><span>${formatVND(summary.totalSurcharges)}</span></div>${summary.totalCash>0?`<div class="total-row" style="color:#065F46;font-weight:600"><span>Đã thu tiền mặt</span><span>${formatVND(summary.totalCash)}</span></div>`:''}</div>`:'<p style="color:#999;margin:20px 0;text-align:center">Không có phụ phí.</p>'}
  <div class="note"><strong>Ghi chú:</strong> Tiền phòng đã thanh toán qua ${channel?.name||'OTA'}. Bill chỉ ghi nhận phụ phí tiền mặt.</div>
  <div class="footer"><div class="footer-col"><h4>Khách hàng</h4><p>${guest?.firstName||''} ${guest?.lastName||''}</p></div><div class="footer-col"><h4>Quản lý</h4><p>BTM Homestay</p></div></div>
  <div class="no-print" style="text-align:center;margin-top:30px"><button onclick="window.print()" style="padding:12px 32px;background:#D97706;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">In / Lưu PDF</button></div></body></html>`);
  w.document.close();
}

// ===== BIÊN BẢN PHẠT PDF =====
function printPenaltyReport(penalty: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  const p = penalty;
  const reportNo = 'BB-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
  const now = new Date();
  const timeStr = `${now.getHours()}h${now.getMinutes().toString().padStart(2,'0')}`;
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Biên bản ${reportNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Times New Roman',serif;color:#000;padding:30px;max-width:800px;margin:0 auto;font-size:14px;line-height:1.6}
    .header{text-align:center;margin-bottom:25px}
    .header h1{font-size:14px;text-transform:uppercase;font-weight:bold}
    .header h2{font-size:16px;font-weight:bold;margin-top:10px;text-transform:uppercase}
    .header p{font-size:12px;margin:3px 0}
    .body-text{margin:15px 0;text-align:justify}
    .body-text p{margin:8px 0}
    .indent{padding-left:30px}
    table{width:100%;border-collapse:collapse;margin:15px 0}
    th,td{border:1px solid #000;padding:8px 10px;text-align:left;font-size:13px}
    th{background:#f0f0f0;font-weight:bold;text-align:center}
    .amount-box{margin:15px 0;padding:12px;border:2px solid #000;text-align:center;font-size:18px;font-weight:bold}
    .signatures{display:flex;justify-content:space-between;margin-top:40px}
    .sig-col{text-align:center;width:45%}
    .sig-col h4{font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px}
    .sig-col p{font-size:11px;font-style:italic;color:#666;margin-bottom:60px}
    .sig-col .name{font-weight:bold;font-style:normal;color:#000}
    .note-section{margin-top:20px;padding:10px;border:1px dashed #999;font-size:12px}
    .note-section h4{font-size:12px;font-weight:bold;margin-bottom:5px}
    @media print{body{padding:15px} .no-print{display:none}}
  </style></head><body>
  <div class="header">
    <h1>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
    <p>Độc lập – Tự do – Hạnh phúc</p>
    <p>————————</p>
    <h2>BIÊN BẢN VI PHẠM NỘI QUY LƯU TRÚ</h2>
    <p>Số: ${reportNo}</p>
  </div>

  <div class="body-text">
    <p>Hôm nay, vào lúc <strong>${timeStr}</strong> ngày <strong>${dateStr}</strong></p>
    <p>Tại: <strong>${p.buildingName || 'BTM 03 - Đà Nẵng'}</strong></p>
    <p>Địa chỉ: <strong>${p.buildingAddress || 'No.03 An Nhơn 15, An Hải Bắc, Sơn Trà, Đà Nẵng'}</strong></p>

    <p style="margin-top:15px"><strong>I. THÀNH PHẦN:</strong></p>
    <p class="indent"><strong>1. Đại diện cơ sở lưu trú:</strong></p>
    <p class="indent">Họ tên: ${p.staffName || '........................................'} &nbsp;&nbsp; Chức vụ: ${p.staffRole || 'Quản lý'}</p>

    <p class="indent"><strong>2. Khách lưu trú (bên vi phạm):</strong></p>
    <p class="indent">Họ tên: <strong>${p.guestName || '........................................'}</strong></p>
    <p class="indent">Số CCCD/Hộ chiếu: <strong>${p.guestId || '........................................'}</strong></p>
    <p class="indent">Quốc tịch: ${p.nationality || '......................'} &nbsp;&nbsp; SĐT: ${p.phone || '......................'}</p>
    <p class="indent">Phòng: <strong>${p.roomName || '............'}</strong> &nbsp;&nbsp; Mã booking: <strong>${p.bookingRef || '............'}</strong></p>
    <p class="indent">Ngày đến: ${p.checkIn || '..../..../........'} &nbsp;&nbsp; Ngày đi: ${p.checkOut || '..../..../........'}</p>

    <p style="margin-top:15px"><strong>II. NỘI DUNG VI PHẠM:</strong></p>
    <table>
      <tr><th style="width:30px">STT</th><th>Hành vi vi phạm</th><th style="width:120px">Số tiền phạt</th></tr>
      ${(p.violations || []).map((v: any, i: number) => `<tr><td style="text-align:center">${i+1}</td><td>${v.description}</td><td style="text-align:right;font-weight:bold">${formatVND(v.amount)}</td></tr>`).join('')}
    </table>

    <div class="amount-box">
      TỔNG SỐ TIỀN PHẠT: ${formatVND(p.totalAmount || 0)}
      <br><span style="font-size:13px;font-weight:normal">(Bằng chữ: ${p.amountInWords || '........................................'})</span>
    </div>

    <p><strong>III. HÌNH THỨC THU:</strong> ${p.paymentMethod || '☑ Tiền mặt &nbsp;&nbsp; ☐ Chuyển khoản'}</p>

    ${p.additionalNotes ? `
    <div class="note-section">
      <h4>IV. GHI CHÚ BỔ SUNG:</h4>
      <p>${p.additionalNotes}</p>
    </div>` : ''}

    <p style="margin-top:15px">Biên bản được lập thành <strong>02 bản</strong>, mỗi bên giữ <strong>01 bản</strong> có giá trị pháp lý như nhau.</p>
    <p>Hai bên đã đọc lại biên bản, công nhận đúng sự thật và cùng ký tên xác nhận.</p>
  </div>

  <div class="signatures">
    <div class="sig-col">
      <h4>Đại diện cơ sở lưu trú</h4>
      <p>(Ký, ghi rõ họ tên)</p>
      <p class="name">${p.staffName || ''}</p>
    </div>
    <div class="sig-col">
      <h4>Khách lưu trú (Bên vi phạm)</h4>
      <p>(Ký, ghi rõ họ tên)</p>
      <p class="name">${p.guestName || ''}</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:30px">
    <button onclick="window.print()" style="padding:12px 32px;background:#DC2626;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ In biên bản</button>
  </div>
  </body></html>`);
  w.document.close();
}

// ===== EXCEL EXPORT =====
function exportMonthlyExcel(monthlyData: any) {
  if (!monthlyData?.surcharges) return;
  const { year, month, surcharges, summary } = monthlyData;
  let csv = '\uFEFF';
  csv += `TỔNG KÊ PHỤ PHÍ TIỀN MẶT - THÁNG ${month}/${year}\nBTM 03 - Đà Nẵng\nNgày xuất: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
  csv += `TỔNG HỢP\nTổng số phụ phí,${summary.totalRecords}\nTổng tiền,"${summary.totalAmount}"\nTổng thu tiền mặt,"${summary.totalCash}"\n\n`;
  csv += `THEO LOẠI\nLoại,Số lượng,Tổng tiền\n`;
  Object.entries(summary.byType||{}).forEach(([type,info]:any) => { csv += `${getTypeInfo(type).label},${info.count},"${info.total}"\n`; });
  csv += `\nCHI TIẾT\nSTT,Ngày,Phòng,Khách,Mã booking,Loại,Mô tả,Số tiền,Tiền mặt\n`;
  surcharges.forEach((s:any,i:number) => {
    csv += `${i+1},${formatDate(s.createdAt)},${s.unit?.name||''},${s.booking?.guest?`${s.booking.guest.firstName} ${s.booking.guest.lastName}`:''},${s.booking?.channelRef||''},${getTypeInfo(s.type).label},"${s.description||s.note||''}","${Number(s.amount)}",${s.paidCash?'Có':'Không'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Phu_phi_thang_${month}_${year}.csv`; a.click();
}

// ===== MAIN COMPONENT =====
export default function SurchargesPage() {
  const [surcharges, setSurcharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list'|'create'|'bill'|'penalty'|'monthly'>('list');
  const [units, setUnits] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({ unitId:'', bookingId:'', type:'HOUSEKEEPING', amount:100000, description:'', paidCash:true, note:'' });
  const [creating, setCreating] = useState(false);
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth()+1 });
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [selectedBillBooking, setSelectedBillBooking] = useState('');
  const [billData, setBillData] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  // Service fees from settings
  const [serviceFees, setServiceFees] = useState<any[]>([]);

  // Penalty form
  const [penaltyBooking, setPenaltyBooking] = useState('');
  const [penaltyInfo, setPenaltyInfo] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([{ description: '', amount: 500000 }]);
  const [penaltyStaffName, setPenaltyStaffName] = useState('');
  const [penaltyStaffRole, setPenaltyStaffRole] = useState('Quản lý');
  const [penaltyNotes, setPenaltyNotes] = useState('');
  const [penaltyAmountWords, setPenaltyAmountWords] = useState('');

  useEffect(() => { loadSurcharges(); loadUnits(); loadServiceFees(); }, []);

  async function loadSurcharges() { setLoading(true); try { setSurcharges(await apiFetch('/surcharges')); } catch(e){} setLoading(false); }
  async function loadUnits() { try { const bl = await apiFetch('/dashboard/buildings'); const au:any[]=[]; bl.forEach((b:any)=>(b.units||[]).forEach((u:any)=>au.push({...u,buildingName:b.name}))); setUnits(au); } catch(e){} }
  async function loadServiceFees() { try { const bl = await apiFetch('/buildings'); if (bl[0]?.settings?.service_fees) setServiceFees(bl[0].settings.service_fees.filter((f:any)=>f.active)); } catch(e){} }
  async function loadBookingsForUnit(uid:string) { try { const d = await apiFetch(`/bookings?unitId=${uid}&status=CHECKED_IN`); setBookings(d); setForm(f=>({...f,bookingId:d.length>0?d[0].id:''})); } catch(e){ setBookings([]); } }
  async function loadAllBookings() { try { const d = await apiFetch('/bookings'); setAllBookings(d.filter((b:any)=>['CHECKED_IN','CHECKED_OUT'].includes(b.status))); } catch(e){} }

  async function handleCreate() {
    if (!form.unitId||form.amount<=0) return; setCreating(true);
    try { await apiFetch('/surcharges',{method:'POST',body:JSON.stringify({unitId:form.unitId,bookingId:form.bookingId||undefined,type:form.type,amount:form.amount,description:form.description,paidCash:form.paidCash,note:form.note||undefined})}); setForm({unitId:'',bookingId:'',type:'HOUSEKEEPING',amount:100000,description:'',paidCash:true,note:''}); setBookings([]); setTab('list'); loadSurcharges(); } catch(e){ alert('Lỗi: '+(e as any).message); }
    setCreating(false);
  }
  async function handleDelete(id:string) { if(!confirm('Xóa phụ phí này?'))return; try{await apiFetch(`/surcharges/${id}`,{method:'DELETE'});loadSurcharges();}catch(e){alert('Lỗi: '+(e as any).message);} }
  async function loadMonthly() { setLoadingMonthly(true); try{setMonthlyData(await apiFetch(`/surcharges/monthly?year=${monthYear.year}&month=${monthYear.month}`));}catch(e){} setLoadingMonthly(false); }
  async function loadBill(bid:string) { if(!bid)return; setLoadingBill(true); try{setBillData(await apiFetch(`/surcharges/bill/${bid}`));}catch(e){} setLoadingBill(false); }

  async function loadPenaltyBooking(bid:string) {
    if (!bid) return;
    try {
      const b = allBookings.find((x:any) => x.id === bid);
      if (b) setPenaltyInfo({ guestName: `${b.guest?.firstName} ${b.guest?.lastName}`, roomName: b.unit?.name, bookingRef: b.channelRef || '', checkIn: formatDateShort(b.checkInDate), checkOut: formatDateShort(b.checkOutDate), phone: b.guest?.phone || '', buildingName: b.unit?.building?.name || 'BTM 03 - Đà Nẵng' });
    } catch(e){}
  }

  const penaltyTotal = violations.reduce((s,v) => s + (Number(v.amount)||0), 0);

  function handlePrintPenalty() {
    printPenaltyReport({
      ...penaltyInfo,
      violations,
      totalAmount: penaltyTotal,
      amountInWords: penaltyAmountWords,
      staffName: penaltyStaffName,
      staffRole: penaltyStaffRole,
      additionalNotes: penaltyNotes,
      paymentMethod: '☑ Tiền mặt    ☐ Chuyển khoản',
    });
  }

  // Create surcharges from penalty violations
  async function handleSavePenalty() {
    if (!penaltyBooking || violations.length === 0) return;
    const b = allBookings.find((x:any) => x.id === penaltyBooking);
    if (!b) return;
    try {
      for (const v of violations) {
        if (v.amount > 0) {
          await apiFetch('/surcharges', { method: 'POST', body: JSON.stringify({
            unitId: b.unit?.id || b.unitId,
            bookingId: penaltyBooking,
            type: v.description.includes('hút thuốc') || v.description.includes('Hút thuốc') ? 'SMOKING' : v.description.includes('hư hỏng') || v.description.includes('Hư hỏng') ? 'DAMAGE' : v.description.includes('bẩn') || v.description.includes('Bẩn') ? 'DIRTY' : 'OTHER',
            amount: v.amount,
            description: `PHẠT: ${v.description}`,
            paidCash: true,
            note: `Biên bản phạt — ${penaltyInfo?.guestName || ''}`,
          })});
        }
      }
      alert('Đã lưu phụ phí phạt vào hệ thống!');
      loadSurcharges();
    } catch (e) { alert('Lỗi: ' + (e as any).message); }
  }

  const inputStyle:any = { background:'#080C16', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 14px', color:'#E2E8F0', fontSize:'14px', width:'100%', outline:'none' };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">💵 Phụ phí & Biên bản phạt</h1>
        <p className="text-sm mt-1" style={{color:'#4B6A8F'}}>Quản lý phụ phí dịch vụ, xuất bill, lập biên bản vi phạm</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          {key:'list',label:'Danh sách',icon:'📋'},
          {key:'create',label:'Tạo phụ phí',icon:'➕'},
          {key:'bill',label:'Xuất Bill',icon:'🧾'},
          {key:'penalty',label:'Biên bản phạt',icon:'📝'},
          {key:'monthly',label:'Tổng kê tháng',icon:'📊'},
        ].map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key as any);if(t.key==='monthly'&&!monthlyData)loadMonthly();if((t.key==='bill'||t.key==='penalty')&&allBookings.length===0)loadAllBookings();}}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={tab===t.key?{background:'rgba(56,138,221,0.15)',border:'1px solid rgba(56,138,221,0.3)',color:'#60A5FA'}:{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',color:'#4B6A8F'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ===== LIST ===== */}
      {tab==='list'&&(
        <div className="rounded-2xl overflow-hidden" style={{background:'#0D1220',border:'1px solid rgba(255,255,255,0.06)'}}>
          {loading?<div className="p-12 text-center" style={{color:'#4B6A8F'}}>Đang tải...</div>
          :surcharges.length===0?<div className="p-12 text-center" style={{color:'#4B6A8F'}}><p className="text-4xl mb-3">💵</p><p>Chưa có phụ phí nào</p></div>
          :<table className="w-full">
            <thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
              {['Thời gian','Phòng','Khách','Loại','Mô tả'].map(h=><th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase" style={{color:'#3D5A80'}}>{h}</th>)}
              <th className="text-right px-5 py-3.5 text-xs font-bold uppercase" style={{color:'#3D5A80'}}>Số tiền</th>
              <th className="text-center px-5 py-3.5 text-xs font-bold uppercase" style={{color:'#3D5A80'}}>TM</th>
              <th className="px-5 py-3.5"></th>
            </tr></thead>
            <tbody>{surcharges.map(s=>{const ti=getTypeInfo(s.type);return<tr key={s.id} className="hover:bg-white/[0.02]" style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
              <td className="px-5 py-3.5 text-sm text-white/70">{formatDate(s.createdAt)}</td>
              <td className="px-5 py-3.5 text-sm text-white font-medium">{s.unit?.name||'—'}</td>
              <td className="px-5 py-3.5 text-sm text-white/70">{s.booking?.guest?`${s.booking.guest.firstName} ${s.booking.guest.lastName}`:'—'}{s.booking?.channelRef&&<span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{background:'rgba(234,179,8,0.15)',color:'#FBBF24'}}>{s.booking.channelRef}</span>}</td>
              <td className="px-5 py-3.5"><span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{background:ti.color+'20',color:ti.color}}>{ti.label}</span></td>
              <td className="px-5 py-3.5 text-sm text-white/60 max-w-[200px] truncate">{s.description||s.note||'—'}</td>
              <td className="px-5 py-3.5 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
              <td className="px-5 py-3.5 text-center">{s.paidCash?<span className="text-emerald-400">✓</span>:<span className="text-red-400">✗</span>}</td>
              <td className="px-5 py-3.5 text-center"><button onClick={()=>handleDelete(s.id)} className="text-red-400/50 hover:text-red-400 text-sm">🗑️</button></td>
            </tr>})}</tbody>
            <tfoot><tr style={{borderTop:'2px solid rgba(255,255,255,0.08)'}}>
              <td colSpan={5} className="px-5 py-4 text-sm font-bold text-white">Tổng ({surcharges.length})</td>
              <td className="px-5 py-4 text-sm text-right font-bold text-emerald-400">{formatVND(surcharges.reduce((s:number,x:any)=>s+Number(x.amount),0))}</td>
              <td colSpan={2}></td>
            </tr></tfoot>
          </table>}
        </div>
      )}

      {/* ===== CREATE ===== */}
      {tab==='create'&&(
        <div className="max-w-lg rounded-2xl p-6" style={{background:'#0D1220',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h2 className="text-lg font-bold text-white mb-5">Tạo phụ phí mới</h2>
          <div className="mb-4"><label className="block text-sm font-medium mb-1.5" style={{color:'#4B6A8F'}}>Phòng *</label>
            <select value={form.unitId} onChange={e=>{setForm(f=>({...f,unitId:e.target.value,bookingId:''}));if(e.target.value)loadBookingsForUnit(e.target.value);}} className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}}>
              <option value="">Chọn phòng...</option>{units.map(u=><option key={u.id} value={u.id}>{u.name} ({u.status})</option>)}
            </select></div>
          {bookings.length>0&&<div className="mb-4"><label className="block text-sm font-medium mb-1.5" style={{color:'#4B6A8F'}}>Booking</label>
            <select value={form.bookingId} onChange={e=>setForm(f=>({...f,bookingId:e.target.value}))} className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}}>
              {bookings.map((b:any)=><option key={b.id} value={b.id}>{b.guest?.firstName} {b.guest?.lastName} — {b.channelRef||b.id.slice(0,8)}</option>)}
            </select></div>}
          <div className="mb-4"><label className="block text-sm font-medium mb-1.5" style={{color:'#4B6A8F'}}>Loại phụ phí</label>
            <div className="flex flex-wrap gap-2">
              {serviceFees.length > 0 ? serviceFees.map((f:any)=>(
                <button key={f.id} onClick={()=>setForm(fm=>({...fm,type:f.name.includes('Dọn')?'HOUSEKEEPING':f.name.includes('vải')?'LINEN_CHANGE':f.name.includes('Late')?'LATE_CHECKOUT':f.name.includes('thuốc')?'SMOKING':f.name.includes('hỏng')?'DAMAGE':f.name.includes('bẩn')?'DIRTY':'OTHER',amount:f.amount,description:f.name}))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition" style={{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
                  {f.name} ({formatVND(f.amount)})
                </button>
              )) : TYPES.slice(0,5).map(t=>(
                <button key={t.value} onClick={()=>{const da=t.value==='HOUSEKEEPING'||t.value==='LINEN_CHANGE'?100000:t.value==='LATE_CHECKOUT'?200000:t.value==='SMOKING'?500000:form.amount;setForm(f=>({...f,type:t.value,amount:da}));}}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  style={form.type===t.value?{background:t.color+'25',color:t.color,border:`1px solid ${t.color}50`}:{background:'rgba(255,255,255,0.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,0.06)'}}>
                  {t.label}
                </button>
              ))}
            </div></div>
          <div className="mb-4"><label className="block text-sm font-medium mb-1.5" style={{color:'#4B6A8F'}}>Số tiền *</label>
            <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:parseInt(e.target.value)||0}))} className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}} step={10000} />
            <p className="text-xs mt-1" style={{color:'#3D5A80'}}>{formatVND(form.amount)}</p></div>
          <div className="mb-4"><label className="block text-sm font-medium mb-1.5" style={{color:'#4B6A8F'}}>Mô tả</label>
            <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}} /></div>
          <div className="mb-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.paidCash} onChange={e=>setForm(f=>({...f,paidCash:e.target.checked}))} className="w-4 h-4 rounded" /><span className="text-sm text-white">Đã thu tiền mặt</span></label></div>
          <button onClick={handleCreate} disabled={creating||!form.unitId||form.amount<=0} className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
            {creating?'Đang tạo...': `Tạo phụ phí — ${formatVND(form.amount)}`}
          </button>
        </div>
      )}

      {/* ===== BILL ===== */}
      {tab==='bill'&&(
        <div className="rounded-2xl p-6" style={{background:'#0D1220',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h2 className="text-lg font-bold text-white mb-2">🧾 Xuất Bill phụ phí</h2>
          <p className="text-xs mb-4" style={{color:'#4B6A8F'}}>Tiền phòng đã thanh toán qua OTA. Bill chỉ ghi phụ phí tiền mặt.</p>
          <select value={selectedBillBooking} onChange={e=>{setSelectedBillBooking(e.target.value);if(e.target.value)loadBill(e.target.value);}} className="max-w-md px-4 py-2.5 rounded-xl text-sm text-white mb-6" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)',width:'100%'}}>
            <option value="">Chọn booking...</option>
            {allBookings.map((b:any)=><option key={b.id} value={b.id}>{b.channelRef||b.id.slice(0,8)} — {b.guest?.firstName} {b.guest?.lastName} — {b.unit?.name}</option>)}
          </select>
          {loadingBill&&<p style={{color:'#4B6A8F'}}>Đang tải...</p>}
          {billData&&!loadingBill&&<div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)'}}><p className="text-xs" style={{color:'#4B6A8F'}}>Tổng phụ phí</p><p className="text-2xl font-bold text-amber-400 mt-1">{formatVND(billData.summary.totalSurcharges)}</p></div>
              <div className="p-4 rounded-xl" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)'}}><p className="text-xs" style={{color:'#4B6A8F'}}>Đã thu TM</p><p className="text-2xl font-bold text-emerald-400 mt-1">{formatVND(billData.summary.totalCash)}</p></div>
            </div>
            {billData.surcharges.length>0&&<div className="mb-6 rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
              <table className="w-full"><thead><tr style={{background:'rgba(245,158,11,0.08)'}}>
                {['Loại','Mô tả','Thời gian'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{color:'#D97706'}}>{h}</th>)}
                <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{color:'#D97706'}}>Số tiền</th>
              </tr></thead><tbody>{billData.surcharges.map((s:any)=><tr key={s.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:getTypeInfo(s.type).color+'20',color:getTypeInfo(s.type).color}}>{getTypeInfo(s.type).label}</span></td>
                <td className="px-4 py-3 text-sm text-white/70">{s.description||'—'}</td>
                <td className="px-4 py-3 text-sm text-white/50">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
              </tr>)}</tbody></table></div>}
            <button onClick={()=>printBillPDF(billData)} className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>🖨️ In Bill / PDF</button>
          </div>}
        </div>
      )}

      {/* ===== PENALTY REPORT ===== */}
      {tab==='penalty'&&(
        <div className="rounded-2xl p-6" style={{background:'#0D1220',border:'1px solid rgba(239,68,68,0.15)'}}>
          <h2 className="text-lg font-bold text-white mb-2">📝 Lập biên bản vi phạm nội quy</h2>
          <p className="text-xs mb-5" style={{color:'#4B6A8F'}}>Biên bản 2 bên ký xác nhận — hút thuốc, hư hỏng, làm bẩn phòng...</p>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{color:'#F87171'}}>Chọn booking vi phạm *</label>
                <select value={penaltyBooking} onChange={e=>{setPenaltyBooking(e.target.value);loadPenaltyBooking(e.target.value);}}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(239,68,68,0.2)'}}>
                  <option value="">Chọn...</option>
                  {allBookings.map((b:any)=><option key={b.id} value={b.id}>{b.channelRef||b.id.slice(0,8)} — {b.guest?.firstName} {b.guest?.lastName} — Phòng {b.unit?.name}</option>)}
                </select>
              </div>

              {penaltyInfo&&<div className="p-3 rounded-xl text-xs" style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.1)'}}>
                <p className="text-white font-bold">{penaltyInfo.guestName} — Phòng {penaltyInfo.roomName}</p>
                <p style={{color:'#4B6A8F'}}>{penaltyInfo.checkIn} → {penaltyInfo.checkOut} | {penaltyInfo.bookingRef}</p>
              </div>}

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{color:'#3D5A80'}}>Đại diện cơ sở</label>
                <div className="grid grid-cols-2 gap-2">
                  <input value={penaltyStaffName} onChange={e=>setPenaltyStaffName(e.target.value)} placeholder="Họ tên quản lý" style={inputStyle} />
                  <input value={penaltyStaffRole} onChange={e=>setPenaltyStaffRole(e.target.value)} placeholder="Chức vụ" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{color:'#F87171'}}>Hành vi vi phạm *</label>
                {violations.map((v,i)=>(
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={v.description} onChange={e=>{const nv=[...violations];nv[i].description=e.target.value;setViolations(nv);}} placeholder="VD: Hút thuốc trong phòng" style={{...inputStyle,flex:1}} />
                    <input type="number" value={v.amount} onChange={e=>{const nv=[...violations];nv[i].amount=parseInt(e.target.value)||0;setViolations(nv);}} style={{...inputStyle,width:'130px'}} step={50000} />
                    {violations.length>1&&<button onClick={()=>setViolations(violations.filter((_,j)=>j!==i))} className="text-red-400 px-2">✗</button>}
                  </div>
                ))}
                <button onClick={()=>setViolations([...violations,{description:'',amount:0}])} className="text-xs font-bold px-3 py-1.5 rounded-lg mt-1" style={{color:'#60A5FA',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)'}}>+ Thêm vi phạm</button>
                {/* Quick add from service fees */}
                {serviceFees.filter(f=>f.name.includes('Phạt')||f.name.includes('phạt')||f.name.includes('thường')||f.name.includes('bẩn')).length>0&&(
                  <div className="flex flex-wrap gap-1 mt-2">
                    {serviceFees.filter(f=>f.name.includes('Phạt')||f.name.includes('phạt')||f.name.includes('thường')||f.name.includes('bẩn')||f.name.includes('mất')).map((f:any)=>(
                      <button key={f.id} onClick={()=>setViolations([...violations,{description:f.name,amount:f.amount}])} className="text-[10px] px-2 py-1 rounded" style={{background:'rgba(239,68,68,0.1)',color:'#F87171',border:'1px solid rgba(239,68,68,0.15)'}}>
                        + {f.name} ({formatVND(f.amount)})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{color:'#3D5A80'}}>Số tiền bằng chữ</label>
                <input value={penaltyAmountWords} onChange={e=>setPenaltyAmountWords(e.target.value)} placeholder="VD: Năm trăm nghìn đồng" style={inputStyle} />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{color:'#3D5A80'}}>Ghi chú bổ sung</label>
                <textarea value={penaltyNotes} onChange={e=>setPenaltyNotes(e.target.value)} rows={3} placeholder="Mô tả chi tiết tình trạng vi phạm, thiệt hại..." className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={{background:'#080C16',color:'#E2E8F0',border:'1px solid rgba(255,255,255,0.08)'}} />
              </div>
            </div>

            {/* Right: preview */}
            <div className="rounded-xl p-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <h3 className="text-sm font-bold text-white mb-4">Xem trước biên bản</h3>
              <div className="space-y-3 text-sm">
                <div><span style={{color:'#4B6A8F'}}>Khách:</span> <span className="text-white font-bold">{penaltyInfo?.guestName||'...'}</span></div>
                <div><span style={{color:'#4B6A8F'}}>Phòng:</span> <span className="text-white">{penaltyInfo?.roomName||'...'}</span></div>
                <div><span style={{color:'#4B6A8F'}}>Đại diện CS:</span> <span className="text-white">{penaltyStaffName||'...'} ({penaltyStaffRole})</span></div>
                <div className="pt-2" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <p className="text-xs font-bold mb-2" style={{color:'#F87171'}}>Vi phạm:</p>
                  {violations.filter(v=>v.description).map((v,i)=>(
                    <div key={i} className="flex justify-between py-1">
                      <span className="text-white/70">{i+1}. {v.description}</span>
                      <span className="text-red-400 font-bold">{formatVND(v.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex justify-between text-lg font-bold" style={{borderTop:'2px solid rgba(239,68,68,0.3)'}}>
                  <span className="text-white">TỔNG PHẠT:</span>
                  <span className="text-red-400">{formatVND(penaltyTotal)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={handlePrintPenalty} disabled={!penaltyBooking||violations.every(v=>!v.description)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{background:'linear-gradient(135deg,#DC2626,#EF4444)'}}>
                  🖨️ In biên bản
                </button>
                <button onClick={handleSavePenalty} disabled={!penaltyBooking||violations.every(v=>!v.description)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
                  💾 Lưu vào phụ phí
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MONTHLY ===== */}
      {tab==='monthly'&&(
        <div className="rounded-2xl p-6" style={{background:'#0D1220',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-white">Tổng kê tháng</h2>
            <select value={monthYear.month} onChange={e=>setMonthYear(m=>({...m,month:parseInt(e.target.value)}))} className="px-3 py-2 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}}>
              {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>Tháng {i+1}</option>)}
            </select>
            <select value={monthYear.year} onChange={e=>setMonthYear(m=>({...m,year:parseInt(e.target.value)}))} className="px-3 py-2 rounded-xl text-sm text-white" style={{background:'#080C16',border:'1px solid rgba(255,255,255,0.1)'}}>
              {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={loadMonthly} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'rgba(56,138,221,0.15)',border:'1px solid rgba(56,138,221,0.3)'}}>{loadingMonthly?'...':'Xem'}</button>
            {monthlyData&&<button onClick={()=>exportMonthlyExcel(monthlyData)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}>📥 Xuất Excel</button>}
          </div>
          {monthlyData&&<>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[{l:'Tổng phụ phí',v:monthlyData.summary.totalRecords,c:'text-white'},{l:'Tổng tiền',v:formatVND(monthlyData.summary.totalAmount),c:'text-emerald-400'},{l:'Thu TM',v:formatVND(monthlyData.summary.totalCash),c:'text-amber-400'},{l:'Theo loại',v:'',c:''}].map((card,i)=>(
                <div key={i} className="p-4 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <p className="text-xs font-medium" style={{color:'#4B6A8F'}}>{card.l}</p>
                  {i<3?<p className={`text-xl font-bold mt-1 ${card.c}`}>{card.v}</p>:
                  <div className="mt-1 space-y-0.5">{Object.entries(monthlyData.summary.byType||{}).map(([t,info]:any)=><p key={t} className="text-xs"><span style={{color:getTypeInfo(t).color}}>{getTypeInfo(t).label}</span>: <span className="text-white">{info.count} ({formatVND(info.total)})</span></p>)}</div>}
                </div>
              ))}
            </div>
            {monthlyData.surcharges?.length>0?<table className="w-full"><thead><tr style={{background:'rgba(255,255,255,0.02)'}}>
              {['Ngày','Phòng','Khách','Loại'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{color:'#3D5A80'}}>{h}</th>)}
              <th className="text-right px-4 py-3 text-xs font-bold uppercase" style={{color:'#3D5A80'}}>Số tiền</th>
            </tr></thead><tbody>{monthlyData.surcharges.map((s:any)=><tr key={s.id} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
              <td className="px-4 py-3 text-sm text-white/70">{formatDate(s.createdAt)}</td>
              <td className="px-4 py-3 text-sm text-white">{s.unit?.name||'—'}</td>
              <td className="px-4 py-3 text-sm text-white/70">{s.booking?.guest?`${s.booking.guest.firstName} ${s.booking.guest.lastName}`:'—'}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:getTypeInfo(s.type).color+'20',color:getTypeInfo(s.type).color}}>{getTypeInfo(s.type).label}</span></td>
              <td className="px-4 py-3 text-sm text-right font-bold text-emerald-400">{formatVND(Number(s.amount))}</td>
            </tr>)}</tbody></table>:<p className="text-center py-8" style={{color:'#4B6A8F'}}>Không có phụ phí trong tháng này</p>}
          </>}
        </div>
      )}
    </div>
  );
}
