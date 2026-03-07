import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HiOutlineArrowRight, HiOutlineArrowLeft, HiOutlineCheck } from 'react-icons/hi';

function getToken(slug) {
  const k=`nx_${slug}`;let t=localStorage.getItem(k);
  if(!t){t='s_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(k,t);}return t;
}

function getMot(pct,total,cur) {
  if(pct<=5)return null;
  if(pct<=15)return "Great start! You're already on your way 🎯";
  if(pct>=90)return `Almost done — just ${total-cur-1} left! 🏁`;
  if(pct>=70)return "You're so close — keep going! 💪";
  if(pct>=50)return "Halfway there! 🙌";
  return null;
}

function Confetti() {
  const cols=['#10B981','#FF5733','#8B5CF6','#F59E0B','#3B82F6','#EC4899'];
  return <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({length:24}).map((_,i)=><div key={i} className="confetti-bit" style={{
      left:`${10+Math.random()*80}%`,top:`${20+Math.random()*30}%`,
      backgroundColor:cols[i%cols.length],animationDelay:`${Math.random()*0.4}s`,animationDuration:`${0.8+Math.random()*0.6}s`,
    }}/>)}
  </div>;
}

export default function SurveyRespond() {
  const{slug}=useParams();
  const[sv,setSv]=useState(null);const[qs,setQs]=useState([]);const[ans,setAns]=useState({});
  const[step,setStep]=useState(-1);const[loading,setLoading]=useState(true);
  const[submitting,setSub]=useState(false);const[done,setDone]=useState(false);
  const[err,setErr]=useState(null);const[email,setEmail]=useState('');
  const[saved,setSaved]=useState(null);const[mot,setMot]=useState(null);
  const token=useRef(null);const timer=useRef(null);const cnt=useRef(0);const rId=useRef(null);

  useEffect(()=>{init();return()=>clearTimeout(timer.current);},[slug]);

  async function init(){try{
    const{data:s}=await supabase.from('surveys').select('*').eq('slug',slug).single();
    if(!s){setErr('Survey not found');return;}
    if(s.expires_at&&new Date(s.expires_at)<new Date()){setErr('This survey has expired.');setSv(s);return;}
    if(s.status!=='active'){setErr('Not accepting responses right now.');setSv(s);return;}
    setSv(s);token.current=getToken(slug);
    const{data:q}=await supabase.from('survey_questions').select('*').eq('survey_id',s.id).order('sort_order');setQs(q||[]);
    const{data:ex}=await supabase.from('survey_responses').select('*,survey_answers(*)').eq('session_token',token.current).eq('status','in_progress').single();
    if(ex){rId.current=ex.id;const r={};(ex.survey_answers||[]).forEach(a=>{r[a.question_id]=a.answer_json||a.answer_value||'';});setAns(r);
      const first=(q||[]).findIndex(x=>!r[x.id]);setStep(first>=0?first:0);setSaved(ex.last_saved_at);
    }else{setStep(s.welcome_message?-1:0);}
  }catch(e){console.error(e);setErr('Failed to load');}finally{setLoading(false);}}

  async function ensureR(){if(rId.current)return rId.current;
    const{data}=await supabase.from('survey_responses').insert({survey_id:sv.id,session_token:token.current,respondent_email:email||null,status:'in_progress'}).select().single();
    if(data)rId.current=data.id;return rId.current;}

  const autoSave=useCallback(async(a,id)=>{if(!id)return;try{
    for(const[qId,v]of Object.entries(a)){const j=typeof v==='object';
      await supabase.from('survey_answers').upsert({response_id:id,question_id:qId,answer_value:j?null:String(v),answer_json:j?v:null},{onConflict:'response_id,question_id'});}
    await supabase.from('survey_responses').update({last_saved_at:new Date().toISOString()}).eq('id',id);setSaved(new Date().toISOString());
  }catch(e){console.error('Auto-save:',e);}},[]);

  const setAn=async(qId,val)=>{const next={...ans,[qId]:val};setAns(next);const id=await ensureR();cnt.current++;
    if(cnt.current>=(sv?.auto_save_interval||2)){cnt.current=0;autoSave(next,id);}
    else{clearTimeout(timer.current);timer.current=setTimeout(()=>{autoSave(next,id);cnt.current=0;},5000);}};

  async function submit(){for(const q of qs){if(q.is_required&&!ans[q.id]){setStep(qs.indexOf(q));return alert(`Please answer: "${q.question_text}"`);}}
    setSub(true);try{const id=await ensureR();await autoSave(ans,id);
      await supabase.from('survey_responses').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',id);
      setDone(true);localStorage.removeItem(`nx_${slug}`);
    }catch(e){alert('Failed — answers saved, try again.');}finally{setSub(false);}}

  function goNext(){const q=qs[step];if(q?.is_required&&!ans[q.id])return alert('This question is required');
    const n=step+1;setStep(n);const pct=Math.round(((n+1)/qs.length)*100);
    const m=getMot(pct,qs.length,n);if(m){setMot(m);setTimeout(()=>setMot(null),2800);}}

  const tc=sv?.theme_color||'#10B981';const q=qs[step];
  const pct=qs.length?Math.round(((step+1)/qs.length)*100):0;

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-n-50"><div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{backgroundColor:tc+'20'}}><svg className="w-5 h-5" style={{color:tc}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg></div></div>;

  if(err) return <div className="min-h-screen flex items-center justify-center bg-n-50 px-5"><div className="text-center max-w-sm animate-in"><span className="text-5xl block mb-5">😔</span><h1 className="text-2xl font-bold text-n-900 mb-2">Unavailable</h1><p className="text-n-500">{err}</p></div></div>;

  if(done) return (
    <div className="min-h-screen flex items-center justify-center px-5 relative" style={{background:`linear-gradient(170deg, ${tc}10, #FAFAF9)`}}>
      <Confetti />
      <div className="text-center max-w-sm relative z-10 animate-in">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{backgroundColor:tc+'15'}}>
          <svg className="w-10 h-10" style={{color:tc}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" className="draw-check"/></svg>
        </div>
        <h1 className="text-3xl font-extrabold text-n-900 mb-3">Thank you! 🎉</h1>
        <p className="text-n-500 text-lg leading-relaxed">{sv?.thank_you_message||'Your insights help build better products.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background:`linear-gradient(170deg, ${tc}08, #FAFAF9 40%, ${tc}04)`}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-n-200/40">
        <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-n-700 truncate max-w-[240px]">{sv.title}</span>
          <div className="flex items-center gap-3">
            {saved&&<span className="flex items-center gap-1.5 text-[11px] text-n-400"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft"/>Saved</span>}
            {step>=0&&<span className="text-xs font-bold" style={{color:tc}}>{pct}%</span>}
          </div>
        </div>
        {sv.show_progress_bar&&step>=0&&(
          <div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`,backgroundColor:tc}}/></div>
        )}
      </div>

      {/* Motivation popup */}
      {mot&&<div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 bg-white rounded-2xl shadow-card border border-n-200 text-sm font-medium text-n-700 animate-pop">{mot}</div>}

      <div className="max-w-[640px] mx-auto px-5 py-10">
        {/* Welcome */}
        {step===-1&&(
          <div className="text-center py-14 animate-slide-up">
            <h1 className="text-[2.2rem] md:text-[2.8rem] font-extrabold text-n-900 tracking-tight leading-tight mb-5">{sv.title}</h1>
            {sv.description&&<p className="text-lg text-n-500 mb-3 max-w-md mx-auto leading-relaxed">{sv.description}</p>}
            {sv.welcome_message&&<p className="text-base text-n-600 mb-8 max-w-md mx-auto leading-relaxed">{sv.welcome_message}</p>}
            <p className="text-sm text-n-400 mb-8">Your opinion helps improve products used by thousands of people. ✨</p>
            {sv.require_email&&<div className="max-w-xs mx-auto mb-8 text-left"><label className="input-label">Your email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@example.com"/></div>}
            <button onClick={()=>{if(sv.require_email&&!email)return alert('Email required');setStep(0);}}
              className="px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
              Start Survey <HiOutlineArrowRight className="inline w-5 h-5 ml-1"/>
            </button>
            <p className="text-xs text-n-300 mt-5">{qs.length} questions · ~{Math.max(1,Math.ceil(qs.length*0.5))} min</p>
          </div>
        )}

        {/* Question */}
        {step>=0&&step<qs.length&&q&&(
          <div key={q.id} className="animate-slide-up">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-card border border-n-200/60">
              <div className="flex items-center gap-2.5 mb-7">
                <span className="text-xs font-bold px-3 py-1 rounded-xl" style={{backgroundColor:tc+'12',color:tc}}>
                  {step+1} of {qs.length}
                </span>
                {q.is_required&&<span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Required</span>}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-n-900 leading-snug mb-2">{q.question_text}</h2>
              {q.description&&<p className="text-sm text-n-400 mb-7">{q.description}</p>}
              <div className={q.description?'':'mt-8'}>
                <QInput q={q} val={ans[q.id]||''} set={v=>setAn(q.id,v)} tc={tc}/>
              </div>
            </div>

            <div className="flex items-center justify-between mt-7">
              <button onClick={()=>setStep(x=>Math.max(sv.welcome_message?-1:0,x-1))} disabled={step<=0&&!sv.welcome_message}
                className="flex items-center gap-1.5 text-sm font-medium text-n-400 hover:text-n-700 disabled:opacity-20 px-4 py-2.5 rounded-xl hover:bg-white transition-all">
                <HiOutlineArrowLeft className="w-4 h-4"/>Back
              </button>
              {step<qs.length-1?(
                <button onClick={goNext}
                  className="flex items-center gap-1.5 px-8 py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
                  Continue <HiOutlineArrowRight className="w-4 h-4"/>
                </button>
              ):(
                <button onClick={submit} disabled={submitting}
                  className="flex items-center gap-1.5 px-8 py-3 rounded-xl text-white font-bold text-sm shadow-md disabled:opacity-50 active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
                  {submitting?'Submitting...':'Submit'} <HiOutlineCheck className="w-4 h-4"/>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QInput({q,val,set,tc}) {
  const ib="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-n-200 text-n-900 text-lg placeholder:text-n-300 focus:outline-none focus:border-green-500 transition-colors";
  switch(q.question_type) {
    case 'short_text': return <input type="text" value={val} onChange={e=>set(e.target.value)} className={ib} placeholder="Type your answer..." autoFocus/>;
    case 'long_text': return <textarea value={val} onChange={e=>set(e.target.value)} className={`${ib} min-h-[100px] resize-none`} placeholder="Type your answer..." autoFocus/>;
    case 'email': return <input type="email" value={val} onChange={e=>set(e.target.value)} className={ib} placeholder="email@example.com" autoFocus/>;
    case 'number': return <input type="number" value={val} onChange={e=>set(e.target.value)} className={`${ib} text-3xl font-extrabold w-40`} placeholder="0" autoFocus/>;
    case 'date': return <input type="date" value={val} onChange={e=>set(e.target.value)} className="input text-lg"/>;
    case 'yes_no': return (
      <div className="grid grid-cols-2 gap-4">
        {[{l:'Yes',e:'👍',v:'yes'},{l:'No',e:'👎',v:'no'}].map(o=>(
          <button key={o.v} onClick={()=>set(o.v)}
            className={`py-7 rounded-2xl border-2 font-bold text-lg transition-all active:scale-[0.97] ${
              val===o.v?'text-white shadow-lg border-transparent':'border-n-200 text-n-700 bg-white hover:border-green-300 hover:-translate-y-0.5'
            }`} style={val===o.v?{backgroundColor:tc}:{}}>
            <span className="text-3xl block mb-2">{o.e}</span>{o.l}
          </button>
        ))}
      </div>
    );
    case 'single_choice': return (
      <div className="space-y-3">{(q.options||[]).map((o,i)=>(
        <button key={i} onClick={()=>set(o.value)} className={`option-card ${val===o.value?'picked':''}`}
          style={val===o.value?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all`}
            style={val===o.value?{borderColor:tc,backgroundColor:tc}:{borderColor:'#D6D3D1'}}>
            {val===o.value&&<svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
          </div>
          <span className="text-[15px] font-medium text-n-800 flex-1">{o.label}</span>
          <span className="text-xs text-n-300 font-mono">{String.fromCharCode(65+i)}</span>
        </button>
      ))}</div>
    );
    case 'multiple_choice': {const sel=Array.isArray(val)?val:[];return(
      <div className="space-y-3">{(q.options||[]).map((o,i)=>{const c=sel.includes(o.value);return(
        <button key={i} onClick={()=>set(c?sel.filter(v=>v!==o.value):[...sel,o.value])}
          className={`option-card ${c?'picked':''}`} style={c?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all`}
            style={c?{borderColor:tc,backgroundColor:tc}:{borderColor:'#D6D3D1'}}>
            {c&&<svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
          </div>
          <span className="text-[15px] font-medium text-n-800 flex-1">{o.label}</span>
        </button>
      );})}</div>
    );}
    case 'dropdown': return <select value={val} onChange={e=>set(e.target.value)} className="input text-lg"><option value="">Choose one...</option>{(q.options||[]).map((o,i)=><option key={i} value={o.value}>{o.label}</option>)}</select>;
    case 'rating': {const r=parseInt(val)||0;return(
      <div className="flex gap-3 justify-center py-6">{[1,2,3,4,5].map(s=>(
        <button key={s} onClick={()=>set(s)}
          className={`text-5xl transition-all duration-200 cursor-pointer hover:scale-110 ${s<=r?'scale-110':'opacity-30 hover:opacity-60'}`}
          style={s<=r?{filter:'drop-shadow(0 3px 8px rgba(245,158,11,0.4))'}:{}}>
          ⭐
        </button>
      ))}</div>
    );}
    case 'scale': {const v=parseInt(val)||0;return(
      <div className="py-6">
        <div className="flex justify-between mb-3 text-xs font-medium text-n-400"><span>Not at all</span><span>Extremely</span></div>
        <div className="flex gap-2 justify-center">{[1,2,3,4,5,6,7,8,9,10].map(n=>(
          <button key={n} onClick={()=>set(n)}
            className={`w-11 h-11 rounded-xl font-bold text-sm transition-all duration-200 active:scale-90 ${
              n===v?'text-white shadow-md scale-110':'bg-white text-n-500 border border-n-200 hover:border-green-300 hover:-translate-y-0.5'
            }`} style={n===v?{backgroundColor:tc}:{}}>
            {n}
          </button>
        ))}</div>
      </div>
    );}
    default: return <input type="text" value={val} onChange={e=>set(e.target.value)} className={ib} placeholder="Your answer..."/>;
  }
}
