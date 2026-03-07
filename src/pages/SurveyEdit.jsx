import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, hasPermission, SURVEY_STATUS, formatDate, isExpired } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineSave, HiOutlineX, HiOutlineLink, HiOutlineChartBar, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh, HiOutlineShare } from 'react-icons/hi';

const hasOpts=t=>['single_choice','multiple_choice','dropdown'].includes(t);

export default function SurveyEdit() {
  const{id}=useParams();const{profile}=useAuthStore();const navigate=useNavigate();
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);
  const[survey,setSurvey]=useState(null);const[questions,setQuestions]=useState([]);
  const[tab,setTab]=useState('details');const[shareOpen,setShareOpen]=useState(false);
  const[shares,setShares]=useState([]);const[users,setUsers]=useState([]);

  useEffect(()=>{if(profile?.id)load();},[id,profile?.id]);

  async function load(){try{
    const{data:s,error}=await supabase.from('surveys').select('*').eq('id',id).single();
    if(error)throw error;setSurvey({...s,expires_at:s.expires_at?new Date(s.expires_at).toISOString().slice(0,16):''});
    const{data:qs}=await supabase.from('survey_questions').select('*').eq('survey_id',id).order('sort_order');
    setQuestions((qs||[]).map(q=>({...q,_id:q.id})));
    const{data:sh}=await supabase.from('survey_shares').select('*,user:user_profiles!shared_with(full_name,email)').eq('survey_id',id);setShares(sh||[]);
    const{data:u}=await supabase.from('user_profiles').select('id,full_name,email,role');setUsers(u||[]);
  }catch(e){console.error(e);toast.error('Failed to load');navigate('/surveys');}finally{setLoading(false);}}

  const set=(k,v)=>setSurvey(s=>({...s,[k]:v}));
  const sQ=(tid,k,v)=>setQuestions(qs=>qs.map(q=>q._id===tid?{...q,[k]:v}:q));
  const addQ=()=>setQuestions(qs=>[...qs,{_id:'new_'+Math.random().toString(36).slice(2),question_text:'',question_type:'short_text',options:[],is_required:false,description:''}]);
  const delQ=async tid=>{if(questions.length<=1)return toast.error('Need ≥1');if(!tid.startsWith('new_'))await supabase.from('survey_questions').delete().eq('id',tid);setQuestions(qs=>qs.filter(q=>q._id!==tid));};
  const moveQ=(tid,d)=>setQuestions(qs=>{const i=qs.findIndex(q=>q._id===tid);if((d===-1&&i===0)||(d===1&&i===qs.length-1))return qs;const a=[...qs];[a[i],a[i+d]]=[a[i+d],a[i]];return a;});
  const addOpt=tid=>setQuestions(qs=>qs.map(q=>q._id===tid?{...q,options:[...(q.options||[]),{label:'',value:''}]}:q));
  const sOpt=(tid,i,v)=>setQuestions(qs=>qs.map(q=>{if(q._id!==tid)return q;const o=[...(q.options||[])];o[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')};return{...q,options:o};}));
  const delOpt=(tid,i)=>setQuestions(qs=>qs.map(q=>q._id!==tid?q:{...q,options:q.options.filter((_,j)=>j!==i)}));

  async function handleSave(){
    if(!survey.title.trim())return toast.error('Title required');setSaving(true);
    try{
      const{data,error}=await supabase.from('surveys').update({title:survey.title,description:survey.description||null,welcome_message:survey.welcome_message||null,thank_you_message:survey.thank_you_message||null,expires_at:survey.expires_at||null,allow_anonymous:survey.allow_anonymous,require_email:survey.require_email,show_progress_bar:survey.show_progress_bar,theme_color:survey.theme_color}).eq('id',id).select().single();
      if(error)throw error;if(!data)throw new Error('Update failed');
      for(let i=0;i<questions.length;i++){const q=questions[i];const d={survey_id:id,question_text:q.question_text,question_type:q.question_type,options:hasOpts(q.question_type)?q.options:null,is_required:q.is_required,description:q.description||null,sort_order:i};
        if(q._id.startsWith('new_')){const{error:e}=await supabase.from('survey_questions').insert(d);if(e)throw e;}
        else{const{error:e}=await supabase.from('survey_questions').update(d).eq('id',q._id);if(e)throw e;}}
      toast.success('Saved!');await load();
    }catch(e){console.error(e);toast.error(e.message||'Failed');}finally{setSaving(false);}}

  async function setStatus(st){const u={status:st};if(st==='active'&&isExpired(survey.expires_at)){const d=prompt('Days:','7');if(!d)return;const x=new Date();x.setDate(x.getDate()+parseInt(d));u.expires_at=x.toISOString();}await supabase.from('surveys').update(u).eq('id',id);toast.success('Updated');load();}
  async function share(uid){await supabase.from('survey_shares').upsert({survey_id:id,shared_with:uid,shared_by:profile.id,permission:'view_analytics'});toast.success('Shared');load();}
  function copyLink(){navigator.clipboard.writeText(`${window.location.origin}/s/${survey.slug}`);toast.success('Link copied!');}

  if(loading)return<div className="text-center py-20 text-txt-secondary text-sm">Loading...</div>;
  if(!survey)return<div className="text-center py-20 text-txt-secondary text-sm">Not found</div>;

  const tabs=[{id:'details',l:'Details'},{id:'questions',l:`Questions (${questions.length})`},{id:'settings',l:'Settings'}];

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1"><h1 className="page-title">{survey.title}</h1><span className={SURVEY_STATUS[survey.status]?.class}>{SURVEY_STATUS[survey.status]?.label}</span></div>
          <div className="flex items-center gap-3 text-xs text-txt-tertiary">
            {survey.expires_at&&<span className={isExpired(survey.expires_at)?'text-danger':''}>{isExpired(survey.expires_at)?'Expired':`Exp ${formatDate(survey.expires_at)}`}</span>}
            <button onClick={copyLink} className="hover:text-brand flex items-center gap-1"><HiOutlineLink className="w-3 h-3"/>Copy link</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {survey.status!=='active'&&<button onClick={()=>setStatus('active')} className="btn-success text-xs"><HiOutlinePlay className="w-3.5 h-3.5"/>Activate</button>}
          {survey.status==='active'&&<button onClick={()=>setStatus('paused')} className="btn-secondary text-xs"><HiOutlinePause className="w-3.5 h-3.5"/>Pause</button>}
          {['expired','closed'].includes(survey.status)&&hasPermission(profile?.role,'resume_survey')&&<button onClick={()=>setStatus('active')} className="btn-success text-xs"><HiOutlineRefresh className="w-3.5 h-3.5"/>Resume</button>}
          <Link to={`/surveys/${id}/analytics`} className="btn-secondary text-xs"><HiOutlineChartBar className="w-3.5 h-3.5"/>Analytics</Link>
          <button onClick={()=>setShareOpen(true)} className="btn-secondary text-xs"><HiOutlineShare className="w-3.5 h-3.5"/>Share</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs"><HiOutlineSave className="w-3.5 h-3.5"/>{saving?'Saving...':'Save'}</button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-bg-alt rounded-btn mb-6">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 py-2 rounded-btn text-xs font-medium transition-colors ${tab===t.id?'bg-white text-txt shadow-btn':'text-txt-secondary'}`}>{t.l}</button>)}</div>

      {tab==='details'&&(<div className="space-y-4 animate-enter">
        <div><label className="input-label">Title *</label><input value={survey.title} onChange={e=>set('title',e.target.value)} className="input font-medium"/></div>
        <div><label className="input-label">Description</label><textarea value={survey.description||''} onChange={e=>set('description',e.target.value)} className="input" rows={2}/></div>
        <div><label className="input-label">Welcome Message</label><textarea value={survey.welcome_message||''} onChange={e=>set('welcome_message',e.target.value)} className="input" rows={2}/></div>
        <div><label className="input-label">Thank You Message</label><textarea value={survey.thank_you_message||''} onChange={e=>set('thank_you_message',e.target.value)} className="input" rows={2}/></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="input-label">Expires</label><input type="datetime-local" value={survey.expires_at} onChange={e=>set('expires_at',e.target.value)} className="input text-sm"/></div>
          <div><label className="input-label">Theme</label><div className="flex items-center gap-2"><input type="color" value={survey.theme_color||'#4F7BFF'} onChange={e=>set('theme_color',e.target.value)} className="w-9 h-9 rounded-btn border border-border cursor-pointer"/><input value={survey.theme_color||''} onChange={e=>set('theme_color',e.target.value)} className="input flex-1 font-mono text-sm"/></div></div>
        </div>
      </div>)}

      {tab==='questions'&&(<div className="space-y-3 animate-enter">
        {questions.map((q,idx)=>(<div key={q._id} className="card p-5">
          <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-txt-tertiary">{idx+1}.</span><div className="flex gap-0.5"><button onClick={()=>moveQ(q._id,-1)} disabled={idx===0} className="btn-ghost p-1"><HiOutlineArrowUp className="w-3.5 h-3.5"/></button><button onClick={()=>moveQ(q._id,1)} disabled={idx===questions.length-1} className="btn-ghost p-1"><HiOutlineArrowDown className="w-3.5 h-3.5"/></button><button onClick={()=>delQ(q._id)} className="btn-ghost p-1 text-danger"><HiOutlineTrash className="w-3.5 h-3.5"/></button></div></div>
          <input value={q.question_text} onChange={e=>sQ(q._id,'question_text',e.target.value)} className="input mb-2 font-medium" placeholder="Question..."/>
          <input value={q.description||''} onChange={e=>sQ(q._id,'description',e.target.value)} className="input mb-3 text-sm" placeholder="Helper text..."/>
          <div className="flex gap-3 items-center"><select value={q.question_type} onChange={e=>sQ(q._id,'question_type',e.target.value)} className="input flex-1 text-sm">{QUESTION_TYPES.map(t=><option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select><label className="flex items-center gap-2 text-xs text-txt-secondary cursor-pointer whitespace-nowrap"><input type="checkbox" checked={q.is_required} onChange={e=>sQ(q._id,'is_required',e.target.checked)} className="rounded border-border text-brand w-3.5 h-3.5"/>Required</label></div>
          {hasOpts(q.question_type)&&(<div className="mt-3 pl-3 border-l-2 border-border-light space-y-1.5">
            {(q.options||[]).map((o,i)=>(<div key={i} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0"/><input value={o.label} onChange={e=>sOpt(q._id,i,e.target.value)} className="input py-1.5 flex-1 text-sm" placeholder={`Option ${i+1}`}/><button onClick={()=>delOpt(q._id,i)} className="btn-ghost p-1 text-danger"><HiOutlineX className="w-3 h-3"/></button></div>))}
            <button onClick={()=>addOpt(q._id)} className="text-xs font-medium text-brand flex items-center gap-1"><HiOutlinePlus className="w-3 h-3"/>Add option</button>
          </div>)}
        </div>))}
        <button onClick={addQ} className="w-full py-3 border-2 border-dashed border-border rounded-card text-sm text-txt-secondary hover:border-brand/40 hover:text-brand transition-colors flex items-center justify-center gap-1.5"><HiOutlinePlus className="w-4 h-4"/>Add Question</button>
      </div>)}

      {tab==='settings'&&(<div className="space-y-2 animate-enter">{[{k:'allow_anonymous',l:'Anonymous',d:'No identity needed'},{k:'require_email',l:'Require Email',d:'Ask before starting'},{k:'show_progress_bar',l:'Progress Bar',d:'Show completion'}].map(x=>(<label key={x.k} className="flex items-center justify-between p-4 rounded-card bg-white border border-border cursor-pointer hover:border-brand/20 transition-colors"><div><p className="text-sm font-medium text-txt">{x.l}</p><p className="text-xs text-txt-tertiary">{x.d}</p></div><input type="checkbox" checked={survey[x.k]} onChange={e=>set(x.k,e.target.checked)} className="rounded border-border text-brand w-4 h-4"/></label>))}</div>)}

      {shareOpen&&(<div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={()=>setShareOpen(false)}><div className="bg-white rounded-card shadow-modal w-full max-w-sm p-6 animate-scale-in" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-txt">Share Analytics</h3><button onClick={()=>setShareOpen(false)} className="btn-ghost p-1"><HiOutlineX className="w-4 h-4"/></button></div>
        <p className="text-xs text-txt-tertiary mb-4">Within your organization only.</p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">{users.filter(u=>u.id!==profile.id).map(u=>{const shared=shares.some(s=>s.shared_with===u.id);return(<div key={u.id} className="flex items-center justify-between p-3 rounded-btn bg-bg"><div><p className="text-sm font-medium text-txt">{u.full_name||u.email}</p><p className="text-[11px] text-txt-tertiary">{u.role}</p></div>{shared?<span className="text-[11px] font-medium text-success">Shared</span>:<button onClick={()=>share(u.id)} className="text-[11px] font-medium text-brand hover:underline">Share</button>}</div>);})}</div>
      </div></div>)}
    </div>
  );
}
