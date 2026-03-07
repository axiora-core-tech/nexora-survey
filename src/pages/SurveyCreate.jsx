import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { QUESTION_TYPES, generateUniqueSlug } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineX, HiOutlineSave, HiOutlineGlobe } from 'react-icons/hi';

const newQ = () => ({ _id: Math.random().toString(36).slice(2), question_text: '', question_type: 'short_text', options: [], is_required: false, description: '' });
const hasOpts = t => ['single_choice','multiple_choice','dropdown'].includes(t);

export default function SurveyCreate() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('details');
  const [form, setForm] = useState({ title: '', description: '', welcome_message: '', thank_you_message: 'Thank you for completing this survey!', expires_at: '', theme_color: '#8b5cf6', allow_anonymous: true, require_email: false, show_progress_bar: true });
  const [questions, setQuestions] = useState([newQ()]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setQ = (id, k, v) => setQuestions(qs => qs.map(q => q._id === id ? { ...q, [k]: v } : q));
  const addQ = () => setQuestions(qs => [...qs, newQ()]);
  const delQ = id => { if (questions.length <= 1) return toast.error('Need at least one question'); setQuestions(qs => qs.filter(q => q._id !== id)); };
  const moveQ = (id, d) => setQuestions(qs => { const i = qs.findIndex(q => q._id === id); if ((d === -1 && i === 0) || (d === 1 && i === qs.length - 1)) return qs; const a = [...qs]; [a[i], a[i+d]] = [a[i+d], a[i]]; return a; });
  const addOpt = id => setQuestions(qs => qs.map(q => q._id === id ? { ...q, options: [...(q.options||[]), {label:'',value:''}] } : q));
  const setOpt = (id, i, v) => setQuestions(qs => qs.map(q => { if (q._id !== id) return q; const o = [...(q.options||[])]; o[i] = {label:v,value:v.toLowerCase().replace(/\s+/g,'_')}; return {...q,options:o}; }));
  const delOpt = (id, i) => setQuestions(qs => qs.map(q => q._id !== id ? q : {...q, options: q.options.filter((_,j)=>j!==i)}));

  async function save(status = 'draft') {
    if (!form.title.trim()) return toast.error('Title is required');
    if (questions.some(q => !q.question_text.trim())) return toast.error('All questions need text');
    if (questions.some(q => hasOpts(q.question_type) && (!q.options || q.options.length < 2))) return toast.error('Choice questions need ≥2 options');
    if (!profile?.tenant_id) return toast.error('Session error — refresh the page');

    setSaving(true);
    try {
      const slug = await generateUniqueSlug(supabase);
      const { data: survey, error: sErr } = await supabase.from('surveys').insert({
        title: form.title, description: form.description || null, welcome_message: form.welcome_message || null,
        thank_you_message: form.thank_you_message || null, expires_at: form.expires_at || null,
        allow_anonymous: form.allow_anonymous, require_email: form.require_email, show_progress_bar: form.show_progress_bar,
        theme_color: form.theme_color, slug, status, tenant_id: profile.tenant_id, created_by: profile.id,
      }).select().single();
      if (sErr) throw sErr;
      if (!survey) throw new Error('Survey not created');

      const { error: qErr } = await supabase.from('survey_questions').insert(
        questions.map((q, i) => ({
          survey_id: survey.id, question_text: q.question_text, question_type: q.question_type,
          options: hasOpts(q.question_type) ? q.options : null, is_required: q.is_required,
          description: q.description || null, sort_order: i,
        }))
      );
      if (qErr) throw qErr;
      toast.success(status === 'active' ? 'Published!' : 'Saved as draft');
      navigate(`/surveys/${survey.id}/edit`);
    } catch (e) { console.error(e); toast.error(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  }

  const tabs = [{id:'details',label:'Details'},{id:'questions',label:`Questions (${questions.length})`},{id:'settings',label:'Settings'}];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">New Survey</h1>
        <div className="flex gap-2">
          <button onClick={() => save('draft')} disabled={saving} className="btn-secondary text-xs"><HiOutlineSave className="w-3.5 h-3.5" />Draft</button>
          <button onClick={() => save('active')} disabled={saving} className="btn-primary text-xs"><HiOutlineGlobe className="w-3.5 h-3.5" />Publish</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-100 rounded-lg p-0.5 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${tab === t.id ? 'bg-white text-ink-900 shadow-xs' : 'text-ink-400 hover:text-ink-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="space-y-4 anim-enter">
          <div><label className="input-label">Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} className="input-field font-medium" placeholder="Customer Satisfaction Survey 2026" /></div>
          <div><label className="input-label">Description</label><textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field" rows={2} placeholder="Brief description..." /></div>
          <div><label className="input-label">Welcome Message</label><textarea value={form.welcome_message} onChange={e => set('welcome_message', e.target.value)} className="input-field" rows={2} placeholder="Shown before they start..." /></div>
          <div><label className="input-label">Thank You Message</label><textarea value={form.thank_you_message} onChange={e => set('thank_you_message', e.target.value)} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Expires</label><input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className="input-field text-sm" /></div>
            <div><label className="input-label">Theme Color</label>
              <div className="flex items-center gap-2"><input type="color" value={form.theme_color} onChange={e => set('theme_color', e.target.value)} className="w-9 h-9 rounded-lg border border-ink-200 cursor-pointer" /><input value={form.theme_color} onChange={e => set('theme_color', e.target.value)} className="input-field flex-1 font-mono text-sm" /></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-3 anim-enter">
          {questions.map((q, idx) => (
            <div key={q._id} className="bg-white rounded-xl border border-ink-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-ink-400">{idx+1}.</span>
                <div className="flex gap-0.5">
                  <button onClick={() => moveQ(q._id,-1)} disabled={idx===0} className="btn-ghost p-1"><HiOutlineArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveQ(q._id,1)} disabled={idx===questions.length-1} className="btn-ghost p-1"><HiOutlineArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => delQ(q._id)} className="btn-ghost p-1 text-red-500 hover:bg-red-50"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <input value={q.question_text} onChange={e => setQ(q._id,'question_text',e.target.value)} className="input-field mb-2 font-medium" placeholder="Your question..." />
              <input value={q.description} onChange={e => setQ(q._id,'description',e.target.value)} className="input-field mb-3 text-sm" placeholder="Helper text (optional)" />
              <div className="flex gap-3 items-center">
                <select value={q.question_type} onChange={e => setQ(q._id,'question_type',e.target.value)} className="input-field flex-1 text-sm">
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={q.is_required} onChange={e => setQ(q._id,'is_required',e.target.checked)} className="rounded border-ink-300 text-pri-600 w-3.5 h-3.5" />Required
                </label>
              </div>
              {hasOpts(q.question_type) && (
                <div className="mt-3 pl-3 border-l-2 border-ink-100 space-y-1.5">
                  {(q.options||[]).map((o,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-ink-300 flex-shrink-0" />
                      <input value={o.label} onChange={e => setOpt(q._id,i,e.target.value)} className="input-field py-1.5 flex-1 text-sm" placeholder={`Option ${i+1}`} />
                      <button onClick={() => delOpt(q._id,i)} className="btn-ghost p-1 text-red-400"><HiOutlineX className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addOpt(q._id)} className="text-xs font-medium text-pri-600 hover:text-pri-700 flex items-center gap-1 mt-1"><HiOutlinePlus className="w-3 h-3" />Add option</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addQ} className="w-full py-3 border-2 border-dashed border-ink-200 rounded-xl text-sm text-ink-400 hover:border-ink-400 hover:text-ink-600 transition-colors flex items-center justify-center gap-1.5">
            <HiOutlinePlus className="w-4 h-4" />Add Question
          </button>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-2 anim-enter">
          {[{k:'allow_anonymous',l:'Anonymous Responses',d:'No identity needed'},{k:'require_email',l:'Require Email',d:'Ask before starting'},{k:'show_progress_bar',l:'Progress Bar',d:'Show completion %'}].map(s => (
            <label key={s.k} className="flex items-center justify-between p-4 rounded-xl bg-white border border-ink-100 cursor-pointer hover:bg-ink-50/50 transition-colors">
              <div><p className="text-sm font-medium text-ink-700">{s.l}</p><p className="text-xs text-ink-400">{s.d}</p></div>
              <input type="checkbox" checked={form[s.k]} onChange={e => set(s.k, e.target.checked)} className="rounded border-ink-300 text-pri-600 w-4 h-4" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
