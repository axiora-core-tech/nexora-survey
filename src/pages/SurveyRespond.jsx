import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HiOutlineArrowRight, HiOutlineArrowLeft, HiOutlineCheck } from 'react-icons/hi';

function getToken(slug) {
  const k = `nx_${slug}`;
  let t = localStorage.getItem(k);
  if (!t) { t = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, t); }
  return t;
}

export default function SurveyRespond() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(null);
  const token = useRef(null);
  const timer = useRef(null);
  const saveCount = useRef(0);
  const rId = useRef(null);

  useEffect(() => { init(); return () => clearTimeout(timer.current); }, [slug]);

  async function init() {
    try {
      const { data: s } = await supabase.from('surveys').select('*').eq('slug', slug).single();
      if (!s) { setErr('Survey not found'); return; }
      if (s.expires_at && new Date(s.expires_at) < new Date()) { setErr('This survey has expired.'); setSurvey(s); return; }
      if (s.status !== 'active') { setErr('This survey is not accepting responses.'); setSurvey(s); return; }
      setSurvey(s);
      token.current = getToken(slug);
      const { data: qs } = await supabase.from('survey_questions').select('*').eq('survey_id', s.id).order('sort_order');
      setQuestions(qs || []);
      const { data: existing } = await supabase.from('survey_responses').select('*, survey_answers(*)').eq('session_token', token.current).eq('status', 'in_progress').single();
      if (existing) {
        rId.current = existing.id;
        const r = {};
        (existing.survey_answers || []).forEach(a => { r[a.question_id] = a.answer_json || a.answer_value || ''; });
        setAnswers(r);
        const first = (qs||[]).findIndex(q => !r[q.id]);
        setStep(first >= 0 ? first : 0);
        setSaved(existing.last_saved_at);
      } else { setStep(s.welcome_message ? -1 : 0); }
    } catch (e) { console.error(e); setErr('Failed to load'); }
    finally { setLoading(false); }
  }

  async function ensureR() {
    if (rId.current) return rId.current;
    const { data } = await supabase.from('survey_responses')
      .insert({ survey_id: survey.id, session_token: token.current, respondent_email: email||null, status: 'in_progress' })
      .select().single();
    if (data) rId.current = data.id;
    return rId.current;
  }

  const autoSave = useCallback(async (ans, id) => {
    if (!id) return;
    try {
      for (const [qId, v] of Object.entries(ans)) {
        const isJ = typeof v === 'object';
        await supabase.from('survey_answers').upsert({ response_id:id, question_id:qId, answer_value:isJ?null:String(v), answer_json:isJ?v:null }, {onConflict:'response_id,question_id'});
      }
      await supabase.from('survey_responses').update({ last_saved_at: new Date().toISOString() }).eq('id', id);
      setSaved(new Date().toISOString());
    } catch(e) { console.error('Auto-save failed:', e); }
  }, []);

  const answer = async (qId, val) => {
    const next = { ...answers, [qId]: val };
    setAnswers(next);
    const id = await ensureR();
    saveCount.current++;
    if (saveCount.current >= (survey?.auto_save_interval || 2)) { saveCount.current = 0; autoSave(next, id); }
    else { clearTimeout(timer.current); timer.current = setTimeout(() => { autoSave(next, id); saveCount.current = 0; }, 5000); }
  };

  async function submit() {
    for (const q of questions) { if (q.is_required && !answers[q.id]) { setStep(questions.indexOf(q)); return alert(`Please answer: "${q.question_text}"`); } }
    setSubmitting(true);
    try {
      const id = await ensureR();
      await autoSave(answers, id);
      await supabase.from('survey_responses').update({ status:'completed', completed_at:new Date().toISOString() }).eq('id', id);
      setDone(true);
      localStorage.removeItem(`nx_${slug}`);
    } catch(e) { alert('Failed — your answers are saved. Try again.'); }
    finally { setSubmitting(false); }
  }

  const tc = survey?.theme_color || '#8b5cf6';
  const q = questions[step];
  const pct = questions.length ? Math.round(((step+1)/questions.length)*100) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-canvas"><div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-pulse" style={{animationDelay:`${i*150}ms`}}/>)}</div></div>;
  if (err) return <div className="min-h-screen flex items-center justify-center bg-canvas px-5"><div className="text-center max-w-sm"><p className="text-2xl font-display font-bold text-ink-900 mb-2">Unavailable</p><p className="text-ink-400">{err}</p></div></div>;
  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{background:`linear-gradient(170deg, ${tc}08, #faf9f7)`}}>
      <div className="text-center max-w-sm anim-enter">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5"><HiOutlineCheck className="w-8 h-8 text-emerald-500"/></div>
        <p className="text-2xl font-display font-bold text-ink-900 mb-2">Thank you!</p>
        <p className="text-ink-400">{survey?.thank_you_message || 'Your response has been recorded.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background:`linear-gradient(170deg, ${tc}06, #faf9f7 50%)`}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-5 h-12 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-600 truncate max-w-[200px]">{survey.title}</span>
          {saved && <span className="text-[10px] text-ink-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Saved</span>}
        </div>
        {survey.show_progress_bar && step >= 0 && (
          <div className="h-[2px] bg-ink-100"><div className="h-full transition-all duration-700 ease-out rounded-full" style={{width:`${pct}%`,background:tc}}/></div>
        )}
      </div>

      <div className="survey-wrap py-10">
        {/* Welcome */}
        {step === -1 && (
          <div className="text-center py-12 anim-enter">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-ink-900 tracking-tight mb-4">{survey.title}</h1>
            {survey.description && <p className="text-ink-400 text-base mb-3 max-w-md mx-auto">{survey.description}</p>}
            {survey.welcome_message && <p className="text-ink-500 mb-8 max-w-md mx-auto leading-relaxed">{survey.welcome_message}</p>}
            {survey.require_email && (
              <div className="max-w-xs mx-auto mb-6 text-left"><label className="input-label">Your email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input-field" placeholder="you@example.com"/></div>
            )}
            <button onClick={()=>{if(survey.require_email&&!email)return alert('Email required');setStep(0);}}
              className="px-8 py-3.5 rounded-2xl text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-[1px] active:translate-y-0 transition-all" style={{backgroundColor:tc}}>
              Begin <HiOutlineArrowRight className="inline w-4 h-4 ml-1"/>
            </button>
            <p className="text-[11px] text-ink-300 mt-5">{questions.length} questions · ~{Math.max(1,Math.ceil(questions.length*0.5))} min</p>
          </div>
        )}

        {/* Question */}
        {step >= 0 && step < questions.length && q && (
          <div key={q.id} className="anim-enter">
            <div className="bg-white rounded-2xl p-7 md:p-10 shadow-sm border border-ink-100">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{backgroundColor:tc+'10',color:tc}}>{step+1}/{questions.length}</span>
                {q.is_required && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Required</span>}
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-ink-900 tracking-tight leading-snug mb-1">{q.question_text}</h2>
              {q.description && <p className="text-ink-400 text-sm mb-6">{q.description}</p>}
              <div className={q.description?'':'mt-6'}>
                <QInput q={q} val={answers[q.id]||''} onChange={v=>answer(q.id,v)} tc={tc}/>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={()=>setStep(s=>Math.max(survey.welcome_message?-1:0,s-1))} disabled={step<=0&&!survey.welcome_message}
                className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-700 disabled:opacity-20 px-3 py-2 rounded-lg hover:bg-white transition-colors">
                <HiOutlineArrowLeft className="w-4 h-4"/>Back
              </button>
              {step < questions.length-1 ? (
                <button onClick={()=>{if(q.is_required&&!answers[q.id])return alert('Required');setStep(s=>s+1);}}
                  className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
                  Next <HiOutlineArrowRight className="w-4 h-4"/>
                </button>
              ) : (
                <button onClick={submit} disabled={submitting}
                  className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md disabled:opacity-50 active:scale-[0.97] transition-all" style={{backgroundColor:tc}}>
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

function QInput({ q, val, onChange, tc }) {
  const base = "w-full px-0 py-3 bg-transparent border-0 border-b-2 border-ink-200 text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-pri-500 transition-colors text-lg";
  switch (q.question_type) {
    case 'short_text': return <input type="text" value={val} onChange={e=>onChange(e.target.value)} className={base} placeholder="Type your answer..." autoFocus/>;
    case 'long_text': return <textarea value={val} onChange={e=>onChange(e.target.value)} className={`${base} min-h-[100px] resize-none`} placeholder="Type your answer..." autoFocus/>;
    case 'email': return <input type="email" value={val} onChange={e=>onChange(e.target.value)} className={base} placeholder="email@example.com" autoFocus/>;
    case 'number': return <input type="number" value={val} onChange={e=>onChange(e.target.value)} className={`${base} text-3xl font-display font-bold w-40`} placeholder="0" autoFocus/>;
    case 'date': return <input type="date" value={val} onChange={e=>onChange(e.target.value)} className="input-field text-lg"/>;
    case 'yes_no': return (
      <div className="flex gap-3">
        {[{l:'Yes',e:'👍',v:'yes'},{l:'No',e:'👎',v:'no'}].map(o=>(
          <button key={o.v} onClick={()=>onChange(o.v)} className={`flex-1 py-5 rounded-2xl border-2 font-semibold text-lg transition-all active:scale-[0.97] ${val===o.v?'text-white shadow-lg':'border-ink-200 text-ink-600 bg-white hover:border-ink-300'}`}
            style={val===o.v?{backgroundColor:tc,borderColor:tc}:{}}><span className="text-2xl block mb-1">{o.e}</span>{o.l}</button>
        ))}
      </div>
    );
    case 'single_choice': return (
      <div className="space-y-2">{(q.options||[]).map((o,i)=>(
        <button key={i} onClick={()=>onChange(o.value)} className={`choice-btn ${val===o.value?'selected':''}`} style={val===o.value?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={val===o.value?{borderColor:tc}:{borderColor:'#d4d0cd'}}>
            {val===o.value && <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:tc}}/>}
          </div>
          <span className="text-sm font-medium text-ink-700">{o.label}</span>
        </button>
      ))}</div>
    );
    case 'multiple_choice': { const sel = Array.isArray(val)?val:[]; return (
      <div className="space-y-2">{(q.options||[]).map((o,i)=>{const c=sel.includes(o.value); return (
        <button key={i} onClick={()=>onChange(c?sel.filter(v=>v!==o.value):[...sel,o.value])} className={`choice-btn ${c?'selected':''}`} style={c?{borderColor:tc,backgroundColor:tc+'08'}:{}}>
          <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0" style={c?{borderColor:tc,backgroundColor:tc}:{borderColor:'#d4d0cd'}}>
            {c && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
          </div>
          <span className="text-sm font-medium text-ink-700">{o.label}</span>
        </button>
      );})}</div>
    );}
    case 'dropdown': return <select value={val} onChange={e=>onChange(e.target.value)} className="input-field text-lg"><option value="">Select...</option>{(q.options||[]).map((o,i)=><option key={i} value={o.value}>{o.label}</option>)}</select>;
    case 'rating': { const r = parseInt(val)||0; return (
      <div className="flex gap-2 justify-center py-4">{[1,2,3,4,5].map(s=>(
        <button key={s} onClick={()=>onChange(s)} className={`star-btn text-4xl ${s<=r?'active':''}`} style={s<=r?{color:'#f97316'}:{color:'#ddd'}}>{s<=r?'★':'☆'}</button>
      ))}</div>
    );}
    case 'scale': { const v = parseInt(val)||0; return (
      <div className="py-4">
        <div className="flex justify-between mb-3 text-[11px] text-ink-400"><span>Not at all</span><span>Extremely</span></div>
        <div className="flex gap-1.5 justify-center">{[1,2,3,4,5,6,7,8,9,10].map(n=>(
          <button key={n} onClick={()=>onChange(n)} className={`w-10 h-10 rounded-xl font-bold text-sm transition-all active:scale-90 ${n===v?'text-white shadow-md scale-105':'bg-white text-ink-500 border border-ink-200 hover:border-ink-300'}`}
            style={n===v?{backgroundColor:tc}:{}}>{n}</button>
        ))}</div>
      </div>
    );}
    default: return <input type="text" value={val} onChange={e=>onChange(e.target.value)} className={base} placeholder="Your answer..."/>;
  }
}
