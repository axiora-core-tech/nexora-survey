import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlinePlusCircle,
  HiOutlineUserGroup, HiOutlineCog, HiOutlineLogout,
  HiOutlineMenuAlt2, HiOutlineX, HiOutlineSparkles,
} from 'react-icons/hi';

const navItems = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Overview' },
  { to: '/surveys', icon: HiOutlineClipboardList, label: 'Surveys' },
  { to: '/surveys/new', icon: HiOutlinePlusCircle, label: 'Create Survey', permission: 'create_survey' },
  { to: '/team', icon: HiOutlineUserGroup, label: 'Team', permission: 'manage_team' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const filteredNav = navItems.filter(
    (item) => !item.permission || hasPermission(profile?.role, item.permission)
  );

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-ink-950/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-[256px]
        bg-white border-r border-ink-200/50
        flex flex-col transition-transform duration-300 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="logo-mark">
              <HiOutlineSparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="leading-none">
              <span className="text-[17px] font-display font-bold text-ink-900 tracking-tight">Nexora</span>
              <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.15em] mt-0.5">Survey</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-ink-100 rounded-lg">
            <HiOutlineX className="w-5 h-5 text-ink-500" />
          </button>
        </div>

        {/* Org pill */}
        <div className="mx-4 mb-5 px-3.5 py-3 bg-pri-50/60 rounded-xl ring-1 ring-pri-100">
          <p className="text-[13px] font-semibold text-pri-800 truncate">{tenant?.name || 'Organization'}</p>
          <p className="text-[11px] text-pri-500/80 mt-0.5 truncate font-mono">{tenant?.slug ? `${tenant.slug}.nexora.io` : ''}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          <p className="overline px-3 mb-2 mt-1">Menu</p>
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-ink-200/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pri-500 to-acc-400 flex items-center justify-center text-white font-bold text-[13px] shadow-xs ring-1 ring-white/50">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink-800 truncate">{profile?.full_name || 'User'}</p>
              <span className={`badge text-[9px] role-${profile?.role}`}>
                {ROLE_LABELS[profile?.role] || profile?.role}
              </span>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <HiOutlineLogout className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-ink-200/40 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-ink-100 rounded-xl">
            <HiOutlineMenuAlt2 className="w-5 h-5 text-ink-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pri-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-ink-900 text-[15px]">Nexora</span>
          </div>
        </header>

        <div className="p-5 md:p-7 lg:p-9 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
