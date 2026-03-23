'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/incidents').then(setIncidents).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 rounded-full animate-spin" style={{border:'3px solid #1E293B',borderTopColor:'#3B82F6'}} /></div>;

  const prCfg: Record<string,{l:string;bg:string;c:string;dot:string}> = {
    high:{l:'Khẩn cấp',bg:'rgba(239,68,68,0.15)',c:'#F87171',dot:'#EF4444'},
    medium:{l:'Trung bình',bg:'rgba(251,191,36,0.15)',c:'#FBBF24',dot:'#FBBF24'},
    low:{l:'Thấp',bg:'rgba(16,185,129,0.15)',c:'#34D399',dot:'#34D399'},
  };
  const stCfg: Record<string,{l:string;bg:string;c:string}> = {
    OPEN:{l:'Mở',bg:'rgba(239,68,68,0.15)',c:'#F87171'},
    IN_PROGRESS:{l:'Đang xử lý',bg:'rgba(251,191,36,0.15)',c:'#FBBF24'},
    RESOLVED:{l:'Đã xử lý',bg:'rgba(16,185,129,0.15)',c:'#34D399'},
    CLOSED:{l:'Đóng',bg:'rgba(148,163,184,0.1)',c:'#94A3B8'},
  };

  return (
    <div className="p-6 min-h-full" style={{color:'#E2E8F0'}}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">⚠️ Incidents</h1>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>{incidents.length} sự cố</p>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'rgba(16,185,129,0.1)'}}>
            <span className="text-4xl">✅</span>
          </div>
          <p className="text-xl font-bold text-white">Tuyệt vời!</p>
          <p className="text-sm mt-1" style={{color:'#3D5A80'}}>Không có incident nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => {
            const pr = prCfg[inc.priority] || prCfg.medium;
            const st = stCfg[inc.status] || stCfg.OPEN;
            return (
              <div key={inc.id} className="rounded-2xl p-5 flex items-start gap-4 transition hover:bg-white/[0.02]"
                style={{background:'#0F1629',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="w-4 h-4 rounded-full mt-1 flex-shrink-0" style={{background:pr.dot,boxShadow:`0 0 12px ${pr.dot}40`}} />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white">{inc.description}</p>
                  <p className="text-sm mt-1" style={{color:'#4B6A8F'}}>
                    Phòng {inc.unit?.name || '?'} · {inc.unit?.building?.name || '?'} · {new Date(inc.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  {inc.assignedStaff && <p className="text-sm mt-1" style={{color:'#64748B'}}>👤 {inc.assignedStaff.name}</p>}
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{background:pr.bg,color:pr.c}}>{pr.l}</span>
                <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{background:st.bg,color:st.c}}>{st.l}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
