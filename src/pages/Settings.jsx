import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineSave } from 'react-icons/hi';

export default function Settings() {
  const { profile, tenant, updateProfile } = useAuthStore();
  const [pForm, setPForm] = useState({ full_name: profile?.full_name || '' });
  const [tForm, setTForm] = useState({ name: tenant?.name || '', primary_color: tenant?.primary_color || '#8b5cf6' });
  const [savingP, setSavingP] = useState(false);
  const [savingT, setSavingT] = useState(false);

  async function saveProfile(e) {
    e.preventDefault(); setSavingP(true);
    try { await updateProfile({ full_name: pForm.full_name }); toast.success('Profile updated'); }
    catch(e) { console.error(e); toast.error(e.message || 'Failed'); }
    finally { setSavingP(false); }
  }

  async function saveTenant(e) {
    e.preventDefault(); if (!tenant?.id) return toast.error('Org not loaded');
    setSavingT(true);
    try {
      const { data, error } = await supabase.from('tenants').update({ name: tForm.name, primary_color: tForm.primary_color }).eq('id', tenant.id).select().single();
      if (error) throw error;
      if (!data) throw new Error('Update failed — need super_admin or admin role');
      toast.success('Organization updated');
    } catch(e) { console.error(e); toast.error(e.message || 'Failed'); }
    finally { setSavingT(false); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-ink-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-ink-500 mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <div><label className="input-label">Full Name</label><input value={pForm.full_name} onChange={e=>setPForm({...pForm, full_name:e.target.value})} className="input-field"/></div>
          <div><label className="input-label">Email</label><input value={profile?.email||''} disabled className="input-field bg-ink-50 text-ink-400 cursor-not-allowed"/></div>
          <div><label className="input-label">Role</label><div className="input-field bg-ink-50 text-ink-400 cursor-not-allowed">{ROLE_LABELS[profile?.role]}</div></div>
          <button type="submit" disabled={savingP} className="btn-primary text-xs"><HiOutlineSave className="w-3.5 h-3.5"/>{savingP?'Saving...':'Save Profile'}</button>
        </form>
      </div>

      {/* Organization */}
      {hasPermission(profile?.role, 'manage_tenant') && (
        <div className="bg-white rounded-2xl border border-ink-100 p-6">
          <h2 className="text-sm font-semibold text-ink-500 mb-4">Organization</h2>
          <form onSubmit={saveTenant} className="space-y-3">
            <div><label className="input-label">Name</label><input value={tForm.name} onChange={e=>setTForm({...tForm,name:e.target.value})} className="input-field"/></div>
            <div><label className="input-label">Slug</label><div className="input-field bg-ink-50 text-ink-400 cursor-not-allowed font-mono text-sm">{tenant?.slug||'—'}</div></div>
            <div><label className="input-label">Plan</label><div className="input-field bg-ink-50 text-ink-400 cursor-not-allowed capitalize">{tenant?.plan||'free'}</div></div>
            <div><label className="input-label">Brand Color</label>
              <div className="flex items-center gap-2"><input type="color" value={tForm.primary_color} onChange={e=>setTForm({...tForm,primary_color:e.target.value})} className="w-9 h-9 rounded-lg border border-ink-200 cursor-pointer"/><input value={tForm.primary_color} onChange={e=>setTForm({...tForm,primary_color:e.target.value})} className="input-field flex-1 font-mono text-sm"/></div>
            </div>
            <button type="submit" disabled={savingT} className="btn-primary text-xs"><HiOutlineSave className="w-3.5 h-3.5"/>{savingT?'Saving...':'Save Organization'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
