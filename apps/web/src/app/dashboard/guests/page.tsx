'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const avGr = ['linear-gradient(135deg,#3B82F6,#06B6D4)','linear-gradient(135deg,#8B5CF6,#EC4899)','linear-gradient(135deg,#F59E0B,#EF4444)','linear-gradient(135deg,#10B981,#3B82F6)','linear-gradient(135deg,#EC4899,#F97316)','linear-gradient(135deg,#06B6D4,#8B5CF6)'];

export default function GuestsPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/guests').then(setGuests).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">👤 Khách hàng</h1>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{guests.length} khách</p>
        </div>
      </div>

      <div className="space-y-2">
        {guests.map((g,i) => (
          <div key={g.id} className="rounded-2xl p-5 flex items-center gap-4 transition hover:bg-white/[0.02]"
            style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
              style={{background:avGr[i%avGr.length]}}>
              {g.firstName?.charAt(0)}{g.lastName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{g.firstName} {g.lastName}</p>
              <p className="text-sm" style={{color:'#4B6A8F'}}>{g.email || '—'}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-white">{g.phone || '—'}</p>
              <p className="text-xs" style={{color:'#4B6A8F'}}>SĐT</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-white">{g.nationality || '—'}</p>
              <p className="text-xs" style={{color:'#4B6A8F'}}>Quốc tịch</p>
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-bold" style={{color:'#60A5FA'}}>{g.preferredLang?.toUpperCase()}</p>
              <p className="text-xs" style={{color:'#4B6A8F'}}>Ngôn ngữ</p>
            </div>
            <div className="text-center px-4">
              <p className="text-lg font-black text-white">{g._count?.bookings || 0}</p>
              <p className="text-xs" style={{color:'#4B6A8F'}}>Bookings</p>
            </div>
            {g.airbnbRating && (
              <div className="text-center px-4">
                <p className="text-sm font-bold" style={{color:'#FBBF24'}}>⭐ {g.airbnbRating}</p>
              </div>
            )}
          </div>
        ))}
        {guests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">👤</p>
            <p className="text-lg font-bold text-white">Chưa có khách nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
