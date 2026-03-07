import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineSave } from 'react-icons/hi';

export default function Settings() {
  const{profile,tenant,updateProfile}=useAuthStore();
  const[pF,setPF]=useState({full_name:profile?.full_name||''});
  const[tF,setTF]=useState({name:tenant?.name||'',primary_color:tenant?.primary_color||'#10B981'});
  const[sP,setSP]=useState(false);const[sT,setST]=useState(false);

  async function saveP(e){e.preventDefault();setSP(true);try{await updateProfile({full_name:pF.full_name});toast.success('Profile updated');}catch(e){toast.error(e.message||'Failed');}finally{setSP(false);}}
  async function saveT(e){e.preventDefault();if(!tenant?.id)return toast.error('Org not loaded');setST(true);try{
    const{data,error}=await supabase.from('tenants').update({name:tF.name,primary_color:tF.primary_color}).eq('id',tenant.id).select().single();
    if(error)throw error;if(!data)throw new Error('Need admin role');toast.success('Organization updated');
  }catch(e){toast.error(e.message||'Failed');}finally{setST(false);}}

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-6">Settings</h1>
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-bold text-n-400 uppercase tracking-wider mb-4">Profile</h2>
        <form onSubmit={saveP} className="space-y-4">
          <div><label className="input-label">Full Name</label><input value={pF.full_name} onChange={e=>setPF({...pF,full_name:e.target.value})} className="input"/></div>
          <div><label className="input-label">Email</label><input value={profile?.email||''} disabled className="input bg-n-50 text-n-400 cursor-not-allowed"/></div>
          <div><label className="input-label">Role</label><div className="input bg-n-50 text-n-400 cursor-not-allowed">{ROLE_LABELS[profile?.role]}</div></div>
          <button type="submit" disabled={sP} className="btn-green"><HiOutlineSave className="w-4 h-4"/>{sP?'Saving...':'Save profile'}</button>
        </form>
      </div>

      {hasPermission(profile?.role,'manage_tenant')&&(
        <div className="card p-6">
          <h2 className="text-sm font-bold text-n-400 uppercase tracking-wider mb-4">Organization</h2>
          <form onSubmit={saveT} className="space-y-4">
            <div><label className="input-label">Name</label><input value={tF.name} onChange={e=>setTF({...tF,name:e.target.value})} className="input"/></div>
            <div><label className="input-label">Slug</label><div className="input bg-n-50 text-n-400 cursor-not-allowed font-mono">{tenant?.slug||'—'}</div></div>
            <div><label className="input-label">Plan</label><div className="input bg-n-50 text-n-400 cursor-not-allowed capitalize">{tenant?.plan||'free'}</div></div>
            <div><label className="input-label">Brand color</label><div className="flex gap-2"><input type="color" value={tF.primary_color} onChange={e=>setTF({...tF,primary_color:e.target.value})} className="w-10 h-10 rounded-xl border border-n-200 cursor-pointer"/><input value={tF.primary_color} onChange={e=>setTF({...tF,primary_color:e.target.value})} className="input flex-1 font-mono text-sm"/></div></div>
            <button type="submit" disabled={sT} className="btn-green"><HiOutlineSave className="w-4 h-4"/>{sT?'Saving...':'Save organization'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
