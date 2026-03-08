import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, SURVEY_STATUS, timeAgo, isExpired, formatDate } from '../lib/constants';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';

const STATUS_FILTERS = ['all', 'active', 'draft', 'paused', 'expired', 'closed'];

export default function SurveyList() {
  const { profile } = useAuthStore();
  const nav = useNavigate();
  const { stopLoading } = useLoading();
  const [surveys, setSurveys] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [menu, setMenu] = useState(null);

  const location = useLocation();
  useEffect(() => { if (profile?.id) load(); else stopLoading(); }, [profile?.id, location.key]);

  async function load() {
    try {
      const { data } = await supabase.from('surveys').select('*,creator:user_profiles!created_by(full_name)').order('created_at', { ascending: false });
      setSurveys(data || []);
    } catch (e) { console.error(e); }
    finally { stopLoading(); }
  }

  const list = surveys.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || s.status === filter)
  );

  async function del(id) {
    if (!confirm('Permanently delete this survey?')) return;
    await supabase.from('surveys').delete().eq('id', id);
    setSurveys(p => p.filter(s => s.id !== id));
    toast.success('Survey deleted'); setMenu(null);
  }
  async function chg(id, st) {
    const u = { status: st };
    if (st === 'active' && isExpired(surveys.find(s => s.id === id)?.expires_at)) {
      const d = prompt('Extend by how many days?', '7');
      if (!d) return;
      const x = new Date(); x.setDate(x.getDate() + parseInt(d));
      u.expires_at = x.toISOString();
    }
    await supabase.from('surveys').update(u).eq('id', id);
    toast.success('Updated'); setMenu(null); load();
  }
  function copy(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
    toast.success('Link copied!'); setMenu(null);
  }

  const STATUS_COLORS = { active: 'var(--sage)', draft: 'rgba(22,15,8,0.25)', paused: 'var(--saffron)', expired: 'var(--terracotta)', closed: 'var(--terracotta)' };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 10 }}>Research</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 'clamp(32px,4vw,48px)', letterSpacing: '-2px', color: 'var(--espresso)', margin: 0 }}>Surveys</h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 15, color: 'rgba(22,15,8,0.4)', marginTop: 6 }}>{surveys.length} total</p>
        </div>
        {hasPermission(profile?.role, 'create_survey') && (
          <Link to="/surveys/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--espresso)', color: 'var(--cream)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 999, textDecoration: 'none', transition: 'background 0.25s ease' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--coral)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--espresso)'}>
            + New Survey
          </Link>
        )}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surveys…"
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 44, paddingRight: 20, paddingTop: 12, paddingBottom: 12, background: 'var(--warm-white)', border: '1px solid rgba(22,15,8,0.1)', borderRadius: 999, fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--espresso)', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'var(--coral)'}
            onBlur={e => e.target.style.borderColor = 'rgba(22,15,8,0.1)'}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'all 0.2s', background: filter === f ? 'var(--espresso)' : 'var(--warm-white)', color: filter === f ? 'var(--cream)' : 'rgba(22,15,8,0.4)', border: `1px solid ${filter === f ? 'transparent' : 'rgba(22,15,8,0.08)'}` }}>
              {f === 'all' ? 'All' : SURVEY_STATUS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div style={{ background: 'var(--warm-white)', borderRadius: 24, border: '1px solid rgba(22,15,8,0.07)', textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 64, color: 'rgba(22,15,8,0.06)', fontWeight: 900, letterSpacing: -3, marginBottom: 16 }}>Empty</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 16, color: 'rgba(22,15,8,0.4)' }}>
            {search || filter !== 'all' ? 'No surveys match your filter.' : 'No surveys yet — create your first one.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20, position: 'relative', zIndex: 1 }}>
          {list.map((sv, i) => (
            <motion.div key={sv.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4, boxShadow: '0 24px 60px rgba(22,15,8,0.1)' }}
              style={{ background: 'var(--warm-white)', borderRadius: 20, border: '1px solid rgba(22,15,8,0.07)', overflow: 'visible', position: 'relative' }}>

              {/* Colour accent bar */}
              <div style={{ height: 3, borderRadius: '20px 20px 0 0', background: sv.theme_color || 'var(--coral)' }} />

              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[sv.status] || 'rgba(22,15,8,0.25)', boxShadow: sv.status === 'active' ? '0 0 6px rgba(30,122,74,0.5)' : 'none' }} />
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: STATUS_COLORS[sv.status] || 'rgba(22,15,8,0.3)' }}>
                      {SURVEY_STATUS[sv.status]?.label || 'Draft'}
                    </span>
                  </div>
                  {/* Kebab menu */}
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setMenu(menu === sv.id ? null : sv.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: 'rgba(22,15,8,0.3)', transition: 'all 0.2s', fontSize: 18, lineHeight: 1 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--espresso)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(22,15,8,0.3)'; }}>
                      ···
                    </button>
                    {menu === sv.id && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenu(null)} />
                        <div style={{ position: 'absolute', right: 0, top: 36, zIndex: 20, width: 180, background: 'var(--espresso)', borderRadius: 16, padding: 8, boxShadow: '0 24px 60px rgba(22,15,8,0.25)' }}>
                          {[
                            { label: 'Edit', action: () => { nav(`/surveys/${sv.id}/edit`); setMenu(null); } },
                            { label: 'Analytics', action: () => { nav(`/surveys/${sv.id}/analytics`); setMenu(null); } },
                            { label: 'Copy link', action: () => copy(sv.slug) },
                            sv.status !== 'active' && { label: 'Activate', action: () => chg(sv.id, 'active'), coral: true },
                            sv.status === 'active' && { label: 'Pause', action: () => chg(sv.id, 'paused') },
                            hasPermission(profile?.role, 'delete_survey') && { label: 'Delete', action: () => del(sv.id), danger: true },
                          ].filter(Boolean).map(item => (
                            <button key={item.label} onClick={item.action}
                              style={{ width: '100%', display: 'block', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: item.danger ? 'var(--terracotta)' : item.coral ? 'var(--coral)' : 'rgba(253,245,232,0.65)', borderRadius: 10, transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,245,232,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Link to={`/surveys/${sv.id}/edit`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18, color: 'var(--espresso)', lineHeight: 1.3, marginBottom: 8, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--espresso)'}>
                    {sv.title}
                  </h3>
                </Link>

                <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 12, color: 'rgba(22,15,8,0.35)' }}>
                  {timeAgo(sv.created_at)} · {sv.creator?.full_name || '—'}
                </p>
                {sv.expires_at && (
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExpired(sv.expires_at) ? 'var(--terracotta)' : 'rgba(22,15,8,0.3)', marginTop: 4 }}>
                    {isExpired(sv.expires_at) ? 'Expired' : `Expires ${formatDate(sv.expires_at)}`}
                  </p>
                )}

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(22,15,8,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/surveys/${sv.id}/analytics`} style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.3)'}>Analytics</Link>
                  <Link to={`/surveys/${sv.id}/edit`} style={{ color: 'rgba(22,15,8,0.2)', textDecoration: 'none', fontSize: 16, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.2)'}>→</Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
