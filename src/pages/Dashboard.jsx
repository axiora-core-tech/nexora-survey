import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, timeAgo, SURVEY_STATUS } from '../lib/constants';
import {
  HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineChartBar,
  HiOutlinePlusCircle, HiOutlineArrowRight, HiOutlineCheckCircle
} from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({ surveys: 0, responses: 0, completions: 0, team: 0 });
  const [recentSurveys, setRecentSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const [{ count: surveyCount }, { count: responseCount }, { count: completionCount }, { count: teamCount }] = await Promise.all([
        supabase.from('surveys').select('*', { count: 'exact', head: true }),
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }),
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        surveys: surveyCount || 0,
        responses: responseCount || 0,
        completions: completionCount || 0,
        team: teamCount || 0,
      });

      const { data: surveys } = await supabase
        .from('surveys')
        .select('*, creator:user_profiles!created_by(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentSurveys(surveys || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const statCards = [
    { label: 'Surveys', value: stats.surveys, icon: HiOutlineClipboardList, color: 'bg-pri-50 text-pri-600 ring-pri-100' },
    { label: 'Responses', value: stats.responses, icon: HiOutlineChartBar, color: 'bg-acc-50 text-acc-600 ring-acc-100' },
    { label: 'Completed', value: stats.completions, icon: HiOutlineCheckCircle, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { label: 'Team', value: stats.team, icon: HiOutlineUserGroup, color: 'bg-purple-50 text-purple-600 ring-purple-100' },
  ];

  return (
    <div className="animate-enter">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">{greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
        <p className="page-subtitle">Here's what's happening with {tenant?.name || 'your organization'}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card animate-enter" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`stat-icon ${stat.color} ring-1`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <span className="stat-value">{loading ? '—' : stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card p-6">
          <p className="overline mb-4">Quick actions</p>
          <div className="space-y-2.5">
            {hasPermission(profile?.role, 'create_survey') && (
              <Link to="/surveys/new" className="flex items-center gap-3 p-3.5 rounded-xl bg-pri-50/70 ring-1 ring-pri-100 hover:ring-pri-200 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-pri-100 flex items-center justify-center group-hover:bg-pri-200 transition-colors">
                  <HiOutlinePlusCircle className="w-5 h-5 text-pri-600" />
                </div>
                <div><p className="text-[13px] font-semibold text-pri-800">New Survey</p><p className="text-[11px] text-pri-500">Start collecting</p></div>
              </Link>
            )}
            <Link to="/surveys" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-ink-50 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center group-hover:bg-ink-200 transition-colors">
                <HiOutlineClipboardList className="w-5 h-5 text-ink-600" />
              </div>
              <div><p className="text-[13px] font-semibold text-ink-700">All Surveys</p><p className="text-[11px] text-ink-400">View & manage</p></div>
            </Link>
            {hasPermission(profile?.role, 'manage_team') && (
              <Link to="/team" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-ink-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center group-hover:bg-ink-200 transition-colors">
                  <HiOutlineUserGroup className="w-5 h-5 text-ink-600" />
                </div>
                <div><p className="text-[13px] font-semibold text-ink-700">Team</p><p className="text-[11px] text-ink-400">Manage members</p></div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent surveys */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="overline">Recent surveys</p>
            <Link to="/surveys" className="text-[13px] font-semibold text-pri-600 hover:text-pri-700 flex items-center gap-1">
              View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-[52px] skeleton" />)}
            </div>
          ) : recentSurveys.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-4">
                <HiOutlineClipboardList className="w-7 h-7 text-ink-400" />
              </div>
              <p className="text-ink-500 text-[15px] mb-4">No surveys yet</p>
              {hasPermission(profile?.role, 'create_survey') && (
                <Link to="/surveys/new" className="btn-primary">Create your first survey</Link>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {recentSurveys.map((s) => (
                <Link key={s.id} to={`/surveys/${s.id}/edit`}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-ink-50 transition-all group">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: s.theme_color || '#8b5cf6' }} />
                    <div>
                      <p className="text-[14px] font-semibold text-ink-800 truncate group-hover:text-pri-700 transition-colors">
                        {s.title}
                      </p>
                      <p className="text-[12px] text-ink-400">{timeAgo(s.created_at)} · {s.creator?.full_name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className={SURVEY_STATUS[s.status]?.class || 'badge-draft'}>
                      {SURVEY_STATUS[s.status]?.label || s.status}
                    </span>
                    <HiOutlineArrowRight className="w-4 h-4 text-ink-300 group-hover:text-pri-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
