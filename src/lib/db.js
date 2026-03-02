import { supabase, isSupabaseReady } from './supabase'

// ─── SURVEYS ──────────────────────────────────────────────────────────────────

export async function fetchSurveys() {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('surveys')
    .select(`*, sections(*, questions(*))`)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchSurveys:', error); return null }
  return data
}

export async function createSurvey(survey, userId) {
  if (!isSupabaseReady) return null
  // 1. Insert survey
  const { data: s, error: sErr } = await supabase
    .from('surveys')
    .insert({ title: survey.title, description: survey.description, status: 'draft', created_by: userId })
    .select().single()
  if (sErr) { console.error('createSurvey:', sErr); return null }

  // 2. Insert sections + questions
  for (const sec of survey.sections || []) {
    const { data: section, error: secErr } = await supabase
      .from('sections')
      .insert({ survey_id: s.id, title: sec.title, sort_order: sec.sort_order || 0 })
      .select().single()
    if (secErr) { console.error('createSection:', secErr); continue }

    const questions = (sec.questions || []).map((q, i) => ({
      survey_id: s.id,
      section_id: section.id,
      type: q.type,
      text: q.text,
      options: q.options || [],
      settings: q.settings || {},
      required: q.required ?? true,
      sort_order: i,
    }))
    if (questions.length) {
      const { error: qErr } = await supabase.from('questions').insert(questions)
      if (qErr) console.error('createQuestions:', qErr)
    }
  }
  return s
}

export async function updateSurvey(id, updates) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('surveys')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) { console.error('updateSurvey:', error); return null }
  return data
}

export async function deleteSurvey(id) {
  if (!isSupabaseReady) return null
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  if (error) { console.error('deleteSurvey:', error); return false }
  return true
}

export async function toggleSurveyStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active'
  return updateSurvey(id, { status: newStatus })
}

// ─── SURVEY LINKS ─────────────────────────────────────────────────────────────

export async function fetchLinks() {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('survey_links')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchLinks:', error); return null }
  return data
}

export async function createLink(surveyId, email, userId) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('survey_links')
    .insert({ survey_id: surveyId, email, created_by: userId })
    .select().single()
  if (error) { console.error('createLink:', error); return null }
  return data
}

export async function deleteLink(id) {
  if (!isSupabaseReady) return null
  const { error } = await supabase.from('survey_links').delete().eq('id', id)
  if (error) { console.error('deleteLink:', error); return false }
  return true
}

export async function trackClick(token) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .rpc('increment_click', { link_token: token })
  if (error) console.error('trackClick:', error)
  return data
}

export async function fetchSurveyByToken(token) {
  if (!isSupabaseReady) return null
  // Track the click
  await trackClick(token)
  // Fetch survey via link
  const { data, error } = await supabase
    .from('survey_links')
    .select(`*, surveys(*, sections(*, questions(*)))`)
    .eq('token', token)
    .eq('status', 'active')
    .single()
  if (error) { console.error('fetchSurveyByToken:', error); return null }
  return data
}

// ─── RESPONSES ────────────────────────────────────────────────────────────────

export async function fetchResponses(surveyId) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('responses')
    .select(`*, answers(*), survey_links(email)`)
    .eq('survey_id', surveyId)
    .order('started_at', { ascending: false })
  if (error) { console.error('fetchResponses:', error); return null }
  return data
}

export async function saveResponseDraft({ responseId, linkId, surveyId, answers }) {
  if (!isSupabaseReady) {
    // Fallback to localStorage
    localStorage.setItem(`draft_${linkId}`, JSON.stringify({ responseId, answers }))
    return { id: responseId }
  }

  // Upsert response row
  const { data: response, error: rErr } = await supabase
    .from('responses')
    .upsert({ id: responseId, survey_id: surveyId, survey_link_id: linkId, status: 'in_progress' })
    .select().single()
  if (rErr) { console.error('saveResponseDraft:', rErr); return null }

  // Insert only NEW answers (never update existing — immutability)
  if (answers?.length) {
    const { data: existing } = await supabase
      .from('answers')
      .select('question_id')
      .eq('response_id', responseId)

    const existingIds = new Set((existing || []).map(a => a.question_id))
    const newAnswers = answers
      .filter(a => !existingIds.has(a.questionId))
      .map(a => ({ response_id: responseId, question_id: a.questionId, value: a.value }))

    if (newAnswers.length) {
      const { error: aErr } = await supabase.from('answers').insert(newAnswers)
      if (aErr) console.error('saveAnswers:', aErr)
    }
  }

  // Also save to localStorage as backup
  localStorage.setItem(`draft_${linkId}`, JSON.stringify({ responseId, answers }))
  return response
}

export async function submitResponse({ responseId, linkId, surveyId, answers }) {
  if (!isSupabaseReady) {
    localStorage.removeItem(`draft_${linkId}`)
    return true
  }

  // Save final batch of answers first
  await saveResponseDraft({ responseId, linkId, surveyId, answers })

  // Mark response as completed
  const { error } = await supabase
    .from('responses')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', responseId)

  if (error) { console.error('submitResponse:', error); return false }

  // Clear localStorage draft
  localStorage.removeItem(`draft_${linkId}`)
  return true
}

export async function deleteResponse(id) {
  if (!isSupabaseReady) return null
  const { error } = await supabase.from('responses').delete().eq('id', id)
  if (error) { console.error('deleteResponse:', error); return false }
  return true
}

export async function loadDraft(linkId) {
  // First try Supabase
  if (isSupabaseReady) {
    const { data } = await supabase
      .from('responses')
      .select('id, answers(*)')
      .eq('survey_link_id', linkId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    if (data) return data
  }
  // Fallback to localStorage
  try {
    const local = localStorage.getItem(`draft_${linkId}`)
    return local ? JSON.parse(local) : null
  } catch { return null }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function fetchUsers() {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchUsers:', error); return null }
  return data
}

export async function inviteUser({ name, email, role }) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, role, status: 'active' })
    .select().single()
  if (error) { console.error('inviteUser:', error); return null }
  return data
}

export async function updateUser(id, updates) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select().single()
  if (error) { console.error('updateUser:', error); return null }
  return data
}

export async function removeUser(id) {
  if (!isSupabaseReady) return null
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) { console.error('removeUser:', error); return false }
  return true
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function fetchAnalytics(surveyId) {
  if (!isSupabaseReady) return null
  const { data, error } = await supabase
    .from('survey_analytics')
    .select('*')
    .eq('survey_id', surveyId)
    .single()
  if (error) { console.error('fetchAnalytics:', error); return null }
  return data
}