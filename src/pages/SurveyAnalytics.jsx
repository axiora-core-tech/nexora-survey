import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { formatDate, formatDateTime, SURVEY_STATUS } from '../lib/constants';
import { HiOutlineArrowLeft, HiOutlineDownload, HiOutlineUsers, HiOutlineCheckCircle, HiOutlineClock, HiOutlineChartBar } from 'react-icons/hi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const chartColors = ['#8b5cf6', '#f97316', '#51cf66', '#ff6b6b', '#845ef7', '#20c997', '#fcc419', '#339af0', '#f06595', '#a9e34b'];

export default function SurveyAnalytics() {
  const { id } = useParams();
  const { profile } = useAuthStore();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, [id]);

  async function loadAnalytics() {
    try {
      const { data: s } = await supabase.from('surveys').select('*').eq('id', id).single();
      setSurvey(s);

      const { data: qs } = await supabase.from('survey_questions').select('*').eq('survey_id', id).order('sort_order');
      setQuestions(qs || []);

      const { data: rs } = await supabase.from('survey_responses').select('*').eq('survey_id', id).order('started_at');
      setResponses(rs || []);

      // Get all answers for this survey's responses
      if (rs && rs.length > 0) {
        const responseIds = rs.map((r) => r.id);
        const { data: ans } = await supabase.from('survey_answers').select('*').in('response_id', responseIds);
        setAnswers(ans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Compute stats
  const totalResponses = responses.length;
  const completedResponses = responses.filter((r) => r.status === 'completed').length;
  const inProgressResponses = responses.filter((r) => r.status === 'in_progress').length;
  const completionRate = totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0;
  const avgTime = responses
    .filter((r) => r.completed_at && r.started_at)
    .reduce((acc, r, _, arr) => {
      const seconds = (new Date(r.completed_at) - new Date(r.started_at)) / 1000;
      return acc + seconds / arr.length;
    }, 0);

  // Responses over time (by day)
  const responsesByDay = {};
  responses.forEach((r) => {
    const day = new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    responsesByDay[day] = (responsesByDay[day] || 0) + 1;
  });

  const timeChartData = {
    labels: Object.keys(responsesByDay),
    datasets: [{
      label: 'Responses',
      data: Object.values(responsesByDay),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#8b5cf6',
    }],
  };

  // Per-question analytics
  function getQuestionAnalytics(question) {
    const qAnswers = answers.filter((a) => a.question_id === question.id);
    if (qAnswers.length === 0) return null;

    switch (question.question_type) {
      case 'single_choice':
      case 'dropdown':
      case 'yes_no': {
        const counts = {};
        qAnswers.forEach((a) => {
          const val = a.answer_value || 'No answer';
          counts[val] = (counts[val] || 0) + 1;
        });
        return {
          type: 'doughnut',
          data: {
            labels: Object.keys(counts).map((k) => {
              const opt = (question.options || []).find((o) => o.value === k);
              return opt?.label || k;
            }),
            datasets: [{
              data: Object.values(counts),
              backgroundColor: chartColors.slice(0, Object.keys(counts).length),
              borderWidth: 0,
              hoverOffset: 8,
            }],
          },
          total: qAnswers.length,
        };
      }

      case 'multiple_choice': {
        const counts = {};
        qAnswers.forEach((a) => {
          const vals = a.answer_json || [];
          vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
        });
        return {
          type: 'bar',
          data: {
            labels: Object.keys(counts).map((k) => {
              const opt = (question.options || []).find((o) => o.value === k);
              return opt?.label || k;
            }),
            datasets: [{
              data: Object.values(counts),
              backgroundColor: chartColors.slice(0, Object.keys(counts).length),
              borderRadius: 8,
              barThickness: 32,
            }],
          },
          total: qAnswers.length,
        };
      }

      case 'rating':
      case 'scale': {
        const vals = qAnswers.map((a) => parseInt(a.answer_value) || 0).filter(Boolean);
        const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
        const max = question.question_type === 'rating' ? 5 : 10;
        const distribution = {};
        for (let i = 1; i <= max; i++) distribution[i] = 0;
        vals.forEach((v) => { if (distribution[v] !== undefined) distribution[v]++; });
        return {
          type: 'bar',
          data: {
            labels: Object.keys(distribution),
            datasets: [{
              data: Object.values(distribution),
              backgroundColor: Object.keys(distribution).map((_, i) => chartColors[i % chartColors.length]),
              borderRadius: 6,
              barThickness: 24,
            }],
          },
          average: avg,
          total: vals.length,
        };
      }

      case 'short_text':
      case 'long_text':
      case 'email':
      case 'number':
      case 'date': {
        return {
          type: 'text',
          responses: qAnswers.map((a) => a.answer_value).filter(Boolean),
          total: qAnswers.length,
        };
      }

      default:
        return null;
    }
  }

  // Export CSV
  function exportCSV() {
    const headers = ['Response ID', 'Status', 'Email', 'Started', 'Completed', ...questions.map((q) => q.question_text)];
    const rows = responses.map((r) => {
      const rAnswers = answers.filter((a) => a.response_id === r.id);
      return [
        r.id,
        r.status,
        r.respondent_email || '',
        r.started_at,
        r.completed_at || '',
        ...questions.map((q) => {
          const ans = rAnswers.find((a) => a.question_id === q.id);
          return ans?.answer_value || (ans?.answer_json ? JSON.stringify(ans.answer_json) : '');
        }),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${survey?.title || 'survey'}-responses.csv`;
    a.click();
  }

  if (loading) return <div className="text-center py-20 text-ink-400">Loading analytics...</div>;
  if (!survey) return <div className="text-center py-20 text-ink-400">Survey not found</div>;

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
  };

  return (
    <div className="animate-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link to={`/surveys/${id}/edit`} className="text-sm text-pri-600 hover:text-pri-700 flex items-center gap-1 mb-2">
            <HiOutlineArrowLeft className="w-4 h-4" /> Back to Survey
          </Link>
          <h1 className="page-title flex items-center gap-3">
            <HiOutlineChartBar className="w-7 h-7 text-pri-500" />
            {survey.title}
          </h1>
          <p className="text-ink-500 mt-1">Response analytics and insights</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary">
          <HiOutlineDownload className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Responses', value: totalResponses, icon: HiOutlineUsers, color: 'bg-pri-50 text-pri-600 ring-1 ring-pri-100' },
          { label: 'Completed', value: completedResponses, icon: HiOutlineCheckCircle, color: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: HiOutlineChartBar, color: 'bg-acc-50 text-acc-600 ring-1 ring-acc-100' },
          { label: 'Avg. Time', value: avgTime > 0 ? `${Math.round(avgTime / 60)}m` : '—', icon: HiOutlineClock, color: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Response trend */}
      {Object.keys(responsesByDay).length > 1 && (
        <div className="card p-6 mb-8">
          <h3 className="section-title mb-4">Response Trend</h3>
          <div className="h-[200px]">
            <Line data={timeChartData} options={{ ...chartOpts, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      <h2 className="section-title mb-4">Question Breakdown</h2>
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const analytics = getQuestionAnalytics(q);
          return (
            <div key={q.id} className="card p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 rounded-lg bg-pri-50 border ring-1 ring-pri-100 flex items-center justify-center text-xs font-bold text-pri-600 flex-shrink-0">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-ink-800">{q.question_text}</h4>
                  <p className="text-xs text-ink-400 mt-0.5">{analytics?.total || 0} responses</p>
                </div>
              </div>

              {!analytics ? (
                <p className="text-sm text-ink-400 italic">No responses yet</p>
              ) : analytics.type === 'doughnut' ? (
                <div className="flex items-center gap-8">
                  <div className="w-[160px] h-[160px]">
                    <Doughnut data={analytics.data} options={{ ...chartOpts, cutout: '65%' }} />
                  </div>
                  <div className="flex-1 space-y-2">
                    {analytics.data.labels.map((label, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                          <span className="text-sm text-ink-700">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-ink-600">
                          {analytics.data.datasets[0].data[i]} ({Math.round((analytics.data.datasets[0].data[i] / analytics.total) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : analytics.type === 'bar' ? (
                <div>
                  {analytics.average && (
                    <p className="text-sm text-ink-500 mb-3">Average: <span className="font-bold text-ink-800 text-lg">{analytics.average}</span></p>
                  )}
                  <div className="h-[180px]">
                    <Bar data={analytics.data} options={{ ...chartOpts, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }} />
                  </div>
                </div>
              ) : analytics.type === 'text' ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {analytics.responses.slice(0, 20).map((resp, i) => (
                    <div key={i} className="text-sm text-ink-700 bg-canvas rounded-lg px-3 py-2">
                      {resp}
                    </div>
                  ))}
                  {analytics.responses.length > 20 && (
                    <p className="text-xs text-ink-400">...and {analytics.responses.length - 20} more</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Individual responses table */}
      <div className="card p-6 mt-8">
        <h3 className="section-title mb-4">Individual Responses</h3>
        {responses.length === 0 ? (
          <p className="text-sm text-ink-400">No responses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="text-left py-3 px-3 font-semibold text-ink-500">#</th>
                  <th className="text-left py-3 px-3 font-semibold text-ink-500">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-ink-500">Email</th>
                  <th className="text-left py-3 px-3 font-semibold text-ink-500">Started</th>
                  <th className="text-left py-3 px-3 font-semibold text-ink-500">Completed</th>
                </tr>
              </thead>
              <tbody>
                {responses.slice(0, 50).map((r, i) => (
                  <tr key={r.id} className="border-b border-ink-100 hover:bg-canvas">
                    <td className="py-2.5 px-3 text-ink-400">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge text-[10px] border ${
                        r.status === 'completed' ? 'badge-active' : r.status === 'in_progress' ? 'badge bg-blue-50 text-blue-600 border-blue-200' : 'badge-closed'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-ink-600">{r.respondent_email || '—'}</td>
                    <td className="py-2.5 px-3 text-ink-500">{formatDateTime(r.started_at)}</td>
                    <td className="py-2.5 px-3 text-ink-500">{r.completed_at ? formatDateTime(r.completed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
