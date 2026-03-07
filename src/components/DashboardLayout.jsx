import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import { HiOutlineHome, HiOutlineCollection, HiOutlinePlus, HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

const links = [
  { to: '/dashboard', icon: HiOutlineHome, label: 'Overview' },
  { to: '/surveys', icon: HiOutlineCollection, label: 'Surveys' },
  { to: '/surveys/new', icon: HiOutlinePlus, label: 'New', perm: 'create_survey' },
  { to: '/team', icon: HiOutlineUsers, label: 'Team', perm: 'manage_team' },
  { to: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const items = links.filter(n => !n.perm || hasPermission(profile?.role, n.perm));

  return (
    <div className="min-h-screen bg-soft">
      {/* ═══════ TOP NAVIGATION BAR ═══════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + nav */}
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-dark tracking-tight">nexora</span>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {items.map(n => {
                const active = loc.pathname === n.to || (n.to !== '/dashboard' && loc.pathname.startsWith(n.to));
                return (
                  <NavLink key={n.to} to={n.to}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      active ? 'bg-dark text-white' : 'text-muted hover:text-dark hover:bg-gray-100'
                    }`}>
                    {n.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right: user + mobile toggle */}
          <div className="flex items-center gap-4">
            {/* Org name */}
            {tenant && <span className="hidden lg:block text-xs text-muted font-medium">{tenant.name}</span>}

            {/* User avatar */}
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)}
                className="w-9 h-9 rounded-full bg-dark text-white flex items-center justify-center text-sm font-bold hover:bg-accent transition-colors">
                {profile?.full_name?.[0]?.toUpperCase() || '?'}
              </button>

              <AnimatePresence>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-12 z-20 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 p-3">
                      <div className="px-3 py-2 mb-2">
                        <p className="text-sm font-semibold text-dark">{profile?.full_name}</p>
                        <p className="text-xs text-muted">{profile?.email}</p>
                        <span className={`badge mt-1 role-${profile?.role}`}>{ROLE_LABELS[profile?.role]}</span>
                      </div>
                      <div className="border-t border-gray-100 pt-2">
                        <button onClick={async () => { await signOut(); nav('/login'); setUserMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                          <HiOutlineLogout className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-xl">
              {mobileOpen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-gray-100 overflow-hidden">
              <div className="p-3 space-y-1">
                {items.map(n => (
                  <NavLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-dark text-white' : 'text-muted hover:bg-gray-100'
                    }`}>
                    <n.icon className="w-5 h-5" />{n.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═══════ CONTENT ═══════ */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
