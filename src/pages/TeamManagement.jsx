import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { ROLE_LABELS, hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';

const ROLE_COLORS = { super_admin: 'rgba(139,92,246,0.12)', admin: 'rgba(255,69,0,0.1)', manager: 'rgba(255,184,0,0.12)', creator: 'rgba(30,122,74,0.1)', viewer: 'rgba(22,15,8,0.06)' };
const ROLE_TEXT   = { super_admin: '#7C3AED', admin: 'var(--coral)', manager: '#A07000', creator: 'var(--sage)', viewer: 'rgba(22,15,8,0.4)' };
const inp = { width: '100%', boxSizing: 'border-box', padding: '14px 18px', background: 'var(--cream)', border: '1px solid rgba(22,15,8,0.1)', borderRadius: 12, fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--espresso)', outline: 'none', transition: 'border-color 0.2s' };
const label = { fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.38)', display: 'block', marginBottom: 10 };

export default function TeamManagement() {
  const { profile } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [iE, sIE] = useState(''); const [iR, sIR] = useState('viewer'); const [iN, sIN] = useState('');
  const [busy, setBusy] = useState(false);

  const location = useLocation();
  useEffect(() => { if (profile?.id) load(); }, [profile?.id, location.key]);

  async function load() {
    const { data } = await supabase.from('user_profiles').select('*').eq('tenant_id', profile.tenant_id).order('created_at');
    setMembers(data || []); setLoading(false);
  }
  async function invite(e) {
    e.preventDefault();
    if (!iE) return toast.error('Email required');
    setBusy(true);
    try {
      const res = await fetch('/.netlify/functions/invite-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: iE, role: iR, fullName: iN, tenantId: profile.tenant_id, invitedBy: profile.id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(`Invited ${iE}`); setShowModal(false); sIE(''); sIN(''); sIR('viewer'); load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function chgRole(uid, role) {
    if (uid === profile.id) return toast.error("Can't change your own role");
    await supabase.from('user_profiles').update({ role }).eq('id', uid);
    toast.success('Role updated'); load();
  }
  async function deactivate(uid) {
    if (uid === profile.id || !confirm('Deactivate this member?')) return;
    await supabase.from('user_profiles').update({ is_active: false }).eq('id', uid);
    toast.success('Member deactivated'); load();
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 10 }}>Organisation</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 'clamp(32px,4vw,48px)', letterSpacing: '-2px', color: 'var(--espresso)', margin: 0 }}>Team</h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 15, color: 'rgba(22,15,8,0.4)', marginTop: 6 }}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {hasPermission(profile?.role, 'manage_team') && (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--espresso)', color: 'var(--cream)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'background 0.25s ease' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--coral)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--espresso)'}>
            + Invite member
          </button>
        )}
      </div>

      {/* Member grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, background: 'var(--cream-deep)', borderRadius: 16 }} className="animate-pulse" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
          {members.map(m => (
            <div key={m.id} style={{ background: 'var(--warm-white)', borderRadius: 18, border: '1px solid rgba(22,15,8,0.07)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, opacity: m.is_active === false ? 0.4 : 1, transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 12px 40px rgba(22,15,8,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--espresso)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {m.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.full_name || 'Unnamed'}
                  {m.id === profile.id && <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(22,15,8,0.3)', marginLeft: 8 }}>YOU</span>}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 12, color: 'rgba(22,15,8,0.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
              </div>
              {/* Role */}
              {hasPermission(profile?.role, 'manage_team') && m.id !== profile.id ? (
                <select value={m.role} onChange={e => chgRole(m.id, e.target.value)}
                  style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999, border: `1px solid ${ROLE_COLORS[m.role]}`, background: ROLE_COLORS[m.role], color: ROLE_TEXT[m.role], cursor: 'pointer', outline: 'none' }}>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999, background: ROLE_COLORS[m.role], color: ROLE_TEXT[m.role] }}>
                  {ROLE_LABELS[m.role]}
                </span>
              )}
              {/* Deactivate */}
              {hasPermission(profile?.role, 'manage_team') && m.id !== profile.id && m.is_active !== false && (
                <button onClick={() => deactivate(m.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, color: 'rgba(22,15,8,0.2)', fontSize: 16, lineHeight: 1, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; e.currentTarget.style.background = 'rgba(214,59,31,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(22,15,8,0.2)'; e.currentTarget.style.background = 'none'; }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,15,8,0.3)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--warm-white)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 40px 100px rgba(22,15,8,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 26, letterSpacing: '-1px', color: 'var(--espresso)', margin: 0 }}>Invite member</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.3)', fontSize: 20, lineHeight: 1, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--espresso)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.3)'}>✕</button>
            </div>
            <form onSubmit={invite} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[{ l: 'Name', v: iN, sv: sIN, t: 'text', ph: 'Jane Smith' }, { l: 'Email *', v: iE, sv: sIE, t: 'email', ph: 'jane@company.com' }].map(f => (
                <div key={f.l}>
                  <label style={label}>{f.l}</label>
                  <input type={f.t} value={f.v} onChange={e => f.sv(e.target.value)} placeholder={f.ph} required={f.t === 'email'}
                    style={inp}
                    onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'} />
                </div>
              ))}
              <div>
                <label style={label}>Role</label>
                <select value={iR} onChange={e => sIR(e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'}>
                  {['viewer','creator','manager','admin'].map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '13px 20px', borderRadius: 999, border: '1px solid rgba(22,15,8,0.1)', background: 'transparent', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.5)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={busy}
                  style={{ flex: 1, padding: '13px 20px', borderRadius: 999, border: 'none', background: busy ? 'rgba(22,15,8,0.3)' : 'var(--espresso)', color: 'var(--cream)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', transition: 'background 0.25s' }}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--coral)'; }}
                  onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--espresso)'; }}>
                  {busy ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
