import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, timeAgo, SURVEY_STATUS } from '../lib/constants';
import { HiOutlineArrowRight, HiOutlinePlus } from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({ surveys: 0, responses: 0, completions: 0, team: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  // FIX: depend on profile.id so data reloads when auth settles after login
  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  async function load() {
    setLoading(true);
    try {
      const [s, r, c, t] = await Promise.all([
        supabase.from('surveys').select('*', { count: 'exact', head: true }),
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }),
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ surveys: s.count || 0, responses: r.count || 0, completions: c.count || 0, team: t.count || 0 });

      const { data } = await supabase.from('surveys')
        .select('*, creator:user_profiles!created_by(full_name)')
        .order('created_at', { ascending: false }).limit(5);
      setRecent(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-ink-400 mt-1">{tenant?.name}</p>
        </div>
        {hasPermission(profile?.role, 'create_survey') && (
          <Link to="/surveys/new" className="btn-primary"><HiOutlinePlus className="w-4 h-4" />New Survey</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Surveys', val: stats.surveys, color: 'text-pri-600' },
          { label: 'Responses', val: stats.responses, color: 'text-acc-600' },
          { label: 'Completed', val: stats.completions, color: 'text-emerald-600' },
          { label: 'Team', val: stats.team, color: 'text-ink-600' },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-xl border border-ink-100 p-5 anim-enter`} style={{animationDelay:`${i*0.05}s`}}>
            <p className={`text-2xl font-display font-bold ${s.color}`}>{loading ? '—' : s.val}</p>
            <p className="text-xs text-ink-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-500">Recent surveys</h2>
          <Link to="/surveys" className="text-xs font-medium text-ink-400 hover:text-ink-700 flex items-center gap-1">
            View all <HiOutlineArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-ink-100 rounded-xl animate-pulse"/>)}</div>
        ) : recent.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-ink-100">
            <p className="text-ink-400 mb-4">No surveys yet</p>
            {hasPermission(profile?.role, 'create_survey') && (
              <Link to="/surveys/new" className="btn-primary text-xs">Create your first survey</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-ink-100 divide-y divide-ink-100">
            {recent.map(s => (
              <Link key={s.id} to={`/surveys/${s.id}/edit`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-ink-50/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{backgroundColor: s.theme_color || '#8b5cf6'}} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{s.title}</p>
                    <p className="text-[11px] text-ink-400">{timeAgo(s.created_at)} · {s.creator?.full_name || '—'}</p>
                  </div>
                </div>
                <span className={SURVEY_STATUS[s.status]?.class || 'badge-draft'}>
                  {SURVEY_STATUS[s.status]?.label || s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
