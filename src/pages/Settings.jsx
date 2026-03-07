import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';

const card  = { background: 'var(--warm-white)', borderRadius: 20, border: '1px solid rgba(22,15,8,0.07)', padding: '36px 40px', marginBottom: 20 };
const label = { fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.38)', display: 'block', marginBottom: 10 };
const inp   = { width: '100%', boxSizing: 'border-box', padding: '14px 18px', background: 'var(--cream)', border: '1px solid rgba(22,15,8,0.1)', borderRadius: 12, fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--espresso)', outline: 'none', transition: 'border-color 0.2s' };
const dis   = { ...inp, background: 'var(--cream-deep)', color: 'rgba(22,15,8,0.3)', cursor: 'not-allowed' };
const btn   = { padding: '13px 28px', borderRadius: 999, border: 'none', background: 'var(--espresso)', color: 'var(--cream)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.25s ease' };
const secH  = { fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)', marginBottom: 28 };

export default function Settings() {
  const { profile, tenant, updateProfile } = useAuthStore();
  const [pF, sPF] = useState({ full_name: profile?.full_name || '' });
  const [tF, sTF] = useState({ name: tenant?.name || '', primary_color: tenant?.primary_color || '#FF4500' });
  const [sP, sSP] = useState(false);
  const [sT, sST] = useState(false);

  async function saveP(e) {
    e.preventDefault(); sSP(true);
    try { await updateProfile({ full_name: pF.full_name }); toast.success('Profile saved'); }
    catch (e) { toast.error(e.message); } finally { sSP(false); }
  }
  async function saveT(e) {
    e.preventDefault();
    if (!tenant?.id) return toast.error('Organisation not loaded');
    sST(true);
    try {
      const { data, error } = await supabase.from('tenants').update({ name: tF.name, primary_color: tF.primary_color }).eq('id', tenant.id).select().single();
      if (error) throw error;
      if (!data) throw new Error('Insufficient permissions');
      toast.success('Organisation saved');
    } catch (e) { toast.error(e.message); } finally { sST(false); }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 10 }}>Account</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 48, letterSpacing: '-2px', color: 'var(--espresso)', margin: 0 }}>Settings</h1>
      </div>

      {/* Profile */}
      <div style={card}>
        <div style={secH}>Profile</div>
        <form onSubmit={saveP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={label}>Full Name</label>
            <input value={pF.full_name} onChange={e => sPF({ ...pF, full_name: e.target.value })} style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--coral)'}
              onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'} />
          </div>
          <div>
            <label style={label}>Email</label>
            <input value={profile?.email || ''} disabled style={dis} />
          </div>
          <div>
            <label style={label}>Role</label>
            <div style={{ ...dis, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 999, background: 'rgba(255,69,0,0.1)', color: 'var(--coral)' }}>
                {ROLE_LABELS[profile?.role]}
              </span>
            </div>
          </div>
          <div>
            <button type="submit" disabled={sP} style={btn}
              onMouseEnter={e => { if (!sP) e.currentTarget.style.background = 'var(--coral)'; }}
              onMouseLeave={e => { if (!sP) e.currentTarget.style.background = 'var(--espresso)'; }}>
              {sP ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Organisation */}
      {hasPermission(profile?.role, 'manage_tenant') && (
        <div style={card}>
          <div style={secH}>Organisation</div>
          <form onSubmit={saveT} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={label}>Name</label>
              <input value={tF.name} onChange={e => sTF({ ...tF, name: e.target.value })} style={inp}
                onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'} />
            </div>
            <div>
              <label style={label}>Workspace URL</label>
              <div style={{ ...dis, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{tenant?.slug}</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, opacity: 0.5 }}>.nexora.io</span>
              </div>
            </div>
            <div>
              <label style={label}>Plan</label>
              <div style={{ ...dis, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 999, background: 'rgba(30,122,74,0.1)', color: 'var(--sage)' }}>
                  {tenant?.plan || 'Free'}
                </span>
              </div>
            </div>
            <div>
              <label style={label}>Brand Colour</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="color" value={tF.primary_color} onChange={e => sTF({ ...tF, primary_color: e.target.value })}
                  style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(22,15,8,0.1)', cursor: 'pointer', padding: 2, background: 'var(--warm-white)' }} />
                <input value={tF.primary_color} onChange={e => sTF({ ...tF, primary_color: e.target.value })}
                  style={{ ...inp, flex: 1, fontFamily: 'Fraunces, serif', letterSpacing: '0.05em' }}
                  onFocus={e => e.target.style.borderColor = 'var(--coral)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'} />
              </div>
            </div>
            <div>
              <button type="submit" disabled={sT} style={btn}
                onMouseEnter={e => { if (!sT) e.currentTarget.style.background = 'var(--coral)'; }}
                onMouseLeave={e => { if (!sT) e.currentTarget.style.background = 'var(--espresso)'; }}>
                {sT ? 'Saving…' : 'Save organisation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
