import { useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useResponseTracking
 * ─────────────────────────────────────────────────────────────────
 * Silently records behavioural signals while a respondent fills in
 * a survey. All data lands in survey_responses.metadata (JSONB).
 *
 * Signals tracked
 * ───────────────
 *  time_per_question  { [questionId]: totalSeconds }   slow = confusion
 *  edit_counts        { [questionId]: number }          high = hesitation
 *  back_count         number                            back-clicks overall
 *  drop_off_at        questionId | null                 last Q seen if abandoned
 *  device             'mobile' | 'tablet' | 'desktop'
 *  quality_score      0–100  (computed on submit)
 *
 * Usage in SurveyRespond
 * ──────────────────────
 *   const tracker = useResponseTracking(responseIdRef);
 *   tracker.onEnter(questionId)          // question becomes visible
 *   tracker.onLeave(questionId)          // navigating away from question
 *   tracker.onEdit(questionId)           // every answer change
 *   tracker.onBack()                     // ← Back pressed
 *   tracker.onAbandon()                  // tab close / page hide
 *   await tracker.onSubmit(ans, qs)      // just before final submit
 */
export function useResponseTracking(responseIdRef) {
  const enterTimes = useRef({});   // { qId: timestamp ms }
  const timings    = useRef({});   // { qId: accumulated seconds }
  const edits      = useRef({});   // { qId: count }
  const backs      = useRef(0);
  const currentQ   = useRef(null);
  const saveTimer  = useRef(null);

  const device = (() => {
    const w = window.innerWidth;
    if (w < 640)  return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  })();

  // ── Start timing a question ────────────────────────────────────────────
  const onEnter = useCallback((qId) => {
    currentQ.current = qId;
    enterTimes.current[qId] = Date.now();
  }, []);

  // ── Stop timing a question (accumulate) ───────────────────────────────
  const onLeave = useCallback((qId) => {
    if (!enterTimes.current[qId]) return;
    const secs = (Date.now() - enterTimes.current[qId]) / 1000;
    timings.current[qId] = (timings.current[qId] || 0) + secs;
    delete enterTimes.current[qId];
  }, []);

  // ── Record each answer edit ────────────────────────────────────────────
  const onEdit = useCallback((qId) => {
    edits.current[qId] = (edits.current[qId] || 0) + 1;
  }, []);

  // ── Record a back-click ────────────────────────────────────────────────
  const onBack = useCallback(() => { backs.current += 1; }, []);

  // ── Quality score 0-100 ────────────────────────────────────────────────
  // Penalises: too fast, straight-lining scales, no edits on text Qs
  function computeQuality(answers, questions) {
    if (!questions?.length) return 100;
    let score = 100;

    // Total time
    const totalSecs = Object.values(timings.current).reduce((a, b) => a + b, 0);
    const avgSecs   = totalSecs / Math.max(questions.length, 1);
    if (avgSecs < 3)  score -= 40;
    else if (avgSecs < 7) score -= 15;

    // Straight-lining on scale/rating questions
    const scaleQs = questions.filter(q => ['rating', 'scale'].includes(q.question_type));
    if (scaleQs.length >= 3) {
      const vals   = scaleQs.map(q => String(answers[q.id] ?? '')).filter(Boolean);
      const unique = new Set(vals);
      if (unique.size === 1 && vals.length === scaleQs.length) score -= 25;
    }

    // Text questions answered but never edited (likely paste/auto-fill spam)
    questions.filter(q => ['short_text', 'long_text'].includes(q.question_type)).forEach(q => {
      if (answers[q.id] && !edits.current[q.id]) score -= 5;
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ── Flush current metrics to DB ────────────────────────────────────────
  const flush = useCallback(async (extra = {}) => {
    const id = responseIdRef?.current;
    if (!id) return;

    // Accumulate time for currently-open question without losing the start
    if (currentQ.current && enterTimes.current[currentQ.current]) {
      const secs = (Date.now() - enterTimes.current[currentQ.current]) / 1000;
      timings.current[currentQ.current] = (timings.current[currentQ.current] || 0) + secs;
      enterTimes.current[currentQ.current] = Date.now(); // reset so we don't double-count on next flush
    }

    const metadata = {
      time_per_question: { ...timings.current },
      edit_counts:       { ...edits.current },
      back_count:        backs.current,
      device,
      drop_off_at:       currentQ.current,
      ...extra,
    };

    try {
      await supabase
        .from('survey_responses')
        .update({ metadata })
        .eq('id', id);
    } catch (e) {
      console.warn('[Tracker] flush failed silently:', e?.message);
    }
  }, [responseIdRef, device]);

  // ── Auto-flush every 20s while survey is active ────────────────────────
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flush(), 20_000);
  }, [flush]);

  // ── Called just before final submit ───────────────────────────────────
  const onSubmit = useCallback(async (answers, questions) => {
    if (currentQ.current) onLeave(currentQ.current);
    const quality = computeQuality(answers, questions);
    await flush({ quality_score: quality, drop_off_at: null });
    clearTimeout(saveTimer.current);
    return quality;
  }, [flush, onLeave]);

  // ── Tab close / page hide — uses sendBeacon for reliability ───────────
  const onAbandon = useCallback(() => {
    if (currentQ.current) onLeave(currentQ.current);
    const id = responseIdRef?.current;
    if (!id) return;

    const metadata = {
      time_per_question: { ...timings.current },
      edit_counts:       { ...edits.current },
      back_count:        backs.current,
      device,
      drop_off_at:       currentQ.current,
    };

    // Prefer sendBeacon (works on page unload), fall back to async update
    const url  = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/survey_responses?id=eq.${id}`;
    const body = JSON.stringify({ metadata, status: 'abandoned' });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        supabase.from('survey_responses').update({ metadata, status: 'abandoned' }).eq('id', id);
      }
    } catch (_) {}
  }, [responseIdRef, device, onLeave]);

  return { onEnter, onLeave, onEdit, onBack, onSubmit, onAbandon, flush, scheduleSave };
}
