import React, { useState, useEffect } from 'react';
import ShareModal from '../components/ShareModal';
import AISurveySuggestions from '../components/AISurveySuggestions';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, hasPermission, SURVEY_STATUS, formatDate, isExpired } from '../lib/constants';
import toast from 'react-hot-toast';
import { useLoading } from '../context/LoadingContext';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineSave, HiOutlineX, HiOutlineLink, HiOutlineChartBar, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh, HiOutlineShare } from 'react-icons/hi';
import { Reorder } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';
import HelpTip from '../components/HelpTip';
const hasO=t=>['single_choice','multiple_choice','dropdown','ranking'].includes(t);
const isMx=t=>t==='matrix';
const inp="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-dark text-sm placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors";

export default function SurveyEdit(){
  const{id}=useParams();const{profile}=useAuthStore();const nav=useNavigate();
  const{stopLoading}=useLoading();
  const[busy,setBusy]=useState(false);const[sv,setSv]=useState(null);const[qs,sQs]=useState([]);const[tab,setTab]=useState('details');
  const[shareOpen,setShareOpen]=useState(false);const[pubShareOpen,setPubShareOpen]=useState(false);const[shares,setShares]=useState([]);const[users,setUsers]=useState([]);
  const [extendOpen, setExtendOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(()=>{if(profile?.id)load();else stopLoading();},[id,profile?.id]);
  async function load(){try{const{data:s,error}=await supabase.from('surveys').select('*').eq('id',id).single();if(error)throw error;setSv({...s,expires_at:s.expires_at?new Date(s.expires_at).toISOString().slice(0,16):''});const{data:q}=await supabase.from('survey_questions').select('*').eq('survey_id',id).order('sort_order');sQs((q||[]).map(x=>({...x,_id:x.id})));const{data:sh}=await supabase.from('survey_shares').select('*,user:user_profiles!shared_with(full_name,email)').eq('survey_id',id);setShares(sh||[]);const{data:u}=await supabase.from('user_profiles').select('id,full_name,email,role');setUsers(u||[]);}catch(e){console.error(e);toast.error('Failed');nav('/surveys');}finally{stopLoading();}}
  const s=(k,v)=>{setSv(p=>({...p,[k]:v}));setDirty(true);};const sQ=(tid,k,v)=>sQs(a=>a.map(q=>q._id===tid?{...q,[k]:v}:q));
  const addQ=()=>sQs(a=>[...a,{_id:'new_'+Math.random().toString(36).slice(2),question_text:'',question_type:'short_text',options:[],is_required:false,description:''}]);
  const delQ=async tid=>{if(qs.length<=1)return toast.error('Need ≥1');if(!tid.startsWith('new_'))await supabase.from('survey_questions').delete().eq('id',tid);sQs(a=>a.filter(q=>q._id!==tid));};
  const moveQ=(tid,d)=>sQs(a=>{const i=a.findIndex(q=>q._id===tid);if((d===-1&&i===0)||(d===1&&i===a.length-1))return a;const b=[...a];[b[i],b[i+d]]=[b[i+d],b[i]];return b;});
  const addOpt=tid=>sQs(a=>a.map(q=>q._id===tid?{...q,options:[...(q.options||[]),{label:'',value:''}]}:q));
  const sOpt=(tid,i,v)=>sQs(a=>a.map(q=>{if(q._id!==tid)return q;const o=[...(q.options||[])];o[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')};return{...q,options:o};}));
  const delOpt=(tid,i)=>sQs(a=>a.map(q=>q._id!==tid?q:{...q,options:q.options.filter((_,j)=>j!==i)}));
  async function save(){if(!sv.title.trim())return toast.error('Title required');setBusy(true);try{const{data,error}=await supabase.from('surveys').update({title:sv.title,description:sv.description||null,welcome_message:sv.welcome_message||null,thank_you_message:sv.thank_you_message||null,expires_at:sv.expires_at||null,allow_anonymous:sv.allow_anonymous,require_email:sv.require_email,show_progress_bar:sv.show_progress_bar,theme_color:sv.theme_color}).eq('id',id).select().single();if(error)throw error;if(!data)throw new Error('Update failed');for(let i=0;i<qs.length;i++){const q=qs[i];const d={survey_id:id,question_text:q.question_text,question_type:q.question_type,options:hasO(q.question_type)?q.options:isMx(q.question_type)?(q.options||{rows:[],columns:[]}):null,is_required:q.is_required,description:q.description||null,sort_order:i};if(q._id.startsWith('new_')){const{error:e}=await supabase.from('survey_questions').insert(d);if(e)throw e;}else{const{error:e}=await supabase.from('survey_questions').update(d).eq('id',q._id);if(e)throw e;}}toast.success('Saved!');setDirty(false);await load();}catch(e){console.error(e);toast.error(e.message||'Failed');}finally{setBusy(false);}}
  async function chg(st){
    if(st==='active'&&isExpired(sv.expires_at)){setExtendOpen(true);return;}
    await supabase.from('surveys').update({status:st}).eq('id',id);
    toast.success('Updated');load();
  }
  async function doExtend(days){
    const x=new Date();x.setDate(x.getDate()+parseInt(days||7));
    await supabase.from('surveys').update({status:'active',expires_at:x.toISOString()}).eq('id',id);
    toast.success('Reactivated');load();
  }
  async function share(uid){await supabase.from('survey_shares').upsert({survey_id:id,shared_with:uid,shared_by:profile.id,permission:'view_analytics'});toast.success('Shared');load();}
  function copyLink(){navigator.clipboard.writeText(`${window.location.origin}/s/${sv.slug}`);toast.success('Copied!');}
  if(!sv)return<div style={{ textAlign:'center',padding:'80px 0',fontFamily:'Fraunces,serif',color:'rgba(22,15,8,0.35)' }}>Survey not found</div>;
  // Health score (client-side)
  function calcHealth(){
    let score=100;
    if(!sv.welcome_message) score-=5;
    if(!sv.expires_at) score-=5;
    if(qs.length>15) score-=20;
    if(qs.filter(q=>q.is_required).length>3) score-=10;
    if(qs.every(q=>q.question_type==='short_text')) score-=15;
    return Math.max(0,Math.min(100,score));
  }
  const health=calcHealth();
  const healthColor=health>=80?'var(--sage)':health>=50?'var(--saffron)':'var(--terracotta)';
  const tabs=[{id:'details',l:'Details'},{id:'questions',l:`Questions (${qs.length})`},{id:'settings',l:'Settings'}];
  const eSty = {
    lbl: { fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(22,15,8,0.4)',display:'block',marginBottom:10 },
    inp: { width:'100%',boxSizing:'border-box',padding:'14px 18px',background:'var(--cream)',border:'1px solid rgba(22,15,8,0.1)',borderRadius:14,fontFamily:'Fraunces,serif',fontSize:15,color:'var(--espresso)',outline:'none',transition:'border-color 0.2s',resize:'vertical' },
    fi: e => e.target.style.borderColor = 'var(--coral)',
    fo: e => e.target.style.borderColor = 'rgba(22,15,8,0.1)',
  };
  return(<div className="max-w-3xl mx-auto">
    {/* ── Extend expiry modal ── */}
    <ConfirmModal
      open={extendOpen} onClose={()=>setExtendOpen(false)}
      title="Reactivate survey"
      body="This survey has expired. Enter how many days to extend the expiry."
      confirmLabel="Reactivate"
      prompt={{label:'Extend by (days)',defaultValue:'7',type:'number',min:1,max:365}}
      onConfirm={doExtend}
    />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 40, flexWrap: 'nowrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 28, letterSpacing: '-1px', color: 'var(--espresso)', margin: 0, lineHeight: 1.1 }}>{sv.title}</h1>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: (sv.status === 'active' && isExpired(sv.expires_at)) ? 'rgba(214,59,31,0.1)' : sv.status === 'active' ? 'rgba(30,122,74,0.12)' : sv.status === 'paused' ? 'rgba(255,184,0,0.15)' : 'rgba(22,15,8,0.08)', color: (sv.status === 'active' && isExpired(sv.expires_at)) ? 'var(--terracotta)' : sv.status === 'active' ? 'var(--sage)' : sv.status === 'paused' ? '#A07000' : 'rgba(22,15,8,0.45)', flexShrink: 0 }}>{(sv.status === 'active' && isExpired(sv.expires_at)) ? 'Expired' : SURVEY_STATUS[sv.status]?.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 12, color: 'rgba(22,15,8,0.35)' }}>
          {sv.expires_at && <span style={{ color: isExpired(sv.expires_at) ? 'var(--terracotta)' : 'inherit' }}>{isExpired(sv.expires_at) ? 'Expired' : `Exp ${formatDate(sv.expires_at)}`}</span>}
          <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Fraunces, serif', fontSize: 12, color: 'rgba(22,15,8,0.35)', padding: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.35)'}>
            ⎘ Copy link
          </button>
        </div>
      </div>

      {/* Action buttons — all on one line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'nowrap' }}>
        {/* Health score pill */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginRight:4}}>
          <div style={{width:80,height:5,background:'rgba(22,15,8,0.08)',borderRadius:10,overflow:'hidden'}}>
            <div className="health-bar-fill" style={{height:'100%',width:`${health}%`,background:healthColor,borderRadius:10}}/>
          </div>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:healthColor}}>{health}%</span>
          <HelpTip text="Survey health score. Improve it by adding a welcome message, setting an expiry, using varied question types, and keeping surveys under 15 questions." position="bottom"/>
        </div>
        {dirty&&<span style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--saffron)',marginRight:4}}>● Unsaved</span>}
        {sv.status !== 'active' && <button onClick={() => chg('active')} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: 'rgba(30,122,74,0.12)', color: 'var(--sage)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,122,74,0.12)'; e.currentTarget.style.color = 'var(--sage)'; }}>▶ Activate</button>}
        {sv.status === 'active' && <button onClick={() => chg('paused')} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: 'rgba(255,184,0,0.12)', color: '#A07000', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--saffron)'; e.currentTarget.style.color = 'var(--espresso)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,184,0,0.12)'; e.currentTarget.style.color = '#A07000'; }}>⏸ Pause</button>}
        {['expired','closed'].includes(sv.status) && hasPermission(profile?.role,'resume_survey') && <button onClick={() => chg('active')} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: 'rgba(30,122,74,0.12)', color: 'var(--sage)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>↺ Resume</button>}
        <Link to={`/surveys/${id}/analytics`} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(22,15,8,0.1)', background: 'transparent', color: 'rgba(22,15,8,0.5)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--espresso)'; e.currentTarget.style.color = 'var(--espresso)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.1)'; e.currentTarget.style.color = 'rgba(22,15,8,0.5)'; }}>Analytics</Link>
        <button onClick={() => setPubShareOpen(true)} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid rgba(22,15,8,0.1)', background: 'transparent', color: 'rgba(22,15,8,0.5)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--espresso)'; e.currentTarget.style.color = 'var(--espresso)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.1)'; e.currentTarget.style.color = 'rgba(22,15,8,0.5)'; }}>🔗 Share</button>
        <ShareModal survey={sv} isOpen={pubShareOpen} onClose={() => setPubShareOpen(false)} />
        <button onClick={save} disabled={busy} style={{ padding: '9px 20px', borderRadius: 999, border: 'none', background: 'var(--espresso)', color: 'var(--cream)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.25s', opacity: busy ? 0.45 : 1 }} onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--coral)'; }} onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--espresso)'; }}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
    {/* Tabs */}
    <div style={{ display: 'flex', gap: 4, padding: 6, background: 'var(--cream-deep)', borderRadius: 999, marginBottom: 32 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{ flex: 1, padding: '10px 0', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'all 0.2s', background: tab === t.id ? 'var(--espresso)' : 'transparent', color: tab === t.id ? 'var(--cream)' : 'rgba(22,15,8,0.4)' }}>
          {t.l}
        </button>
      ))}
    </div>

    {/* Details tab */}
    {tab === 'details' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[
          { key: 'title',             lbl: 'Title *',          type: 'input',    large: true },
          { key: 'description',       lbl: 'Description',      type: 'textarea', rows: 2 },
          { key: 'welcome_message',   lbl: 'Welcome message',  type: 'textarea', rows: 2 },
          { key: 'thank_you_message', lbl: 'Thank you message',type: 'textarea', rows: 2 },
        ].map(fi => (
          <div key={fi.key}>
            <label style={eSty.lbl}>{fi.lbl}</label>
            {fi.type === 'textarea'
              ? <textarea value={sv[fi.key] || ''} onChange={e => s(fi.key, e.target.value)} rows={fi.rows} style={eSty.inp} onFocus={eSty.fi} onBlur={eSty.fo} />
              : <input value={sv[fi.key] || ''} onChange={e => s(fi.key, e.target.value)} style={{ ...eSty.inp, fontSize: fi.large ? 18 : 15, fontWeight: fi.large ? 500 : 400 }} onFocus={eSty.fi} onBlur={eSty.fo} />}
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={eSty.lbl}>Expires</label>
            <input type="datetime-local" value={sv.expires_at} onChange={e => s('expires_at', e.target.value)} style={eSty.inp} onFocus={eSty.fi} onBlur={eSty.fo} />
          </div>
          <div>
            <label style={eSty.lbl}>Theme colour</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={sv.theme_color || '#FF4500'} onChange={e => s('theme_color', e.target.value)} style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(22,15,8,0.1)', cursor: 'pointer', padding: 2 }} />
              <input value={sv.theme_color || ''} onChange={e => s('theme_color', e.target.value)} style={{ ...eSty.inp, flex: 1 }} onFocus={eSty.fi} onBlur={eSty.fo} />
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Questions tab */}
    {tab === 'questions' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Reorder.Group axis="y" values={qs} onReorder={sQs} style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:16}}>
        {qs.map((q, i) => (
          <Reorder.Item key={q._id} value={q} style={{ background: 'var(--warm-white)', borderRadius: 20, border: '1px solid rgba(22,15,8,0.08)', padding: 24, listStyle:'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', background: 'var(--cream-deep)', padding: '4px 10px', borderRadius: 999 }}>Q{i + 1}</span>
                <span className="drag-handle" title="Drag to reorder" style={{color:'rgba(22,15,8,0.2)',fontSize:16,userSelect:'none'}}>⠿</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[[-1,'↑'],[1,'↓']].map(([d, sym]) => (
                  <button key={d} onClick={() => moveQ(q._id, d)} disabled={(d===-1&&i===0)||(d===1&&i===qs.length-1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: ((d===-1&&i===0)||(d===1&&i===qs.length-1)) ? 0.2 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-deep)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>{sym}</button>
                ))}
                <button onClick={() => delQ(q._id)}
                  style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.25)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,59,31,0.08)'; e.currentTarget.style.color = 'var(--terracotta)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(22,15,8,0.25)'; }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={q.question_text} onChange={e => sQ(q._id, 'question_text', e.target.value)} placeholder="Ask your question…" style={{ ...eSty.inp, fontSize: 16 }} onFocus={eSty.fi} onBlur={eSty.fo} />
              <input value={q.description || ''} onChange={e => sQ(q._id, 'description', e.target.value)} placeholder="Helper text (optional)" style={{ ...eSty.inp, fontSize: 13, color: 'rgba(22,15,8,0.5)' }} onFocus={eSty.fi} onBlur={eSty.fo} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select value={q.question_type} onChange={e => sQ(q._id, 'question_type', e.target.value)} style={{ ...eSty.inp, flex: 1 }} onFocus={eSty.fi} onBlur={eSty.fo}>
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <input type="checkbox" checked={q.is_required} onChange={e => sQ(q._id, 'is_required', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--coral)', cursor: 'pointer' }} />
                  Required
                </label>
              </div>
              {hasO(q.question_type) && (
                <div style={{ marginTop: 4, paddingLeft: 16, borderLeft: '2px solid rgba(255,69,0,0.2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(q.options || []).map((o, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(22,15,8,0.15)', flexShrink: 0 }} />
                      <input value={o.label} onChange={e => sOpt(q._id, j, e.target.value)} placeholder={`Option ${j + 1}`} style={{ ...eSty.inp, flex: 1, padding: '10px 14px', fontSize: 14 }} onFocus={eSty.fi} onBlur={eSty.fo} />
                      <button onClick={() => delOpt(q._id, j)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(22,15,8,0.2)', fontSize: 14, padding: 4, transition: 'color 0.15s', lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--terracotta)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.2)'}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addOpt(q._id)} style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'left' }}>+ Add option</button>
                </div>
              )}
              {isMx(q.question_type) && (() => {
                const raw = q.options;
                const mx = raw && !Array.isArray(raw) && typeof raw === 'object' ? raw : { rows: [], columns: [] };
                const setMx = (next) => sQ(q._id, 'options', next);
                const addRow = () => setMx({...mx, rows:[...(mx.rows||[]),{label:`Row ${(mx.rows||[]).length+1}`,value:`row_${(mx.rows||[]).length+1}`}]});
                const addCol = () => setMx({...mx, columns:[...(mx.columns||[]),{label:`Col ${(mx.columns||[]).length+1}`,value:`col_${(mx.columns||[]).length+1}`}]});
                const updRow = (i,v) => { const r=[...(mx.rows||[])]; r[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')}; setMx({...mx,rows:r}); };
                const updCol = (i,v) => { const cs=[...(mx.columns||[])]; cs[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')}; setMx({...mx,columns:cs}); };
                const delRow = (i) => setMx({...mx, rows:(mx.rows||[]).filter((_,j)=>j!==i)});
                const delCol = (i) => setMx({...mx, columns:(mx.columns||[]).filter((_,j)=>j!==i)});
                return (
                  <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <div style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(22,15,8,0.4)',marginBottom:8}}>Rows</div>
                      {(mx.rows||[]).map((r,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                          <input value={r.label} onChange={e=>updRow(i,e.target.value)} placeholder={`Row ${i+1}`} style={{...eSty.inp,flex:1,padding:'8px 12px',fontSize:13}} onFocus={eSty.fi} onBlur={eSty.fo}/>
                          <button onClick={()=>delRow(i)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.2)',fontSize:12,padding:'0 4px'}}>✕</button>
                        </div>
                      ))}
                      <button onClick={addRow} style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--coral)',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Add row</button>
                    </div>
                    <div>
                      <div style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(22,15,8,0.4)',marginBottom:8}}>Columns</div>
                      {(mx.columns||[]).map((col,i)=>(
                        <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                          <input value={col.label} onChange={e=>updCol(i,e.target.value)} placeholder={`Col ${i+1}`} style={{...eSty.inp,flex:1,padding:'8px 12px',fontSize:13}} onFocus={eSty.fi} onBlur={eSty.fo}/>
                          <button onClick={()=>delCol(i)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.2)',fontSize:12,padding:'0 4px'}}>✕</button>
                        </div>
                      ))}
                      <button onClick={addCol} style={{fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--coral)',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Add column</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Reorder.Item>
        ))}
        </Reorder.Group>
        <button onClick={addQ}
          style={{ width: '100%', padding: '18px 0', border: '2px dashed rgba(22,15,8,0.12)', borderRadius: 20, background: 'transparent', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.color = 'var(--coral)'; e.currentTarget.style.background = 'rgba(255,69,0,0.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(22,15,8,0.12)'; e.currentTarget.style.color = 'rgba(22,15,8,0.3)'; e.currentTarget.style.background = 'transparent'; }}>
          + Add Question
        </button>
        {/* ── AI question suggestions ── */}
        <AISurveySuggestions
          survey={sv}
          questions={qs}
          tc={sv?.theme_color || '#FF4500'}
          onAdd={q => sQs(a => [...a, { _id:'new_'+Math.random().toString(36).slice(2), question_text:q.question_text, question_type:q.question_type, options:q.options||[], is_required:false, description:q.description||'' }])}
        />
      </div>
    )}

    {/* Settings tab */}
    {tab === 'settings' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { k: 'allow_anonymous',   l: 'Anonymous responses',   d: "Respondents don't need to identify themselves" },
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
            <div onClick={() => s(x.k, !sv[x.k])}
              style={{ width: 44, height: 24, borderRadius: 999, background: sv[x.k] ? 'var(--coral)' : 'rgba(22,15,8,0.12)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: sv[x.k] ? 23 : 3, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(22,15,8,0.2)' }} />
            </div>
          </label>
        ))}
      </div>
    )}
    {shareOpen && (
      <div style={{ position:'fixed',inset:0,background:'rgba(22,15,8,0.3)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={() => setShareOpen(false)}>
        <div style={{ background:'var(--warm-white)',borderRadius:24,padding:36,width:'100%',maxWidth:400,boxShadow:'0 40px 100px rgba(22,15,8,0.2)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
            <h3 style={{ fontFamily:'Playfair Display,serif',fontWeight:900,fontSize:24,letterSpacing:'-1px',color:'var(--espresso)',margin:0 }}>Share analytics</h3>
            <button onClick={() => setShareOpen(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'rgba(22,15,8,0.3)',fontSize:18,lineHeight:1,transition:'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--espresso)'} onMouseLeave={e=>e.currentTarget.style.color='rgba(22,15,8,0.3)'}>✕</button>
          </div>
          <p style={{ fontFamily:'Fraunces,serif',fontWeight:300,fontSize:13,color:'rgba(22,15,8,0.4)',marginBottom:20 }}>Share read-only analytics access within your organisation.</p>
          <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:240,overflowY:'auto' }}>
            {users.filter(u => u.id !== profile.id).map(u => {
              const shared = shares.some(x => x.shared_with === u.id);
              return (
                <div key={u.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--cream)',borderRadius:14 }}>
                  <div>
                    <div style={{ fontFamily:'Playfair Display,serif',fontWeight:700,fontSize:14,color:'var(--espresso)' }}>{u.full_name || u.email}</div>
                    <div style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(22,15,8,0.35)',marginTop:2 }}>{u.role}</div>
                  </div>
                  {shared
                    ? <span style={{ fontFamily:'Syne,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--sage)' }}>Shared ✓</span>
                    : <button onClick={() => share(u.id)} style={{ fontFamily:'Syne,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--espresso)',background:'none',border:'none',cursor:'pointer',transition:'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--coral)'} onMouseLeave={e=>e.currentTarget.style.color='var(--espresso)'}>Share</button>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </div>);
}
