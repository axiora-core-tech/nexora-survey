import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import { HiOutlineHome, HiOutlineCollection, HiOutlinePlusCircle, HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

const items = [
  { to:'/dashboard', icon:HiOutlineHome, label:'Dashboard' },
  { to:'/surveys', icon:HiOutlineCollection, label:'Surveys' },
  { to:'/surveys/new', icon:HiOutlinePlusCircle, label:'New Survey', perm:'create_survey' },
  { to:'/team', icon:HiOutlineUsers, label:'Team', perm:'manage_team' },
  { to:'/settings', icon:HiOutlineCog, label:'Settings' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const links = items.filter(n => !n.perm || hasPermission(profile?.role, n.perm));

  return (
    <div className="min-h-screen flex bg-n-50">
      {open && <div className="fixed inset-0 bg-n-900/10 z-40 lg:hidden" onClick={()=>setOpen(false)} />}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[250px] bg-white border-r border-n-200/60 flex flex-col transition-transform duration-200 lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
        <div className="px-5 h-[68px] flex items-center justify-between border-b border-n-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            </div>
            <span className="text-lg font-bold text-n-900">Nexora</span>
          </div>
          <button onClick={()=>setOpen(false)} className="lg:hidden p-1 rounded hover:bg-n-100"><HiOutlineX className="w-5 h-5"/></button>
        </div>

        {tenant && (
          <div className="mx-4 mt-4 px-3 py-2.5 bg-green-50 rounded-xl">
            <p className="text-xs font-bold text-green-800 truncate">{tenant.name}</p>
            <p className="text-[10px] text-green-600 mt-0.5 capitalize">{tenant.plan||'free'} plan</p>
          </div>
        )}

        <nav className="flex-1 p-3 mt-2 space-y-1">
          {links.map(n => (
            <NavLink key={n.to} to={n.to} onClick={()=>setOpen(false)}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-green-50 text-green-700 font-semibold' : 'text-n-500 hover:text-n-800 hover:bg-n-50'
              }`}>
              <n.icon className="w-5 h-5" />{n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-n-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
              {profile?.full_name?.[0]?.toUpperCase()||'?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-n-800 truncate">{profile?.full_name||'User'}</p>
              <p className="text-[11px] text-n-400">{ROLE_LABELS[profile?.role]}</p>
            </div>
          </div>
          <button onClick={async()=>{await signOut();nav('/login');}}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-n-400 hover:text-red-500 rounded-lg transition-colors">
            <HiOutlineLogout className="w-4 h-4"/>Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-n-100 px-4 h-14 flex items-center gap-3">
          <button onClick={()=>setOpen(true)} className="p-2 hover:bg-n-100 rounded-xl"><HiOutlineMenu className="w-5 h-5"/></button>
          <span className="font-bold text-n-900">Nexora</span>
        </header>
        <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
}
