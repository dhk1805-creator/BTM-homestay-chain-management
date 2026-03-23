'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getUser } from '@/lib/api';

export default function SettingsPage() {
  const [building, setBuilding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    apiFetch('/buildings').then(b => { if (b.length > 0) setBuilding(b[0]); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  const s = building?.settings || {};

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white">⚙️ Cài đặt</h1>
        <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Cấu hình hệ thống và tòa nhà</p>
      </div>

      <div className="space-y-5">
        {/* Account */}
        <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">🔐 Tài khoản</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Tên</p>
              <p className="text-base font-semibold text-white">{user?.name}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Email</p>
              <p className="text-base font-semibold text-white">{user?.email}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>Vai trò</p>
              <p className="text-base font-semibold" style={{color:'#60A5FA'}}>{user?.role === 'CHAIN_ADMIN' ? 'Chain Admin' : user?.role}</p>
            </div>
          </div>
        </div>

        {/* Building */}
        {building && (
          <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <h3 className="text-lg font-bold text-white mb-4">🏢 Tòa nhà: {building.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📍 Địa chỉ</p>
                <p className="text-sm text-white">{building.address}, {building.city}</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>🏗️ Quy mô</p>
                <p className="text-sm text-white">{s.total_floors || '?'} tầng · {building._count?.units || '?'} phòng</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📶 WiFi</p>
                <p className="text-sm font-mono text-white">{s.wifi_ssid} / {s.wifi_password}</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>⏰ Giờ giấc</p>
                <p className="text-sm text-white">In: {s.checkin_time} · Out: {s.checkout_time} · Late: {s.late_checkout_time} ({s.late_checkout_fee})</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📞 Hotline quản lý</p>
                <p className="text-sm text-white">{s.manager_phone}</p>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>⏱️ Escalation</p>
                <p className="text-sm text-white">{s.escalation_eta_minutes || 15} phút</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Agent */}
        <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">🤖 AI Agent</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#10B981'}}>Tên AI</p>
              <p className="text-lg font-bold" style={{color:'#34D399'}}>{s.ai_name || 'Lena'}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#3D6FA8'}}>Model</p>
              <p className="text-lg font-bold font-mono" style={{color:'#60A5FA'}}>claude-sonnet-4</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#7C3AED'}}>Tính năng</p>
              <p className="text-sm" style={{color:'#A78BFA'}}>Web Search · Đa ngôn ngữ · 24/7</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.1)'}}>
              <p className="text-xs font-bold mb-1" style={{color:'#10B981'}}>Trạng thái</p>
              <p className="text-lg font-bold" style={{color:'#34D399'}}>● Online</p>
            </div>
          </div>
        </div>

        {/* House Rules */}
        <div className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 className="text-lg font-bold text-white mb-4">📝 Nội quy tòa nhà</h3>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',color:'#94A3B8'}}>{s.house_rules || 'Chưa cấu hình'}</pre>
        </div>
      </div>
    </div>
  );
}
