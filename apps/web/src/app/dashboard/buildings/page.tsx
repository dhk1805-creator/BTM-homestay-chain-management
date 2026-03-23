'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BuildingItem {
  id: string;
  name: string;
  address: string;
  city: string;
  description: string;
  amenities: string[];
  settings: any;
  active: boolean;
  _count: { units: number; staff: number };
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/buildings').then(setBuildings).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">🏢 Buildings</h1>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{buildings.length} tòa nhà trong chuỗi</p>
        </div>
        <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#3B82F6,#06B6D4)'}}>+ Thêm tòa nhà</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {buildings.map(b => {
          const s = b.settings || {};
          return (
            <div key={b.id} className="rounded-2xl p-6" style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#3B82F6,#8B5CF6)'}}>🏢</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{b.name}</h3>
                  <p className="text-sm mt-1" style={{color:'#4B6A8F'}}>📍 {b.address}, {b.city}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-bold" style={{background:'rgba(16,185,129,0.15)',color:'#34D399'}}>Active</span>
              </div>

              {b.description && <p className="text-sm mb-4" style={{color:'#64748B'}}>{b.description}</p>}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl p-3 text-center" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.15)'}}>
                  <p className="text-2xl font-black text-white">{b._count.units}</p>
                  <p className="text-xs font-semibold" style={{color:'#60A5FA'}}>Phòng</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.15)'}}>
                  <p className="text-2xl font-black text-white">{b._count.staff}</p>
                  <p className="text-xs font-semibold" style={{color:'#34D399'}}>Nhân viên</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.15)'}}>
                  <p className="text-2xl font-black text-white">{s.total_floors || '?'}</p>
                  <p className="text-xs font-semibold" style={{color:'#FBBF24'}}>Tầng</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📶 WiFi</p>
                  <p className="text-sm text-white font-mono">{s.wifi_ssid || '—'} / {s.wifi_password || '—'}</p>
                </div>
                <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>⏰ Giờ giấc</p>
                  <p className="text-sm text-white">Check-in: {s.checkin_time || '14:00'} · Out: {s.checkout_time || '12:00'}</p>
                </div>
                <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>📞 Hotline</p>
                  <p className="text-sm text-white">{s.manager_phone || '—'}</p>
                </div>
                <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)'}}>
                  <p className="text-xs font-bold mb-1" style={{color:'#3D5A80'}}>🤖 AI Agent</p>
                  <p className="text-sm text-white">{s.ai_name || 'Lena'}</p>
                </div>
              </div>

              {b.amenities && b.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {b.amenities.map((a: string) => (
                    <span key={a} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{background:'rgba(255,255,255,0.04)',color:'#94A3B8',border:'1px solid rgba(255,255,255,0.06)'}}>{a}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
