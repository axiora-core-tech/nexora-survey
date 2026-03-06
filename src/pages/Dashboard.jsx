import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, formatDate, timeAgo, SURVEY_STATUS } from '../lib/constants';
import {
  HiOutlineClipboardList, HiOutlineUserGroup, HiOutlineChartBar,
  HiOutlinePlusCircle, HiOutlineArrowRight, HiOutlineCheckCircle
} from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({ surveys: 0, responses: 0, completions: 0, team: 0 });
  const [recentSurveys, setRecentSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Survey count
      const { count: surveyCount } = await supabase
        .from('surveys')
        .select('*', { count: 'exact', head: true });

      // Response count
      const { count: responseCount } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true });

      // Completed count
      const { count: completionCount } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Team count
      const { count: teamCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        surveys: surveyCount || 0,
        responses: responseCount || 0,
        completions: completionCount || 0,
        team: teamCount || 0,
      });

      // Recent surveys
      const { data: surveys } = await supabase
        .from('surveys')
        .select('*, user_profiles!surveys_created_by_fkey(full_name, email)')
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
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-surface-500 mt-1">
          Here's what's happening with {tenant?.name || 'your organization'} today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Surveys', value: stats.surveys, icon: HiOutlineClipboardList, color: 'nexora' },
          { label: 'Total Responses', value: stats.responses, icon: HiOutlineChartBar, color: 'warm' },
          { label: 'Completed', value: stats.completions, icon: HiOutlineCheckCircle, color: 'emerald' },
          { label: 'Team Members', value: stats.team, icon: HiOutlineUserGroup, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 border border-${stat.color}-100 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <span className="stat-value">{loading ? '—' : stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Quick actions + recent surveys */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {hasPermission(profile?.role, 'create_survey') && (
              <Link
                to="/surveys/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-nexora-50 border border-nexora-100 hover:border-nexora-200 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-nexora-100 flex items-center justify-center group-hover:bg-nexora-200 transition-colors">
                  <HiOutlinePlusCircle className="w-5 h-5 text-nexora-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-nexora-700">Create New Survey</p>
                  <p className="text-xs text-nexora-500">Start collecting responses</p>
                </div>
              </Link>
            )}
            <Link
              to="/surveys"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center group-hover:bg-surface-200 transition-colors">
                <HiOutlineClipboardList className="w-5 h-5 text-surface-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-700">View All Surveys</p>
                <p className="text-xs text-surface-500">Manage existing surveys</p>
              </div>
            </Link>
            {hasPermission(profile?.role, 'manage_team') && (
              <Link
                to="/team"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center group-hover:bg-surface-200 transition-colors">
                  <HiOutlineUserGroup className="w-5 h-5 text-surface-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-700">Manage Team</p>
                  <p className="text-xs text-surface-500">Invite and manage members</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent surveys */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Surveys</h2>
            <Link to="/surveys" className="text-sm font-medium text-nexora-600 hover:text-nexora-700 flex items-center gap-1">
              View all <HiOutlineArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentSurveys.length === 0 ? (
            <div className="text-center py-12">
              <HiOutlineClipboardList className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 mb-4">No surveys yet. Create your first one!</p>
              {hasPermission(profile?.role, 'create_survey') && (
                <Link to="/surveys/new" className="btn-primary text-sm">
                  Create Survey
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentSurveys.map((survey) => (
                <Link
                  key={survey.id}
                  to={`/surveys/${survey.id}/edit`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate group-hover:text-nexora-700 transition-colors">
                      {survey.title}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Created {timeAgo(survey.created_at)} by {survey.user_profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={SURVEY_STATUS[survey.status]?.class || 'badge-draft'}>
                      {SURVEY_STATUS[survey.status]?.label || survey.status}
                    </span>
                    <HiOutlineArrowRight className="w-4 h-4 text-surface-300 group-hover:text-nexora-500 transition-colors" />
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
