import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AISurveySuggestions from '../components/AISurveySuggestions';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, generateUniqueSlug } from '../lib/constants';
import { Reorder } from 'framer-motion';
import HelpTip from '../components/HelpTip';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';

const newQ = () => ({ _id: Math.random().toString(36).slice(2), question_text: '', question_type: 'short_text', options: [], is_required: false, description: '' });
const hasO = t => ['single_choice', 'multiple_choice', 'dropdown', 'ranking'].includes(t);
const isMx = t => t === 'matrix';

/* ── Brand-consistent field styles ── */
const label = { fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.4)', display: 'block', marginBottom: 10 };
const inp   = { width: '100%', boxSizing: 'border-box', padding: '14px 18px', background: 'var(--cream)', border: '1.5px solid rgba(22,15,8,0.1)', borderRadius: 14, fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--espresso)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', resize: 'vertical' };
const focusIn  = e => { e.target.style.borderColor = 'var(--coral)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,69,0,0.08)'; };
const focusOut = e => { e.target.style.borderColor = 'rgba(22,15,8,0.1)'; e.target.style.boxShadow = 'none'; };

export default function SurveyCreate() {
  const { profile } = useAuthStore();
  const { stopLoading } = useLoading();
  const nav = useNavigate();
  // No async data fetch on mount — dismiss the navigation spinner immediately
  useEffect(() => { stopLoading(); }, [stopLoading]);
  const [busy, setBusy]   = useState(false);
  const [tab, setTab]     = useState('details');
  const [f, sf]           = useState({ title: '', description: '', welcome_message: '', thank_you_message: 'Thank you for completing this survey!', expires_at: '', theme_color: '#FF4500', allow_anonymous: true, require_email: false, show_progress_bar: true });
  const [qs, sQs]         = useState([newQ()]);
  const [dirty, setDirty] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Beforeunload guard ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const s    = (k, v) => { sf(p => ({ ...p, [k]: v })); setDirty(true); };
  const sQ   = (id, k, v) => sQs(a => a.map(q => q._id === id ? { ...q, [k]: v } : q));
  const addQ = () => sQs(a => [...a, newQ()]);
  const delQ = id => { if (qs.length <= 1) return toast.error('Need at least 1 question'); sQs(a => a.filter(q => q._id !== id)); };
  const moveQ = (id, d) => sQs(a => { const i = a.findIndex(q => q._id === id); if ((d === -1 && i === 0) || (d === 1 && i === a.length - 1)) return a; const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b; });
  const addOpt = id => sQs(a => a.map(q => q._id === id ? { ...q, options: [...(q.options || []), { label: '', value: '' }] } : q));
  const sOpt = (id, i, v) => sQs(a => a.map(q => { if (q._id !== id) return q; const o = [...(q.options || [])]; o[i] = { label: v, value: v.toLowerCase().replace(/\s+/g, '_') }; return { ...q, options: o }; }));
  const delOpt = (id, i) => sQs(a => a.map(q => q._id !== id ? q : { ...q, options: q.options.filter((_, j) => j !== i) }));

  async function save(status = 'draft') {
    if (!f.title.trim()) return toast.error('Title is required');
    if (qs.some(q => !q.question_text.trim())) return toast.error('All questions need text');
    if (qs.some(q => hasO(q.question_type) && (!q.options || q.options.length < 2))) return toast.error('Choice questions need ≥2 options');
    if (!profile?.tenant_id) return toast.error('Session error — please sign in again');
    setBusy(true);
    try {
      const slug = await generateUniqueSlug(supabase);
      const { data: sv, error: e1 } = await supabase.from('surveys').insert({ title: f.title, description: f.description || null, welcome_message: f.welcome_message || null, thank_you_message: f.thank_you_message || null, expires_at: f.expires_at || null, allow_anonymous: f.allow_anonymous, require_email: f.require_email, show_progress_bar: f.show_progress_bar, theme_color: f.theme_color, slug, status, tenant_id: profile.tenant_id, created_by: profile.id }).select().single();
      if (e1) throw e1;
      if (!sv) throw new Error('Survey not created');
      const { error: e2 } = await supabase.from('survey_questions').insert(qs.map((q, i) => ({ survey_id: sv.id, question_text: q.question_text, question_type: q.question_type, options: hasO(q.question_type) ? q.options : isMx(q.question_type) ? (q.options || { rows: [], columns: [] }) : null, is_required: q.is_required, description: q.description || null, sort_order: i })));
      if (e2) throw e2;
      setDirty(false);
      toast.success(status === 'active' ? 'Published!' : 'Draft saved');
      nav(`/surveys/${sv.id}/edit`);
    } catch (e) { console.error(e); toast.error(e.message || 'Failed to save'); }
    finally { setBusy(false); }
  }

  const tabs = [
    { id: 'details',   label: 'Details' },
    { id: 'questions', label: `Questions (${qs.length})` },
    { id: 'settings',  label: 'Settings' },
  ];

  const btnBase = { padding: '10px 22px', borderRadius: 999, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap', opacity: busy ? 0.45 : 1 };

  return (
    <div>
      {/* ── Template Gallery Modal ──────────────────────────────────────── */}
      {showTemplates && (
        <div style={{ position:'fixed',inset:0,zIndex:9000,background:'rgba(22,15,8,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowTemplates(false); }}>
          <div style={{ background:'var(--warm-white)',borderRadius:24,padding:36,maxWidth:680,width:'100%',maxHeight:'80vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(22,15,8,0.25)' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
              <h2 style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:24,letterSpacing:'-0.5px',margin:0 }}>Survey Templates</h2>
              <button onClick={()=>setShowTemplates(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:'rgba(22,15,8,0.3)' }}>✕</button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16 }}>
              {[
                { name:'NPS Survey', desc:'Measure customer loyalty with the Net Promoter Score methodology.', time:'2 min', icon:'NPS', qs:[
                  {question_text:'How likely are you to recommend us to a friend or colleague?',question_type:'scale',is_required:true,description:'0 = Not at all likely, 10 = Extremely likely'},
                  {question_text:'What is the main reason for your score?',question_type:'long_text',is_required:false,description:''},
                  {question_text:'What could we do to improve your experience?',question_type:'long_text',is_required:false,description:''},
                ]},
                { name:'Product Feedback', desc:'Gather actionable feedback on your product features and UX.', time:'3 min', icon:'UX', qs:[
                  {question_text:'How satisfied are you with the product overall?',question_type:'rating',is_required:true,description:''},
                  {question_text:'Which features do you use most often?',question_type:'multiple_choice',is_required:false,options:[{label:'Dashboard',value:'dashboard'},{label:'Analytics',value:'analytics'},{label:'Sharing',value:'sharing'},{label:'Integrations',value:'integrations'}]},
                  {question_text:'What feature would you most like to see added?',question_type:'long_text',is_required:false},
                  {question_text:'How easy is the product to use?',question_type:'scale',is_required:true,description:'1 = Very difficult, 10 = Very easy'},
                ]},
                { name:'Employee Pulse', desc:'Quick check-in on team morale, workload, and engagement.', time:'4 min', icon:'HR', qs:[
                  {question_text:'How satisfied are you with your work environment?',question_type:'rating',is_required:true},
                  {question_text:'How manageable is your current workload?',question_type:'scale',is_required:true,description:'1 = Overwhelmed, 10 = Very manageable'},
                  {question_text:'Do you feel your contributions are recognised?',question_type:'yes_no',is_required:true},
                  {question_text:'What would most improve your day-to-day experience?',question_type:'long_text',is_required:false},
                ]},
                { name:'Event Feedback', desc:'Collect structured feedback right after an event or workshop.', time:'2 min', icon:'EVT', qs:[
                  {question_text:'How would you rate this event overall?',question_type:'rating',is_required:true},
                  {question_text:'How well did the event meet your expectations?',question_type:'scale',is_required:true,description:'1 = Far below, 10 = Far exceeded'},
                  {question_text:'What was the highlight of the event?',question_type:'short_text',is_required:false},
                  {question_text:'What could be improved for next time?',question_type:'long_text',is_required:false},
                ]},
                { name:'Market Research', desc:'Understand your audience segments and buying intent.', time:'5 min', icon:'MKT', qs:[
                  {question_text:'Which of the following best describes your role?',question_type:'single_choice',is_required:true,options:[{label:'Individual Contributor',value:'ic'},{label:'Manager',value:'manager'},{label:'Director or above',value:'director'},{label:'Founder/Owner',value:'founder'}]},
                  {question_text:'What is your primary challenge in your work today?',question_type:'long_text',is_required:true},
                  {question_text:'Which tools do you currently use?',question_type:'multiple_choice',is_required:false,options:[{label:'Spreadsheets',value:'spreadsheets'},{label:'Survey tools',value:'survey'},{label:'CRM',value:'crm'},{label:'BI tools',value:'bi'}]},
                  {question_text:'How important is this problem for your team?',question_type:'scale',is_required:true,description:'1 = Nice to solve, 10 = Critical'},
                ]},
              ].map(t=>(
                <div key={t.name} style={{ background:'var(--cream)',borderRadius:18,padding:24,border:'1px solid rgba(22,15,8,0.07)',cursor:'pointer',transition:'all 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.boxShadow='0 12px 40px rgba(255,69,0,0.1)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(22,15,8,0.07)';e.currentTarget.style.boxShadow='none';}}
                  onClick={()=>{
                    sf(p=>({...p,title:t.name}));
                    sQs(t.qs.map(q=>({...q,_id:Math.random().toString(36).slice(2),options:q.options||[],description:q.description||''})));
                    setDirty(true); setShowTemplates(false); setTab('questions');
                    toast.success(`"${t.name}" template loaded!`);
                  }}>
                  <div style={{ fontSize:28,marginBottom:12 }}>{t.icon}</div>
                  <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:16,color:'var(--espresso)',marginBottom:6 }}>{t.name}</div>
                  <div style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:13,color:'rgba(22,15,8,0.5)',lineHeight:1.5,marginBottom:10 }}>{t.desc}</div>
                  <div style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(22,15,8,0.35)' }}>
                    ~{t.time} · {t.qs.length} questions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Header — full width, matches all other pages */}
      <div className="np-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: 10 }}>Research</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 'clamp(28px,3.5vw,48px)', letterSpacing: '-2px', color: 'var(--espresso)', margin: 0 }}>New Survey</h1>
          {dirty && <span style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--saffron)',marginTop:6,display:'block'}}>● Unsaved changes</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowTemplates(true)} style={{ ...btnBase, background: 'var(--cream-deep)', color: 'rgba(22,15,8,0.6)', display:'flex', alignItems:'center', gap:6 }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(22,15,8,0.1)'; }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--cream-deep)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Templates
          </button>
          <button onClick={() => save('draft')} disabled={busy} style={{ ...btnBase, background: 'var(--cream-deep)', color: 'rgba(22,15,8,0.6)' }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(22,15,8,0.1)'; }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--cream-deep)'; }}>
            Save draft
          </button>
          <button onClick={() => save('active')} disabled={busy} style={{ ...btnBase, background: 'var(--espresso)', color: 'var(--cream)' }}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--coral)'; }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--espresso)'; }}>
            Publish →
          </button>
        </div>
      </div>

      {/* Constrained form body */}
      <div style={{ maxWidth: 760 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 6, background: 'var(--cream-deep)', borderRadius: 999, marginBottom: 32 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'all 0.2s', background: tab === t.id ? 'var(--espresso)' : 'transparent', color: tab === t.id ? 'var(--cream)' : 'rgba(22,15,8,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { key: 'title',            lbl: 'Title *',         type: 'input',    ph: 'Customer Satisfaction Survey', large: true },
            { key: 'description',      lbl: 'Description',     type: 'textarea', ph: "What's this research about?", rows: 2 },
            { key: 'welcome_message',  lbl: 'Welcome message', type: 'textarea', ph: 'Shown before they start', rows: 2 },
            { key: 'thank_you_message',lbl: 'Thank you message',type: 'textarea',ph: '', rows: 2 },
          ].map(fi => (
            <div key={fi.key}>
              <label style={label}>{fi.lbl}</label>
              {fi.type === 'textarea' ? (
                <textarea value={f[fi.key]} onChange={e => s(fi.key, e.target.value)} placeholder={fi.ph} rows={fi.rows} style={inp} onFocus={focusIn} onBlur={focusOut} />
              ) : (
                <input value={f[fi.key]} onChange={e => s(fi.key, e.target.value)} placeholder={fi.ph}
                  style={{ ...inp, fontSize: fi.large ? 18 : 15, fontWeight: fi.large ? 500 : 400 }} onFocus={focusIn} onBlur={focusOut} />
              )}
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={label}>Expires</label>
              <input type="datetime-local" value={f.expires_at} onChange={e => s('expires_at', e.target.value)} style={inp} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={label}>Theme colour</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={f.theme_color} onChange={e => s('theme_color', e.target.value)}
                  style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(22,15,8,0.1)', cursor: 'pointer', padding: 2, background: 'var(--warm-white)' }} />
                <input value={f.theme_color} onChange={e => s('theme_color', e.target.value)} style={{ ...inp, flex: 1, fontFamily: 'Fraunces, serif', letterSpacing: '0.05em' }} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Questions tab ── */}
      {tab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {qs.map((q, i) => (
            <div key={q._id} style={{ background: 'var(--warm-white)', borderRadius: 24, border: '1.5px solid rgba(22,15,8,0.07)', padding: '28px 28px 24px', transition: 'border-color 0.2s, box-shadow 0.2s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.14)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(22,15,8,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}>
              {/* Coral accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, var(--coral), transparent)`, opacity: 0.35, borderRadius: '24px 24px 0 0' }} />
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 28, color: 'rgba(22,15,8,0.07)', lineHeight: 1, userSelect: 'none', letterSpacing: '-1px' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', background: 'var(--cream-deep)', padding: '4px 10px', borderRadius: 999 }}>
                    {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || 'Question'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[[-1, '↑'], [1, '↓']].map(([d, sym]) => (
                    <button key={d} onClick={() => moveQ(q._id, d)} disabled={(d === -1 && i === 0) || (d === 1 && i === qs.length - 1)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', color: 'rgba(22,15,8,0.3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: ((d === -1 && i === 0) || (d === 1 && i === qs.length - 1)) ? 0.2 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-deep)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>{sym}</button>
                  ))}
                  <button onClick={() => delQ(q._id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.25)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,59,31,0.08)'; e.currentTarget.style.color = 'var(--terracotta)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(22,15,8,0.25)'; }}>✕</button>
                </div>
              </div>

              {/* Question fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={q.question_text} onChange={e => sQ(q._id, 'question_text', e.target.value)}
                  placeholder="Type your question here…"
                  style={{ ...inp, fontSize: 17, fontWeight: 400, padding: '16px 20px', background: 'rgba(253,245,232,0.5)', border: '1.5px solid rgba(22,15,8,0.08)' }} onFocus={focusIn} onBlur={focusOut} />
                <input value={q.description} onChange={e => sQ(q._id, 'description', e.target.value)}
                  placeholder="Add a description or helper text (optional)"
                  style={{ ...inp, fontSize: 13, color: 'rgba(22,15,8,0.5)', padding: '11px 16px', background: 'transparent' }} onFocus={focusIn} onBlur={focusOut} />

                {/* Type + required */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <select value={q.question_type} onChange={e => sQ(q._id, 'question_type', e.target.value)}
                    style={{ ...inp, flex: 1, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='rgba(22,15,8,0.3)' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
                    onFocus={focusIn} onBlur={focusOut}>
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <input type="checkbox" checked={q.is_required} onChange={e => sQ(q._id, 'is_required', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--coral)', cursor: 'pointer' }} />
                    Required
                  </label>
                </div>

                {/* Options */}
                {hasO(q.question_type) && (
                  <div style={{ marginTop: 4, paddingLeft: 16, borderLeft: '2px solid rgba(255,69,0,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map((o, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(22,15,8,0.15)', flexShrink: 0 }} />
                        <input value={o.label} onChange={e => sOpt(q._id, j, e.target.value)}
                          placeholder={`Option ${j + 1}`}
                          style={{ ...inp, flex: 1, padding: '10px 14px', fontSize: 14 }} onFocus={focusIn} onBlur={focusOut} />
                        <button onClick={() => delOpt(q._id, j)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.2)', fontSize: 14, padding: 4, transition: 'color 0.15s', lineHeight: 1 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--terracotta)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.2)'}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addOpt(q._id)}
                      style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'left', transition: 'opacity 0.15s' }}>
                      + Add option
                    </button>
                  </div>
                )}

                {/* Matrix rows/columns editor */}
                {isMx(q.question_type) && (() => {
                  const mx = q.options && !Array.isArray(q.options) ? q.options : { rows: [], columns: [] };
                  const setMx = (next) => sQ(q._id, 'options', next);
                  const addRow = () => { const r = { label: `Row ${(mx.rows||[]).length+1}`, value: `row_${(mx.rows||[]).length+1}` }; setMx({...mx, rows:[...(mx.rows||[]),r]}); };
                  const addCol = () => { const c2 = { label: `Col ${(mx.columns||[]).length+1}`, value: `col_${(mx.columns||[]).length+1}` }; setMx({...mx, columns:[...(mx.columns||[]),c2]}); };
                  const updRow = (i, v) => { const r=[...(mx.rows||[])]; r[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')}; setMx({...mx,rows:r}); };
                  const updCol = (i, v) => { const cs=[...(mx.columns||[])]; cs[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')}; setMx({...mx,columns:cs}); };
                  const delRow = (i) => setMx({...mx, rows:(mx.rows||[]).filter((_,j)=>j!==i)});
                  const delCol = (i) => setMx({...mx, columns:(mx.columns||[]).filter((_,j)=>j!==i)});
                  return (
                    <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <div style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(22,15,8,0.4)',marginBottom:8}}>Rows</div>
                        {(mx.rows||[]).map((r,i)=>(
                          <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                            <input value={r.label} onChange={e=>updRow(i,e.target.value)} placeholder={`Row ${i+1}`} style={{...inp,flex:1,padding:'8px 12px',fontSize:13}} onFocus={focusIn} onBlur={focusOut}/>
                            <button onClick={()=>delRow(i)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.2)',fontSize:12,padding:'0 4px'}}>✕</button>
                          </div>
                        ))}
                        <button onClick={addRow} style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--coral)',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Add row</button>
                      </div>
                      <div>
                        <div style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(22,15,8,0.4)',marginBottom:8}}>Columns</div>
                        {(mx.columns||[]).map((c2,i)=>(
                          <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                            <input value={c2.label} onChange={e=>updCol(i,e.target.value)} placeholder={`Col ${i+1}`} style={{...inp,flex:1,padding:'8px 12px',fontSize:13}} onFocus={focusIn} onBlur={focusOut}/>
                            <button onClick={()=>delCol(i)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.2)',fontSize:12,padding:'0 4px'}}>✕</button>
                          </div>
                        ))}
                        <button onClick={addCol} style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--coral)',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Add column</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* Add question */}
          <button onClick={addQ}
            style={{ width: '100%', padding: '18px 0', border: '2px dashed rgba(22,15,8,0.12)', borderRadius: 20, background: 'transparent', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.color = 'var(--coral)'; e.currentTarget.style.background = 'rgba(255,69,0,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.12)'; e.currentTarget.style.color = 'rgba(22,15,8,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
            + Add Question
          </button>
          {/* ── AI question suggestions ── */}
          <AISurveySuggestions
            survey={f}
            questions={qs}
            tc={f.theme_color || '#FF4500'}
            onAdd={q => sQs(a => [...a, { ...newQ(), ...q, _id: 'new_' + Math.random().toString(36).slice(2) }])}
          />
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { k: 'allow_anonymous',   l: 'Anonymous responses',    d: "Respondents don't need to identify themselves" },
            { k: 'require_email',     l: 'Require email address',  d: 'Ask for email before the survey starts' },
            { k: 'show_progress_bar', l: 'Progress bar',           d: 'Show completion percentage to respondents' },
          ].map(x => (
            <label key={x.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'var(--warm-white)', borderRadius: 18, border: '1px solid rgba(22,15,8,0.07)', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(22,15,8,0.14)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(22,15,8,0.07)'}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 16, color: 'var(--espresso)', marginBottom: 4 }}>{x.l}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.45)' }}>{x.d}</div>
              </div>
              {/* Toggle */}
              <div onClick={() => s(x.k, !f[x.k])}
                style={{ width: 44, height: 24, borderRadius: 999, background: f[x.k] ? 'var(--coral)' : 'rgba(22,15,8,0.12)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: f[x.k] ? 23 : 3, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(22,15,8,0.2)' }} />
              </div>
            </label>
          ))}
        </div>
      )}
    </div>{/* end constrained form body */}
    </div>
  );
}
