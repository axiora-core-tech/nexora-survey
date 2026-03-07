import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, generateUniqueSlug } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineX, HiOutlineSave, HiOutlineGlobe } from 'react-icons/hi';

const newQ=()=>({_id:Math.random().toString(36).slice(2),question_text:'',question_type:'short_text',options:[],is_required:false,description:''});
const hasO=t=>['single_choice','multiple_choice','dropdown'].includes(t);

export default function SurveyCreate() {
  const{profile}=useAuthStore();const nav=useNavigate();const[busy,setBusy]=useState(false);const[tab,setTab]=useState('details');
  const[f,setF]=useState({title:'',description:'',welcome_message:'',thank_you_message:'Thank you for completing this survey!',expires_at:'',theme_color:'#10B981',allow_anonymous:true,require_email:false,show_progress_bar:true});
  const[qs,setQs]=useState([newQ()]);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sQ=(id,k,v)=>setQs(a=>a.map(q=>q._id===id?{...q,[k]:v}:q));
  const addQ=()=>setQs(a=>[...a,newQ()]);
  const delQ=id=>{if(qs.length<=1)return toast.error('Need ≥1 question');setQs(a=>a.filter(q=>q._id!==id));};
  const moveQ=(id,d)=>setQs(a=>{const i=a.findIndex(q=>q._id===id);if((d===-1&&i===0)||(d===1&&i===a.length-1))return a;const b=[...a];[b[i],b[i+d]]=[b[i+d],b[i]];return b;});
  const addOpt=id=>setQs(a=>a.map(q=>q._id===id?{...q,options:[...(q.options||[]),{label:'',value:''}]}:q));
  const sOpt=(id,i,v)=>setQs(a=>a.map(q=>{if(q._id!==id)return q;const o=[...(q.options||[])];o[i]={label:v,value:v.toLowerCase().replace(/\s+/g,'_')};return{...q,options:o};}));
  const delOpt=(id,i)=>setQs(a=>a.map(q=>q._id!==id?q:{...q,options:q.options.filter((_,j)=>j!==i)}));

  async function save(status='draft'){
    if(!f.title.trim())return toast.error('Title required');
    if(qs.some(q=>!q.question_text.trim()))return toast.error('All questions need text');
    if(qs.some(q=>hasO(q.question_type)&&(!q.options||q.options.length<2)))return toast.error('Choice questions need ≥2 options');
    if(!profile?.tenant_id)return toast.error('Session error');
    setBusy(true);
    try{
      const slug=await generateUniqueSlug(supabase);
      const{data:sv,error:e1}=await supabase.from('surveys').insert({title:f.title,description:f.description||null,welcome_message:f.welcome_message||null,thank_you_message:f.thank_you_message||null,expires_at:f.expires_at||null,allow_anonymous:f.allow_anonymous,require_email:f.require_email,show_progress_bar:f.show_progress_bar,theme_color:f.theme_color,slug,status,tenant_id:profile.tenant_id,created_by:profile.id}).select().single();
      if(e1)throw e1;if(!sv)throw new Error('Not created');
      const{error:e2}=await supabase.from('survey_questions').insert(qs.map((q,i)=>({survey_id:sv.id,question_text:q.question_text,question_type:q.question_type,options:hasO(q.question_type)?q.options:null,is_required:q.is_required,description:q.description||null,sort_order:i})));
      if(e2)throw e2;
      toast.success(status==='active'?'Published!':'Draft saved');nav(`/surveys/${sv.id}/edit`);
    }catch(e){console.error(e);toast.error(e.message||'Failed');}finally{setBusy(false);}
  }

  const tabs=[{id:'details',l:'Details'},{id:'questions',l:`Questions (${qs.length})`},{id:'settings',l:'Settings'}];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">New Survey</h1>
        <div className="flex gap-2">
          <button onClick={()=>save('draft')} disabled={busy} className="btn-outline text-sm"><HiOutlineSave className="w-4 h-4"/>Draft</button>
          <button onClick={()=>save('active')} disabled={busy} className="btn-green text-sm"><HiOutlineGlobe className="w-4 h-4"/>Publish</button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-n-100 rounded-xl mb-6">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab===t.id?'bg-white text-n-900 shadow-soft':'text-n-400'}`}>{t.l}</button>)}</div>

      {tab==='details'&&(
        <div className="space-y-4 animate-in">
          <div><label className="input-label">Title *</label><input value={f.title} onChange={e=>s('title',e.target.value)} className="input font-medium text-base" placeholder="Customer Satisfaction Survey"/></div>
          <div><label className="input-label">Description</label><textarea value={f.description} onChange={e=>s('description',e.target.value)} className="input" rows={2} placeholder="What's this survey about?"/></div>
          <div><label className="input-label">Welcome message</label><textarea value={f.welcome_message} onChange={e=>s('welcome_message',e.target.value)} className="input" rows={2} placeholder="Shown before they start..."/></div>
          <div><label className="input-label">Thank you message</label><textarea value={f.thank_you_message} onChange={e=>s('thank_you_message',e.target.value)} className="input" rows={2}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Expires</label><input type="datetime-local" value={f.expires_at} onChange={e=>s('expires_at',e.target.value)} className="input"/></div>
            <div><label className="input-label">Theme color</label><div className="flex gap-2"><input type="color" value={f.theme_color} onChange={e=>s('theme_color',e.target.value)} className="w-10 h-10 rounded-xl border border-n-200 cursor-pointer"/><input value={f.theme_color} onChange={e=>s('theme_color',e.target.value)} className="input flex-1 font-mono text-sm"/></div></div>
          </div>
        </div>
      )}

      {tab==='questions'&&(
        <div className="space-y-4 animate-in">
          {qs.map((q,i)=>(
            <div key={q._id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-xs font-bold text-green-700">{i+1}</span>
                <div className="flex gap-1">
                  <button onClick={()=>moveQ(q._id,-1)} disabled={i===0} className="btn-ghost p-1.5"><HiOutlineArrowUp className="w-4 h-4"/></button>
                  <button onClick={()=>moveQ(q._id,1)} disabled={i===qs.length-1} className="btn-ghost p-1.5"><HiOutlineArrowDown className="w-4 h-4"/></button>
                  <button onClick={()=>delQ(q._id)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4"/></button>
                </div>
              </div>
              <input value={q.question_text} onChange={e=>sQ(q._id,'question_text',e.target.value)} className="input mb-2 font-medium" placeholder="Your question..."/>
              <input value={q.description} onChange={e=>sQ(q._id,'description',e.target.value)} className="input mb-3 text-sm" placeholder="Helper text (optional)"/>
              <div className="flex gap-3 items-center">
                <select value={q.question_type} onChange={e=>sQ(q._id,'question_type',e.target.value)} className="input flex-1">{QUESTION_TYPES.map(t=><option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select>
                <label className="flex items-center gap-2 text-sm text-n-600 cursor-pointer whitespace-nowrap"><input type="checkbox" checked={q.is_required} onChange={e=>sQ(q._id,'is_required',e.target.checked)} className="rounded border-n-300 text-green-500 w-4 h-4"/>Required</label>
              </div>
              {hasO(q.question_type)&&(
                <div className="mt-4 pl-4 border-l-2 border-green-200 space-y-2">
                  {(q.options||[]).map((o,j)=>(
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-n-300 flex-shrink-0"/>
                      <input value={o.label} onChange={e=>sOpt(q._id,j,e.target.value)} className="input py-2 flex-1" placeholder={`Option ${j+1}`}/>
                      <button onClick={()=>delOpt(q._id,j)} className="btn-ghost p-1 text-red-400"><HiOutlineX className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <button onClick={()=>addOpt(q._id)} className="text-sm font-semibold text-green-600 flex items-center gap-1 hover:underline"><HiOutlinePlus className="w-3.5 h-3.5"/>Add option</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addQ} className="w-full py-4 border-2 border-dashed border-n-300 rounded-2xl text-sm font-medium text-n-400 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center gap-2"><HiOutlinePlus className="w-5 h-5"/>Add Question</button>
        </div>
      )}

      {tab==='settings'&&(
        <div className="space-y-3 animate-in">
          {[{k:'allow_anonymous',l:'Anonymous responses',d:'Respondents don\'t need to identify themselves'},{k:'require_email',l:'Require email',d:'Ask for email before they start'},{k:'show_progress_bar',l:'Progress bar',d:'Show completion percentage'}].map(x=>(
            <label key={x.k} className="flex items-center justify-between p-5 rounded-2xl bg-white border border-n-200 cursor-pointer hover:border-green-300 transition-colors">
              <div><p className="text-sm font-semibold text-n-800">{x.l}</p><p className="text-xs text-n-400 mt-0.5">{x.d}</p></div>
              <input type="checkbox" checked={f[x.k]} onChange={e=>s(x.k,e.target.checked)} className="rounded border-n-300 text-green-500 w-5 h-5"/>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
