import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, timeAgo, SURVEY_STATUS } from '../lib/constants';
import { HiOutlineArrowRight, HiOutlinePlus } from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({ surveys: 0, responses: 0, completions: 0, team: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile?.id) load(); }, [profile?.id]);

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
      const { data } = await supabase.from('surveys').select('*, creator:user_profiles!created_by(full_name)').order('created_at', { ascending: false }).limit(6);
      setRecent(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const statItems = [
    { label: 'Total Surveys', val: stats.surveys, color: 'bg-accent' },
    { label: 'Responses', val: stats.responses, color: 'bg-dark' },
    { label: 'Completed', val: stats.completions, color: 'bg-accent' },
    { label: 'Team Members', val: stats.team, color: 'bg-dark' },
  ];

  return (
    <div>
      {/* Hero greeting — big, bold */}
      <div className="flex items-end justify-between mb-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-accent text-sm font-semibold tracking-[0.15em] uppercase mb-2">{tenant?.name}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-dark tracking-tight leading-tight">
            {greet},<br />{profile?.full_name?.split(' ')[0] || 'there'}
          </h1>
        </motion.div>
        {hasPermission(profile?.role, 'create_survey') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Link to="/surveys/new" className="bg-dark text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent transition-colors duration-300 flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> New Survey
            </Link>
          </motion.div>
        )}
      </div>

      {/* Stats — horizontal row, large numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {statItems.map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <p className="text-4xl md:text-5xl font-extrabold text-dark tracking-tight">{loading ? '—' : s.val}</p>
            <p className="text-muted text-sm mt-2 font-medium">{s.label}</p>
            <div className={`w-8 h-1 rounded-full mt-4 ${s.color}`} />
          </motion.div>
        ))}
      </div>

      {/* Recent surveys — horizontal scroll on mobile, grid on desktop */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-muted uppercase tracking-[0.15em]">Recent Surveys</h2>
        <Link to="/surveys" className="text-sm font-semibold text-dark hover:text-accent transition-colors flex items-center gap-1">
          View all <HiOutlineArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-muted mb-6">No surveys yet. Let's change that.</p>
          {hasPermission(profile?.role, 'create_survey') && (
            <Link to="/surveys/new" className="bg-dark text-white px-8 py-3 rounded-full text-sm font-semibold hover:bg-accent transition-colors inline-flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Create your first survey
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.map((s, i) => (
            <motion.div key={s.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}>
              <Link to={`/surveys/${s.id}/edit`}
                className="block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.theme_color || '#10B981' }} />
                  <span className={SURVEY_STATUS[s.status]?.class || 'badge-draft'}>{SURVEY_STATUS[s.status]?.label}</span>
                </div>
                <h3 className="text-lg font-bold text-dark group-hover:text-accent transition-colors mb-2 line-clamp-2">{s.title}</h3>
                <p className="text-xs text-muted">
                  {timeAgo(s.created_at)} · {s.creator?.full_name || '—'}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">View details</span>
                  <HiOutlineArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
