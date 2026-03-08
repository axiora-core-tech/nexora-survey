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
  const [tmplTab, setTmplTab]             = useState('gallery'); // 'gallery' | 'mine'
  const [catFilter, setCatFilter]         = useState('All');
  const [showCreateTmpl, setShowCreateTmpl] = useState(false);
  const [tmplName, setTmplName]           = useState('');
  const [tmplCat, setTmplCat]             = useState('');
  const [tmplDesc, setTmplDesc]           = useState('');
  const [tmplNewCat, setTmplNewCat]       = useState('');
  const [customTemplates, setCustomTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('np-custom-templates') || '[]'); } catch { return []; }
  });

  const persistCustom = (list) => {
    setCustomTemplates(list);
    localStorage.setItem('np-custom-templates', JSON.stringify(list));
  };

  function saveAsTemplate() {
    if (!tmplName.trim()) return toast.error('Template name required');
    const cat = (tmplNewCat.trim() || tmplCat || 'Custom');
    const newT = {
      id: Math.random().toString(36).slice(2),
      name: tmplName.trim(),
      category: cat,
      desc: tmplDesc.trim() || 'Custom template',
      time: `${Math.max(1, Math.ceil(qs.length * 0.5))} min`,
      createdAt: new Date().toISOString(),
      qs: qs.map(q => ({ question_text: q.question_text, question_type: q.question_type, options: q.options, is_required: q.is_required, description: q.description })),
    };
    persistCustom([newT, ...customTemplates]);
    toast.success(`Template "${newT.name}" saved!`);
    setShowCreateTmpl(false);
    setTmplName(''); setTmplDesc(''); setTmplCat(''); setTmplNewCat('');
    setTmplTab('mine');
  }

  function deleteCustomTemplate(id) {
    persistCustom(customTemplates.filter(t => t.id !== id));
    toast.success('Template deleted');
  }

  function loadTemplate(t) {
    sf(p => ({ ...p, title: t.name }));
    sQs(t.qs.map(q => ({ ...q, _id: Math.random().toString(36).slice(2), options: q.options || [], description: q.description || '' })));
    setDirty(true); setShowTemplates(false); setTab('questions');
    toast.success(`"${t.name}" loaded!`);
  }

  const GALLERY_TEMPLATES = [
                { name:'NPS Survey', category:'Customer', desc:'Measure customer loyalty with the Net Promoter Score methodology.', time:'2 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, qs:[
                  {question_text:'How likely are you to recommend us to a friend or colleague?',question_type:'scale',is_required:true,description:'0 = Not at all likely, 10 = Extremely likely'},
                  {question_text:'What is the main reason for your score?',question_type:'long_text',is_required:false,description:''},
                  {question_text:'What could we do to improve your experience?',question_type:'long_text',is_required:false,description:''},
                ]},
                { name:'Product Feedback', category:'Product', desc:'Gather actionable feedback on your product features and UX.', time:'3 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, qs:[
                  {question_text:'How satisfied are you with the product overall?',question_type:'rating',is_required:true,description:''},
                  {question_text:'Which features do you use most often?',question_type:'multiple_choice',is_required:false,options:[{label:'Dashboard',value:'dashboard'},{label:'Analytics',value:'analytics'},{label:'Sharing',value:'sharing'},{label:'Integrations',value:'integrations'}]},
                  {question_text:'What feature would you most like to see added?',question_type:'long_text',is_required:false},
                  {question_text:'How easy is the product to use?',question_type:'scale',is_required:true,description:'1 = Very difficult, 10 = Very easy'},
                ]},
                { name:'Employee Pulse', category:'HR', desc:'Quick check-in on team morale, workload, and engagement.', time:'4 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, qs:[
                  {question_text:'How satisfied are you with your work environment?',question_type:'rating',is_required:true},
                  {question_text:'How manageable is your current workload?',question_type:'scale',is_required:true,description:'1 = Overwhelmed, 10 = Very manageable'},
                  {question_text:'Do you feel your contributions are recognised?',question_type:'yes_no',is_required:true},
                  {question_text:'What would most improve your day-to-day experience?',question_type:'long_text',is_required:false},
                ]},
                { name:'Event Feedback', category:'Events', desc:'Collect structured feedback right after an event or workshop.', time:'2 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, qs:[
                  {question_text:'How would you rate this event overall?',question_type:'rating',is_required:true},
                  {question_text:'How well did the event meet your expectations?',question_type:'scale',is_required:true,description:'1 = Far below, 10 = Far exceeded'},
                  {question_text:'What was the highlight of the event?',question_type:'short_text',is_required:false},
                  {question_text:'What could be improved for next time?',question_type:'long_text',is_required:false},
                ]},
                { name:'Market Research', category:'Research', desc:'Understand your audience segments and buying intent.', time:'5 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M7 20V12M11 20V8M15 20V14M19 20V4"/></svg>, qs:[
                  {question_text:'Which of the following best describes your role?',question_type:'single_choice',is_required:true,options:[{label:'Individual Contributor',value:'ic'},{label:'Manager',value:'manager'},{label:'Director or above',value:'director'},{label:'Founder/Owner',value:'founder'}]},
                  {question_text:'What is your primary challenge in your work today?',question_type:'long_text',is_required:true},
                  {question_text:'Which tools do you currently use?',question_type:'multiple_choice',is_required:false,options:[{label:'Spreadsheets',value:'spreadsheets'},{label:'Survey tools',value:'survey'},{label:'CRM',value:'crm'},{label:'BI tools',value:'bi'}]},
                  {question_text:'How important is this problem for your team?',question_type:'scale',is_required:true,description:'1 = Nice to solve, 10 = Critical'},
                ]},
                { name:'Patient Satisfaction', category:'Healthcare', desc:'Measure patient experience and care quality standards.', time:'4 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, qs:[
                  {question_text:'How would you rate your overall care experience?',question_type:'rating',is_required:true},
                  {question_text:'How clearly did our staff explain your treatment?',question_type:'scale',is_required:true,description:'1 = Not at all clear, 10 = Completely clear'},
                  {question_text:'Did you feel listened to and respected?',question_type:'yes_no',is_required:true},
                  {question_text:'What would improve your experience?',question_type:'long_text',is_required:false},
                ]},
                { name:'Student Course Eval', category:'Education', desc:'Evaluate course quality, instructor effectiveness, and learning outcomes.', time:'5 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, qs:[
                  {question_text:'How would you rate this course overall?',question_type:'rating',is_required:true},
                  {question_text:'How effective was the instructor at explaining concepts?',question_type:'scale',is_required:true,description:'1 = Not effective, 10 = Extremely effective'},
                  {question_text:'Was the course material relevant to your learning goals?',question_type:'yes_no',is_required:true},
                  {question_text:'What would you change about this course?',question_type:'long_text',is_required:false},
                ]},
                { name:'SaaS Onboarding', category:'Product', desc:'Understand friction in your onboarding flow and time-to-value.', time:'3 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, qs:[
                  {question_text:'How easy was it to get started with our product?',question_type:'scale',is_required:true,description:'1 = Very difficult, 10 = Effortless'},
                  {question_text:'Did you feel ready to use the product after onboarding?',question_type:'yes_no',is_required:true},
                  {question_text:'What resources would have helped you most?',question_type:'long_text',is_required:false},
                ]},
                { name:'Restaurant & Dining', category:'Hospitality', desc:'Capture diner experience across food, service, and ambiance.', time:'2 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>, qs:[
                  {question_text:'How would you rate the food quality?',question_type:'rating',is_required:true},
                  {question_text:'How was the service?',question_type:'rating',is_required:true},
                  {question_text:'Would you return and recommend us?',question_type:'yes_no',is_required:true},
                  {question_text:'Any comments or suggestions?',question_type:'long_text',is_required:false},
                ]},
                { name:'Website UX Audit', category:'Digital', desc:'Measure usability, clarity, and navigation satisfaction on your website.', time:'3 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, qs:[
                  {question_text:'How easy was it to find what you were looking for?',question_type:'scale',is_required:true,description:'1 = Very difficult, 10 = Effortless'},
                  {question_text:'Did you encounter any issues or confusing sections?',question_type:'yes_no',is_required:true},
                  {question_text:'What would make your experience better?',question_type:'long_text',is_required:false},
                ]},
                { name:'Brand Perception', category:'Marketing', desc:'Measure brand awareness, associations, and competitive positioning.', time:'4 min', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, qs:[
                  {question_text:'How familiar are you with our brand?',question_type:'scale',is_required:true,description:'1 = Never heard of you, 10 = Know you very well'},
                  {question_text:'How does our brand compare to competitors?',question_type:'single_choice',is_required:false,options:[{label:'Much better',value:'much_better'},{label:'Slightly better',value:'slightly_better'},{label:'About the same',value:'same'},{label:'Slightly worse',value:'slightly_worse'},{label:'Not sure',value:'unsure'}]},
                  {question_text:'What would make you choose us over others?',question_type:'long_text',is_required:false},
                ]},
              ];

  const galleryCats = ['All', ...Array.from(new Set(GALLERY_TEMPLATES.map(t => t.category)))];
  const filteredGallery = catFilter === 'All' ? GALLERY_TEMPLATES : GALLERY_TEMPLATES.filter(t => t.category === catFilter);
  const customCats = Array.from(new Set(customTemplates.map(t => t.category)));

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
          <div style={{ background:'var(--warm-white)',borderRadius:24,width:'100%',maxWidth:900,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(22,15,8,0.25)' }}>

            {/* Modal header */}
            <div style={{ padding:'28px 32px 0',flexShrink:0 }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 }}>
                <div>
                  <h2 style={{ fontFamily:'Playfair Display,serif',fontWeight:900,fontSize:26,letterSpacing:'-0.5px',margin:0,color:'var(--espresso)' }}>Templates</h2>
                  <p style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:13,color:'rgba(22,15,8,0.4)',marginTop:4,marginBottom:0 }}>Start fast with a curated template, or build and save your own.</p>
                </div>
                <button onClick={()=>setShowTemplates(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:'rgba(22,15,8,0.3)',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,transition:'all 0.15s',flexShrink:0 }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(22,15,8,0.06)';e.currentTarget.style.color='var(--espresso)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='rgba(22,15,8,0.3)';}}>✕</button>
              </div>

              {/* Tab bar: Gallery / My Templates */}
              <div style={{ display:'flex',gap:0,borderBottom:'1.5px solid rgba(22,15,8,0.07)',marginBottom:0 }}>
                {[['gallery','Gallery'],['mine',`My Templates${customTemplates.length ? ` (${customTemplates.length})` : ''}`]].map(([id,label])=>(
                  <button key={id} onClick={()=>setTmplTab(id)} style={{ fontFamily:'Syne,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',padding:'10px 20px',border:'none',background:'none',cursor:'pointer',color:tmplTab===id?'var(--espresso)':'rgba(22,15,8,0.35)',borderBottom:tmplTab===id?'2px solid var(--coral)':'2px solid transparent',transition:'all 0.2s',marginBottom:'-1.5px' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex:1,overflowY:'auto',padding:'24px 32px 32px' }}>

              {/* ── GALLERY TAB ── */}
              {tmplTab==='gallery' && (<>
                {/* Category filter chips */}
                <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:20 }}>
                  {galleryCats.map(c=>(
                    <button key={c} onClick={()=>setCatFilter(c)} style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'6px 14px',borderRadius:999,border:'none',background:catFilter===c?'var(--espresso)':'var(--cream-deep)',color:catFilter===c?'var(--cream)':'rgba(22,15,8,0.4)',cursor:'pointer',transition:'all 0.15s' }}>
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:14 }}>
                  {filteredGallery.map(t=>(
                    <div key={t.name} style={{ background:'var(--cream)',borderRadius:16,padding:20,border:'1.5px solid rgba(22,15,8,0.07)',cursor:'pointer',transition:'all 0.2s',display:'flex',flexDirection:'column',gap:10 }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.boxShadow='0 12px 40px rgba(255,69,0,0.1)';e.currentTarget.style.transform='translateY(-2px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(22,15,8,0.07)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}
                      onClick={()=>loadTemplate(t)}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                        <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,69,0,0.08)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--coral)' }}>{t.icon}</div>
                        <span style={{ fontFamily:'Syne,sans-serif',fontSize:8,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(22,15,8,0.3)',background:'var(--cream-deep)',padding:'3px 8px',borderRadius:999 }}>{t.category}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:15,color:'var(--espresso)',marginBottom:4 }}>{t.name}</div>
                        <div style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:12,color:'rgba(22,15,8,0.5)',lineHeight:1.5 }}>{t.desc}</div>
                      </div>
                      <div style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(22,15,8,0.3)',display:'flex',alignItems:'center',gap:8 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ~{t.time} · {t.qs.length} questions
                      </div>
                    </div>
                  ))}
                </div>
              </>)}

              {/* ── MY TEMPLATES TAB ── */}
              {tmplTab==='mine' && (<>
                {/* Save current survey as template */}
                <div style={{ background:'rgba(255,69,0,0.04)',border:'1.5px solid rgba(255,69,0,0.12)',borderRadius:16,padding:'18px 22px',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:15,color:'var(--espresso)',marginBottom:3 }}>Save current survey as template</div>
                    <div style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:12,color:'rgba(22,15,8,0.45)' }}>Capture your {qs.length} question{qs.length!==1?'s':''} as a reusable template in any category.</div>
                  </div>
                  <button onClick={()=>setShowCreateTmpl(true)} style={{ flexShrink:0,display:'inline-flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:999,border:'none',background:'var(--espresso)',color:'var(--cream)',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',transition:'background 0.2s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--coral)'}
                    onMouseLeave={e=>e.currentTarget.style.background='var(--espresso)'}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Save as template
                  </button>
                </div>

                {/* Create template inline form */}
                {showCreateTmpl && (
                  <div style={{ background:'var(--cream)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:18,padding:'24px 24px 20px',marginBottom:24 }}>
                    <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:17,color:'var(--espresso)',marginBottom:18,letterSpacing:'-0.3px' }}>New template</div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
                      <div>
                        <label style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.38)',display:'block',marginBottom:8 }}>Template name *</label>
                        <input value={tmplName} onChange={e=>setTmplName(e.target.value)} placeholder="e.g. Quarterly Retro" style={{ width:'100%',boxSizing:'border-box',padding:'12px 16px',background:'var(--warm-white)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:12,fontFamily:'Fraunces,serif',fontSize:14,color:'var(--espresso)',outline:'none' }}
                          onFocus={e=>e.target.style.borderColor='var(--coral)'}
                          onBlur={e=>e.target.style.borderColor='rgba(22,15,8,0.1)'} />
                      </div>
                      <div>
                        <label style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.38)',display:'block',marginBottom:8 }}>Category</label>
                        {customCats.length > 0 ? (
                          <select value={tmplCat} onChange={e=>setTmplCat(e.target.value)} style={{ width:'100%',padding:'12px 16px',background:'var(--warm-white)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:12,fontFamily:'Fraunces,serif',fontSize:14,color:'var(--espresso)',outline:'none',appearance:'none' }}
                            onFocus={e=>e.target.style.borderColor='var(--coral)'}
                            onBlur={e=>e.target.style.borderColor='rgba(22,15,8,0.1)'}>
                            <option value="">Pick or type below…</option>
                            {customCats.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input value={tmplCat} onChange={e=>setTmplCat(e.target.value)} placeholder="e.g. Internal, Clients…" style={{ width:'100%',boxSizing:'border-box',padding:'12px 16px',background:'var(--warm-white)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:12,fontFamily:'Fraunces,serif',fontSize:14,color:'var(--espresso)',outline:'none' }}
                            onFocus={e=>e.target.style.borderColor='var(--coral)'}
                            onBlur={e=>e.target.style.borderColor='rgba(22,15,8,0.1)'} />
                        )}
                      </div>
                    </div>
                    {customCats.length > 0 && (
                      <div style={{ marginBottom:16 }}>
                        <label style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.38)',display:'block',marginBottom:8 }}>Or create new category</label>
                        <input value={tmplNewCat} onChange={e=>setTmplNewCat(e.target.value)} placeholder="New category name…" style={{ width:'100%',boxSizing:'border-box',padding:'12px 16px',background:'var(--warm-white)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:12,fontFamily:'Fraunces,serif',fontSize:14,color:'var(--espresso)',outline:'none' }}
                          onFocus={e=>e.target.style.borderColor='var(--coral)'}
                          onBlur={e=>e.target.style.borderColor='rgba(22,15,8,0.1)'} />
                      </div>
                    )}
                    <div style={{ marginBottom:20 }}>
                      <label style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.38)',display:'block',marginBottom:8 }}>Description (optional)</label>
                      <input value={tmplDesc} onChange={e=>setTmplDesc(e.target.value)} placeholder="What is this template for?" style={{ width:'100%',boxSizing:'border-box',padding:'12px 16px',background:'var(--warm-white)',border:'1.5px solid rgba(22,15,8,0.1)',borderRadius:12,fontFamily:'Fraunces,serif',fontSize:14,color:'var(--espresso)',outline:'none' }}
                        onFocus={e=>e.target.style.borderColor='var(--coral)'}
                        onBlur={e=>e.target.style.borderColor='rgba(22,15,8,0.1)'} />
                    </div>
                    <div style={{ display:'flex',gap:10 }}>
                      <button onClick={()=>setShowCreateTmpl(false)} style={{ flex:1,padding:'11px 0',borderRadius:999,border:'1px solid rgba(22,15,8,0.1)',background:'transparent',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(22,15,8,0.45)',cursor:'pointer' }}>Cancel</button>
                      <button onClick={saveAsTemplate} style={{ flex:2,padding:'11px 0',borderRadius:999,border:'none',background:'var(--espresso)',color:'var(--cream)',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',transition:'background 0.2s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--coral)'}
                        onMouseLeave={e=>e.currentTarget.style.background='var(--espresso)'}>
                        Save template
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom templates list */}
                {customTemplates.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'48px 0',color:'rgba(22,15,8,0.3)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:12,opacity:0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    <div style={{ fontFamily:'Syne,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:6 }}>No custom templates yet</div>
                    <div style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:13 }}>Build a survey and save it as a reusable template above.</div>
                  </div>
                ) : (
                  <>
                    {/* Group by category */}
                    {(customCats.length > 0 ? customCats : ['']).map(cat => {
                      const catItems = customTemplates.filter(t => t.category === cat || (!cat && !t.category));
                      if (!catItems.length) return null;
                      return (
                        <div key={cat} style={{ marginBottom:24 }}>
                          {cat && <div style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.35)',marginBottom:12 }}>{cat}</div>}
                          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12 }}>
                            {catItems.map(t=>(
                              <div key={t.id} style={{ background:'var(--cream)',borderRadius:16,padding:18,border:'1.5px solid rgba(22,15,8,0.07)',cursor:'pointer',transition:'all 0.2s',display:'flex',flexDirection:'column',gap:8,position:'relative' }}
                                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.boxShadow='0 8px 32px rgba(255,69,0,0.1)';e.currentTarget.style.transform='translateY(-1px)';}}
                                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(22,15,8,0.07)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}>
                                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8 }}>
                                  <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:15,color:'var(--espresso)',flex:1 }}>{t.name}</div>
                                  <button onClick={e=>{e.stopPropagation();deleteCustomTemplate(t.id);}} title="Delete template" style={{ flexShrink:0,background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.2)',fontSize:14,padding:'2px 4px',lineHeight:1,borderRadius:6,transition:'all 0.15s' }}
                                    onMouseEnter={e=>{e.currentTarget.style.color='var(--terracotta)';e.currentTarget.style.background='rgba(214,59,31,0.07)';}}
                                    onMouseLeave={e=>{e.currentTarget.style.color='rgba(22,15,8,0.2)';e.currentTarget.style.background='none';}}>✕</button>
                                </div>
                                {t.desc && <div style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:12,color:'rgba(22,15,8,0.45)',lineHeight:1.5 }}>{t.desc}</div>}
                                <div style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(22,15,8,0.3)' }}>
                                  {t.qs.length} questions · {t.time}
                                </div>
                                <button onClick={()=>loadTemplate(t)} style={{ marginTop:4,width:'100%',padding:'9px 0',borderRadius:999,border:'1.5px solid rgba(22,15,8,0.1)',background:'transparent',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(22,15,8,0.45)',cursor:'pointer',transition:'all 0.2s' }}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.color='var(--coral)';e.currentTarget.style.background='rgba(255,69,0,0.04)';}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(22,15,8,0.1)';e.currentTarget.style.color='rgba(22,15,8,0.45)';e.currentTarget.style.background='transparent';}}>
                                  Use template →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>)}
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
