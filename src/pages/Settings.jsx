import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineSave } from 'react-icons/hi';

export default function Settings() {
  const { profile, tenant, updateProfile } = useAuthStore();
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
  });
  const [tenantForm, setTenantForm] = useState({
    name: tenant?.name || '',
    primary_color: tenant?.primary_color || '#6366f1',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: profileForm.full_name });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveTenant(e) {
    e.preventDefault();
    setSavingTenant(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ name: tenantForm.name, primary_color: tenantForm.primary_color })
        .eq('id', tenant.id);
      if (error) throw error;
      toast.success('Organization settings updated');
    } catch (err) {
      toast.error('Failed to update organization');
    } finally {
      setSavingTenant(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <h1 className="page-title mb-6">Settings</h1>

      {/* Profile settings */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-nexora-50 border border-nexora-100 flex items-center justify-center">
            <HiOutlineUser className="w-5 h-5 text-nexora-600" />
          </div>
          <div>
            <h2 className="section-title">Profile</h2>
            <p className="text-xs text-surface-400">Your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="input-label">Full Name</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" value={profile?.email || ''} disabled className="input-field bg-surface-50 text-surface-500 cursor-not-allowed" />
            <p className="text-xs text-surface-400 mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <label className="input-label">Role</label>
            <div className="input-field bg-surface-50 text-surface-500 cursor-not-allowed">
              {ROLE_LABELS[profile?.role] || profile?.role}
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            <HiOutlineSave className="w-4 h-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Organization settings (admin only) */}
      {hasPermission(profile?.role, 'manage_tenant') && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warm-50 border border-warm-100 flex items-center justify-center">
              <HiOutlineOfficeBuilding className="w-5 h-5 text-warm-600" />
            </div>
            <div>
              <h2 className="section-title">Organization</h2>
              <p className="text-xs text-surface-400">Manage your organization settings</p>
            </div>
          </div>

          <form onSubmit={handleSaveTenant} className="space-y-4">
            <div>
              <label className="input-label">Organization Name</label>
              <input
                type="text"
                value={tenantForm.name}
                onChange={(e) => setTenantForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Slug</label>
              <div className="input-field bg-surface-50 text-surface-500 cursor-not-allowed">
                {tenant?.slug || '—'}
              </div>
              <p className="text-xs text-surface-400 mt-1">Organization URL cannot be changed</p>
            </div>
            <div>
              <label className="input-label">Plan</label>
              <div className="input-field bg-surface-50 text-surface-500 cursor-not-allowed capitalize">
                {tenant?.plan || 'free'}
              </div>
            </div>
            <div>
              <label className="input-label">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tenantForm.primary_color}
                  onChange={(e) => setTenantForm((f) => ({ ...f, primary_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={tenantForm.primary_color}
                  onChange={(e) => setTenantForm((f) => ({ ...f, primary_color: e.target.value }))}
                  className="input-field flex-1"
                />
              </div>
            </div>
            <button type="submit" disabled={savingTenant} className="btn-primary">
              <HiOutlineSave className="w-4 h-4" /> {savingTenant ? 'Saving...' : 'Save Organization'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
