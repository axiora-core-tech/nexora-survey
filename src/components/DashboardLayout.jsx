import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import { HiOutlineHome, HiOutlineCollection, HiOutlinePlus, HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX, HiOutlineChartBar, HiOutlineSearch } from 'react-icons/hi';

const nav = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/surveys', icon: HiOutlineCollection, label: 'Surveys' },
  { to: '/surveys/new', icon: HiOutlinePlus, label: 'Create Survey', perm: 'create_survey' },
  { to: '/team', icon: HiOutlineUsers, label: 'Team', perm: 'manage_team' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = nav.filter(n => !n.perm || hasPermission(profile?.role, n.perm));

  return (
    <div className="min-h-screen flex bg-bg">
      {open && <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar — 240px per spec */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[240px] bg-white border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-6 h-16 flex items-center justify-between border-b border-border-light">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-lg font-bold text-txt tracking-tight">Nexora</span>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded"><HiOutlineX className="w-4 h-4" /></button>
        </div>

        {/* Org */}
        {tenant && (
          <div className="mx-4 mt-4 px-3 py-2.5 bg-bg-alt rounded-btn">
            <p className="text-xs font-semibold text-txt truncate">{tenant.name}</p>
            <p className="text-[10px] text-txt-tertiary mt-0.5">{tenant.plan || 'Free'} plan</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 mt-2 space-y-0.5">
          {items.map(n => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-btn text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-50 text-brand font-semibold'
                  : 'text-txt-secondary hover:text-txt hover:bg-gray-50'
              }`}>
              <n.icon className="w-[18px] h-[18px]" />{n.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border-light">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-violet flex items-center justify-center text-white text-xs font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-txt truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] text-txt-tertiary">{ROLE_LABELS[profile?.role]}</p>
            </div>
          </div>
          <button onClick={async () => { await signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-txt-tertiary hover:text-danger rounded transition-colors">
            <HiOutlineLogout className="w-3.5 h-3.5" />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top bar — 64px per spec */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border-light h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-btn"><HiOutlineMenu className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/surveys/new" className="btn-primary text-xs hidden sm:inline-flex"><HiOutlinePlus className="w-4 h-4" />Create Survey</NavLink>
          </div>
        </header>
        <div className="p-6 md:p-8 max-w-6xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}
