import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, SURVEY_STATUS, timeAgo, isExpired, formatDate } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineDotsVertical, HiOutlineChartBar, HiOutlinePencil, HiOutlineTrash, HiOutlineLink, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh } from 'react-icons/hi';

export default function SurveyList() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [menu, setMenu] = useState(null);

  useEffect(() => { if (profile?.id) load(); }, [profile?.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('surveys')
      .select('*, creator:user_profiles!created_by(full_name)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); toast.error('Failed to load'); }
    setSurveys(data || []);
    setLoading(false);
  }

  const filtered = surveys.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || s.status === filter)
  );

  async function del(id) {
    if (!confirm('Delete this survey and all responses?')) return;
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    if (error) return toast.error('Failed');
    setSurveys(p => p.filter(s => s.id !== id));
    toast.success('Deleted'); setMenu(null);
  }

  async function changeStatus(id, status) {
    const updates = { status };
    if (status === 'active' && isExpired(surveys.find(s => s.id === id)?.expires_at)) {
      const days = prompt('Days to extend:', '7');
      if (!days) return;
      const d = new Date(); d.setDate(d.getDate() + parseInt(days));
      updates.expires_at = d.toISOString();
    }
    const { error } = await supabase.from('surveys').update(updates).eq('id', id);
    if (error) return toast.error('Failed');
    toast.success('Updated'); setMenu(null); load();
  }

  function copy(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
    toast.success('Link copied'); setMenu(null);
  }

  const filters = ['all', 'active', 'draft', 'paused', 'expired', 'closed'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Surveys</h1>
        {hasPermission(profile?.role, 'create_survey') && (
          <Link to="/surveys/new" className="btn-primary"><HiOutlinePlus className="w-4 h-4" />New Survey</Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 text-sm" placeholder="Search..." />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-ink-900 text-white' : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100'}`}>
              {f === 'all' ? 'All' : SURVEY_STATUS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-ink-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-ink-400 mb-4">{search || filter !== 'all' ? 'No matches' : 'No surveys yet'}</p>
          {hasPermission(profile?.role, 'create_survey') && !search && filter === 'all' && (
            <Link to="/surveys/new" className="btn-primary text-xs">Create Survey</Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-100 divide-y divide-ink-100">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50/50 transition-colors">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{backgroundColor: s.theme_color || '#8b5cf6'}} />
              <div className="flex-1 min-w-0">
                <Link to={`/surveys/${s.id}/edit`} className="text-sm font-medium text-ink-800 hover:text-pri-700 truncate block">{s.title}</Link>
                <div className="flex items-center gap-3 text-[11px] text-ink-400 mt-0.5">
                  <span>{s.creator?.full_name || '—'}</span>
                  <span>{timeAgo(s.created_at)}</span>
                  {s.expires_at && <span className={isExpired(s.expires_at) ? 'text-red-500' : ''}>{isExpired(s.expires_at) ? 'Expired' : `Exp ${formatDate(s.expires_at)}`}</span>}
                </div>
              </div>
              <span className={SURVEY_STATUS[s.status]?.class || 'badge-draft'}>{SURVEY_STATUS[s.status]?.label}</span>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => copy(s.slug)} className="btn-ghost p-1.5"><HiOutlineLink className="w-3.5 h-3.5" /></button>
                <Link to={`/surveys/${s.id}/analytics`} className="btn-ghost p-1.5"><HiOutlineChartBar className="w-3.5 h-3.5" /></Link>
                <div className="relative">
                  <button onClick={() => setMenu(menu === s.id ? null : s.id)} className="btn-ghost p-1.5"><HiOutlineDotsVertical className="w-3.5 h-3.5" /></button>
                  {menu === s.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                      <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl shadow-lg border border-ink-100 py-1 anim-enter">
                        <button onClick={() => { navigate(`/surveys/${s.id}/edit`); setMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-700 hover:bg-ink-50"><HiOutlinePencil className="w-3.5 h-3.5" />Edit</button>
                        {s.status !== 'active' && <button onClick={() => changeStatus(s.id, 'active')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50"><HiOutlinePlay className="w-3.5 h-3.5" />Activate</button>}
                        {s.status === 'active' && <button onClick={() => changeStatus(s.id, 'paused')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-yellow-600 hover:bg-yellow-50"><HiOutlinePause className="w-3.5 h-3.5" />Pause</button>}
                        {['expired','closed'].includes(s.status) && hasPermission(profile?.role, 'resume_survey') && (
                          <button onClick={() => changeStatus(s.id, 'active')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-pri-600 hover:bg-pri-50"><HiOutlineRefresh className="w-3.5 h-3.5" />Resume</button>
                        )}
                        {hasPermission(profile?.role, 'delete_survey') && (
                          <button onClick={() => del(s.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><HiOutlineTrash className="w-3.5 h-3.5" />Delete</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
