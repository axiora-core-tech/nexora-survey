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

  async function load() {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at');
    setMembers(data || []);
    setLoading(false);
  }

  async function invite(e) {
    e.preventDefault();
    if (!invEmail) return toast.error('Email required');
    setInviting(true);
    try {
      const res = await fetch('/.netlify/functions/invite-user', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email:invEmail, role:invRole, fullName:invName, tenantId:profile.tenant_id, invitedBy:profile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invited ${invEmail}`);
      setShowInvite(false); setInvEmail(''); setInvName(''); setInvRole('viewer'); load();
    } catch(e) { toast.error(e.message); }
    finally { setInviting(false); }
  }

  async function changeRole(uid, role) {
    if (uid===profile.id) return toast.error("Can't change your own role");
    const { error } = await supabase.from('user_profiles').update({role}).eq('id',uid);
    if (error) return toast.error('Failed');
    toast.success('Updated'); load();
  }

  async function deactivate(uid) {
    if (uid===profile.id) return toast.error("Can't deactivate yourself");
    if (!confirm('Deactivate this user?')) return;
    const { error } = await supabase.from('user_profiles').update({is_active:false}).eq('id',uid);
    if (error) return toast.error('Failed');
    toast.success('Deactivated'); load();
  }

  const isAdmin = hasPermission(profile?.role, 'manage_team');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="text-sm text-ink-400 mt-1">{members.length} member{members.length!==1?'s':''}</p>
        </div>
        {isAdmin && <button onClick={()=>setShowInvite(true)} className="btn-primary"><HiOutlineUserAdd className="w-4 h-4"/>Invite</button>}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse"/>)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-100 divide-y divide-ink-100">
          {members.map(m => (
            <div key={m.id} className={`flex items-center gap-3 px-5 py-3.5 ${!m.is_active?'opacity-40':''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pri-500 to-acc-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {m.full_name?.[0]?.toUpperCase()||'?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">
                  {m.full_name||'Unnamed'}{m.id===profile.id && <span className="text-ink-400 ml-1">(you)</span>}
                </p>
                <p className="text-[11px] text-ink-400 truncate">{m.email}</p>
              </div>
              {isAdmin && m.id !== profile.id ? (
                <select value={m.role} onChange={e=>changeRole(m.id,e.target.value)}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-ink-200 bg-white focus:outline-none">
                  {Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <span className={`badge role-${m.role}`}>{ROLE_LABELS[m.role]||m.role}</span>
              )}
              {isAdmin && m.id !== profile.id && m.is_active && (
                <button onClick={()=>deactivate(m.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600"><HiOutlineTrash className="w-3.5 h-3.5"/></button>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-ink-950/25 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowInvite(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 anim-enter" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-ink-900">Invite Member</h3>
              <button onClick={()=>setShowInvite(false)} className="btn-ghost p-1"><HiOutlineX className="w-4 h-4"/></button>
            </div>
            <form onSubmit={invite} className="space-y-3">
              <div><label className="input-label">Name</label><input value={invName} onChange={e=>setInvName(e.target.value)} className="input-field" placeholder="Jane Smith"/></div>
              <div><label className="input-label">Email *</label>
                <div className="relative"><HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"/><input type="email" value={invEmail} onChange={e=>setInvEmail(e.target.value)} className="input-field pl-10" placeholder="jane@company.com" required/></div>
              </div>
              <div><label className="input-label">Role</label>
                <select value={invRole} onChange={e=>setInvRole(e.target.value)} className="input-field">
                  <option value="viewer">Viewer</option><option value="creator">Creator</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowInvite(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
                <button type="submit" disabled={inviting} className="btn-primary flex-1 text-xs">{inviting?'Sending...':'Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
