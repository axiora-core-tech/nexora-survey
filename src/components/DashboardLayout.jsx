import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import { HiOutlineHome, HiOutlineCollection, HiOutlinePlus, HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

const nav = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Overview' },
  { to: '/surveys', icon: HiOutlineCollection, label: 'Surveys' },
  { to: '/surveys/new', icon: HiOutlinePlus, label: 'New Survey', perm: 'create_survey' },
  { to: '/team', icon: HiOutlineUsers, label: 'Team', perm: 'manage_team' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = nav.filter(n => !n.perm || hasPermission(profile?.role, n.perm));

  return (
    <div className="min-h-screen flex bg-canvas">
      {open && <div className="fixed inset-0 bg-black/10 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[240px] bg-white border-r border-ink-100 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 h-14 flex items-center justify-between border-b border-ink-100">
          <span className="font-display font-bold text-ink-900 tracking-tight">Nexora</span>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 hover:bg-ink-100 rounded"><HiOutlineX className="w-4 h-4" /></button>
        </div>

        {tenant && (
          <div className="px-4 py-3 mx-3 mt-3 bg-ink-50 rounded-lg">
            <p className="text-xs font-semibold text-ink-700 truncate">{tenant.name}</p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-0.5 mt-1">
          {items.map(n => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-ink-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pri-500 to-acc-400 flex items-center justify-center text-white text-xs font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-800 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-ink-400">{ROLE_LABELS[profile?.role]}</p>
            </div>
          </div>
          <button onClick={async () => { await signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink-400 hover:text-red-600 rounded-lg transition-colors">
            <HiOutlineLogout className="w-3.5 h-3.5" />Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-100 px-4 h-12 flex items-center">
          <button onClick={() => setOpen(true)} className="p-1.5 hover:bg-ink-100 rounded-lg mr-3"><HiOutlineMenu className="w-5 h-5" /></button>
          <span className="font-display font-bold text-ink-900 text-sm">Nexora</span>
        </header>
        <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}
