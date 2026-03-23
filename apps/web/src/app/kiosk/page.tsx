'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

type Step = 'welcome' | 'checkin' | 'checkout' | 'complete';

export default function KioskPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [lang, setLang] = useState('vi');
  const [bookingCode, setBookingCode] = useState('');
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [messages, setMessages] = useState<{role:string;text:string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTime(new Date()); const t = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  useEffect(() => {
    const g: Record<string,string> = {
      vi: 'Xin chào! Mình là Lena 😊 Chào mừng bạn đến BTM 03 Đà Nẵng!\nNhập mã booking bên trên hoặc nhắn tin cho mình tại đây nhé.',
      en: 'Hello! I\'m Lena 😊 Welcome to BTM 03 Da Nang!\nEnter your booking code above or chat with me here.',
      zh: '您好！我是Lena 😊 欢迎来到BTM 03岘港！\n请在上方输入预订代码，或在此与我聊天。',
      ko: '안녕하세요! Lena입니다 😊 BTM 03 다낭에 오신 것을 환영합니다!\n위에 예약 코드를 입력하거나 여기서 채팅하세요.',
    };
    setMessages([{ role: 'ai', text: g[lang] || g.vi }]);
  }, [lang]);

  const T: Record<string,Record<string,string>> = {
    vi: { title:'Chào mừng đến BTM 03', subtitle:'Đà Nẵng · Self Check-in', code:'Mã đặt phòng / Tên khách', search:'Tìm booking', room:'Phòng', floor:'Tầng', guest:'Khách', nights:'đêm', checkin:'✅ Xác nhận Check-in', pin:'Mã PIN cửa', wifi:'WiFi', enjoy:'Chúc bạn nghỉ ngơi vui vẻ!', done:'Xong! Quay về trang chủ', back:'← Quay lại', chat:'Nhắn tin cho Lena...', send:'Gửi', emergency:'🚨 Khẩn cấp', checkout:'🚪 Check-out', checkoutTitle:'Check-out', checkoutSub:'Nhập tên hoặc số phòng để check-out', confirmCheckout:'🚪 Xác nhận Check-out', thankYou:'Cảm ơn bạn!', seeYou:'Hẹn gặp lại lần sau!' },
    en: { title:'Welcome to BTM 03', subtitle:'Da Nang · Self Check-in', code:'Booking code / Guest name', search:'Find booking', room:'Room', floor:'Floor', guest:'Guests', nights:'nights', checkin:'✅ Confirm Check-in', pin:'Door PIN', wifi:'WiFi', enjoy:'Enjoy your stay!', done:'Done! Back to home', back:'← Back', chat:'Chat with Lena...', send:'Send', emergency:'🚨 Emergency', checkout:'🚪 Check-out', checkoutTitle:'Check-out', checkoutSub:'Enter name or room number', confirmCheckout:'🚪 Confirm Check-out', thankYou:'Thank you!', seeYou:'See you next time!' },
    zh: { title:'欢迎来到BTM 03', subtitle:'岘港 · 自助入住', code:'预订代码/客人姓名', search:'查找预订', room:'房间', floor:'楼层', guest:'客人', nights:'晚', checkin:'✅ 确认入住', pin:'门锁密码', wifi:'WiFi', enjoy:'祝您住宿愉快！', done:'完成！返回首页', back:'← 返回', chat:'与Lena聊天...', send:'发送', emergency:'🚨 紧急', checkout:'🚪 退房', checkoutTitle:'退房', checkoutSub:'输入姓名或房间号', confirmCheckout:'🚪 确认退房', thankYou:'谢谢！', seeYou:'下次再见！' },
    ko: { title:'BTM 03에 오신 것을 환영합니다', subtitle:'다낭 · 셀프 체크인', code:'예약 코드/손님 이름', search:'예약 찾기', room:'방', floor:'층', guest:'손님', nights:'박', checkin:'✅ 체크인 확인', pin:'도어 PIN', wifi:'WiFi', enjoy:'즐거운 숙박 되세요!', done:'완료! 홈으로', back:'← 뒤로', chat:'Lena에게 메시지...', send:'보내기', emergency:'🚨 긴급', checkout:'🚪 체크아웃', checkoutTitle:'체크아웃', checkoutSub:'이름 또는 방 번호 입력', confirmCheckout:'🚪 체크아웃 확인', thankYou:'감사합니다!', seeYou:'다음에 또 만나요!' },
  };
  const t = T[lang] || T.vi;

  const handleKey = (k: string) => { if (k === 'del') setBookingCode(p => p.slice(0,-1)); else if (bookingCode.length < 20) setBookingCode(p => p + k); };

  const searchBooking = async () => {
    if (!bookingCode.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await apiFetch('/bookings?limit=50');
      const found = res.find((b:any) =>
        b.id?.includes(bookingCode.toLowerCase()) ||
        b.channelRef?.toLowerCase().includes(bookingCode.toLowerCase()) ||
        b.guest?.lastName?.toLowerCase().includes(bookingCode.toLowerCase()) ||
        b.guest?.firstName?.toLowerCase().includes(bookingCode.toLowerCase())
      );
      if (found) {
        setBooking(found); setStep('checkin');
        setMessages(p => [...p, { role:'ai', text: lang==='en'
          ? `Found it! Welcome ${found.guest.firstName}! 🎉\nRoom ${found.unit.name} (Floor ${found.unit.floor || '?'}) is ready.\nPress "Confirm Check-in" above.`
          : `Tìm thấy rồi! Chào ${found.guest.firstName}! 🎉\nPhòng ${found.unit.name} (Tầng ${found.unit.floor || '?'}) đã sẵn sàng.\nNhấn "Xác nhận Check-in" ở trên nhé.`
        }]);
      } else {
        setError(lang==='en' ? 'Booking not found.' : 'Không tìm thấy. Thử nhập tên hoặc mã khác.');
      }
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  };

  const searchCheckout = async () => {
    if (!bookingCode.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await apiFetch('/bookings?limit=50');
      const found = res.find((b:any) =>
        (b.status === 'CHECKED_IN') && (
          b.guest?.firstName?.toLowerCase().includes(bookingCode.toLowerCase()) ||
          b.guest?.lastName?.toLowerCase().includes(bookingCode.toLowerCase()) ||
          b.unit?.name?.includes(bookingCode) ||
          b.channelRef?.toLowerCase().includes(bookingCode.toLowerCase())
        )
      );
      if (found) {
        await apiFetch(`/bookings/${found.id}/status`, { method:'PATCH', body: JSON.stringify({ status:'CHECKED_OUT' }) });
        setBooking(found);
        setStep('complete');
        setMessages(p => [...p, { role:'ai', text: lang==='en'
          ? `✅ Check-out room ${found.unit.name} complete!\n\nThank you ${found.guest.firstName} for staying at BTM 03. See you next time! 😊\n\nRemember:\n• Leave keys in the room\n• Close the door when leaving`
          : `✅ Check-out phòng ${found.unit.name} hoàn tất!\n\nCảm ơn ${found.guest.firstName} đã ở BTM 03 Đà Nẵng. Hẹn gặp lại! 😊\n\nNhớ:\n• Để lại chìa khóa trong phòng\n• Đóng cửa khi ra\n\n⭐ Nếu hài lòng, hãy dành 1 phút review tốt cho BTM 03 trên AirBnB nhe`
        }]);
      } else {
        setError(lang==='en' ? 'No checked-in booking found.' : 'Không tìm thấy booking đang check-in.');
      }
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  };

  const confirmCheckin = async () => {
    if (!booking) return;
    setLoading(true);
    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    setPin(newPin);
    try {
      await apiFetch(`/bookings/${booking.id}/status`, { method:'PATCH', body: JSON.stringify({ status:'CHECKED_IN' }) });
      setStep('complete');
      setMessages(p => [...p, { role:'ai', text: lang==='en'
        ? `✅ All done!\n\n🔑 PIN: ${newPin}\n📶 WiFi: BTM03_5G / btm2026!\n\nI'm here 24/7 — just ask!`
        : `✅ Xong rồi!\n\n🔑 Mã PIN: ${newPin}\n📶 WiFi: BTM03_5G / btm2026!\n\n📍 Thông tin tòa nhà:\n🏢 BTM 03 - No.03 An Nhơn 15, An Hải Bắc, Đà Nẵng\n🏗️ 6 tầng · Thang máy · Thoát hiểm: cầu thang bộ bên phải\n📞 Hotline quản lý: +84 901 234 567\n\n💁 Mình là Lena — có thể giúp bạn:\n🌤️ Thời tiết · 🍜 Nhà hàng ngon · 🏖️ Du lịch & giá vé\n🛵 Thuê xe · ⛳ Golf & Spa · 🚕 Taxi/Grab\n🏥 Bệnh viện · 👮 Công an (113/114/115) · 🧹 Dọn phòng\n\n📝 Nội quy: Không hút thuốc. Yên tĩnh 22:00-07:00.\n\nNhắn tin cho mình bất cứ lúc nào — 24/7 nhé! 😊`
      }]);
    } catch { setError('Check-in failed'); }
    finally { setLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput(''); setChatLoading(true);
    setMessages(p => [...p, { role:'user', text: msg }]);
    try {
      const res = await apiFetch('/agent/chat', { method:'POST', body: JSON.stringify({ message: msg, bookingId: booking?.id, deviceType:'kiosk', lang, history: messages.slice(1) }) });
      setMessages(p => [...p, { role:'ai', text: res.response }]);
    } catch { setMessages(p => [...p, { role:'ai', text: 'Connection error.' }]); }
    finally { setChatLoading(false); }
  };

  const reset = () => { setStep('welcome'); setBooking(null); setBookingCode(''); setError(''); setPin(''); };

  const nights = booking ? Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000) : 0;

  const Keyboard = ({ color = 'blue' }: { color?: string }) => {
    const numStyle = color === 'red'
      ? {background:'rgba(239,68,68,.06)',color:'#FCA5A5',border:'1px solid rgba(239,68,68,.15)'}
      : {background:'rgba(59,130,246,.06)',color:'#60A5FA',border:'1px solid rgba(59,130,246,.15)'};
    return (
      <>
        <div className="grid grid-cols-10 gap-1.5 mb-2">
          {'QWERTYUIOP'.split('').map(k=>(
            <button key={k} onClick={()=>handleKey(k)} className="py-3.5 rounded-xl text-lg font-bold transition-all active:scale-95"
              style={{background:'rgba(255,255,255,.03)',color:'#CBD5E1',border:'1px solid rgba(255,255,255,.06)'}}>{k}</button>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1.5 mb-2 px-4">
          {'ASDFGHJKL'.split('').map(k=>(
            <button key={k} onClick={()=>handleKey(k)} className="py-3.5 rounded-xl text-lg font-bold transition-all active:scale-95"
              style={{background:'rgba(255,255,255,.03)',color:'#CBD5E1',border:'1px solid rgba(255,255,255,.06)'}}>{k}</button>
          ))}
        </div>
        <div className="grid grid-cols-10 gap-1.5 mb-2 px-8">
          {'ZXCVBNM'.split('').map(k=>(
            <button key={k} onClick={()=>handleKey(k)} className="py-3.5 rounded-xl text-lg font-bold transition-all active:scale-95"
              style={{background:'rgba(255,255,255,.03)',color:'#CBD5E1',border:'1px solid rgba(255,255,255,.06)'}}>{k}</button>
          ))}
          <button onClick={()=>handleKey('del')} className="py-3.5 rounded-xl text-lg font-bold col-span-2 transition-all active:scale-95"
            style={{background:'rgba(239,68,68,.08)',color:'#F87171',border:'1px solid rgba(239,68,68,.15)'}}>⌫</button>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {'1234567890'.split('').map(k=>(
            <button key={k} onClick={()=>handleKey(k)} className="py-3.5 rounded-xl text-lg font-bold transition-all active:scale-95"
              style={numStyle}>{k}</button>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none" style={{background:'#060A14'}}>

      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between px-8 py-3 flex-shrink-0" style={{background:'#0A0F1D',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,.9)"/><rect x="8" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,.55)"/><rect x="1" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,.55)"/><rect x="8" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,.3)"/></svg>
          </div>
          <div>
            <p className="text-white font-extrabold text-xl tracking-tight">BTM Homestay</p>
            <p className="text-xs font-medium" style={{color:'#3D5A80'}}>Lena · AI Concierge · 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            {[{c:'vi',l:'🇻🇳 VI'},{c:'en',l:'🇬🇧 EN'},{c:'zh',l:'🇨🇳 中文'},{c:'ko',l:'🇰🇷 한국'}].map(x=>(
              <button key={x.c} onClick={()=>setLang(x.c)} className="px-4 py-2 rounded-xl text-sm font-bold transition"
                style={lang===x.c?{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',color:'white'}:{background:'rgba(255,255,255,.03)',color:'#3D5A80',border:'1px solid rgba(255,255,255,.06)'}}>
                {x.l}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{time ? time.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : '--:--'}</p>
            <p className="text-[10px]" style={{color:'#263554'}}>{time ? time.toLocaleDateString(lang==='vi'?'vi-VN':'en-US',{weekday:'short',day:'numeric',month:'short'}) : ''}</p>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex items-center justify-center px-8 py-4 overflow-auto min-h-0 relative">

        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-6">
              <img src="/lena.png" alt="Lena AI" className="w-28 h-28 mx-auto mb-3 rounded-full" style={{filter:'drop-shadow(0 4px 20px rgba(59,130,246,0.3))'}} />
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">{t.title}</h1>
              <p className="text-lg" style={{color:'#3D5A80'}}>{t.subtitle}</p>
            </div>

            <div className="rounded-3xl p-6" style={{background:'#0D1224',border:'1px solid rgba(255,255,255,.06)'}}>
              <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{color:'#3D5A80'}}>{t.code}</p>
              <div className="rounded-2xl px-6 py-4 flex items-center text-3xl font-mono tracking-widest mb-4"
                style={{background:'#080C18',border:'2px solid rgba(59,130,246,.25)',color:'#60A5FA',minHeight:60}}>
                {bookingCode || <span style={{color:'#15203A'}}>...</span>}
                <div className="w-0.5 h-8 ml-1 animate-pulse" style={{background:'#3B82F6'}} />
              </div>

              <Keyboard />

              {error && <div className="rounded-xl p-3 mb-3 text-center" style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)'}}><p className="text-red-400 font-semibold">{error}</p></div>}

              <div className="flex gap-3">
                <button onClick={()=>{setBookingCode(''); setError(''); setStep('checkout');}}
                  className="px-8 py-4 rounded-2xl text-lg font-bold transition-all active:scale-95"
                  style={{background:'rgba(239,68,68,.08)',color:'#F87171',border:'2px solid rgba(239,68,68,.2)'}}>
                  🚪 {t.checkout}
                </button>
                <button onClick={searchBooking} disabled={loading||!bookingCode.trim()}
                  className="flex-1 py-4 rounded-2xl text-xl font-black text-white transition-all active:scale-[.98] disabled:opacity-30"
                  style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)',boxShadow:'0 4px 24px rgba(59,130,246,.3)'}}>
                  {loading ? '...' : `🔍 ${t.search}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHECK-IN CONFIRM */}
        {step === 'checkin' && booking && (
          <div className="w-full max-w-3xl">
            <div className="rounded-3xl p-8" style={{background:'#0D1224',border:'1px solid rgba(255,255,255,.06)'}}>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{background:'linear-gradient(135deg,#8B5CF6,#EC4899)'}}>
                  {booking.guest.firstName.charAt(0)}{booking.guest.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-3xl font-black text-white">{booking.guest.firstName} {booking.guest.lastName}</p>
                  <p className="text-base" style={{color:'#4B6A8F'}}>{booking.guest.email} · {booking.channel?.name || 'Direct'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-2xl p-5 text-center" style={{background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D6FA8'}}>{t.room}</p>
                  <p className="text-5xl font-black text-white">{booking.unit.name}</p>
                  <p className="text-sm font-semibold mt-1" style={{color:'#60A5FA'}}>{t.floor} {booking.unit.floor || '?'}</p>
                </div>
                <div className="rounded-2xl p-5 text-center" style={{background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#1B7A5A'}}>{t.guest}</p>
                  <p className="text-5xl font-black text-white">{booking.numGuests}</p>
                  <p className="text-sm font-semibold mt-1" style={{color:'#34D399'}}>{t.guest}</p>
                </div>
                <div className="rounded-2xl p-5 text-center" style={{background:'rgba(251,191,36,.08)',border:'1px solid rgba(251,191,36,.2)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#92720A'}}>{t.nights}</p>
                  <p className="text-5xl font-black text-white">{nights}</p>
                  <p className="text-sm font-semibold mt-1" style={{color:'#FBBF24'}}>{t.nights}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={reset} className="px-8 py-5 rounded-2xl text-base font-bold" style={{background:'rgba(255,255,255,.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,.06)'}}>{t.back}</button>
                <button onClick={confirmCheckin} disabled={loading}
                  className="flex-1 py-5 rounded-2xl text-xl font-black text-white transition-all active:scale-[.98] disabled:opacity-40"
                  style={{background:'linear-gradient(135deg,#10B981,#06B6D4)',boxShadow:'0 4px 24px rgba(16,185,129,.3)'}}>
                  {loading ? '...' : t.checkin}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHECKOUT */}
        {step === 'checkout' && (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">🚪 {t.checkoutTitle}</h1>
              <p className="text-lg" style={{color:'#3D5A80'}}>{t.checkoutSub}</p>
            </div>
            <div className="rounded-3xl p-6" style={{background:'#0D1224',border:'1px solid rgba(239,68,68,.1)'}}>
              <div className="rounded-2xl px-6 py-4 flex items-center text-3xl font-mono tracking-widest mb-4"
                style={{background:'#080C18',border:'2px solid rgba(239,68,68,.25)',color:'#F87171',minHeight:60}}>
                {bookingCode || <span style={{color:'#15203A'}}>...</span>}
                <div className="w-0.5 h-8 ml-1 animate-pulse" style={{background:'#EF4444'}} />
              </div>

              <Keyboard color="red" />

              {error && <div className="rounded-xl p-3 mb-3 text-center" style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.15)'}}><p className="text-red-400 font-semibold">{error}</p></div>}

              <div className="flex gap-3">
                <button onClick={reset} className="px-8 py-4 rounded-2xl text-base font-bold"
                  style={{background:'rgba(255,255,255,.03)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,.06)'}}>{t.back}</button>
                <button onClick={searchCheckout} disabled={loading||!bookingCode.trim()}
                  className="flex-1 py-4 rounded-2xl text-xl font-black text-white transition-all active:scale-[.98] disabled:opacity-30"
                  style={{background:'linear-gradient(135deg,#EF4444,#DC2626)',boxShadow:'0 4px 24px rgba(239,68,68,.3)'}}>
                  {loading ? '...' : t.confirmCheckout}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {step === 'complete' && booking && (
          <div className="w-full max-w-3xl text-center">
            <div className="rounded-3xl p-10" style={{background:'#0D1224',border:`1px solid ${pin ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)'}`}}>
              <div className="text-6xl mb-4">{pin ? '🎉' : '👋'}</div>
              <h2 className="text-4xl font-black text-white mb-2">{pin ? t.enjoy : t.thankYou}</h2>
              <p className="text-xl mb-8" style={{color:'#4B6A8F'}}>
                {pin ? `${t.room}: ` : ''}<span className="text-white font-bold">{booking.unit.name}</span>
                {pin ? ` · ${t.floor} ${booking.unit.floor || '?'}` : ` — ${t.seeYou}`}
              </p>

              {pin ? (
                <div className="grid grid-cols-2 gap-5 max-w-lg mx-auto mb-8">
                  <div className="rounded-2xl p-6" style={{background:'rgba(139,92,246,.08)',border:'1px solid rgba(139,92,246,.2)'}}>
                    <p className="text-sm font-bold mb-2" style={{color:'#A78BFA'}}>🔑 {t.pin}</p>
                    <p className="text-4xl font-black text-white font-mono tracking-widest">{pin}</p>
                  </div>
                  <div className="rounded-2xl p-6" style={{background:'rgba(6,182,212,.08)',border:'1px solid rgba(6,182,212,.2)'}}>
                    <p className="text-sm font-bold mb-2" style={{color:'#22D3EE'}}>📶 {t.wifi}</p>
                    <p className="text-xl font-bold text-white">BTM03_5G</p>
                    <p className="text-base font-mono" style={{color:'#06B6D4'}}>btm2026!</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto mb-8 rounded-2xl p-6" style={{background:'rgba(239,68,68,.05)',border:'1px solid rgba(239,68,68,.1)'}}>
                  <p className="text-sm" style={{color:'#94A3B8'}}>Nhớ để lại chìa khóa trong phòng và đóng cửa khi ra. Cảm ơn bạn! 😊</p>
                </div>
              )}

              <button onClick={reset} className="px-10 py-4 rounded-2xl text-base font-bold transition"
                style={{background:'rgba(255,255,255,.04)',color:'#4B6A8F',border:'1px solid rgba(255,255,255,.06)'}}>
                🏠 {t.done}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM: Chat bar ===== */}
      <div className="flex-shrink-0" style={{background:'#0A0F1D',borderTop:'1px solid rgba(255,255,255,.06)',height:'38%',minHeight:250}}>
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3 px-8 py-2 flex-shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
            <img src="/lena.png" alt="Lena" className="w-7 h-7 rounded-full" />
            <p className="text-base font-bold text-white">Lena · AI Concierge</p>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{color:'#10B981'}}>Online</span>
            <div className="flex-1" />
            <button className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{background:'rgba(239,68,68,.08)',color:'#F87171',border:'1px solid rgba(239,68,68,.12)'}}>{t.emergency}</button>
          </div>
          <div className="flex-1 px-8 py-2 overflow-auto">
            <div className="flex flex-col gap-2">
              {messages.map((m,i) => (
                <div key={i} className={'flex gap-2 ' + (m.role==='user'?'justify-end':'')}>
                  {m.role==='ai' && <img src="/lena.png" alt="Lena" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />}
                  <div className={'w-full px-5 py-3 text-lg leading-relaxed whitespace-pre-wrap ' + (m.role==='user'?'rounded-2xl rounded-br-md':'rounded-2xl rounded-bl-md')}
                    style={m.role==='user'?{background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'white'}:{background:'rgba(255,255,255,.04)',color:'#CBD5E1',border:'1px solid rgba(255,255,255,.06)'}}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <img src="/lena.png" alt="Lena" className="w-6 h-6 rounded-full flex-shrink-0" />
                  <div className="px-3 py-2 rounded-2xl rounded-bl-md text-sm animate-pulse" style={{background:'rgba(255,255,255,.04)',color:'#3D5A80'}}>...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          <div className="px-8 py-2 flex gap-3 flex-shrink-0" style={{borderTop:'1px solid rgba(255,255,255,.04)'}}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
              placeholder={t.chat} className="flex-1 rounded-xl px-5 py-3 text-lg outline-none"
              style={{background:'rgba(255,255,255,.03)',color:'#E2E8F0',border:'1px solid rgba(255,255,255,.06)'}} />
            <button onClick={sendChat} disabled={chatLoading}
              className="px-6 py-3 rounded-xl text-lg font-bold text-white disabled:opacity-30"
              style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>
              {t.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}