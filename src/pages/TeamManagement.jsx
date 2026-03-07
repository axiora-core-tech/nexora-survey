import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { ROLE_LABELS, hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineMail, HiOutlineX } from 'react-icons/hi';

export default function TeamManagement() {
  const { profile } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('viewer');
  const [invName, setInvName] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { if (profile?.id) load(); }, [profile?.id]);

  async function load() { const { data } = await supabase.from('user_profiles').select('*').order('created_at'); setMembers(data || []); setLoading(false); }

  async function invite(e) {
    e.preventDefault(); if (!invEmail) return toast.error('Email required');
    setInviting(true);
    try {
      const res = await fetch('/.netlify/functions/invite-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: invEmail, role: invRole, fullName: invName, tenantId: profile.tenant_id, invitedBy: profile.id }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(`Invited ${invEmail}`); setShowInvite(false); setInvEmail(''); setInvName(''); setInvRole('viewer'); load();
    } catch (e) { toast.error(e.message); } finally { setInviting(false); }
  }

  async function changeRole(uid, role) { if (uid === profile.id) return toast.error("Can't change own role"); const { error } = await supabase.from('user_profiles').update({ role }).eq('id', uid); if (error) return toast.error('Failed'); toast.success('Updated'); load(); }
  async function deactivate(uid) { if (uid === profile.id) return toast.error("Can't deactivate yourself"); if (!confirm('Deactivate?')) return; await supabase.from('user_profiles').update({ is_active: false }).eq('id', uid); toast.success('Done'); load(); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Team</h1><p className="text-sm text-txt-secondary mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p></div>
        {hasPermission(profile?.role, 'manage_team') && <button onClick={() => setShowInvite(true)} className="btn-primary"><HiOutlineUserAdd className="w-4 h-4" />Invite</button>}
      </div>

      {loading ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-card animate-pulse" />)}</div> : (
        <div className="card divide-y divide-border-light">
          {members.map(m => (
            <div key={m.id} className={`flex items-center gap-3 px-5 py-4 ${!m.is_active ? 'opacity-40' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-violet flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.full_name?.[0]?.toUpperCase() || '?'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-txt truncate">{m.full_name || 'Unnamed'}{m.id === profile.id && <span className="text-txt-tertiary ml-1">(you)</span>}</p>
                <p className="text-[11px] text-txt-tertiary truncate">{m.email}</p>
              </div>
              {hasPermission(profile?.role, 'manage_team') && m.id !== profile.id ? (
                <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} className="text-xs font-medium px-2 py-1 rounded-btn border border-border bg-white">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : <span className={`badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>}
              {hasPermission(profile?.role, 'manage_team') && m.id !== profile.id && m.is_active && (
                <button onClick={() => deactivate(m.id)} className="btn-ghost p-1.5 text-danger"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-card shadow-modal w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="font-semibold text-txt">Invite Member</h3><button onClick={() => setShowInvite(false)} className="btn-ghost p-1"><HiOutlineX className="w-4 h-4" /></button></div>
            <form onSubmit={invite} className="space-y-3">
              <div><label className="input-label">Name</label><input value={invName} onChange={e => setInvName(e.target.value)} className="input" placeholder="Jane Smith" /></div>
              <div><label className="input-label">Email *</label><div className="relative"><HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-placeholder" /><input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} className="input pl-10" placeholder="jane@company.com" required /></div></div>
              <div><label className="input-label">Role</label><select value={invRole} onChange={e => setInvRole(e.target.value)} className="input"><option value="viewer">Viewer</option><option value="creator">Creator</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1 text-xs">Cancel</button><button type="submit" disabled={inviting} className="btn-primary flex-1 text-xs">{inviting ? 'Sending...' : 'Send Invite'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
