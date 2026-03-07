import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';
export default function Settings(){
  const{profile,tenant,updateProfile}=useAuthStore();const[pF,sPF]=useState({full_name:profile?.full_name||''});const[tF,sTF]=useState({name:tenant?.name||'',primary_color:tenant?.primary_color||'#10B981'});const[sP,sSP]=useState(false);const[sT,sST]=useState(false);
  async function saveP(e){e.preventDefault();sSP(true);try{await updateProfile({full_name:pF.full_name});toast.success('Saved');}catch(e){toast.error(e.message);}finally{sSP(false);}}
  async function saveT(e){e.preventDefault();if(!tenant?.id)return toast.error('Org not loaded');sST(true);try{const{data,error}=await supabase.from('tenants').update({name:tF.name,primary_color:tF.primary_color}).eq('id',tenant.id).select().single();if(error)throw error;if(!data)throw new Error('Need admin role');toast.success('Saved');}catch(e){toast.error(e.message);}finally{sST(false);}}
  const inp="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-dark text-sm placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors";
  const dis="w-full px-4 py-3 bg-soft border border-gray-200 rounded-xl text-muted text-sm cursor-not-allowed";
  return(<div className="max-w-xl mx-auto">
    <h1 className="text-4xl font-extrabold text-dark tracking-tight mb-10">Settings</h1>
    <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
      <h2 className="text-sm font-bold text-muted uppercase tracking-[0.15em] mb-6">Profile</h2>
      <form onSubmit={saveP} className="space-y-5">
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Full Name</label><input value={pF.full_name} onChange={e=>sPF({...pF,full_name:e.target.value})} className={inp}/></div>
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Email</label><input value={profile?.email||''} disabled className={dis}/></div>
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Role</label><div className={dis}>{ROLE_LABELS[profile?.role]}</div></div>
        <button type="submit" disabled={sP} className="px-6 py-3 rounded-full text-sm font-semibold bg-dark text-white hover:bg-accent transition-colors disabled:opacity-40">{sP?'Saving...':'Save profile'}</button>
      </form></div>
    {hasPermission(profile?.role,'manage_tenant')&&(<div className="bg-white rounded-2xl border border-gray-100 p-8">
      <h2 className="text-sm font-bold text-muted uppercase tracking-[0.15em] mb-6">Organization</h2>
      <form onSubmit={saveT} className="space-y-5">
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Name</label><input value={tF.name} onChange={e=>sTF({...tF,name:e.target.value})} className={inp}/></div>
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Slug</label><div className={`${dis} font-mono`}>{tenant?.slug||'—'}</div></div>
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Plan</label><div className={`${dis} capitalize`}>{tenant?.plan||'free'}</div></div>
        <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Brand color</label><div className="flex gap-3"><input type="color" value={tF.primary_color} onChange={e=>sTF({...tF,primary_color:e.target.value})} className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer"/><input value={tF.primary_color} onChange={e=>sTF({...tF,primary_color:e.target.value})} className={`${inp} flex-1 font-mono`}/></div></div>
        <button type="submit" disabled={sT} className="px-6 py-3 rounded-full text-sm font-semibold bg-dark text-white hover:bg-accent transition-colors disabled:opacity-40">{sT?'Saving...':'Save organization'}</button>
      </form></div>)}
  </div>);
}
