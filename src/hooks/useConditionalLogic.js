/**
 * useConditionalLogic
 * Evaluates which questions should be visible given current answers.
 *
 * Usage in SurveyRespond:
 *   const { isVisible, visibleQuestions, nextVisible, prevVisible } = useConditionalLogic(questions, answers);
 *
 * Supports operators:
 *   equals, not_equals, contains, not_contains, includes, not_includes,
 *   gte, lte, first_is
 */
export function useConditionalLogic(questions = [], answers = {}) {

  /**
   * Evaluate a single condition rule against current answers.
   * Returns true if the question SHOULD be shown.
   */
  function evaluate(rule, answers) {
    if (!rule?.show_if) return true; // no rule → always show

    const { question_id, operator, value } = rule.show_if;
    const ans = answers[question_id];

    // No answer yet on the source question → hide dependent question
    if (ans === undefined || ans === null || ans === '') return false;

    const normalize = v => String(v ?? '').toLowerCase().trim();
    const ansStr    = normalize(ans);
    const valStr    = normalize(value);

    switch (operator) {
      case 'equals':       return ansStr === valStr;
      case 'not_equals':   return ansStr !== valStr;
      case 'contains':     return ansStr.includes(valStr);
      case 'not_contains': return !ansStr.includes(valStr);

      case 'includes':     // multiple_choice: val is array
        if (Array.isArray(ans)) return ans.map(normalize).includes(valStr);
        return ansStr.includes(valStr);

      case 'not_includes':
        if (Array.isArray(ans)) return !ans.map(normalize).includes(valStr);
        return !ansStr.includes(valStr);

      case 'gte':          return Number(ans) >= Number(value);
      case 'lte':          return Number(ans) <= Number(value);

      case 'first_is':     // ranking: first item in array
        if (Array.isArray(ans)) return normalize(ans[0]) === valStr;
        return false;

      default:             return true;
    }
  }

  /**
   * Build visibility map: { [question.id]: boolean }
   * Uses the question's _id (local) or id (DB).
   */
  function buildVisibility() {
    const map = {};
    for (const q of questions) {
      const key    = q._id || q.id;
      map[key]     = evaluate(q.conditional_logic, answers);
    }
    return map;
  }

  const visibility = buildVisibility();

  /** Filtered list — only questions the respondent should see */
  const visibleQuestions = questions.filter(q => visibility[q._id || q.id]);

  /**
   * Given current visible index, find the next visible question index
   * in the full questions array (skip hidden ones).
   */
  function nextVisible(currentIndex) {
    for (let i = currentIndex + 1; i < questions.length; i++) {
      if (visibility[questions[i]._id || questions[i].id]) return i;
    }
    return null; // no next visible → end of survey
  }

  function prevVisible(currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (visibility[questions[i]._id || questions[i].id]) return i;
    }
    return null; // no prev → go to welcome screen
  }

  /** Is a specific question visible? */
  function isVisible(questionId) {
    return visibility[questionId] !== false;
  }

  /** Total number of visible questions (for progress bar) */
  const visibleCount = visibleQuestions.length;

  /**
   * Progress percentage for a respondent at a given full-array index.
   * Only counts visible questions answered so far.
   */
  function progressAt(currentIndex) {
    const visibleSoFar = questions
      .slice(0, currentIndex + 1)
      .filter(q => visibility[q._id || q.id]).length;
    return visibleCount ? Math.round((visibleSoFar / visibleCount) * 100) : 0;
  }

  return {
    visibility,
    visibleQuestions,
    visibleCount,
    isVisible,
    nextVisible,
    prevVisible,
    progressAt,
  };
}

/**
 * Standalone evaluator — use outside of React (e.g. in analytics or exports)
 */
export function evaluateCondition(rule, answers) {
  if (!rule?.show_if) return true;
  const { question_id, operator, value } = rule.show_if;
  const ans = answers[question_id];
  if (ans === undefined || ans === null || ans === '') return false;
  const n = v => String(v ?? '').toLowerCase().trim();
  switch (operator) {
    case 'equals':       return n(ans) === n(value);
    case 'not_equals':   return n(ans) !== n(value);
    case 'contains':     return n(ans).includes(n(value));
    case 'not_contains': return !n(ans).includes(n(value));
    case 'includes':     return Array.isArray(ans) ? ans.map(n).includes(n(value)) : n(ans).includes(n(value));
    case 'not_includes': return Array.isArray(ans) ? !ans.map(n).includes(n(value)) : !n(ans).includes(n(value));
    case 'gte':          return Number(ans) >= Number(value);
    case 'lte':          return Number(ans) <= Number(value);
    case 'first_is':     return Array.isArray(ans) && n(ans[0]) === n(value);
    default:             return true;
  }
}
