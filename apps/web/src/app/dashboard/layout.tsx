// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, logout } from '@/lib/api';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
 { label: 'Calendar', href: '/dashboard/calendar', icon: '🗓️' },
{ label: 'Pricing', href: '/dashboard/pricing', icon: '💰' },
{ label: 'Housekeeping', href: '/dashboard/housekeeping', icon: '🧹' },
  { label: 'Buildings', href: '/dashboard/buildings', icon: '🏢' },
  { label: 'Bookings', href: '/dashboard/bookings', icon: '📅' },
 { label: 'Tạo Booking', href: '/dashboard/new-booking', icon: '➕' },
  { label: 'Khách hàng', href: '/dashboard/guests', icon: '👤' },
  { label: 'AI Agent', href: '/dashboard/ai-agent', icon: '🤖' },
  { label: 'Incidents', href: '/dashboard/incidents', icon: '⚠️' },
  { label: 'Phụ phí', href: '/dashboard/surcharges', icon: '💵' },
  { label: 'Báo cáo', href: '/dashboard/reports', icon: '📈' },
  { label: 'Hóa đơn', href: '/dashboard/invoices', icon: '🧾' },
  { label: 'Cài đặt', href: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#080C16' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0 relative" style={{ background: '#0D1220' }}>
        {/* Top glow */}
        <div className="absolute top-0 left-0 w-full h-48 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(56,138,221,0.15) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}>
              <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.9)" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.35)" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-xl tracking-wide">BTM Homestay</p>
              <p className="text-sm" style={{ color: '#3D5A80' }}>Management Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex-1 px-4 space-y-1 overflow-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest px-3 mb-3" style={{ color: '#263554' }}>Menu</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive ? '' : 'hover:bg-white/[0.04]'}`}
                style={isActive ? { background: 'rgba(56,138,221,0.12)', border: '1px solid rgba(56,138,221,0.2)' } : { border: '1px solid transparent' }}>
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-base font-semibold
 ${isActive ? 'text-white' : ''}`} style={!isActive ? { color: '#4B6A8F' } : {}}>
                  {item.label}
                </span>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />}
              </a>
            );
          })}
        </nav>

        {/* AI Status */}
        <div className="relative z-10 mx-4 mb-3 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
            <span className="text-emerald-400 text-sm font-bold">Lena AI — Online</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#1B5E42' }}>Powered by Claude Sonnet</p>
        </div>

        {/* User */}
        <div className="relative z-10 p-4 mx-4 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs" style={{ color: '#3D5A80' }}>{user.role === 'CHAIN_ADMIN' ? 'Chain Admin' : user.role}</p>
            </div>
            <button onClick={logout} className="hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-400/10" style={{ color: '#3D5A80' }} title="Đăng xuất">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ background: '#080C16' }}>
        {children}
      </main>
    </div>
  );
}
