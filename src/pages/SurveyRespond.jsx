import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

// ── Question type components ─────────────────────────────────────────────────
import RankingInput from '../components/questions/RankingInput';
import SliderInput  from '../components/questions/SliderInput';
import MatrixInput  from '../components/questions/MatrixInput';

// ── Phase 2: behavioural tracking ────────────────────────────────────────────
import { useConditionalLogic } from '../hooks/useConditionalLogic';
import { useResponseTracking } from '../hooks/useResponseTracking';
import { useExitDetection }    from '../hooks/useExitDetection';

// ── Phase 3: completion UX boosters ──────────────────────────────────────────
import SmartNudge    from '../components/SmartNudge';
import EstimatedTime from '../components/EstimatedTime';
import FatigueShorter from '../components/FatigueShorter';

// ─────────────────────────────────────────────────────────────────────────────
// Session token — persists across page reloads for resume
// ─────────────────────────────────────────────────────────────────────────────
function getToken(slug) {
  const k = `nx_${slug}`;
  let t = localStorage.getItem(k);
  if (!t) {
    t = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(k, t);
  }
  return t;
}

const slide = {
  enter:  dir => ({ y: dir > 0 ? 60  : -60,  opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit:   dir => ({ y: dir > 0 ? -60 :  60,  opacity: 0 }),
};

// ─────────────────────────────────────────────────────────────────────────────
export default function SurveyRespond() {
  const { slug } = useParams();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [sv,         setSv]    = useState(null);
  const [qs,         setQs]    = useState([]);
  const [ans,        setAns]   = useState({});
  const [step,       setStep]  = useState(-1);
  const [dir,        setDir]   = useState(1);
  const [loading,    setL]     = useState(true);
  const [submitting, sSub]     = useState(false);
  const [done,       setDone]  = useState(false);
  const [err,        setErr]   = useState(null);
  const [email,      setEmail] = useState('');
  const [saved,      setSaved] = useState(null);

  // ── Phase 3: streamline mode — skip optional questions automatically ────────
  const [streamlineMode, setStreamlineMode] = useState(false);

  const token = useRef(null);
  const timer = useRef(null);
  const cnt   = useRef(0);
  const rId   = useRef(null);

  // ── Phase 2: tracking & exit detection ────────────────────────────────────
  const tracker = useResponseTracking(rId);
  useExitDetection(rId, tracker.onAbandon, done);

  // ── Conditional logic ──────────────────────────────────────────────────────
  const { visibleQuestions, nextVisible, prevVisible, progressAt } =
    useConditionalLogic(qs, ans);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    init();
    return () => clearTimeout(timer.current);
  }, [slug]);

  async function init() {
    try {
      const { data: s } = await supabase
        .from('surveys').select('*').eq('slug', slug).single();

      if (!s)                    { setErr('Survey not found'); return; }
      if (s.status !== 'active') { setErr('Not accepting responses right now.'); setSv(s); return; }
      if (s.expires_at && new Date(s.expires_at) < new Date()) {
        setErr('This survey has expired.'); setSv(s); return;
      }

      setSv(s);
      token.current = getToken(slug);

      const { data: q } = await supabase
        .from('survey_questions').select('*')
        .eq('survey_id', s.id).order('sort_order');
      setQs(q || []);

      const { data: ex } = await supabase
        .from('survey_responses')
        .select('*, survey_answers(*)')
        .eq('session_token', token.current)
        .eq('status', 'in_progress')
        .single();

      if (ex) {
        rId.current = ex.id;
        const r = {};
        (ex.survey_answers || []).forEach(a => {
          r[a.question_id] = a.answer_json ?? a.answer_value ?? '';
        });
        setAns(r);
        const first = (q || []).findIndex(x => !r[x.id]);
        setStep(first >= 0 ? first : 0);
        setSaved(ex.last_saved_at);
      } else {
        setStep(s.welcome_message ? -1 : 0);
      }
    } catch (e) {
      console.error(e); setErr('Failed to load survey');
    } finally {
      setL(false);
    }
  }

  // ── Create response row on first answer ───────────────────────────────────
  async function ensureR() {
    if (rId.current) return rId.current;
    const { data } = await supabase
      .from('survey_responses')
      .insert({
        survey_id:        sv.id,
        session_token:    token.current,
        respondent_email: email || null,
        status:           'in_progress',
      })
      .select().single();
    if (data) rId.current = data.id;
    return rId.current;
  }

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const autoSave = useCallback(async (a, id) => {
    if (!id) return;
    try {
      for (const [qId, v] of Object.entries(a)) {
        const isObj = v !== null && typeof v === 'object';
        await supabase.from('survey_answers').upsert(
          { response_id: id, question_id: qId,
            answer_value: isObj ? null : String(v),
            answer_json:  isObj ? v    : null },
          { onConflict: 'response_id,question_id' }
        );
      }
      await supabase.from('survey_responses')
        .update({ last_saved_at: new Date().toISOString() }).eq('id', id);
      setSaved(new Date().toISOString());
    } catch (e) { console.error('Auto-save:', e); }
  }, []);

  // ── Answer setter ──────────────────────────────────────────────────────────
  const setAn = async (qId, val) => {
    const next = { ...ans, [qId]: val };
    setAns(next);
    tracker.onEdit(qId);
    const id = await ensureR();
    cnt.current++;
    if (cnt.current >= (sv?.auto_save_interval || 2)) {
      cnt.current = 0;
      autoSave(next, id);
      tracker.flush();
    } else {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        autoSave(next, id); tracker.flush(); cnt.current = 0;
      }, 5000);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    for (const q of visibleQuestions) {
      if (q.is_required && !ans[q.id]) {
        goTo(qs.indexOf(q));
        return toast.error(`Please answer: "${q.question_text}"`);
      }
    }
    sSub(true);
    try {
      const id = await ensureR();
      await tracker.onSubmit(ans, qs);
      await autoSave(ans, id);
      await supabase.from('survey_responses')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      setDone(true);
      localStorage.removeItem(`nx_${slug}`);
    } catch (e) {
      toast.error('Submission failed — your answers are saved. Please try again.');
    } finally { sSub(false); }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goTo(n) { setDir(n > step ? 1 : -1); setStep(n); }

  function goNext() {
    const q = qs[step];
    if (q?.is_required && !ans[q.id]) return toast.error('This question is required');
    if (q) tracker.onLeave(q.id);
    const next = nextVisible(step);
    if (next !== null) {
      setDir(1); setStep(next);
      tracker.onEnter(qs[next]?.id);
    } else {
      setDir(1); setStep(qs.length);
    }
  }

  function goBack() {
    if (step >= 0 && qs[step]) tracker.onLeave(qs[step].id);
    tracker.onBack();
    const prev = prevVisible(step);
    setDir(-1);
    if (prev !== null) {
      setStep(prev);
      tracker.onEnter(qs[prev]?.id);
    } else if (sv?.welcome_message) {
      setStep(-1);
    } else {
      setStep(0);
    }
  }

  // Fire onEnter for the very first question once data is loaded
  useEffect(() => {
    if (step >= 0 && qs[step]) tracker.onEnter(qs[step].id);
  }, []); // eslint-disable-line

  // ── Phase 3: streamline — auto-advance optional unanswered questions ────────
  // When activated, whenever the step lands on an optional question with no answer,
  // wait 600ms then skip forward automatically.
  const streamlineTimer = useRef(null);
  useEffect(() => {
    clearTimeout(streamlineTimer.current);
    if (!streamlineMode || step < 0 || done) return;
    const q = qs[step];
    if (q && !q.is_required && !ans[q.id]) {
      streamlineTimer.current = setTimeout(() => {
        goNext();
      }, 600);
    }
    return () => clearTimeout(streamlineTimer.current);
  }, [streamlineMode, step]); // eslint-disable-line

  // ── Phase 3: live avg secs per question from tracker (via metadata flush) ──
  // We read the timing data that useResponseTracking accumulates in its refs.
  // Since that hook doesn't expose internal state directly, we derive a rough
  // avg from how long the current session has been running vs questions answered.
  const [sessionStartMs] = useState(() => Date.now());
  const avgSecsPerQ = useMemo(() => {
    const answered = Object.keys(ans).length;
    if (answered < 2) return 0;
    const elapsedSecs = (Date.now() - sessionStartMs) / 1000;
    return elapsedSecs / answered;
  }, [ans, sessionStartMs]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const tc           = sv?.theme_color || '#FF4500';
  const q            = qs[step];
  const onWelcome    = step === -1;
  const total        = qs.length;
  const pct          = step >= 0 ? progressAt(step) : 0;
  const visiblePos   = step >= 0
    ? visibleQuestions.findIndex(vq => vq.id === q?.id) + 1
    : 0;
  const visibleTotal = visibleQuestions.length;
  const isLastQ      = step >= 0 && nextVisible(step) === null;

  // Questions the respondent still needs to complete (unanswered visible ones)
  const remainingQuestions = useMemo(() =>
    visibleQuestions.filter(vq => !ans[vq.id]),
    [visibleQuestions, ans]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--espresso)', gap:24 }}>
      <div style={{ display:'flex', alignItems:'flex-start', lineHeight:1 }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(253,245,232,0.35)', marginRight:8, position:'relative', top:-2 }}>Nexora</span>
        <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:22, letterSpacing:'-1px', color:'var(--cream)', lineHeight:1 }}>Pulse</span>
        <div style={{ width:9, height:9, background:'#FF4500', borderRadius:'50%', alignSelf:'flex-start', marginTop:5, marginLeft:8 }} />
      </div>
      <motion.div animate={{ scaleX:[0.3,1,0.3] }} transition={{ repeat:Infinity, duration:1.6, ease:'easeInOut' }}
        style={{ width:40, height:2, borderRadius:2, background:'#FF4500', transformOrigin:'center' }} />
    </div>
  );

  // ERROR
  if (err) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--espresso)', padding:32 }}>
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,69,0,0.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:30 }}>✕</div>
        <h1 style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:32, letterSpacing:'-1px', color:'var(--cream)', marginBottom:12 }}>Unavailable</h1>
        <p style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:17, color:'rgba(253,245,232,0.45)', lineHeight:1.7 }}>{err}</p>
      </motion.div>
    </div>
  );

  // THANK YOU
  if (done) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--espresso)', padding:32, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,${tc}22,transparent 70%)`, filter:'blur(30px)', pointerEvents:'none' }} />
      <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
        transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}
        style={{ textAlign:'center', maxWidth:480, position:'relative', zIndex:1 }}>
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.2, type:'spring', stiffness:200 }}
          style={{ width:88, height:88, borderRadius:'50%', background:`${tc}20`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 32px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={tc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 13l4 4L19 7" initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ delay:0.5, duration:0.6 }} />
          </svg>
        </motion.div>
        <h1 style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:'clamp(28px,5vw,48px)', letterSpacing:'-2px', color:'var(--cream)', marginBottom:16, lineHeight:1.05 }}>Thank you.</h1>
        <p style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:18, color:'rgba(253,245,232,0.5)', lineHeight:1.7, maxWidth:360, margin:'0 auto' }}>
          {sv?.thank_you_message || 'Your insights help build better products and experiences.'}
        </p>
        <div style={{ marginTop:48, display:'flex', alignItems:'flex-start', lineHeight:1, justifyContent:'center' }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:8, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(253,245,232,0.2)', marginRight:6, position:'relative', top:-1 }}>Nexora</span>
          <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:18, letterSpacing:'-0.5px', color:'rgba(253,245,232,0.2)', lineHeight:1 }}>Pulse</span>
        </div>
      </motion.div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background: onWelcome ? 'var(--espresso)' : 'var(--warm-white)' }}>

      {/* ── Top bar ── */}
      <div style={{ flexShrink:0, position:'relative', zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:60 }}>

          {/* Wordmark */}
          <div style={{ display:'flex', alignItems:'flex-start', lineHeight:1 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:8, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color: onWelcome ? 'rgba(253,245,232,0.3)' : 'rgba(22,15,8,0.25)', marginRight:6, position:'relative', top:-1 }}>Nexora</span>
            <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:18, letterSpacing:'-0.5px', color: onWelcome ? 'rgba(253,245,232,0.5)' : 'rgba(22,15,8,0.4)', lineHeight:1 }}>Pulse</span>
          </div>

          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Phase 3: EstimatedTime — appears in top bar */}
            {!onWelcome && step >= 0 && (
              <EstimatedTime
                remainingQuestions={remainingQuestions}
                avgSecsPerQ={avgSecsPerQ}
                onWelcome={onWelcome}
                tc={tc}
              />
            )}
            {saved && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color: onWelcome ? 'rgba(253,245,232,0.3)' : 'rgba(22,15,8,0.3)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:tc }} />Saved
              </span>
            )}
            {step >= 0 && (
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:12, color:tc }}>
                {visiblePos}<span style={{ color: onWelcome ? 'rgba(253,245,232,0.25)' : 'rgba(22,15,8,0.25)' }}>/{visibleTotal}</span>
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {step >= 0 && sv?.show_progress_bar !== false && (
          <div style={{ height:2, background: onWelcome ? 'rgba(253,245,232,0.08)' : 'rgba(22,15,8,0.06)' }}>
            <motion.div animate={{ width:`${pct}%` }} transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}
              style={{ height:'100%', background:tc, borderRadius:2 }} />
          </div>
        )}
      </div>

      {/* ── Question area ── */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* Phase 3: FatigueShorter — overlays inside question area */}
        {step >= 0 && q && (
          <FatigueShorter
            question={q}
            visiblePos={visiblePos}
            visibleTotal={visibleTotal}
            hasAnswer={!!ans[q.id]}
            avgSecsPerQ={avgSecsPerQ}
            onSkip={goNext}
            onStreamline={() => setStreamlineMode(true)}
            tc={tc}
          />
        )}

        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Welcome screen ── */}
          {step === -1 && (
            <motion.div key="welcome" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
              transition={{ duration:0.45, ease:[0.16,1,0.3,1] }}
              style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
                <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', filter:'blur(80px)', background:`radial-gradient(circle,${tc}30,transparent 70%)`, top:-200, right:-200 }} />
                <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', filter:'blur(80px)', background:'radial-gradient(circle,rgba(255,184,0,0.15),transparent 70%)', bottom:-100, left:-100 }} />
              </div>
              <div style={{ textAlign:'center', maxWidth:540, position:'relative', zIndex:1 }}>
                <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15, duration:0.5 }}
                  style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:'clamp(28px,5vw,54px)', letterSpacing:'-2px', color:'var(--cream)', lineHeight:1.05, marginBottom:20 }}>
                  {sv.title}
                </motion.h1>
                {sv.description && <motion.p initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }} style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:18, color:'rgba(253,245,232,0.5)', lineHeight:1.7, marginBottom:12 }}>{sv.description}</motion.p>}
                {sv.welcome_message && <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }} style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:16, color:'rgba(253,245,232,0.35)', lineHeight:1.7, marginBottom:32 }}>{sv.welcome_message}</motion.p>}
                {sv.require_email && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.35 }} style={{ maxWidth:320, margin:'0 auto 28px' }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
                      style={{ width:'100%', boxSizing:'border-box', padding:'14px 20px', background:'rgba(253,245,232,0.08)', border:'1px solid rgba(253,245,232,0.15)', borderRadius:14, fontFamily:'Fraunces,serif', fontSize:16, color:'var(--cream)', outline:'none', textAlign:'center', transition:'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor = tc} onBlur={e => e.target.style.borderColor = 'rgba(253,245,232,0.15)'} />
                  </motion.div>
                )}
                <motion.button initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                  whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }}
                  onClick={() => {
                    if (sv.require_email && !email) return toast.error('Please enter your email to begin');
                    if (sv.require_email && email && !/^[^@]+@[^@]+.[^@]+$/.test(email)) return toast.error('Please enter a valid email address');
                    setDir(1);
                    const firstVisible = qs.findIndex(q => visibleQuestions.some(vq => vq.id === q.id));
                    const idx = firstVisible >= 0 ? firstVisible : 0;
                    setStep(idx);
                    tracker.onEnter(qs[idx]?.id);
                  }}
                  style={{ padding:'16px 40px', borderRadius:999, border:'none', background:tc, color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', boxShadow:`0 8px 32px ${tc}50` }}>
                  Begin →
                </motion.button>
                <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.55 }}
                  style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(253,245,232,0.2)', marginTop:24 }}>
                  {visibleTotal} question{visibleTotal !== 1 ? 's' : ''} · ~{Math.max(1, Math.ceil(visibleTotal * 0.5))} min
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* ── Question screen ── */}
          {step >= 0 && step < total && q && (
            <motion.div key={q.id} custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
              transition={{ duration:0.45, ease:[0.16,1,0.3,1] }}
              style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 32px', overflowY:'auto' }}>
              <div style={{ width:'100%', maxWidth:660 }}>

                {/* Counter row */}
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}
                  style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:tc }}>{visiblePos} / {visibleTotal}</span>
                  {q.is_required && <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'rgba(214,59,31,0.7)' }}>Required</span>}
                  {!q.is_required && <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'rgba(22,15,8,0.25)' }}>Optional</span>}
                </motion.div>

                {/* Question */}
                <motion.h2 initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15, duration:0.4 }}
                  style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:'clamp(22px,3.5vw,38px)', letterSpacing:'-1px', color:'var(--espresso)', lineHeight:1.15, marginBottom: q.description ? 12 : 0 }}>
                  {q.question_text}
                </motion.h2>
                {q.description && (
                  <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
                    style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:16, color:'rgba(22,15,8,0.45)', marginBottom:0, lineHeight:1.6 }}>
                    {q.description}
                  </motion.p>
                )}

                {/* Input */}
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.28, duration:0.4 }}
                  style={{ marginTop:32 }}>
                  <QInput q={q} val={ans[q.id] ?? ''} set={v => setAn(q.id, v)} tc={tc} />
                </motion.div>

                {/* Navigation */}
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.45 }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:40 }}>
                  <button onClick={goBack}
                    disabled={step <= 0 && !sv?.welcome_message}
                    style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)', background:'none', border:'none', cursor:'pointer', opacity:(step <= 0 && !sv?.welcome_message) ? 0.2 : 1, transition:'color 0.2s, opacity 0.2s', padding:0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--espresso)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.35)'}>
                    ← Back
                  </button>
                  {!isLastQ ? (
                    <motion.button whileHover={{ scale:1.02, y:-1 }} whileTap={{ scale:0.97 }} onClick={goNext}
                      style={{ padding:'13px 32px', borderRadius:999, border:'none', background:'var(--espresso)', color:'var(--cream)', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', transition:'background 0.25s' }}
                      onMouseEnter={e => e.currentTarget.style.background = tc}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--espresso)'}>
                      Continue →
                    </motion.button>
                  ) : (
                    <motion.button whileHover={{ scale:1.02, y:-1 }} whileTap={{ scale:0.97 }} onClick={submit} disabled={submitting}
                      style={{ padding:'13px 32px', borderRadius:999, border:'none', background:tc, color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', opacity: submitting ? 0.6 : 1, boxShadow:`0 6px 24px ${tc}40` }}>
                      {submitting ? 'Submitting…' : 'Submit ✓'}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Phase 3: SmartNudge — floats above nav, inside question area */}
        {step >= 0 && !onWelcome && (
          <SmartNudge
            visiblePos={visiblePos}
            visibleTotal={visibleTotal}
            tc={tc}
          />
        )}

      </div>{/* end question area */}

      {/* ── Scoped CSS ── */}
      <style>{`
        .q-text-input { width:100%; box-sizing:border-box; background:transparent; border:none; border-bottom:2px solid rgba(22,15,8,0.12); font-family:'Fraunces',serif; font-size:clamp(18px,2.5vw,26px); font-weight:300; color:var(--espresso); outline:none; padding:8px 0 14px; transition:border-color 0.2s; }
        .q-text-input:focus { border-bottom-color:var(--focus-color,#FF4500); }
        .q-text-input::placeholder { color:rgba(22,15,8,0.18); }
        .q-textarea { min-height:120px; resize:none; line-height:1.6; }
        .q-choice { width:100%; display:flex; align-items:center; gap:16px; padding:16px 20px; border-radius:16px; border:1.5px solid rgba(22,15,8,0.1); background:var(--warm-white); cursor:pointer; text-align:left; transition:all 0.2s; }
        .q-choice:hover { border-color:rgba(22,15,8,0.2); background:var(--cream); transform:translateX(4px); }
        .q-choice.active { border-color:var(--act-color,#FF4500); background:var(--act-bg,rgba(255,69,0,0.06)); }
        .q-radio,.q-checkbox { width:22px; height:22px; flex-shrink:0; border:2px solid rgba(22,15,8,0.18); display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
        .q-radio { border-radius:50%; } .q-checkbox { border-radius:6px; }
        .q-radio.active,.q-checkbox.active { border-color:var(--act-color,#FF4500); background:var(--act-color,#FF4500); }
        .q-label { font-family:'Fraunces',serif; font-weight:300; font-size:17px; color:var(--espresso); flex:1; line-height:1.4; }
        .q-key   { font-family:'Syne',sans-serif; font-size:10px; font-weight:700; letter-spacing:0.1em; color:rgba(22,15,8,0.25); flex-shrink:0; }
        .scale-btn { flex:1; height:52px; border-radius:12px; border:1.5px solid rgba(22,15,8,0.1); background:var(--warm-white); font-family:'Syne',sans-serif; font-weight:700; font-size:14px; color:rgba(22,15,8,0.5); cursor:pointer; transition:all 0.2s; }
        .scale-btn:hover  { border-color:rgba(22,15,8,0.25); transform:translateY(-3px); color:var(--espresso); }
        .scale-btn.active { border-color:var(--act-color,#FF4500); background:var(--act-color,#FF4500); color:white; transform:translateY(-3px); }
        .star-btn { background:none; border:none; cursor:pointer; font-size:44px; padding:4px; transition:all 0.2s; filter:grayscale(1); opacity:0.2; line-height:1; }
        .star-btn.lit  { filter:none; opacity:1; }
        .star-btn:hover { transform:scale(1.15) translateY(-4px); filter:none; opacity:1; }
        .yn-btn { flex:1; padding:28px 0; border-radius:20px; border:2px solid rgba(22,15,8,0.1); background:var(--warm-white); cursor:pointer; transition:all 0.25s; text-align:center; font-family:'Playfair Display',serif; font-weight:700; font-size:18px; color:var(--espresso); }
        .yn-btn:hover  { border-color:rgba(22,15,8,0.2); transform:translateY(-4px); box-shadow:0 12px 40px rgba(22,15,8,0.08); }
        .yn-btn.active { border-color:transparent; color:white; }
        .yn-emoji { font-size:36px; display:block; margin-bottom:10px; }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QInput — question type renderer (unchanged from Phase 2)
// ─────────────────────────────────────────────────────────────────────────────
function QInput({ q, val, set, tc }) {
  const cssVars = { '--focus-color':tc, '--act-color':tc, '--act-bg': tc+'10' };
  switch (q.question_type) {
    case 'short_text':  return <input type="text" value={val} onChange={e => set(e.target.value)} className="q-text-input" placeholder="Type your answer…" autoFocus style={cssVars} />;
    case 'long_text':   return <textarea value={val} onChange={e => set(e.target.value)} className="q-text-input q-textarea" placeholder="Type your answer…" autoFocus style={cssVars} />;
    case 'email':       return <input type="email" value={val} onChange={e => set(e.target.value)} className="q-text-input" placeholder="name@company.com" autoFocus style={cssVars} />;
    case 'number':      return <div style={{ display:'flex', alignItems:'baseline', gap:12 }}><input type="number" value={val} onChange={e => set(e.target.value)} className="q-text-input" placeholder="0" autoFocus style={{ ...cssVars, width:160, fontSize:52, fontWeight:400, textAlign:'center', letterSpacing:'-2px' }} /></div>;
    case 'date':        return <input type="date" value={val} onChange={e => set(e.target.value)} className="q-text-input" style={{ ...cssVars, fontSize:24 }} />;
    case 'yes_no':      return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:480 }}>
        {[{l:'Yes',e:'👍',v:'yes'},{l:'No',e:'👎',v:'no'}].map(o => (
          <motion.button key={o.v} whileHover={{ y:-4 }} whileTap={{ scale:0.97 }}
            onClick={() => set(o.v)} className={`yn-btn${val===o.v?' active':''}`}
            style={val===o.v?{backgroundColor:tc,borderColor:tc}:{}}>
            <span className="yn-emoji">{o.e}</span>{o.l}
          </motion.button>
        ))}
      </div>
    );
    case 'single_choice': return (
      <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:560 }}>
        {(q.options||[]).map((o,i) => {
          const active = val===o.value;
          return (
            <motion.button key={i} whileTap={{ scale:0.99 }} onClick={() => set(o.value)}
              className={`q-choice${active?' active':''}`}
              style={active?{'--act-color':tc,'--act-bg':tc+'10',borderColor:tc,background:tc+'08'}:{}}>
              <div className={`q-radio${active?' active':''}`} style={active?{'--act-color':tc}:{}}>
                {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
              </div>
              <span className="q-label">{o.label}</span>
              <span className="q-key">{String.fromCharCode(65+i)}</span>
            </motion.button>
          );
        })}
      </div>
    );
    case 'multiple_choice': {
      const sel = Array.isArray(val) ? val : [];
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:560 }}>
          {(q.options||[]).map((o,i) => {
            const active = sel.includes(o.value);
            return (
              <motion.button key={i} whileTap={{ scale:0.99 }}
                onClick={() => set(active ? sel.filter(v=>v!==o.value) : [...sel,o.value])}
                className={`q-choice${active?' active':''}`}
                style={active?{borderColor:tc,background:tc+'08'}:{}}>
                <div className={`q-checkbox${active?' active':''}`} style={active?{'--act-color':tc}:{}}>
                  {active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                </div>
                <span className="q-label">{o.label}</span>
              </motion.button>
            );
          })}
        </div>
      );
    }
    case 'dropdown': return (
      <select value={val} onChange={e => set(e.target.value)}
        style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:22, color:'var(--espresso)', background:'var(--warm-white)', border:'1.5px solid rgba(22,15,8,0.12)', borderRadius:14, padding:'14px 20px', outline:'none', cursor:'pointer', width:'100%', maxWidth:480, transition:'border-color 0.2s' }}
        onFocus={e => e.target.style.borderColor=tc} onBlur={e => e.target.style.borderColor='rgba(22,15,8,0.12)'}>
        <option value="">Choose an option…</option>
        {(q.options||[]).map((o,i) => <option key={i} value={o.value}>{o.label}</option>)}
      </select>
    );
    case 'rating': {
      const r = parseInt(val)||0;
      return (
        <div style={{ display:'flex', gap:8 }}>
          {[1,2,3,4,5].map(s => (
            <motion.button key={s} whileHover={{ scale:1.2, y:-8 }} whileTap={{ scale:0.9 }}
              onClick={() => set(s)} className={`star-btn${s<=r?' lit':''}`}>⭐</motion.button>
          ))}
        </div>
      );
    }
    case 'scale': {
      const v = parseInt(val)||0;
      return (
        <div style={{ maxWidth:560 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)' }}>
            <span>Not at all</span><span>Extremely</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <motion.button key={n} whileHover={{ y:-4 }} whileTap={{ scale:0.92 }}
                onClick={() => set(n)} className={`scale-btn${n===v?' active':''}`}
                style={n===v?{'--act-color':tc,borderColor:tc,background:tc,color:'#fff'}:{}}>
                {n}
              </motion.button>
            ))}
          </div>
        </div>
      );
    }
    case 'ranking': return <RankingInput q={q} val={val||[]} set={set} tc={tc} />;
    case 'slider':  return <SliderInput  q={q} val={val}     set={set} tc={tc} />;
    case 'matrix':  return <MatrixInput  q={q} val={val||{}} set={set} tc={tc} />;
    default: return <input type="text" value={val} onChange={e => set(e.target.value)} className="q-text-input" placeholder="Your answer…" style={cssVars} />;
  }
}
