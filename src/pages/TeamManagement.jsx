import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { ROLE_LABELS, ROLE_COLORS, hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineUserGroup, HiOutlineMail } from 'react-icons/hi';

export default function TeamManagement() {
  const { profile } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail) return toast.error('Email is required');

    setInviting(true);
    try {
      // Use server function to create user
      const res = await fetch('/.netlify/functions/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          fullName: inviteName,
          tenantId: profile.tenant_id,
          invitedBy: profile.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to invite user');
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('viewer');
      loadMembers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    if (userId === profile.id) return toast.error("You can't change your own role");
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      toast.success('Role updated');
      loadMembers();
    } catch (err) {
      toast.error('Failed to update role');
    }
  }

  async function handleDeactivate(userId) {
    if (userId === profile.id) return toast.error("You can't deactivate yourself");
    if (!confirm('Deactivate this user? They will lose access.')) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);
      if (error) throw error;
      toast.success('User deactivated');
      loadMembers();
    } catch (err) {
      toast.error('Failed');
    }
  }

  const isAdmin = hasPermission(profile?.role, 'manage_team');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="text-surface-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''} in your organization</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <HiOutlineUserAdd className="w-5 h-5" /> Invite Member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <span key={role} className={`badge text-xs border ${ROLE_COLORS[role]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-surface-100" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className={`glass-card p-4 flex items-center gap-4 ${!member.is_active ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nexora-400 to-warm-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-surface-800 truncate">
                    {member.full_name || 'Unnamed'}
                    {member.id === profile.id && <span className="text-xs text-nexora-500 ml-1">(you)</span>}
                  </p>
                  {!member.is_active && <span className="badge text-[10px] bg-red-50 text-red-600 border border-red-200">Inactive</span>}
                </div>
                <p className="text-xs text-surface-400 truncate">{member.email}</p>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && member.id !== profile.id ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-nexora-500/20"
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`badge text-xs border ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                )}

                {isAdmin && member.id !== profile.id && member.is_active && (
                  <button
                    onClick={() => handleDeactivate(member.id)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Deactivate"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl shadow-glass-lg w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-nexora-50 border border-nexora-100 flex items-center justify-center">
                <HiOutlineUserAdd className="w-5 h-5 text-nexora-600" />
              </div>
              <div>
                <h3 className="section-title">Invite Team Member</h3>
                <p className="text-xs text-surface-400">They'll receive an email to join your organization</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="input-label">Full Name</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="input-field" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="input-label">Email *</label>
                <div className="relative">
                  <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input-field pl-11" placeholder="jane@company.com" required />
                </div>
              </div>
              <div>
                <label className="input-label">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-field">
                  <option value="viewer">Viewer</option>
                  <option value="creator">Creator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={inviting} className="btn-primary flex-1">
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
