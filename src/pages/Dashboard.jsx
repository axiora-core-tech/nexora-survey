import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, timeAgo, SURVEY_STATUS } from '../lib/constants';
import { HiOutlineArrowRight, HiOutlinePlus, HiOutlineCollection, HiOutlineUsers, HiOutlineChartBar, HiOutlineCheck } from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({ surveys:0, responses:0, completions:0, team:0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile?.id) load(); }, [profile?.id]);

  async function load() {
    setLoading(true);
    try {
      const [s,r,c,t] = await Promise.all([
        supabase.from('surveys').select('*',{count:'exact',head:true}),
        supabase.from('survey_responses').select('*',{count:'exact',head:true}),
        supabase.from('survey_responses').select('*',{count:'exact',head:true}).eq('status','completed'),
        supabase.from('user_profiles').select('*',{count:'exact',head:true}),
      ]);
      setStats({ surveys:s.count||0, responses:r.count||0, completions:c.count||0, team:t.count||0 });
      const { data } = await supabase.from('surveys').select('*, creator:user_profiles!created_by(full_name)').order('created_at',{ascending:false}).limit(5);
      setRecent(data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const h = new Date().getHours();
  const greeting = h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const statItems = [
    { label:'Surveys', val:stats.surveys, icon:HiOutlineCollection, color:'text-brand bg-brand-50' },
    { label:'Responses', val:stats.responses, icon:HiOutlineChartBar, color:'text-violet bg-violet-50' },
    { label:'Completed', val:stats.completions, icon:HiOutlineCheck, color:'text-success bg-success-light' },
    { label:'Team', val:stats.team, icon:HiOutlineUsers, color:'text-txt-secondary bg-gray-100' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h3 text-txt tracking-tight">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="text-sm text-txt-secondary mt-1">Here's what's happening with {tenant?.name || 'your org'}.</p>
        </div>
        {hasPermission(profile?.role,'create_survey') && (
          <Link to="/surveys/new" className="btn-primary"><HiOutlinePlus className="w-4 h-4"/>New Survey</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statItems.map((s,i) => (
          <div key={i} className="card p-5 animate-enter" style={{animationDelay:`${i*0.05}s`}}>
            <div className={`w-10 h-10 rounded-card flex items-center justify-center mb-3 ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold text-txt tracking-tight">{loading?'—':s.val}</p>
            <p className="text-xs text-txt-secondary mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-txt-secondary">Recent Surveys</h2>
        <Link to="/surveys" className="text-xs text-brand font-medium hover:underline flex items-center gap-1">View all<HiOutlineArrowRight className="w-3 h-3"/></Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-gray-100 rounded-card animate-pulse"/>)}</div>
      ) : recent.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-txt-secondary mb-4">No surveys yet</p>
          {hasPermission(profile?.role,'create_survey') && <Link to="/surveys/new" className="btn-primary text-xs">Create your first survey</Link>}
        </div>
      ) : (
        <div className="card divide-y divide-border-light">
          {recent.map(s => (
            <Link key={s.id} to={`/surveys/${s.id}/edit`} className="flex items-center justify-between px-5 py-4 hover:bg-bg transition-colors first:rounded-t-card last:rounded-b-card">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{backgroundColor:s.theme_color||'#4F7BFF'}}/>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt truncate">{s.title}</p>
                  <p className="text-[11px] text-txt-tertiary">{timeAgo(s.created_at)} · {s.creator?.full_name||'—'}</p>
                </div>
              </div>
              <span className={SURVEY_STATUS[s.status]?.class||'badge-draft'}>{SURVEY_STATUS[s.status]?.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
