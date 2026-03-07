import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HiOutlineSparkles, HiOutlineCheckCircle, HiOutlineClock, HiOutlineArrowRight, HiOutlineArrowLeft } from 'react-icons/hi';

function getSessionToken(slug) {
  const key = `nexora_session_${slug}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, token);
  }
  return token;
}

export default function SurveyRespond() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [responseId, setResponseId] = useState(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back for animation
  const sessionToken = useRef(null);
  const saveTimerRef = useRef(null);
  const autoSaveCountRef = useRef(0);
  const responseIdRef = useRef(null);

  useEffect(() => {
    loadSurvey();
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [slug]);

  async function loadSurvey() {
    try {
      const { data: s, error: sErr } = await supabase.from('surveys').select('*').eq('slug', slug).single();
      if (sErr || !s) { setError('Survey not found'); setLoading(false); return; }
      if (s.expires_at && new Date(s.expires_at) < new Date()) {
        setError('This survey has expired and is no longer accepting responses.');
        setSurvey(s); setLoading(false); return;
      }
      if (s.status !== 'active') {
        setError('This survey is not currently accepting responses.');
        setSurvey(s); setLoading(false); return;
      }
      setSurvey(s);
      sessionToken.current = getSessionToken(slug);
      const { data: qs } = await supabase.from('survey_questions').select('*').eq('survey_id', s.id).order('sort_order');
      setQuestions(qs || []);

      const { data: existing } = await supabase
        .from('survey_responses').select('*, survey_answers(*)').eq('session_token', sessionToken.current).eq('status', 'in_progress').single();
      if (existing) {
        setResponseId(existing.id);
        responseIdRef.current = existing.id;
        const restored = {};
        (existing.survey_answers || []).forEach((a) => { restored[a.question_id] = a.answer_json || a.answer_value || ''; });
        setAnswers(restored);
        const firstUnanswered = (qs || []).findIndex((q) => !restored[q.id]);
        setCurrentStep(firstUnanswered >= 0 ? firstUnanswered : 0);
        setLastSaved(existing.last_saved_at);
      } else {
        setCurrentStep(s.welcome_message ? -1 : 0);
      }
    } catch (err) { console.error(err); setError('Failed to load survey'); } finally { setLoading(false); }
  }

  async function ensureResponse() {
    if (responseIdRef.current) return responseIdRef.current;
    if (responseId) { responseIdRef.current = responseId; return responseId; }
    try {
      const { data, error: rErr } = await supabase.from('survey_responses')
        .insert({ survey_id: survey.id, session_token: sessionToken.current, respondent_email: email || null, respondent_name: respondentName || null, status: 'in_progress' })
        .select().single();
      if (rErr) throw rErr;
      responseIdRef.current = data.id; setResponseId(data.id);
      return data.id;
    } catch (err) { console.error('Failed to create response:', err); return null; }
  }

  const autoSave = useCallback(async (currentAnswers, rId) => {
    if (!rId) return;
    try {
      for (const [qId, value] of Object.entries(currentAnswers)) {
        const isJson = typeof value === 'object';
        await supabase.from('survey_answers').upsert({
          response_id: rId, question_id: qId,
          answer_value: isJson ? null : String(value),
          answer_json: isJson ? value : null,
        }, { onConflict: 'response_id,question_id' });
      }
      await supabase.from('survey_responses').update({ last_saved_at: new Date().toISOString() }).eq('id', rId);
      setLastSaved(new Date().toISOString());
    } catch (err) { console.error('Auto-save failed:', err); }
  }, []);

  const setAnswer = async (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    const rId = await ensureResponse();
    autoSaveCountRef.current += 1;
    const interval = survey?.auto_save_interval || 2;
    if (autoSaveCountRef.current >= interval) {
      autoSaveCountRef.current = 0; autoSave(newAnswers, rId);
    } else {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { autoSave(newAnswers, rId); autoSaveCountRef.current = 0; }, 5000);
    }
  };

  async function handleSubmit() {
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) {
        setCurrentStep(questions.indexOf(q));
        return alert(`Please answer: "${q.question_text}"`);
      }
    }
    setSubmitting(true);
    try {
      const rId = await ensureResponse();
      await autoSave(answers, rId);
      await supabase.from('survey_responses').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', rId);
      setCompleted(true);
      localStorage.removeItem(`nexora_session_${slug}`);
    } catch (err) { console.error(err); alert('Submission failed. Your answers are saved — try again.'); }
    finally { setSubmitting(false); }
  }

  function goNext() {
    const currentQ = questions[currentStep];
    if (currentQ?.is_required && !answers[currentQ.id]) return alert('This question is required');
    setDirection(1);
    setCurrentStep((s) => s + 1);
  }

  function goBack() {
    setDirection(-1);
    setCurrentStep((s) => Math.max(survey?.welcome_message ? -1 : 0, s - 1));
  }

  const progress = questions.length > 0 ? Math.round(((currentStep + 1) / questions.length) * 100) : 0;
  const tc = survey?.theme_color || '#8b5cf6';
  const currentQ = questions[currentStep];

  // ====== LOADING ======
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="text-center animate-enter">
        <div className="w-14 h-14 rounded-2xl bg-pri-50 ring-1 ring-pri-100 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
          <HiOutlineSparkles className="w-7 h-7 text-pri-600" />
        </div>
        <p className="text-ink-500 text-[15px]">Loading survey...</p>
      </div>
    </div>
  );

  // ====== ERROR ======
  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: `linear-gradient(170deg, ${tc}04, #faf9f7, ${tc}02)` }}>
      <div className="text-center max-w-md animate-enter">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center mx-auto mb-5">
          <HiOutlineClock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-[24px] font-display font-bold text-ink-900 tracking-tight mb-3">Survey Unavailable</h1>
        <p className="text-ink-500 text-[15px] leading-relaxed">{error}</p>
      </div>
    </div>
  );

  // ====== COMPLETED ======
  if (completed) return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: `linear-gradient(170deg, ${tc}06, #faf9f7, ${tc}03)` }}>
      <div className="text-center max-w-md animate-scale-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mx-auto mb-6">
          <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-[28px] font-display font-bold text-ink-900 tracking-tight mb-3">Thank you!</h1>
        <p className="text-ink-500 text-[16px] leading-relaxed">{survey?.thank_you_message || 'Your response has been recorded.'}</p>
      </div>
    </div>
  );

  // ====== MAIN SURVEY ======
  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(170deg, ${tc}05, #faf9f7 40%, ${tc}02)` }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-ink-200/30">
        <div className="max-w-[640px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: tc + '12' }}>
              <HiOutlineSparkles className="w-3.5 h-3.5" style={{ color: tc }} />
            </div>
            <span className="text-[13px] font-semibold text-ink-700 truncate max-w-[200px]">{survey.title}</span>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              Auto-saved
            </div>
          )}
        </div>
        {survey.show_progress_bar && currentStep >= 0 && (
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${tc}, ${tc}bb)` }} />
          </div>
        )}
      </div>

      <div className="survey-container">
        {/* ====== WELCOME ====== */}
        {currentStep === -1 && (
          <div className="text-center py-16 animate-enter">
            <h1 className="text-[2rem] md:text-[2.5rem] font-display font-bold text-ink-900 tracking-tight leading-tight mb-5">
              {survey.title}
            </h1>
            {survey.description && <p className="text-ink-500 text-[16px] mb-4 max-w-md mx-auto leading-relaxed">{survey.description}</p>}
            {survey.welcome_message && <p className="text-ink-600 text-[15px] mb-10 max-w-md mx-auto leading-relaxed">{survey.welcome_message}</p>}

            {survey.require_email && (
              <div className="max-w-xs mx-auto mb-8 text-left">
                <label className="input-label">Your email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
              </div>
            )}

            <button
              onClick={() => { if (survey.require_email && !email) return alert('Email is required'); setDirection(1); setCurrentStep(0); }}
              className="px-10 py-4 rounded-2xl text-white font-semibold text-[16px] shadow-lg hover:shadow-xl hover:-translate-y-[2px] active:translate-y-0 transition-all"
              style={{ backgroundColor: tc }}
            >
              Begin Survey <HiOutlineArrowRight className="inline w-5 h-5 ml-1" />
            </button>
            <p className="text-[13px] text-ink-400 mt-6">{questions.length} questions · ~{Math.max(1, Math.ceil(questions.length * 0.5))} min</p>
          </div>
        )}

        {/* ====== QUESTION ====== */}
        {currentStep >= 0 && currentStep < questions.length && currentQ && (
          <div className="py-10" key={`${currentQ.id}-${direction}`}>
            <div className="question-card active animate-enter">
              {/* Question number */}
              <div className="flex items-center gap-2.5 mb-7">
                <span className="text-[12px] font-bold px-3 py-1 rounded-lg" style={{ backgroundColor: tc + '10', color: tc }}>
                  {currentStep + 1} / {questions.length}
                </span>
                {currentQ.is_required && (
                  <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Required</span>
                )}
              </div>

              {/* Question text */}
              <h2 className="text-[22px] md:text-[26px] font-display font-bold text-ink-900 tracking-tight leading-snug mb-2">
                {currentQ.question_text}
              </h2>
              {currentQ.description && <p className="text-ink-400 text-[14px] mb-8">{currentQ.description}</p>}

              {/* Answer input */}
              <div className={currentQ.description ? '' : 'mt-8'}>
                <QuestionInput question={currentQ} value={answers[currentQ.id] || ''} onChange={(val) => setAnswer(currentQ.id, val)} tc={tc} />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-7">
              <button onClick={goBack}
                disabled={currentStep <= 0 && !survey.welcome_message}
                className="flex items-center gap-1.5 text-[14px] font-medium text-ink-400 hover:text-ink-600 disabled:opacity-30 transition-colors px-3 py-2 rounded-xl hover:bg-white"
              >
                <HiOutlineArrowLeft className="w-4 h-4" /> Back
              </button>

              {currentStep < questions.length - 1 ? (
                <button onClick={goNext}
                  className="flex items-center gap-1.5 px-7 py-3 rounded-xl text-white font-semibold text-[15px] shadow-md hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0 transition-all"
                  style={{ backgroundColor: tc }}
                >
                  Next <HiOutlineArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-1.5 px-7 py-3 rounded-xl text-white font-semibold text-[15px] shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                  style={{ backgroundColor: tc }}
                >
                  {submitting ? 'Submitting...' : 'Submit'} <HiOutlineCheckCircle className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-[11px] text-ink-300 mt-5 hidden md:block">
              Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-ink-200 text-ink-500 font-mono text-[10px]">Enter ↵</kbd> to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== QUESTION INPUT COMPONENTS ======
function QuestionInput({ question, value, onChange, tc }) {
  // Keyboard enter to advance
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && question.question_type !== 'long_text') {
      e.preventDefault();
      // Trigger next button click
      const nextBtn = document.querySelector('[data-next-btn]');
      if (nextBtn) nextBtn.click();
    }
  };

  switch (question.question_type) {
    case 'short_text':
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
        className="input-field-lg border-0 border-b-2 border-ink-200 rounded-none px-0 focus:border-pri-500 focus:ring-0 bg-transparent" placeholder="Type your answer..." autoFocus />;

    case 'long_text':
      return <textarea value={value} onChange={(e) => onChange(e.target.value)}
        className="input-field-lg border-0 border-b-2 border-ink-200 rounded-none px-0 focus:border-pri-500 focus:ring-0 bg-transparent min-h-[120px]" placeholder="Type your answer..." autoFocus />;

    case 'email':
      return <input type="email" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
        className="input-field-lg border-0 border-b-2 border-ink-200 rounded-none px-0 focus:border-pri-500 focus:ring-0 bg-transparent" placeholder="email@example.com" autoFocus />;

    case 'number':
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
        className="input-field-lg border-0 border-b-2 border-ink-200 rounded-none px-0 focus:border-pri-500 focus:ring-0 bg-transparent text-3xl font-display font-bold w-32" placeholder="0" autoFocus />;

    case 'date':
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="input-field-lg" />;

    case 'yes_no':
      return (
        <div className="flex gap-3">
          {[{ label: 'Yes', emoji: '👍', val: 'yes' }, { label: 'No', emoji: '👎', val: 'no' }].map((opt) => (
            <button key={opt.val} onClick={() => onChange(opt.val)}
              className={`flex-1 py-5 rounded-2xl border-2 font-semibold text-lg transition-all active:scale-[0.97] ${
                value === opt.val ? 'text-white shadow-lg scale-[1.02]' : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
              }`}
              style={value === opt.val ? { backgroundColor: tc, borderColor: tc } : {}}
            >
              <span className="text-2xl block mb-1">{opt.emoji}</span> {opt.label}
            </button>
          ))}
        </div>
      );

    case 'single_choice':
      return (
        <div className="space-y-2.5">
          {(question.options || []).map((opt, i) => (
            <button key={i} onClick={() => onChange(opt.value)}
              className={`choice-option w-full text-left ${value === opt.value ? 'selected' : ''}`}
              style={value === opt.value ? { borderColor: tc, backgroundColor: tc + '08' } : {}}
            >
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={value === opt.value ? { borderColor: tc } : { borderColor: '#d4d0cd' }}>
                {value === opt.value && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tc }} />}
              </div>
              <span className="text-[15px] font-medium text-ink-700">{opt.label}</span>
              <span className="ml-auto text-[12px] font-mono text-ink-300 opacity-0 group-hover:opacity-100">{String.fromCharCode(65 + i)}</span>
            </button>
          ))}
        </div>
      );

    case 'multiple_choice': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {(question.options || []).map((opt, i) => {
            const checked = selected.includes(opt.value);
            return (
              <button key={i}
                onClick={() => onChange(checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])}
                className={`choice-option w-full text-left ${checked ? 'selected' : ''}`}
                style={checked ? { borderColor: tc, backgroundColor: tc + '08' } : {}}
              >
                <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={checked ? { borderColor: tc, backgroundColor: tc } : { borderColor: '#d4d0cd' }}>
                  {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className="text-[15px] font-medium text-ink-700">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'dropdown':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field-lg">
          <option value="">Select an option...</option>
          {(question.options || []).map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
        </select>
      );

    case 'rating': {
      const rating = parseInt(value) || 0;
      return (
        <div className="flex gap-3 justify-center py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => onChange(star)}
              className={`text-[3rem] transition-all duration-200 ${star <= rating ? '' : 'grayscale opacity-30 hover:grayscale-0 hover:opacity-70'}`}
              style={star <= rating ? { filter: 'drop-shadow(0 3px 8px rgba(249,115,22,0.3))' } : {}}
            >
              ⭐
            </button>
          ))}
        </div>
      );
    }

    case 'scale': {
      const scaleVal = parseInt(value) || 0;
      return (
        <div className="py-4">
          <div className="flex justify-between mb-3 text-[12px] font-medium text-ink-400">
            <span>Not at all</span><span>Extremely</span>
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => onChange(n)}
                className={`w-11 h-11 rounded-xl font-bold text-[14px] transition-all duration-200 active:scale-90 ${
                  n === scaleVal ? 'text-white shadow-lg scale-110' : 'bg-white text-ink-500 border border-ink-200 hover:border-ink-300 hover:shadow-xs'
                }`}
                style={n === scaleVal ? { backgroundColor: tc } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    }

    default:
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="input-field-lg" placeholder="Your answer..." />;
  }
}
