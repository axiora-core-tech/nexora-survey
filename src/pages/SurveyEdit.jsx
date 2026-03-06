import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, hasPermission, SURVEY_STATUS, formatDate, isExpired } from '../lib/constants';
import toast from 'react-hot-toast';
import {
  HiOutlinePlusCircle, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown,
  HiOutlineSave, HiOutlineEye, HiOutlineCalendar, HiOutlineX, HiOutlineLink,
  HiOutlineChartBar, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh, HiOutlineShare
} from 'react-icons/hi';

export default function SurveyEdit() {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [shareModal, setShareModal] = useState(false);
  const [shareUsers, setShareUsers] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);

  useEffect(() => { loadSurvey(); }, [id]);

  async function loadSurvey() {
    try {
      const { data: s, error: sErr } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();
      if (sErr) throw sErr;
      setSurvey({
        ...s,
        expires_at: s.expires_at ? new Date(s.expires_at).toISOString().slice(0, 16) : '',
      });

      const { data: qs, error: qErr } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('sort_order');
      if (qErr) throw qErr;
      setQuestions((qs || []).map((q) => ({ ...q, tempId: q.id })));

      // Load shares
      const { data: shares } = await supabase
        .from('survey_shares')
        .select('*, shared_with_user:user_profiles!shared_with(full_name, email)')
        .eq('survey_id', id);
      setShareUsers(shares || []);

      // Load tenant users for sharing
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role');
      setTenantUsers(users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load survey');
      navigate('/surveys');
    } finally {
      setLoading(false);
    }
  }

  const updateSurvey = (field, value) => setSurvey((s) => ({ ...s, [field]: value }));

  const updateQuestion = (tempId, field, value) => {
    setQuestions((qs) => qs.map((q) => (q.tempId === tempId ? { ...q, [field]: value } : q)));
  };

  const addQuestion = () => {
    setQuestions((qs) => [...qs, {
      tempId: 'new_' + Math.random().toString(36).slice(2),
      question_text: '', question_type: 'short_text', options: [],
      is_required: false, description: '', survey_id: id,
    }]);
  };

  const removeQuestion = async (tempId) => {
    if (questions.length <= 1) return toast.error('Need at least one question');
    // If existing question (has UUID id), delete from DB
    if (!tempId.startsWith('new_')) {
      await supabase.from('survey_questions').delete().eq('id', tempId);
    }
    setQuestions((qs) => qs.filter((q) => q.tempId !== tempId));
  };

  const moveQuestion = (tempId, dir) => {
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.tempId === tempId);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === qs.length - 1)) return qs;
      const arr = [...qs];
      [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
      return arr;
    });
  };

  const addOption = (tempId) => {
    setQuestions((qs) =>
      qs.map((q) => q.tempId === tempId ? { ...q, options: [...(q.options || []), { label: '', value: '' }] } : q)
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
      qs.map((q) => q.tempId !== tempId ? q : { ...q, options: q.options.filter((_, i) => i !== optIdx) })
    );
  };

  const hasOptions = (type) => ['single_choice', 'multiple_choice', 'dropdown'].includes(type);

  async function handleSave() {
    if (!survey.title.trim()) return toast.error('Survey title required');
    setSaving(true);
    try {
      const { data: updatedSurvey, error: sErr } = await supabase
        .from('surveys')
        .update({
          title: survey.title,
          description: survey.description || null,
          welcome_message: survey.welcome_message || null,
          thank_you_message: survey.thank_you_message || null,
          expires_at: survey.expires_at || null,
          allow_anonymous: survey.allow_anonymous,
          require_email: survey.require_email,
          show_progress_bar: survey.show_progress_bar,
          theme_color: survey.theme_color,
        })
        .eq('id', id)
        .select()
        .single();

      console.log('Survey update result:', { data: updatedSurvey, error: sErr });

      if (sErr) throw sErr;
      if (!updatedSurvey) throw new Error('Survey update had no effect. Check your permissions.');

      // Upsert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qData = {
          survey_id: id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: hasOptions(q.question_type) ? q.options : null,
          is_required: q.is_required,
          description: q.description || null,
          sort_order: i,
        };
        if (q.tempId.startsWith('new_')) {
          const { error: qErr } = await supabase.from('survey_questions').insert(qData);
          if (qErr) { console.error('Question insert error:', qErr); throw qErr; }
        } else {
          const { error: qErr } = await supabase.from('survey_questions').update(qData).eq('id', q.tempId);
          if (qErr) { console.error('Question update error:', qErr); throw qErr; }
        }
      }

      toast.success('Survey saved!');
      await loadSurvey();
    } catch (err) {
      console.error('Save survey error:', err);
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status) {
    if (status === 'active' && isExpired(survey.expires_at)) {
      const days = prompt('Survey expired. Days to extend:', '7');
      if (!days) return;
      const d = new Date();
      d.setDate(d.getDate() + parseInt(days, 10));
      const { error } = await supabase.from('surveys').update({ status, expires_at: d.toISOString() }).eq('id', id);
      if (error) return toast.error('Failed');
      toast.success('Survey resumed!');
    } else {
      const { error } = await supabase.from('surveys').update({ status }).eq('id', id);
      if (error) return toast.error('Failed');
      toast.success(`Survey ${status}`);
    }
    loadSurvey();
  }

  async function handleShare(userId) {
    try {
      const { error } = await supabase.from('survey_shares').upsert({
        survey_id: id,
        shared_with: userId,
        shared_by: profile.id,
        permission: 'view_analytics',
      });
      if (error) throw error;
      toast.success('Shared!');
      loadSurvey();
    } catch (err) {
      toast.error('Failed to share');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/s/${survey.slug}`);
    toast.success('Link copied!');
  }

  if (loading) return <div className="text-center py-20 text-surface-400">Loading survey...</div>;
  if (!survey) return <div className="text-center py-20 text-surface-400">Survey not found</div>;

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'questions', label: `Questions (${questions.length})` },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="page-title">{survey.title || 'Untitled Survey'}</h1>
            <span className={SURVEY_STATUS[survey.status]?.class || 'badge-draft'}>
              {SURVEY_STATUS[survey.status]?.label || survey.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-surface-400">
            {survey.expires_at && (
              <span className={isExpired(survey.expires_at) ? 'text-red-500 font-medium' : ''}>
                {isExpired(survey.expires_at) ? 'Expired' : `Expires ${formatDate(survey.expires_at)}`}
              </span>
            )}
            <button onClick={copyLink} className="flex items-center gap-1 hover:text-nexora-600 transition-colors">
              <HiOutlineLink className="w-4 h-4" /> Copy Link
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {survey.status !== 'active' && (
            <button onClick={() => handleStatusChange('active')} className="btn-success text-sm">
              <HiOutlinePlay className="w-4 h-4" /> Activate
            </button>
          )}
          {survey.status === 'active' && (
            <button onClick={() => handleStatusChange('paused')} className="btn-secondary text-sm">
              <HiOutlinePause className="w-4 h-4" /> Pause
            </button>
          )}
          {(survey.status === 'expired' || survey.status === 'closed') &&
            hasPermission(profile?.role, 'resume_survey') && (
            <button onClick={() => handleStatusChange('active')} className="btn-success text-sm">
              <HiOutlineRefresh className="w-4 h-4" /> Resume
            </button>
          )}
          <Link to={`/surveys/${id}/analytics`} className="btn-secondary text-sm">
            <HiOutlineChartBar className="w-4 h-4" /> Analytics
          </Link>
          <button onClick={() => setShareModal(true)} className="btn-secondary text-sm">
            <HiOutlineShare className="w-4 h-4" /> Share
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            <HiOutlineSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
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
              activeTab === tab.id ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {activeTab === 'details' && (
        <div className="glass-card p-6 space-y-5 animate-fade-in">
          <div>
            <label className="input-label">Survey Title *</label>
            <input type="text" value={survey.title} onChange={(e) => updateSurvey('title', e.target.value)} className="input-field text-lg font-semibold" />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={survey.description || ''} onChange={(e) => updateSurvey('description', e.target.value)} className="input-field" rows={3} />
          </div>
          <div>
            <label className="input-label">Welcome Message</label>
            <textarea value={survey.welcome_message || ''} onChange={(e) => updateSurvey('welcome_message', e.target.value)} className="input-field" rows={2} />
          </div>
          <div>
            <label className="input-label">Thank You Message</label>
            <textarea value={survey.thank_you_message || ''} onChange={(e) => updateSurvey('thank_you_message', e.target.value)} className="input-field" rows={2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="input-label"><HiOutlineCalendar className="inline w-4 h-4 mr-1" />Expiry Date</label>
              <input type="datetime-local" value={survey.expires_at} onChange={(e) => updateSurvey('expires_at', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="input-label">Theme Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={survey.theme_color || '#6366f1'} onChange={(e) => updateSurvey('theme_color', e.target.value)} className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer" />
                <input type="text" value={survey.theme_color || ''} onChange={(e) => updateSurvey('theme_color', e.target.value)} className="input-field flex-1" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4 animate-fade-in">
          {questions.map((q, idx) => (
            <div key={q.tempId} className="glass-card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-nexora-50 border border-nexora-100 flex items-center justify-center text-xs font-bold text-nexora-600">{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveQuestion(q.tempId, -1)} className="btn-ghost p-1.5" disabled={idx === 0}><HiOutlineArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveQuestion(q.tempId, 1)} className="btn-ghost p-1.5" disabled={idx === questions.length - 1}><HiOutlineArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => removeQuestion(q.tempId)} className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /></button>
                </div>
              </div>
              <input type="text" value={q.question_text} onChange={(e) => updateQuestion(q.tempId, 'question_text', e.target.value)} className="input-field mb-3 font-medium" placeholder="Question text..." />
              <input type="text" value={q.description || ''} onChange={(e) => updateQuestion(q.tempId, 'description', e.target.value)} className="input-field mb-3 text-sm" placeholder="Helper text..." />
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <select value={q.question_type} onChange={(e) => updateQuestion(q.tempId, 'question_type', e.target.value)} className="input-field">
                    {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 px-4 py-3 bg-surface-50 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={q.is_required} onChange={(e) => updateQuestion(q.tempId, 'is_required', e.target.checked)} className="w-4 h-4 rounded border-surface-300 text-nexora-600" />
                  <span className="text-sm font-medium text-surface-600">Required</span>
                </label>
              </div>
              {hasOptions(q.question_type) && (
                <div className="space-y-2 pl-4 border-l-2 border-nexora-100">
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-surface-300 flex-shrink-0" />
                      <input type="text" value={opt.label} onChange={(e) => updateOption(q.tempId, oi, e.target.value)} className="input-field py-2 flex-1" placeholder={`Option ${oi + 1}`} />
                      <button onClick={() => removeOption(q.tempId, oi)} className="btn-ghost p-1.5 text-red-400"><HiOutlineX className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => addOption(q.tempId)} className="text-sm font-medium text-nexora-600 hover:text-nexora-700 flex items-center gap-1">
                    <HiOutlinePlusCircle className="w-4 h-4" /> Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-surface-300 rounded-2xl text-surface-500 hover:border-nexora-400 hover:text-nexora-600 transition-all flex items-center justify-center gap-2 font-medium">
            <HiOutlinePlusCircle className="w-5 h-5" /> Add Question
          </button>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="glass-card p-6 space-y-4 animate-fade-in">
          {[
            { field: 'allow_anonymous', label: 'Allow Anonymous', desc: 'No identity needed' },
            { field: 'require_email', label: 'Require Email', desc: 'Ask for email first' },
            { field: 'show_progress_bar', label: 'Show Progress', desc: 'Display completion bar' },
          ].map((s) => (
            <label key={s.field} className="flex items-center justify-between p-4 rounded-xl bg-surface-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-surface-700">{s.label}</p>
                <p className="text-xs text-surface-500">{s.desc}</p>
              </div>
              <input type="checkbox" checked={survey[s.field]} onChange={(e) => updateSurvey(s.field, e.target.checked)} className="w-5 h-5 rounded border-surface-300 text-nexora-600" />
            </label>
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-glass-lg w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Share Analytics</h3>
              <button onClick={() => setShareModal(false)} className="btn-ghost p-1.5"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-surface-500 mb-4">Share with team members in your organization only.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tenantUsers.filter((u) => u.id !== profile.id).map((user) => {
                const isShared = shareUsers.some((s) => s.shared_with === user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                    <div>
                      <p className="text-sm font-medium text-surface-700">{user.full_name || user.email}</p>
                      <p className="text-xs text-surface-400">{user.role}</p>
                    </div>
                    {isShared ? (
                      <span className="text-xs font-medium text-emerald-600">Shared</span>
                    ) : (
                      <button onClick={() => handleShare(user.id)} className="text-xs font-medium text-nexora-600 hover:text-nexora-700">
                        Share
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
