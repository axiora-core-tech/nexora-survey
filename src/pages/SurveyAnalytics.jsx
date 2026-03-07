import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { formatDateTime } from '../lib/constants';
import AIInsightsPanel from '../components/AIInsightsPanel';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Nexora palette for charts
const COLS = ['#FF4500','#FFB800','#1E7A4A','#0047FF','#D63B1F','#7C3AED','#00D4FF','#FF6B35','#84CC16','#EC4899'];

const S = {
  tag:      { fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 10 },
  h1:       { fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 'clamp(32px,4vw,48px)', letterSpacing: '-2px', color: 'var(--espresso)', margin: 0 },
  card:     { background: 'var(--warm-white)', borderRadius: 20, border: '1px solid rgba(22,15,8,0.07)', padding: '28px 28px 24px' },
  secLabel: { fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', marginBottom: 24 },
  qNum:     { fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)' },
  qText:    { fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, color: 'var(--espresso)', lineHeight: 1.3, letterSpacing: '-0.5px', marginBottom: 4 },
  qResp:    { fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.35)', marginBottom: 24 },
  statNum:  { fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 48, letterSpacing: '-3px', color: 'var(--espresso)', lineHeight: 1 },
  statLbl:  { fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)', marginTop: 8 },
  textResp: { fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 14, color: 'var(--espresso)', background: 'var(--cream)', borderRadius: 12, padding: '12px 16px', lineHeight: 1.6, borderLeft: '3px solid var(--coral)' },
  exportBtn:{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, border: '1px solid rgba(22,15,8,0.12)', background: 'transparent', color: 'rgba(22,15,8,0.55)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'none', transition: 'all 0.2s' },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)', textDecoration: 'none', marginBottom: 14, transition: 'color 0.2s' },
};

const STAT_TOPS = ['var(--coral)', 'var(--espresso)', 'var(--saffron)'];

export default function SurveyAnalytics() {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const [sv, setSv]       = useState(null);
  const [qs, sQs]         = useState([]);
  const [rs, sRs]         = useState([]);
  const [ans, sAns]       = useState([]);
  const [loading, setL]   = useState(true);

  useEffect(() => { if (profile?.id) load(); }, [id, profile?.id]);

  async function load() {
    try {
      const { data: s }  = await supabase.from('surveys').select('*').eq('id', id).single();
      setSv(s);
      const { data: q }  = await supabase.from('survey_questions').select('*').eq('survey_id', id).order('sort_order');
      sQs(q || []);
      const { data: r }  = await supabase.from('survey_responses').select('*').eq('survey_id', id).order('started_at');
      sRs(r || []);
      if (r?.length) {
        const { data: a } = await supabase.from('survey_answers').select('*').in('response_id', r.map(x => x.id));
        sAns(a || []);
      }
    } catch (e) { console.error(e); }
    finally { setL(false); }
  }

  const total = rs.length;
  const done  = rs.filter(r => r.status === 'completed').length;
  const rate  = total ? Math.round((done / total) * 100) : 0;
  const avgTime = (() => {
    const times = rs.filter(r => r.completed_at && r.started_at).map(r =>
      (new Date(r.completed_at) - new Date(r.started_at)) / 60000);
    return times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null;
  })();

  function getQA(q) {
    const qa = ans.filter(a => a.question_id === q.id);
    if (!qa.length) return null;
    if (['single_choice', 'dropdown', 'yes_no'].includes(q.question_type)) {
      const c = {}; qa.forEach(a => { const v = a.answer_value || '—'; c[v] = (c[v] || 0) + 1; });
      const labels = Object.keys(c).map(k => (q.options || []).find(o => o.value === k)?.label || k);
      return { type: 'doughnut', labels, values: Object.values(c), total: qa.length };
    }
    if (q.question_type === 'multiple_choice') {
      const c = {}; qa.forEach(a => (a.answer_json || []).forEach(v => { c[v] = (c[v] || 0) + 1; }));
      const labels = Object.keys(c).map(k => (q.options || []).find(o => o.value === k)?.label || k);
      return { type: 'bar', labels, values: Object.values(c), total: qa.length };
    }
    if (['rating', 'scale'].includes(q.question_type)) {
      const vs = qa.map(a => parseInt(a.answer_value) || 0).filter(Boolean);
      const avg = vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : 0;
      const mx = q.question_type === 'rating' ? 5 : 10;
      const d = {}; for (let i = 1; i <= mx; i++) d[i] = 0;
      vs.forEach(v => { if (d[v] !== undefined) d[v]++; });
      return { type: 'bar', labels: Object.keys(d), values: Object.values(d), avg, total: vs.length };
    }
    return { type: 'text', items: qa.map(a => a.answer_value).filter(Boolean), total: qa.length };
  }

  function csv() {
    const h   = ['#', 'Status', 'Email', 'Started', 'Completed', ...qs.map(q => q.question_text)];
    const rows = rs.map((r, i) => {
      const ra = ans.filter(a => a.response_id === r.id);
      return [i + 1, r.status, r.respondent_email || '', r.started_at, r.completed_at || '',
        ...qs.map(q => { const a = ra.find(x => x.question_id === q.id); return a?.answer_value || (a?.answer_json ? JSON.stringify(a.answer_json) : ''); })];
    });
    const c = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' }));
    a.download = `${sv?.title || 'survey'}.csv`; a.click();
  }

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 10, padding: 10, backgroundColor: 'rgba(22,15,8,0.9)', titleFont: { family: 'Syne' }, bodyFont: { family: 'Fraunces' } } },
    scales: { x: { grid: { display: false }, ticks: { font: { family: 'Syne', size: 11 }, color: 'rgba(22,15,8,0.4)' } }, y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Syne', size: 10 }, color: 'rgba(22,15,8,0.4)' }, grid: { color: 'rgba(22,15,8,0.05)' } } },
  };
  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 10, backgroundColor: 'rgba(22,15,8,0.9)', titleFont: { family: 'Syne' }, bodyFont: { family: 'Fraunces' } } },
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[200, 100, 160, 160, 160].map((h, i) => <div key={i} style={{ height: h, background: 'var(--cream-deep)', borderRadius: 20 }} className="animate-pulse" />)}
    </div>
  );
  if (!sv) return <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'Fraunces, serif', color: 'rgba(22,15,8,0.35)' }}>Survey not found</div>;

  const statCards = [
    { label: 'Total responses', val: total },
    { label: 'Completed',        val: done },
    { label: 'Completion rate',  val: `${rate}%` },
    ...(avgTime ? [{ label: 'Avg. time (min)', val: avgTime }] : []),
  ];

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48, gap: 20 }}>
        <div>
          <Link to={`/surveys/${id}/edit`} style={S.backLink}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.35)'}>
            ← Back to survey
          </Link>
          <div style={S.tag}>Analytics</div>
          <h1 style={S.h1}>{sv.title}</h1>
        </div>
        <button onClick={csv} style={S.exportBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--espresso)'; e.currentTarget.style.color = 'var(--espresso)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.12)'; e.currentTarget.style.color = 'rgba(22,15,8,0.55)'; }}>
          ↓ Export CSV
        </button>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statCards.length}, 1fr)`, gap: 16, marginBottom: 48 }}>
        {statCards.map((st, i) => (
          <div key={i} style={{ ...S.card, borderTop: `3px solid ${STAT_TOPS[i] || 'var(--coral)'}`, padding: '22px 24px 20px' }}>
            <div style={S.statNum}>{st.val}</div>
            <div style={S.statLbl}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Question breakdown */}
      {qs.length > 0 && (
        <>
          <div style={S.secLabel}>Question Breakdown</div>
          {/* ── AI Insights ── */}
          <AIInsightsPanel survey={sv} analytics={{ total, completedCount: done, completionRate: rate, abandonRate: 0, avgTimeMin: avgTime, nps: null, questionAnalytics: qs.map(q => ({ question: q, data: getQA(q) })) }} questionAnalytics={qs.map(q => ({ question: q, data: getQA(q) }))} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
            {qs.map((q, i) => {
              const a = getQA(q);
              return (
                <div key={q.id} style={S.card}>
                  <div style={{ marginBottom: 20 }}>
                    <div style={S.qNum}>Q{i + 1}</div>
                    <div style={S.qText}>{q.question_text}</div>
                    <div style={S.qResp}>{a?.total || 0} response{a?.total !== 1 ? 's' : ''}</div>
                  </div>

                  {!a ? (
                    <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 14, color: 'rgba(22,15,8,0.25)', fontStyle: 'italic' }}>No responses yet</div>
                  ) : a.type === 'doughnut' ? (
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                      <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                        <Doughnut options={donutOpts} data={{ labels: a.labels, datasets: [{ data: a.values, backgroundColor: COLS.slice(0, a.values.length), borderWidth: 0 }] }} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {a.labels.map((lbl, j) => {
                          const pct = Math.round((a.values[j] / a.total) * 100);
                          return (
                            <div key={j}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 14, color: 'var(--espresso)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLS[j], flexShrink: 0, display: 'inline-block' }} />
                                  {lbl}
                                </span>
                                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12, color: 'var(--espresso)' }}>{a.values[j]} <span style={{ color: 'rgba(22,15,8,0.35)' }}>({pct}%)</span></span>
                              </div>
                              <div style={{ height: 3, background: 'var(--cream-deep)', borderRadius: 999 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: COLS[j], borderRadius: 999, transition: 'width 0.8s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : a.type === 'bar' ? (
                    <div>
                      {a.avg && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
                          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 40, letterSpacing: '-2px', color: 'var(--espresso)' }}>{a.avg}</span>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)' }}>Average</span>
                        </div>
                      )}
                      <div style={{ height: 180 }}>
                        <Bar options={chartOpts} data={{ labels: a.labels, datasets: [{ data: a.values, backgroundColor: a.labels.map((_, j) => COLS[j % COLS.length]), borderRadius: 8, barThickness: 28 }] }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                      {a.items.slice(0, 25).map((r, j) => <div key={j} style={S.textResp}>{r}</div>)}
                      {a.items.length > 25 && <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', paddingLeft: 4 }}>+{a.items.length - 25} more in CSV export</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Responses table */}
      <div style={{ ...S.card, padding: '32px 32px 28px' }}>
        <div style={{ ...S.secLabel, marginBottom: 20 }}>All Responses</div>
        {!rs.length ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 48, color: 'rgba(22,15,8,0.06)', fontWeight: 900, letterSpacing: -2, marginBottom: 12 }}>Empty</div>
            <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 15, color: 'rgba(22,15,8,0.35)' }}>No responses yet — share your survey to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(22,15,8,0.08)' }}>
                  {['#', 'Status', 'Email', 'Started', 'Completed'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rs.slice(0, 50).map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(22,15,8,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.35)' }}>{i + 1}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999,
                        background: r.status === 'completed' ? 'rgba(30,122,74,0.1)' : r.status === 'in_progress' ? 'rgba(0,71,255,0.08)' : 'rgba(22,15,8,0.06)',
                        color: r.status === 'completed' ? 'var(--sage)' : r.status === 'in_progress' ? 'var(--cobalt)' : 'rgba(22,15,8,0.4)',
                      }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.5)' }}>{r.respondent_email || '—'}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.5)' }}>{formatDateTime(r.started_at)}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.5)' }}>{r.completed_at ? formatDateTime(r.completed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rs.length > 50 && <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', padding: '16px 14px 0', textAlign: 'center' }}>Showing 50 of {rs.length} — export CSV for all</div>}
          </div>
        )}
      </div>
    </div>
  );
}
