import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS, ROLE_COLORS } from '../lib/constants';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlinePlusCircle,
  HiOutlineUserGroup, HiOutlineCog, HiOutlineLogout,
  HiOutlineMenuAlt2, HiOutlineX, HiOutlineSparkles,
} from 'react-icons/hi';

const navItems = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
  { to: '/surveys', icon: HiOutlineClipboardList, label: 'Surveys' },
  { to: '/surveys/new', icon: HiOutlinePlusCircle, label: 'Create Survey', permission: 'create_survey' },
  { to: '/team', icon: HiOutlineUserGroup, label: 'Team', permission: 'manage_team' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter(
    (item) => !item.permission || hasPermission(profile?.role, item.permission)
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px]
          bg-white/90 backdrop-blur-xl border-r border-surface-200/60
          flex flex-col transition-transform duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nexora-600 to-nexora-700 flex items-center justify-center shadow-sm">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-display text-surface-900 leading-none">Nexora</span>
              <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Survey</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-surface-100 rounded-lg">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant info */}
        <div className="mx-4 mb-4 px-3 py-2.5 bg-nexora-50/60 rounded-xl border border-nexora-100">
          <p className="text-xs font-semibold text-nexora-700 truncate">{tenant?.name || 'Organization'}</p>
          <p className="text-[10px] text-nexora-500 mt-0.5 truncate">{tenant?.slug ? `${tenant.slug}.nexora.io` : ''}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-nexora-50 text-nexora-700 shadow-sm border border-nexora-100'
                    : 'text-surface-600 hover:text-surface-800 hover:bg-surface-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-surface-200/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nexora-400 to-warm-400 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-800 truncate">
                {profile?.full_name || 'User'}
              </p>
              <span className={`badge text-[10px] border ${ROLE_COLORS[profile?.role] || ''}`}>
                {ROLE_LABELS[profile?.role] || profile?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <HiOutlineLogout className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-surface-200/60 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-surface-100 rounded-xl"
          >
            <HiOutlineMenuAlt2 className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-nexora-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-surface-900">Nexora</span>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
