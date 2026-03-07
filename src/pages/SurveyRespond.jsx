import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function getToken(slug) {
  const k=`nx_${slug}`; let t=localStorage.getItem(k);
  if(!t){t='s_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(k,t);} return t;
}

// Motivation messages based on progress
function getMotivation(pct, total, current) {
  if (pct <= 5) return null;
  if (pct <= 15) return "Great start! You're already on your way.";
  if (pct >= 90) return `Just ${total - current - 1} more to go!`;
  if (pct >= 70) return "You're almost there — keep going!";
  if (pct >= 50) return "Halfway done. You're doing great!";
  if (pct >= 30) return "Nice momentum! Keep it up.";
  return null;
}

// Confetti component for completion
function Confetti() {
  const colors = ['#4F7BFF','#3FD3A6','#7A6BFF','#F59E0B','#EF4444','#10B981'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({length:30}).map((_,i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${Math.random()*100}%`, top: `${30+Math.random()*30}%`,
          backgroundColor: colors[i%colors.length],
          animationDelay: `${Math.random()*0.5}s`,
          animationDuration: `${1+Math.random()*0.5}s`,
        }}/>
      ))}
    </div>
  );
}

export default function SurveyRespond() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(-1); // -1=welcome
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(null);
  const [showMotivation, setShowMotivation] = useState(null);
  const token = useRef(null);
  const timer = useRef(null);
  const saveCount = useRef(0);
  const rId = useRef(null);

  useEffect(() => { init(); return ()=>clearTimeout(timer.current); }, [slug]);

  async function init() {
    try {
      const{data:s}=await supabase.from('surveys').select('*').eq('slug',slug).single();
      if(!s){setErr('Survey not found');return;}
      if(s.expires_at&&new Date(s.expires_at)<new Date()){setErr('This survey has expired.');setSurvey(s);return;}
      if(s.status!=='active'){setErr('This survey is not accepting responses.');setSurvey(s);return;}
      setSurvey(s); token.current=getToken(slug);
      const{data:qs}=await supabase.from('survey_questions').select('*').eq('survey_id',s.id).order('sort_order');
      setQuestions(qs||[]);
      const{data:existing}=await supabase.from('survey_responses').select('*,survey_answers(*)').eq('session_token',token.current).eq('status','in_progress').single();
      if(existing){
        rId.current=existing.id;
        const r={};(existing.survey_answers||[]).forEach(a=>{r[a.question_id]=a.answer_json||a.answer_value||'';});
        setAnswers(r);
        const first=(qs||[]).findIndex(q=>!r[q.id]);
        setStep(first>=0?first:0); setSaved(existing.last_saved_at);
      } else { setStep(s.welcome_message?-1:0); }
    } catch(e){console.error(e);setErr('Failed to load survey');}
    finally{setLoading(false);}
  }

  async function ensureR(){
    if(rId.current)return rId.current;
    const{data}=await supabase.from('survey_responses').insert({survey_id:survey.id,session_token:token.current,respondent_email:email||null,status:'in_progress'}).select().single();
    if(data)rId.current=data.id; return rId.current;
  }

  const autoSave=useCallback(async(ans,id)=>{
    if(!id)return;
    try{
      for(const[qId,v]of Object.entries(ans)){
        const isJ=typeof v==='object';
        await supabase.from('survey_answers').upsert({response_id:id,question_id:qId,answer_value:isJ?null:String(v),answer_json:isJ?v:null},{onConflict:'response_id,question_id'});
      }
      await supabase.from('survey_responses').update({last_saved_at:new Date().toISOString()}).eq('id',id);
      setSaved(new Date().toISOString());
    }catch(e){console.error('Auto-save:',e);}
  },[]);

  const answer=async(qId,val)=>{
    const next={...answers,[qId]:val};setAnswers(next);
    const id=await ensureR();saveCount.current++;
    if(saveCount.current>=(survey?.auto_save_interval||2)){saveCount.current=0;autoSave(next,id);}
    else{clearTimeout(timer.current);timer.current=setTimeout(()=>{autoSave(next,id);saveCount.current=0;},5000);}
  };

  async function submit(){
    for(const q of questions){if(q.is_required&&!answers[q.id]){setStep(questions.indexOf(q));return alert(`Please answer: "${q.question_text}"`);}}
    setSubmitting(true);
    try{const id=await ensureR();await autoSave(answers,id);await supabase.from('survey_responses').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',id);setDone(true);localStorage.removeItem(`nx_${slug}`);}
    catch(e){alert('Failed. Your answers are saved.');}
    finally{setSubmitting(false);}
  }

  function goNext(){
    const q=questions[step];
    if(q?.is_required&&!answers[q.id])return alert('This question is required');
    const nextStep=step+1;
    setStep(nextStep);
    // Show motivation at key moments
    const pct=Math.round(((nextStep+1)/questions.length)*100);
    const msg=getMotivation(pct,questions.length,nextStep);
    if(msg){setShowMotivation(msg);setTimeout(()=>setShowMotivation(null),2500);}
  }

  const tc=survey?.theme_color||'#4F7BFF';
  const q=questions[step];
  const pct=questions.length?Math.round(((step+1)/questions.length)*100):0;
  const answeredCount=Object.keys(answers).length;

  // ====== LOADING ======
  if(loading) return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:tc,animationDelay:`${i*200}ms`}}/>)}</div>
    </div>
  );

  // ====== ERROR ======
  if(err) return (
    <div className="min-h-screen flex items-center justify-center gradient-bg px-5">
      <div className="text-center max-w-sm animate-enter">
        <div className="w-16 h-16 rounded-2xl bg-warn-light flex items-center justify-center mx-auto mb-5 text-3xl">⏰</div>
        <h1 className="text-h4 text-txt mb-2">Survey Unavailable</h1>
        <p className="text-txt-secondary">{err}</p>
      </div>
    </div>
  );

  // ====== COMPLETION — Peak-End Rule: make it delightful ======
  if(done) return (
    <div className="min-h-screen flex items-center justify-center px-5 relative" style={{background:`linear-gradient(170deg, ${tc}08, #F8FAFF)`}}>
      <Confetti />
      <div className="text-center max-w-sm relative z-10 animate-enter">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" className="animated-check" />
          </svg>
        </div>
        <h1 className="text-h3 text-txt mb-3">Thank you!</h1>
        <p className="text-txt-secondary text-base leading-relaxed">{survey?.thank_you_message||'Your insights help build better products.'}</p>
      </div>
    </div>
  );

  // ====== MAIN SURVEY ======
  return (
    <div className="min-h-screen" style={{background:`linear-gradient(170deg, ${tc}06, #F8FAFF 40%, ${tc}03)`}}>
      {/* Header with progress */}
      <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-border-light">
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-sm font-medium text-txt truncate max-w-[220px]">{survey.title}</span>
          <div className="flex items-center gap-3">
            {saved && <span className="flex items-center gap-1 text-[10px] text-txt-tertiary"><div className="pulse-dot"/>Saved</span>}
            {step>=0 && <span className="text-xs font-semibold" style={{color:tc}}>{pct}%</span>}
          </div>
        </div>
        {/* Progress bar — smooth animated */}
        {survey.show_progress_bar && step>=0 && (
          <div className="h-[3px] bg-border-light">
            <div className="h-full rounded-r-full progress-fill" style={{width:`${pct}%`,backgroundColor:tc}}/>
          </div>
        )}
      </div>

      {/* Motivation popup */}
      {showMotivation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-white rounded-pill shadow-card border border-border text-sm text-txt-secondary font-medium motivation-msg">
          {showMotivation}
        </div>
      )}

      <div className="max-w-xl mx-auto px-5 py-10">
        {/* ====== WELCOME — Step 1: Reduce friction ====== */}
        {step===-1 && (
          <div className="text-center py-16 animate-slide-up">
            <h1 className="text-h2 text-txt tracking-tight mb-4">{survey.title}</h1>
            {survey.description && <p className="text-base text-txt-secondary mb-3 max-w-md mx-auto leading-relaxed">{survey.description}</p>}
            {survey.welcome_message && <p className="text-base text-txt mb-8 max-w-md mx-auto leading-relaxed">{survey.welcome_message}</p>}

            {/* Friction reducer */}
            <p className="text-sm text-txt-tertiary mb-6">Your opinion helps improve products used by thousands of people.</p>

            {survey.require_email && (
              <div className="max-w-xs mx-auto mb-8 text-left">
                <label className="input-label">Your email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@example.com"/>
              </div>
            )}

            <button onClick={()=>{if(survey.require_email&&!email)return alert('Email required');setStep(0);}}
              className="px-10 py-4 rounded-btn text-white font-semibold text-base shadow-btn-hover hover:shadow-lg hover:-translate-y-[1px] active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
              Start Survey →
            </button>
            <p className="text-xs text-txt-placeholder mt-5">{questions.length} questions · ~{Math.max(1,Math.ceil(questions.length*0.5))} min</p>
          </div>
        )}

        {/* ====== QUESTION — Steps 2-5: Progressive flow ====== */}
        {step>=0 && step<questions.length && q && (
          <div key={q.id} className="animate-slide-up">
            {/* Question card */}
            <div className="card p-8 md:p-10">
              {/* Question counter */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-bold px-2.5 py-1 rounded-btn" style={{backgroundColor:tc+'10',color:tc}}>
                  Question {step+1} of {questions.length}
                </span>
                {q.is_required && <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Required</span>}
              </div>

              {/* Question text — large and clear per spec */}
              <h2 className="text-xl md:text-[22px] font-semibold text-txt leading-snug mb-2">
                {q.question_text}
              </h2>
              {q.description && <p className="text-sm text-txt-secondary mb-6">{q.description}</p>}

              {/* Answer input — large soft cards per spec */}
              <div className={q.description?'':'mt-8'}>
                <QInput q={q} val={answers[q.id]||''} onChange={v=>answer(q.id,v)} tc={tc}/>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button onClick={()=>setStep(s=>Math.max(survey.welcome_message?-1:0,s-1))}
                disabled={step<=0&&!survey.welcome_message}
                className="flex items-center gap-1.5 text-sm text-txt-secondary hover:text-txt disabled:opacity-20 px-3 py-2 rounded-btn hover:bg-white transition-all">
                ← Back
              </button>
              {step<questions.length-1 ? (
                <button onClick={goNext}
                  className="flex items-center gap-1.5 px-7 py-3 rounded-btn text-white font-semibold text-sm shadow-btn hover:shadow-btn-hover hover:-translate-y-[1px] active:scale-[0.97] transition-all"
                  style={{backgroundColor:tc}}>
                  Continue →
                </button>
              ) : (
                <button onClick={submit} disabled={submitting}
                  className="flex items-center gap-1.5 px-7 py-3 rounded-btn text-white font-semibold text-sm shadow-btn disabled:opacity-50 active:scale-[0.97] transition-all"
                  style={{backgroundColor:tc}}>
                  {submitting?'Submitting...':'Submit Survey ✓'}
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-[10px] text-txt-placeholder mt-4 hidden md:block">
              Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-border text-txt-tertiary font-mono text-[10px]">Enter ↵</kbd> to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== QUESTION INPUT COMPONENTS — Large soft cards ======
function QInput({ q, val, onChange, tc }) {
  const handleKey = e => { if(e.key==='Enter'&&!e.shiftKey&&q.question_type!=='long_text') e.preventDefault(); };
  const inputBase = "w-full px-0 py-3 bg-transparent border-0 border-b-2 border-border text-txt text-lg placeholder:text-txt-placeholder focus:outline-none focus:border-brand transition-colors";

  switch(q.question_type) {
    case 'short_text': return <input type="text" value={val} onChange={e=>onChange(e.target.value)} onKeyDown={handleKey} className={inputBase} placeholder="Type your answer..." autoFocus/>;
    case 'long_text': return <textarea value={val} onChange={e=>onChange(e.target.value)} className={`${inputBase} min-h-[100px] resize-none`} placeholder="Type your answer..." autoFocus/>;
    case 'email': return <input type="email" value={val} onChange={e=>onChange(e.target.value)} onKeyDown={handleKey} className={inputBase} placeholder="email@example.com" autoFocus/>;
    case 'number': return <input type="number" value={val} onChange={e=>onChange(e.target.value)} onKeyDown={handleKey} className={`${inputBase} text-3xl font-bold w-40`} placeholder="0" autoFocus/>;
    case 'date': return <input type="date" value={val} onChange={e=>onChange(e.target.value)} className="input text-base"/>;

    case 'yes_no': return (
      <div className="grid grid-cols-2 gap-3">
        {[{l:'Yes',e:'👍',v:'yes'},{l:'No',e:'👎',v:'no'}].map(o=>(
          <button key={o.v} onClick={()=>onChange(o.v)}
            className={`py-6 rounded-card border-2 font-semibold text-lg transition-all active:scale-[0.97] ${
              val===o.v ? 'text-white shadow-lg border-transparent' : 'border-border text-txt bg-white hover:border-brand/30 hover:-translate-y-[1px]'
            }`}
            style={val===o.v?{backgroundColor:tc}:{}}>
            <span className="text-3xl block mb-2">{o.e}</span>{o.l}
          </button>
        ))}
      </div>
    );

    case 'single_choice': return (
      <div className="space-y-3">
        {(q.options||[]).map((o,i)=>(
          <button key={i} onClick={()=>onChange(o.value)}
            className={`survey-option ${val===o.value?'selected':''}`}
            style={val===o.value?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
            <div className={`option-radio ${val===o.value?'':'border-border'}`}
              style={val===o.value?{borderColor:tc,backgroundColor:tc}:{}}>
              {val===o.value && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-sm font-medium text-txt flex-1">{o.label}</span>
            <span className="text-xs text-txt-placeholder font-mono">{String.fromCharCode(65+i)}</span>
          </button>
        ))}
      </div>
    );

    case 'multiple_choice': { const sel=Array.isArray(val)?val:[]; return (
      <div className="space-y-3">
        {(q.options||[]).map((o,i)=>{const c=sel.includes(o.value); return (
          <button key={i} onClick={()=>onChange(c?sel.filter(v=>v!==o.value):[...sel,o.value])}
            className={`survey-option ${c?'selected':''}`}
            style={c?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
            <div className={`option-check ${c?'selected':''}`}
              style={c?{borderColor:tc,backgroundColor:tc}:{}}>
              {c && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-sm font-medium text-txt flex-1">{o.label}</span>
          </button>
        );})}
      </div>
    );}

    case 'dropdown': return (
      <select value={val} onChange={e=>onChange(e.target.value)} className="input text-base">
        <option value="">Select an option...</option>
        {(q.options||[]).map((o,i)=><option key={i} value={o.value}>{o.label}</option>)}
      </select>
    );

    case 'rating': { const r=parseInt(val)||0; return (
      <div className="flex gap-3 justify-center py-6">
        {[1,2,3,4,5].map(s=>(
          <button key={s} onClick={()=>onChange(s)}
            className={`star-btn text-5xl ${s<=r?'active':''}`}
            style={s<=r?{color:'#F59E0B'}:{color:'#E5E7EB'}}>
            {s<=r?'★':'☆'}
          </button>
        ))}
      </div>
    );}

    case 'scale': { const v=parseInt(val)||0; return (
      <div className="py-6">
        <div className="flex justify-between mb-3 text-xs text-txt-tertiary font-medium"><span>Not at all</span><span>Extremely</span></div>
        <div className="flex gap-2 justify-center">
          {[1,2,3,4,5,6,7,8,9,10].map(n=>(
            <button key={n} onClick={()=>onChange(n)}
              className={`scale-btn ${n===v?'text-white shadow-md scale-110':'bg-white text-txt-secondary border border-border hover:border-brand/30 hover:-translate-y-[1px]'}`}
              style={n===v?{backgroundColor:tc}:{}}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );}

    default: return <input type="text" value={val} onChange={e=>onChange(e.target.value)} className={inputBase} placeholder="Your answer..."/>;
  }
}
