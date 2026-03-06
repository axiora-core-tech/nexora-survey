import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { HiOutlineSparkles, HiOutlineCheckCircle, HiOutlineStar, HiOutlineClock } from 'react-icons/hi';

// Generate session token for auto-save (localStorage persists across tab/browser close)
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
  const [currentStep, setCurrentStep] = useState(-1); // -1 = welcome, questions, then complete
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
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
      // Fetch survey by slug
      const { data: s, error: sErr } = await supabase
        .from('surveys')
        .select('*')
        .eq('slug', slug)
        .single();

      if (sErr || !s) { setError('Survey not found'); setLoading(false); return; }

      // Check expiry — block if expired by time, regardless of DB status
      if (s.expires_at && new Date(s.expires_at) < new Date()) {
        setError('This survey has expired and is no longer accepting responses.');
        setSurvey(s);
        setLoading(false);
        return;
      }

      if (s.status !== 'active') {
        setError('This survey is not currently accepting responses.');
        setSurvey(s);
        setLoading(false);
        return;
      }

      setSurvey(s);
      sessionToken.current = getSessionToken(slug);

      // Fetch questions
      const { data: qs } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', s.id)
        .order('sort_order');
      setQuestions(qs || []);

      // Check for existing in-progress response (resume)
      const { data: existing } = await supabase
        .from('survey_responses')
        .select('*, survey_answers(*)')
        .eq('session_token', sessionToken.current)
        .eq('status', 'in_progress')
        .single();

      if (existing) {
        setResponseId(existing.id);
        responseIdRef.current = existing.id;
        // Restore answers
        const restored = {};
        (existing.survey_answers || []).forEach((a) => {
          restored[a.question_id] = a.answer_json || a.answer_value || '';
        });
        setAnswers(restored);
        // Find the first unanswered question
        const firstUnanswered = (qs || []).findIndex((q) => !restored[q.id]);
        setCurrentStep(firstUnanswered >= 0 ? firstUnanswered : 0);
        setLastSaved(existing.last_saved_at);
      } else {
        setCurrentStep(s.welcome_message ? -1 : 0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load survey');
    } finally {
      setLoading(false);
    }
  }

  // Create response record on first interaction (uses ref to prevent race conditions)
  async function ensureResponse() {
    if (responseIdRef.current) return responseIdRef.current;
    if (responseId) { responseIdRef.current = responseId; return responseId; }
    try {
      const { data, error: rErr } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: survey.id,
          session_token: sessionToken.current,
          respondent_email: email || null,
          respondent_name: respondentName || null,
          status: 'in_progress',
        })
        .select()
        .single();
      if (rErr) throw rErr;
      responseIdRef.current = data.id;
      setResponseId(data.id);
      return data.id;
    } catch (err) {
      console.error('Failed to create response:', err);
      return null;
    }
  }

  // Auto-save logic: save every N answers
  const autoSave = useCallback(async (currentAnswers, rId) => {
    if (!rId) return;
    try {
      const entries = Object.entries(currentAnswers);
      for (const [qId, value] of entries) {
        const isJson = typeof value === 'object';
        await supabase
          .from('survey_answers')
          .upsert({
            response_id: rId,
            question_id: qId,
            answer_value: isJson ? null : String(value),
            answer_json: isJson ? value : null,
          }, { onConflict: 'response_id,question_id' });
      }
      // Update last_saved_at
      await supabase.from('survey_responses').update({ last_saved_at: new Date().toISOString() }).eq('id', rId);
      setLastSaved(new Date().toISOString());
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, []);

  // Set answer and trigger auto-save check
  const setAnswer = async (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    const rId = await ensureResponse();

    // Increment ref counter (no stale closure issues)
    autoSaveCountRef.current += 1;

    // Auto-save every N answers (default 2)
    const interval = survey?.auto_save_interval || 2;
    if (autoSaveCountRef.current >= interval) {
      autoSaveCountRef.current = 0;
      autoSave(newAnswers, rId);
    } else {
      // Debounced save after 5 seconds of inactivity
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        autoSave(newAnswers, rId);
        autoSaveCountRef.current = 0;
      }, 5000);
    }
  };

  async function handleSubmit() {
    // Validate required
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) {
        const idx = questions.indexOf(q);
        setCurrentStep(idx);
        return alert(`Please answer: "${q.question_text}"`);
      }
    }

    setSubmitting(true);
    try {
      const rId = await ensureResponse();
      // Save all answers
      await autoSave(answers, rId);
      // Mark complete
      await supabase
        .from('survey_responses')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', rId);
      setCompleted(true);
      // Clean session
      localStorage.removeItem(`nexora_session_${slug}`);
    } catch (err) {
      console.error(err);
      alert('Submission failed. Your answers are saved — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const progress = questions.length > 0 ? Math.round((Math.max(0, currentStep) / questions.length) * 100) : 0;
  const themeColor = survey?.theme_color || '#6366f1';

  // === RENDER ===
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-nexora-100 flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <HiOutlineSparkles className="w-6 h-6 text-nexora-600" />
          </div>
          <p className="text-surface-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <HiOutlineClock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-display text-surface-900 mb-2">Survey Unavailable</h1>
          <p className="text-surface-500">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{
        background: `linear-gradient(135deg, ${themeColor}08, ${themeColor}04, #f8fafc)`
      }}>
        <div className="text-center max-w-md animate-scale-in">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
            <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-display text-surface-900 mb-3">All Done!</h1>
          <p className="text-surface-500 text-lg leading-relaxed">
            {survey?.thank_you_message || 'Thank you for completing this survey!'}
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentStep];

  return (
    <div className="min-h-screen" style={{
      background: `linear-gradient(135deg, ${themeColor}06, #fafafa, ${themeColor}03)`
    }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-surface-200/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: themeColor + '15' }}>
              <HiOutlineSparkles className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <span className="text-sm font-semibold text-surface-700 truncate">{survey.title}</span>
          </div>
          {lastSaved && (
            <span className="text-[10px] text-surface-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Saved
            </span>
          )}
        </div>
        {survey.show_progress_bar && currentStep >= 0 && (
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)` }} />
          </div>
        )}
      </div>

      <div className="survey-container">
        {/* Welcome screen */}
        {currentStep === -1 && (
          <div className="text-center py-12 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-display text-surface-900 mb-4">{survey.title}</h1>
            {survey.description && <p className="text-surface-500 text-lg mb-4 max-w-lg mx-auto">{survey.description}</p>}
            {survey.welcome_message && <p className="text-surface-600 mb-8 max-w-lg mx-auto leading-relaxed">{survey.welcome_message}</p>}

            {survey.require_email && (
              <div className="max-w-sm mx-auto mb-6 text-left">
                <label className="input-label">Your Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
              </div>
            )}

            <button
              onClick={() => {
                if (survey.require_email && !email) return alert('Email is required');
                setCurrentStep(0);
              }}
              className="px-8 py-3.5 rounded-xl text-white font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ backgroundColor: themeColor }}
            >
              Start Survey
            </button>
            <p className="text-xs text-surface-400 mt-4">{questions.length} questions • Takes ~{Math.max(1, Math.ceil(questions.length * 0.5))} min</p>
          </div>
        )}

        {/* Question display */}
        {currentStep >= 0 && currentStep < questions.length && currentQ && (
          <div className="py-8 animate-slide-up" key={currentQ.id}>
            <div className="question-card active">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: themeColor + '12', color: themeColor }}>
                  {currentStep + 1} of {questions.length}
                </span>
                {currentQ.is_required && <span className="text-xs font-medium text-red-500">Required</span>}
              </div>

              <h2 className="text-xl md:text-2xl font-display text-surface-900 mb-2">{currentQ.question_text}</h2>
              {currentQ.description && <p className="text-surface-500 text-sm mb-6">{currentQ.description}</p>}

              <div className="mt-6">
                <QuestionInput
                  question={currentQ}
                  value={answers[currentQ.id] || ''}
                  onChange={(val) => setAnswer(currentQ.id, val)}
                  themeColor={themeColor}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentStep((s) => Math.max(survey.welcome_message ? -1 : 0, s - 1))}
                disabled={currentStep <= 0 && !survey.welcome_message}
                className="btn-ghost text-surface-500 disabled:opacity-30"
              >
                ← Back
              </button>

              {currentStep < questions.length - 1 ? (
                <button
                  onClick={() => {
                    if (currentQ.is_required && !answers[currentQ.id]) return alert('This question is required');
                    setCurrentStep((s) => s + 1);
                  }}
                  className="px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-md"
                  style={{ backgroundColor: themeColor }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:shadow-md disabled:opacity-50"
                  style={{ backgroundColor: themeColor }}
                >
                  {submitting ? 'Submitting...' : 'Submit Survey ✓'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// === Question Input Components ===
function QuestionInput({ question, value, onChange, themeColor }) {
  switch (question.question_type) {
    case 'short_text':
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg" placeholder="Type your answer..." autoFocus />;

    case 'long_text':
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg" rows={4} placeholder="Type your answer..." autoFocus />;

    case 'email':
      return <input type="email" value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg" placeholder="email@example.com" autoFocus />;

    case 'number':
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg" placeholder="0" autoFocus />;

    case 'date':
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg" />;

    case 'yes_no':
      return (
        <div className="flex gap-3">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt.toLowerCase())}
              className={`flex-1 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${
                value === opt.toLowerCase()
                  ? 'text-white shadow-md'
                  : 'border-surface-200 text-surface-600 hover:border-surface-300'
              }`}
              style={value === opt.toLowerCase() ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
            >
              {opt === 'Yes' ? '👍' : '👎'} {opt}
            </button>
          ))}
        </div>
      );

    case 'single_choice':
      return (
        <div className="space-y-2.5">
          {(question.options || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => onChange(opt.value)}
              className={`choice-option w-full text-left ${value === opt.value ? 'selected' : ''}`}
              style={value === opt.value ? { borderColor: themeColor, backgroundColor: themeColor + '08' } : {}}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={value === opt.value ? { borderColor: themeColor } : { borderColor: '#d6d3d1' }}
              >
                {value === opt.value && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor }} />}
              </div>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      );

    case 'multiple_choice':
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {(question.options || []).map((opt, i) => {
            const isChecked = selected.includes(opt.value);
            return (
              <button
                key={i}
                onClick={() => {
                  const next = isChecked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                  onChange(next);
                }}
                className={`choice-option w-full text-left ${isChecked ? 'selected' : ''}`}
                style={isChecked ? { borderColor: themeColor, backgroundColor: themeColor + '08' } : {}}
              >
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={isChecked ? { borderColor: themeColor, backgroundColor: themeColor } : { borderColor: '#d6d3d1' }}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      );

    case 'dropdown':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field text-lg">
          <option value="">Select an option...</option>
          {(question.options || []).map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'rating':
      const rating = parseInt(value) || 0;
      return (
        <div className="star-rating flex gap-2 justify-center py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onChange(star)}
              className={`star transition-all text-4xl ${star <= rating ? 'active' : ''}`}
              style={star <= rating ? { color: '#e69748' } : {}}
            >
              {star <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      );

    case 'scale':
      const scaleVal = parseInt(value) || 0;
      return (
        <div className="py-4">
          <div className="flex justify-between mb-2 text-xs text-surface-400">
            <span>Not at all</span>
            <span>Extremely</span>
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                  n === scaleVal ? 'text-white shadow-md scale-110' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
                style={n === scaleVal ? { backgroundColor: themeColor } : {}}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );

    default:
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="input-field" placeholder="Your answer..." />;
  }
}
