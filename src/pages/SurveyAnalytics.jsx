import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { formatDateTime } from '../lib/constants';
import { HiOutlineArrowLeft, HiOutlineDownload } from 'react-icons/hi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);
const colors = ['#4F7BFF','#3FD3A6','#7A6BFF','#F59E0B','#EF4444','#10B981','#8B5CF6','#3B82F6','#EC4899','#84CC16'];

export default function SurveyAnalytics() {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile?.id) load(); }, [id, profile?.id]);

  async function load() {
    try {
      const { data: s } = await supabase.from('surveys').select('*').eq('id', id).single();
      setSurvey(s);
      const { data: qs } = await supabase.from('survey_questions').select('*').eq('survey_id', id).order('sort_order');
      setQuestions(qs || []);
      const { data: rs } = await supabase.from('survey_responses').select('*').eq('survey_id', id).order('started_at');
      setResponses(rs || []);
      if (rs?.length) {
        const { data: ans } = await supabase.from('survey_answers').select('*').in('response_id', rs.map(r => r.id));
        setAnswers(ans || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const total = responses.length;
  const completed = responses.filter(r => r.status === 'completed').length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  function getQA(q) {
    const qa = answers.filter(a => a.question_id === q.id);
    if (!qa.length) return null;
    if (['single_choice', 'dropdown', 'yes_no'].includes(q.question_type)) {
      const c = {}; qa.forEach(a => { const v = a.answer_value || '—'; c[v] = (c[v] || 0) + 1; });
      return { type: 'doughnut', data: { labels: Object.keys(c).map(k => (q.options || []).find(o => o.value === k)?.label || k), datasets: [{ data: Object.values(c), backgroundColor: colors.slice(0, Object.keys(c).length), borderWidth: 0, hoverOffset: 4 }] }, total: qa.length };
    }
    if (q.question_type === 'multiple_choice') {
      const c = {}; qa.forEach(a => (a.answer_json || []).forEach(v => { c[v] = (c[v] || 0) + 1; }));
      return { type: 'bar', data: { labels: Object.keys(c).map(k => (q.options || []).find(o => o.value === k)?.label || k), datasets: [{ data: Object.values(c), backgroundColor: colors.slice(0, Object.keys(c).length), borderRadius: 6, barThickness: 28 }] }, total: qa.length };
    }
    if (['rating', 'scale'].includes(q.question_type)) {
      const vals = qa.map(a => parseInt(a.answer_value) || 0).filter(Boolean);
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
      const max = q.question_type === 'rating' ? 5 : 10;
      const dist = {}; for (let i = 1; i <= max; i++) dist[i] = 0; vals.forEach(v => { if (dist[v] !== undefined) dist[v]++; });
      return { type: 'bar', data: { labels: Object.keys(dist), datasets: [{ data: Object.values(dist), backgroundColor: colors, borderRadius: 4, barThickness: 20 }] }, avg, total: vals.length };
    }
    return { type: 'text', items: qa.map(a => a.answer_value).filter(Boolean), total: qa.length };
  }

  function exportCSV() {
    const h = ['#', 'Status', 'Email', 'Started', 'Completed', ...questions.map(q => q.question_text)];
    const rows = responses.map((r, i) => {
      const ra = answers.filter(a => a.response_id === r.id);
      return [i + 1, r.status, r.respondent_email || '', r.started_at, r.completed_at || '', ...questions.map(q => { const a = ra.find(x => x.question_id === q.id); return a?.answer_value || (a?.answer_json ? JSON.stringify(a.answer_json) : ''); })];
    });
    const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${survey?.title || 'survey'}-responses.csv`; a.click();
  }

  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { cornerRadius: 6 } } };

  if (loading) return <div className="text-center py-20 text-txt-secondary text-sm">Loading...</div>;
  if (!survey) return <div className="text-center py-20 text-txt-secondary text-sm">Not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/surveys/${id}/edit`} className="text-xs text-txt-tertiary hover:text-brand flex items-center gap-1 mb-1"><HiOutlineArrowLeft className="w-3 h-3" />Back</Link>
          <h1 className="page-title">{survey.title} — Analytics</h1>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-xs"><HiOutlineDownload className="w-3.5 h-3.5" />Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[{ l: 'Responses', v: total, c: 'text-brand' }, { l: 'Completed', v: completed, c: 'text-success' }, { l: 'Rate', v: `${rate}%`, c: 'text-violet' }].map((s, i) => (
          <div key={i} className="card p-5">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p><p className="text-xs text-txt-secondary mt-1">{s.l}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-txt-secondary mb-4">Question Breakdown</h2>
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const a = getQA(q);
          return (
            <div key={q.id} className="card p-6">
              <div className="flex items-start gap-2 mb-4">
                <span className="text-xs font-bold text-txt-tertiary mt-0.5">{idx + 1}.</span>
                <div><p className="text-sm font-semibold text-txt">{q.question_text}</p><p className="text-[11px] text-txt-tertiary">{a?.total || 0} responses</p></div>
              </div>
              {!a ? <p className="text-xs text-txt-placeholder italic">No responses</p> :
                a.type === 'doughnut' ? (
                  <div className="flex items-center gap-6">
                    <div className="w-[140px] h-[140px]"><Doughnut data={a.data} options={{ ...opts, cutout: '65%' }} /></div>
                    <div className="space-y-1.5 flex-1">{a.data.labels.map((l, i) => (<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i] }} /><span className="text-xs text-txt-secondary">{l}</span></div><span className="text-xs font-semibold text-txt">{a.data.datasets[0].data[i]}</span></div>))}</div>
                  </div>
                ) : a.type === 'bar' ? (
                  <div>{a.avg && <p className="text-xs text-txt-secondary mb-2">Average: <span className="font-bold text-txt text-base">{a.avg}</span></p>}<div className="h-[160px]"><Bar data={a.data} options={{ ...opts, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }} /></div></div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">{a.items.slice(0, 20).map((r, i) => (<div key={i} className="text-sm text-txt bg-bg rounded-btn px-3 py-1.5">{r}</div>))}{a.items.length > 20 && <p className="text-[11px] text-txt-tertiary">+{a.items.length - 20} more</p>}</div>
                )}
            </div>
          );
        })}
      </div>

      <div className="card p-6 mt-6">
        <h3 className="text-sm font-semibold text-txt-secondary mb-3">Individual Responses</h3>
        {!responses.length ? <p className="text-xs text-txt-placeholder">None yet</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">{['#', 'Status', 'Email', 'Started', 'Completed'].map(h => <th key={h} className="text-left py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-txt-tertiary">{h}</th>)}</tr></thead>
              <tbody>{responses.slice(0, 50).map((r, i) => (
                <tr key={r.id} className="border-b border-border-light hover:bg-bg/50">
                  <td className="py-2 px-3 text-txt-tertiary text-xs">{i + 1}</td>
                  <td className="py-2 px-3"><span className={r.status === 'completed' ? 'badge-active' : r.status === 'in_progress' ? 'badge bg-blue-50 text-blue-600' : 'badge-closed'}>{r.status}</span></td>
                  <td className="py-2 px-3 text-txt-secondary text-xs">{r.respondent_email || '—'}</td>
                  <td className="py-2 px-3 text-txt-tertiary text-xs">{formatDateTime(r.started_at)}</td>
                  <td className="py-2 px-3 text-txt-tertiary text-xs">{r.completed_at ? formatDateTime(r.completed_at) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
