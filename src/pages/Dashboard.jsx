import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, timeAgo, SURVEY_STATUS } from '../lib/constants';
import { HiOutlineArrowRight, HiOutlinePlusCircle } from 'react-icons/hi';

export default function Dashboard() {
  const { profile, tenant } = useAuthStore();
  const [stats, setStats] = useState({surveys:0,responses:0,completions:0,team:0});
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
      setStats({surveys:s.count||0,responses:r.count||0,completions:c.count||0,team:t.count||0});
      const{data}=await supabase.from('surveys').select('*,creator:user_profiles!created_by(full_name)').order('created_at',{ascending:false}).limit(5);
      setRecent(data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  const h = new Date().getHours();
  const greet = h<12?'Good morning':h<17?'Good afternoon':'Good evening';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-n-900">{greet}, {profile?.full_name?.split(' ')[0]||'there'} 👋</h1>
          <p className="text-sm text-n-400 mt-1">{tenant?.name}</p>
        </div>
        {hasPermission(profile?.role,'create_survey') && (
          <Link to="/surveys/new" className="btn-green"><HiOutlinePlusCircle className="w-5 h-5"/>New Survey</Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {l:'Surveys',v:stats.surveys,color:'bg-green-50 text-green-700',emoji:'📋'},
          {l:'Responses',v:stats.responses,color:'bg-plum-50 text-plum-500',emoji:'💬'},
          {l:'Completed',v:stats.completions,color:'bg-yellow-50 text-yellow-700',emoji:'✅'},
          {l:'Team',v:stats.team,color:'bg-coral-50 text-coral-600',emoji:'👥'},
        ].map((s,i) => (
          <div key={i} className="card p-5 animate-in" style={{animationDelay:`${i*0.06}s`}}>
            <span className="text-2xl mb-3 block">{s.emoji}</span>
            <p className="text-2xl font-extrabold text-n-900">{loading?'—':s.v}</p>
            <p className="text-xs text-n-400 mt-1 font-medium">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-n-400 uppercase tracking-wider">Recent Surveys</h2>
        <Link to="/surveys" className="text-sm text-green-600 font-semibold hover:underline flex items-center gap-1">See all<HiOutlineArrowRight className="w-3.5 h-3.5"/></Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-n-100 rounded-2xl animate-pulse"/>)}</div>
      ) : recent.length===0 ? (
        <div className="card text-center py-16">
          <span className="text-4xl block mb-4">📝</span>
          <p className="text-n-500 mb-4">No surveys yet. Let's fix that!</p>
          {hasPermission(profile?.role,'create_survey') && <Link to="/surveys/new" className="btn-green">Create your first survey</Link>}
        </div>
      ) : (
        <div className="card divide-y divide-n-100">
          {recent.map(s => (
            <Link key={s.id} to={`/surveys/${s.id}/edit`} className="flex items-center justify-between px-5 py-4 hover:bg-green-50/30 transition-colors first:rounded-t-2xl last:rounded-b-2xl group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-1.5 h-9 rounded-full flex-shrink-0" style={{backgroundColor:s.theme_color||'#10B981'}}/>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-n-800 truncate group-hover:text-green-700 transition-colors">{s.title}</p>
                  <p className="text-[11px] text-n-400 mt-0.5">{timeAgo(s.created_at)} · {s.creator?.full_name||'—'}</p>
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
