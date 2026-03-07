import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

function getToken(slug) {
  const k = `nx_${slug}`; let t = localStorage.getItem(k);
  if (!t) { t = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, t); }
  return t;
}

const pageVariants = {
  enter: (dir) => ({ y: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir) => ({ y: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function SurveyRespond() {
  const { slug } = useParams();
  const [sv, setSv] = useState(null);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [step, setStep] = useState(-1);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSub] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(null);
  const token = useRef(null);
  const timer = useRef(null);
  const cnt = useRef(0);
  const rId = useRef(null);

  useEffect(() => { init(); return () => clearTimeout(timer.current); }, [slug]);

  async function init() {
    try {
      const { data: s } = await supabase.from('surveys').select('*').eq('slug', slug).single();
      if (!s) { setErr('Survey not found'); return; }
      if (s.expires_at && new Date(s.expires_at) < new Date()) { setErr('This survey has expired.'); setSv(s); return; }
      if (s.status !== 'active') { setErr('Not accepting responses.'); setSv(s); return; }
      setSv(s); token.current = getToken(slug);
      const { data: q } = await supabase.from('survey_questions').select('*').eq('survey_id', s.id).order('sort_order');
      setQs(q || []);
      const { data: ex } = await supabase.from('survey_responses').select('*,survey_answers(*)').eq('session_token', token.current).eq('status', 'in_progress').single();
      if (ex) {
        rId.current = ex.id;
        const r = {}; (ex.survey_answers || []).forEach(a => { r[a.question_id] = a.answer_json || a.answer_value || ''; }); setAns(r);
        const first = (q || []).findIndex(x => !r[x.id]); setStep(first >= 0 ? first : 0); setSaved(ex.last_saved_at);
      } else { setStep(s.welcome_message ? -1 : 0); }
    } catch (e) { console.error(e); setErr('Failed to load'); }
    finally { setLoading(false); }
  }

  async function ensureR() {
    if (rId.current) return rId.current;
    const { data } = await supabase.from('survey_responses').insert({ survey_id: sv.id, session_token: token.current, respondent_email: email || null, status: 'in_progress' }).select().single();
    if (data) rId.current = data.id; return rId.current;
  }

  const autoSave = useCallback(async (a, id) => {
    if (!id) return;
    try {
      for (const [qId, v] of Object.entries(a)) {
        const j = typeof v === 'object';
        await supabase.from('survey_answers').upsert({ response_id: id, question_id: qId, answer_value: j ? null : String(v), answer_json: j ? v : null }, { onConflict: 'response_id,question_id' });
      }
      await supabase.from('survey_responses').update({ last_saved_at: new Date().toISOString() }).eq('id', id);
      setSaved(new Date().toISOString());
    } catch (e) { console.error('Auto-save:', e); }
  }, []);

  const setAn = async (qId, val) => {
    const next = { ...ans, [qId]: val }; setAns(next); const id = await ensureR(); cnt.current++;
    if (cnt.current >= (sv?.auto_save_interval || 2)) { cnt.current = 0; autoSave(next, id); }
    else { clearTimeout(timer.current); timer.current = setTimeout(() => { autoSave(next, id); cnt.current = 0; }, 5000); }
  };

  async function submit() {
    for (const q of qs) { if (q.is_required && !ans[q.id]) { goTo(qs.indexOf(q)); return alert(`Please answer: "${q.question_text}"`); } }
    setSub(true);
    try { const id = await ensureR(); await autoSave(ans, id); await supabase.from('survey_responses').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id); setDone(true); localStorage.removeItem(`nx_${slug}`); }
    catch (e) { alert('Failed — answers saved, try again.'); }
    finally { setSub(false); }
  }

  function goTo(n) { setDir(n > step ? 1 : -1); setStep(n); }

  function goNext() {
    const q = qs[step]; if (q?.is_required && !ans[q.id]) return alert('Required');
    setDir(1); setStep(s => s + 1);
  }

  function goBack() { setDir(-1); setStep(s => Math.max(sv?.welcome_message ? -1 : 0, s - 1)); }

  const tc = sv?.theme_color || '#10B981';
  const q = qs[step];
  const pct = qs.length ? Math.round(((step + 1) / qs.length) * 100) : 0;
  const total = qs.length;

  // === LOADING ===
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-dark">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-3 h-3 rounded-full" style={{ backgroundColor: tc }} />
    </div>
  );

  // === ERROR ===
  if (err) return (
    <div className="h-screen flex items-center justify-center bg-dark px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <p className="text-6xl mb-6">🚫</p>
        <h1 className="text-3xl font-bold text-white mb-3">Unavailable</h1>
        <p className="text-white/40">{err}</p>
      </motion.div>
    </div>
  );

  // === DONE — celebration ===
  if (done) return (
    <div className="h-screen flex items-center justify-center bg-dark relative overflow-hidden px-8">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: tc + '20' }} />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center relative z-10 max-w-md">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center" style={{ backgroundColor: tc + '20' }}>
          <svg className="w-12 h-12" style={{ color: tc }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
          </svg>
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-4">Thank you!</h1>
        <p className="text-white/40 text-lg leading-relaxed">{sv?.thank_you_message || 'Your insights help build better products.'}</p>
      </motion.div>
    </div>
  );

  // === MAIN — full-screen question experience ===
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: step === -1 ? '#0A0A0A' : '#FFFFFF' }}>
      {/* Top bar — minimal, stays out of the way */}
      <div className="flex-shrink-0 relative z-20">
        <div className="flex items-center justify-between px-6 md:px-10 h-14">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: step === -1 ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>
            {sv.title}
          </span>
          <div className="flex items-center gap-4">
            {saved && <span className="flex items-center gap-1.5 text-[10px]" style={{ color: step === -1 ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tc }} /> Saved
            </span>}
            {step >= 0 && (
              <span className="text-xs font-bold" style={{ color: tc }}>{step + 1}<span style={{ color: '#9CA3AF' }}>/{total}</span></span>
            )}
          </div>
        </div>
        {/* Progress — ultra thin line */}
        {step >= 0 && (
          <div className="h-[2px] bg-gray-100">
            <motion.div className="h-full" style={{ backgroundColor: tc }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        )}
      </div>

      {/* Question area — fills remaining viewport */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          {/* === WELCOME === */}
          {step === -1 && (
            <motion.div key="welcome" custom={dir}
              variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center px-8">
              <div className="text-center max-w-xl">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-white leading-tight tracking-tight mb-6">
                  {sv.title}
                </motion.h1>
                {sv.description && <p className="text-white/40 text-lg mb-4">{sv.description}</p>}
                {sv.welcome_message && <p className="text-white/50 mb-10">{sv.welcome_message}</p>}

                {sv.require_email && (
                  <div className="max-w-xs mx-auto mb-8 text-left">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent"
                      placeholder="Your email" />
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { if (sv.require_email && !email) return alert('Email required'); setDir(1); setStep(0); }}
                  className="px-10 py-4 rounded-full text-white text-lg font-semibold transition-all" style={{ backgroundColor: tc }}>
                  Begin →
                </motion.button>
                <p className="text-white/20 text-xs mt-6">{total} questions · ~{Math.max(1, Math.ceil(total * 0.5))} min</p>
              </div>
            </motion.div>
          )}

          {/* === QUESTION — fills the screen === */}
          {step >= 0 && step < total && q && (
            <motion.div key={q.id} custom={dir}
              variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center px-6 md:px-16">
              <div className="w-full max-w-2xl">
                {/* Question number */}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: tc }}>
                  Question {step + 1}
                  {q.is_required && <span className="text-red-400 ml-2">*</span>}
                </motion.p>

                {/* Question text — LARGE */}
                <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-dark leading-snug tracking-tight mb-3">
                  {q.question_text}
                </motion.h2>
                {q.description && <p className="text-muted text-base mb-8">{q.description}</p>}

                {/* Answer — big, tactile */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className={q.description ? '' : 'mt-10'}>
                  <QInput q={q} val={ans[q.id] || ''} set={v => setAn(q.id, v)} tc={tc} />
                </motion.div>

                {/* Nav */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="flex items-center justify-between mt-12">
                  <button onClick={goBack} disabled={step <= 0 && !sv.welcome_message}
                    className="text-sm font-medium text-muted hover:text-dark disabled:opacity-20 transition-colors">
                    ← Back
                  </button>
                  {step < total - 1 ? (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={goNext}
                      className="px-8 py-3.5 rounded-full text-white text-sm font-semibold" style={{ backgroundColor: tc }}>
                      Continue →
                    </motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={submit} disabled={submitting}
                      className="px-8 py-3.5 rounded-full text-white text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: tc }}>
                      {submitting ? 'Submitting...' : 'Submit ✓'}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════ QUESTION INPUT COMPONENTS ═══════
function QInput({ q, val, set, tc }) {
  switch (q.question_type) {
    case 'short_text': return <input type="text" value={val} onChange={e => set(e.target.value)} className="u-input" placeholder="Type your answer..." autoFocus />;
    case 'long_text': return <textarea value={val} onChange={e => set(e.target.value)} className="u-input resize-none min-h-[120px] text-2xl md:text-3xl" placeholder="Type your answer..." autoFocus />;
    case 'email': return <input type="email" value={val} onChange={e => set(e.target.value)} className="u-input" placeholder="name@company.com" autoFocus />;
    case 'number': return <input type="number" value={val} onChange={e => set(e.target.value)} className="u-input !text-6xl font-bold w-48" placeholder="0" autoFocus />;
    case 'date': return <input type="date" value={val} onChange={e => set(e.target.value)} className="u-input !text-2xl" />;

    case 'yes_no': return (
      <div className="grid grid-cols-2 gap-4">
        {[{ l: 'Yes', e: '👍', v: 'yes' }, { l: 'No', e: '👎', v: 'no' }].map(o => (
          <motion.button key={o.v} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.97 }}
            onClick={() => set(o.v)}
            className={`py-10 rounded-2xl border-2 font-bold text-xl transition-all ${val === o.v ? 'text-white border-transparent' : 'border-gray-200 text-dark bg-white'}`}
            style={val === o.v ? { backgroundColor: tc } : {}}>
            <span className="text-4xl block mb-3">{o.e}</span>{o.l}
          </motion.button>
        ))}
      </div>
    );

    case 'single_choice': return (
      <div className="space-y-3">
        {(q.options || []).map((o, i) => (
          <motion.button key={i} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            onClick={() => set(o.value)}
            className={`ans-opt ${val === o.value ? 'picked' : ''}`}
            style={val === o.value ? { borderColor: tc, backgroundColor: tc + '08' } : {}}>
            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={val === o.value ? { borderColor: tc, backgroundColor: tc } : { borderColor: '#D1D5DB' }}>
              {val === o.value && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-base font-medium text-dark flex-1">{o.label}</span>
            <span className="text-xs text-gray-300 font-mono">{String.fromCharCode(65 + i)}</span>
          </motion.button>
        ))}
      </div>
    );

    case 'multiple_choice': { const sel = Array.isArray(val) ? val : []; return (
      <div className="space-y-3">
        {(q.options || []).map((o, i) => { const c = sel.includes(o.value); return (
          <motion.button key={i} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
            onClick={() => set(c ? sel.filter(v => v !== o.value) : [...sel, o.value])}
            className={`ans-opt ${c ? 'picked' : ''}`}
            style={c ? { borderColor: tc, backgroundColor: tc + '08' } : {}}>
            <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={c ? { borderColor: tc, backgroundColor: tc } : { borderColor: '#D1D5DB' }}>
              {c && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-base font-medium text-dark flex-1">{o.label}</span>
          </motion.button>
        ); })}
      </div>
    ); }

    case 'dropdown': return <select value={val} onChange={e => set(e.target.value)} className="u-input !text-2xl cursor-pointer"><option value="">Choose...</option>{(q.options || []).map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}</select>;

    case 'rating': { const r = parseInt(val) || 0; return (
      <div className="flex gap-4 py-4">
        {[1, 2, 3, 4, 5].map(s => (
          <motion.button key={s} whileHover={{ scale: 1.2, y: -8 }} whileTap={{ scale: 0.9 }}
            onClick={() => set(s)}
            className={`text-6xl transition-all cursor-pointer ${s <= r ? '' : 'grayscale opacity-20'}`}
            style={s <= r ? { filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.4))' } : {}}>
            ⭐
          </motion.button>
        ))}
      </div>
    ); }

    case 'scale': { const v = parseInt(val) || 0; return (
      <div className="py-4">
        <div className="flex justify-between mb-4 text-xs font-medium text-muted"><span>Not at all</span><span>Extremely</span></div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <motion.button key={n} whileHover={{ y: -4 }} whileTap={{ scale: 0.9 }}
              onClick={() => set(n)}
              className={`flex-1 h-14 rounded-xl font-bold text-base transition-all ${n === v ? 'text-white shadow-lg' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
              style={n === v ? { backgroundColor: tc } : {}}>
              {n}
            </motion.button>
          ))}
        </div>
      </div>
    ); }

    default: return <input type="text" value={val} onChange={e => set(e.target.value)} className="u-input" placeholder="Your answer..." />;
  }
}
