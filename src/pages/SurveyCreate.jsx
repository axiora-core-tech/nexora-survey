import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, generateSlug } from '../lib/constants';
import toast from 'react-hot-toast';
import {
  HiOutlinePlusCircle, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown,
  HiOutlineSave, HiOutlineEye, HiOutlineCalendar, HiOutlineChevronDown, HiOutlineX
} from 'react-icons/hi';

const emptyQuestion = () => ({
  tempId: Math.random().toString(36).slice(2),
  question_text: '',
  question_type: 'short_text',
  options: [],
  is_required: false,
  description: '',
});

export default function SurveyCreate() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    welcome_message: '',
    thank_you_message: 'Thank you for completing this survey!',
    expires_at: '',
    allow_anonymous: true,
    require_email: false,
    show_progress_bar: true,
    theme_color: '#6366f1',
  });

  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [activeTab, setActiveTab] = useState('details'); // details | questions | settings

  const updateSurvey = (field, value) => setSurvey((s) => ({ ...s, [field]: value }));

  const updateQuestion = (tempId, field, value) => {
    setQuestions((qs) => qs.map((q) => (q.tempId === tempId ? { ...q, [field]: value } : q)));
  };

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);

  const removeQuestion = (tempId) => {
    if (questions.length <= 1) return toast.error('Survey needs at least one question');
    setQuestions((qs) => qs.filter((q) => q.tempId !== tempId));
  };

  const moveQuestion = (tempId, direction) => {
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.tempId === tempId);
      if ((direction === -1 && idx === 0) || (direction === 1 && idx === qs.length - 1)) return qs;
      const newQs = [...qs];
      [newQs[idx], newQs[idx + direction]] = [newQs[idx + direction], newQs[idx]];
      return newQs;
    });
  };

  const addOption = (tempId) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.tempId === tempId
          ? { ...q, options: [...(q.options || []), { label: '', value: '' }] }
          : q
      )
    );
  };

  const updateOption = (tempId, optIdx, value) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.tempId !== tempId) return q;
        const opts = [...(q.options || [])];
        opts[optIdx] = { label: value, value: value.toLowerCase().replace(/\s+/g, '_') };
        return { ...q, options: opts };
      })
    );
  };

  const removeOption = (tempId, optIdx) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.tempId !== tempId) return q;
        return { ...q, options: q.options.filter((_, i) => i !== optIdx) };
      })
    );
  };

  const hasOptions = (type) => ['single_choice', 'multiple_choice', 'dropdown'].includes(type);

  async function handleSave(status = 'draft') {
    if (!survey.title.trim()) return toast.error('Survey title is required');
    if (questions.some((q) => !q.question_text.trim())) return toast.error('All questions need text');
    if (questions.some((q) => hasOptions(q.question_type) && (!q.options || q.options.length < 2))) {
      return toast.error('Choice questions need at least 2 options');
    }

    setSaving(true);
    try {
      const slug = generateSlug(10);
      const { data: newSurvey, error: surveyErr } = await supabase
        .from('surveys')
        .insert({
          ...survey,
          slug,
          status,
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          expires_at: survey.expires_at || null,
        })
        .select()
        .single();

      if (surveyErr) throw surveyErr;

      // Insert questions
      const questionInserts = questions.map((q, i) => ({
        survey_id: newSurvey.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: hasOptions(q.question_type) ? q.options : null,
        is_required: q.is_required,
        description: q.description || null,
        sort_order: i,
      }));

      const { error: qErr } = await supabase.from('survey_questions').insert(questionInserts);
      if (qErr) throw qErr;

      toast.success(status === 'active' ? 'Survey published!' : 'Survey saved as draft');
      navigate(`/surveys/${newSurvey.id}/edit`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'questions', label: `Questions (${questions.length})` },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Create Survey</h1>
          <p className="text-surface-500 mt-1">Design your survey and start collecting responses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving} className="btn-secondary">
            <HiOutlineSave className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave('active')} disabled={saving} className="btn-primary">
            <HiOutlineEye className="w-4 h-4" /> Publish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div>
            <label className="input-label">Survey Title *</label>
            <input
              type="text"
              value={survey.title}
              onChange={(e) => updateSurvey('title', e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="e.g., Customer Satisfaction Survey 2026"
            />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea
              value={survey.description}
              onChange={(e) => updateSurvey('description', e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Brief description of what this survey is about..."
            />
          </div>
          <div>
            <label className="input-label">Welcome Message</label>
            <textarea
              value={survey.welcome_message}
              onChange={(e) => updateSurvey('welcome_message', e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Message shown to respondents before they start..."
            />
          </div>
          <div>
            <label className="input-label">Thank You Message</label>
            <textarea
              value={survey.thank_you_message}
              onChange={(e) => updateSurvey('thank_you_message', e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Message shown after survey completion..."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="input-label">
                <HiOutlineCalendar className="inline w-4 h-4 mr-1" />
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={survey.expires_at}
                onChange={(e) => updateSurvey('expires_at', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Theme Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={survey.theme_color}
                  onChange={(e) => updateSurvey('theme_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={survey.theme_color}
                  onChange={(e) => updateSurvey('theme_color', e.target.value)}
                  className="input-field flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-4 animate-fade-in">
          {questions.map((q, idx) => (
            <div key={q.tempId} className="glass-card p-5">
              {/* Question header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-nexora-50 border border-nexora-100 flex items-center justify-center text-xs font-bold text-nexora-600">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-surface-400 uppercase">
                    {QUESTION_TYPES.find((t) => t.value === q.question_type)?.label || q.question_type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(q.tempId, -1)} className="btn-ghost p-1.5" disabled={idx === 0}>
                    <HiOutlineArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveQuestion(q.tempId, 1)} className="btn-ghost p-1.5" disabled={idx === questions.length - 1}>
                    <HiOutlineArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeQuestion(q.tempId)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question text */}
              <input
                type="text"
                value={q.question_text}
                onChange={(e) => updateQuestion(q.tempId, 'question_text', e.target.value)}
                className="input-field mb-3 font-medium"
                placeholder="Type your question here..."
              />

              {/* Helper text */}
              <input
                type="text"
                value={q.description}
                onChange={(e) => updateQuestion(q.tempId, 'description', e.target.value)}
                className="input-field mb-3 text-sm"
                placeholder="Optional helper text..."
              />

              {/* Question type selector */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="input-label text-xs">Question Type</label>
                  <select
                    value={q.question_type}
                    onChange={(e) => updateQuestion(q.tempId, 'question_type', e.target.value)}
                    className="input-field"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-4 py-3 bg-surface-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.is_required}
                      onChange={(e) => updateQuestion(q.tempId, 'is_required', e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-nexora-600 focus:ring-nexora-500"
                    />
                    <span className="text-sm font-medium text-surface-600">Required</span>
                  </label>
                </div>
              </div>

              {/* Options for choice questions */}
              {hasOptions(q.question_type) && (
                <div className="space-y-2 mt-4 pl-4 border-l-2 border-nexora-100">
                  <p className="text-xs font-semibold text-surface-500 mb-2">OPTIONS</p>
                  {(q.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-surface-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => updateOption(q.tempId, optIdx, e.target.value)}
                        className="input-field py-2 flex-1"
                        placeholder={`Option ${optIdx + 1}`}
                      />
                      <button
                        onClick={() => removeOption(q.tempId, optIdx)}
                        className="btn-ghost p-1.5 text-red-400 hover:text-red-600"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(q.tempId)}
                    className="text-sm font-medium text-nexora-600 hover:text-nexora-700 flex items-center gap-1 mt-2"
                  >
                    <HiOutlinePlusCircle className="w-4 h-4" /> Add Option
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add question button */}
          <button
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-surface-300 rounded-2xl text-surface-500 hover:border-nexora-400 hover:text-nexora-600 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <HiOutlinePlusCircle className="w-5 h-5" /> Add Question
          </button>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-card p-6 space-y-6 animate-fade-in">
          <h3 className="section-title">Response Settings</h3>

          <label className="flex items-center justify-between p-4 rounded-xl bg-surface-50 cursor-pointer group">
            <div>
              <p className="text-sm font-semibold text-surface-700">Allow Anonymous Responses</p>
              <p className="text-xs text-surface-500">Respondents don't need to provide their identity</p>
            </div>
            <input
              type="checkbox"
              checked={survey.allow_anonymous}
              onChange={(e) => updateSurvey('allow_anonymous', e.target.checked)}
              className="w-5 h-5 rounded border-surface-300 text-nexora-600 focus:ring-nexora-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-xl bg-surface-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-surface-700">Require Email</p>
              <p className="text-xs text-surface-500">Ask respondents for their email before starting</p>
            </div>
            <input
              type="checkbox"
              checked={survey.require_email}
              onChange={(e) => updateSurvey('require_email', e.target.checked)}
              className="w-5 h-5 rounded border-surface-300 text-nexora-600 focus:ring-nexora-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-xl bg-surface-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-surface-700">Show Progress Bar</p>
              <p className="text-xs text-surface-500">Display completion progress to respondents</p>
            </div>
            <input
              type="checkbox"
              checked={survey.show_progress_bar}
              onChange={(e) => updateSurvey('show_progress_bar', e.target.checked)}
              className="w-5 h-5 rounded border-surface-300 text-nexora-600 focus:ring-nexora-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}
