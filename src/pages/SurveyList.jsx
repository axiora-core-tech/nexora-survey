import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, SURVEY_STATUS, formatDate, timeAgo, isExpired } from '../lib/constants';
import toast from 'react-hot-toast';
import {
  HiOutlinePlusCircle, HiOutlineSearch, HiOutlineDotsVertical,
  HiOutlineChartBar, HiOutlinePencil, HiOutlineTrash, HiOutlineLink,
  HiOutlineClipboardList, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh
} from 'react-icons/hi';

export default function SurveyList() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => { loadSurveys(); }, []);

  async function loadSurveys() {
    try {
      let query = supabase
        .from('surveys')
        .select('*, creator:user_profiles!created_by(full_name, email)')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }

  const filtered = surveys.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id) {
    if (!confirm('Are you sure? This will delete the survey and all its responses.')) return;
    try {
      const { error } = await supabase.from('surveys').delete().eq('id', id);
      if (error) throw error;
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      toast.success('Survey deleted');
    } catch (err) {
      toast.error('Failed to delete survey');
    }
    setOpenMenu(null);
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'active' && isExpired(surveys.find(s => s.id === id)?.expires_at)) {
        // If resuming an expired survey, prompt for new expiry
        const days = prompt('Survey has expired. Enter number of days to extend:', '7');
        if (!days) return;
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + parseInt(days, 10));
        updates.expires_at = newExpiry.toISOString();
      }
      const { error } = await supabase.from('surveys').update(updates).eq('id', id);
      if (error) throw error;
      await loadSurveys();
      toast.success(`Survey ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
    setOpenMenu(null);
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Survey link copied!');
    setOpenMenu(null);
  }

  return (
    <div className="animate-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Surveys</h1>
          <p className="text-ink-500 mt-1">Manage and track all your surveys</p>
        </div>
        {hasPermission(profile?.role, 'create_survey') && (
          <Link to="/surveys/new" className="btn-primary">
            <HiOutlinePlusCircle className="w-5 h-5" />
            New Survey
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            placeholder="Search surveys..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'draft', 'paused', 'expired', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-pri-50 text-pri-700 border border-pri-200'
                  : 'text-ink-500 hover:bg-ink-100 border border-transparent'
              }`}
            >
              {s === 'all' ? 'All' : SURVEY_STATUS[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Survey list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-ink-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <HiOutlineClipboardList className="w-16 h-16 text-ink-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink-700 mb-2">
            {search || statusFilter !== 'all' ? 'No matching surveys' : 'No surveys yet'}
          </h3>
          <p className="text-ink-500 mb-6">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first survey to get started'}
          </p>
          {hasPermission(profile?.role, 'create_survey') && (
            <Link to="/surveys/new" className="btn-primary">Create Survey</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((survey) => (
            <div key={survey.id} className="card-hover p-4 md:p-5 flex items-center gap-4">
              {/* Color indicator */}
              <div
                className="w-2 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: survey.theme_color || '#8b5cf6' }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    to={`/surveys/${survey.id}/edit`}
                    className="text-sm md:text-base font-semibold text-ink-800 hover:text-pri-700 truncate transition-colors"
                  >
                    {survey.title}
                  </Link>
                  <span className={SURVEY_STATUS[survey.status]?.class || 'badge-draft'}>
                    {SURVEY_STATUS[survey.status]?.label || survey.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-400">
                  <span>By {survey.creator?.full_name || 'Unknown'}</span>
                  <span>{timeAgo(survey.created_at)}</span>
                  {survey.expires_at && (
                    <span className={isExpired(survey.expires_at) ? 'text-red-500' : ''}>
                      {isExpired(survey.expires_at) ? 'Expired' : `Expires ${formatDate(survey.expires_at)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copyLink(survey.slug)}
                  className="btn-ghost p-2 text-ink-400 hover:text-pri-600"
                  title="Copy link"
                >
                  <HiOutlineLink className="w-4 h-4" />
                </button>
                <Link
                  to={`/surveys/${survey.id}/analytics`}
                  className="btn-ghost p-2 text-ink-400 hover:text-pri-600"
                  title="Analytics"
                >
                  <HiOutlineChartBar className="w-4 h-4" />
                </Link>

                {/* More menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === survey.id ? null : survey.id)}
                    className="btn-ghost p-2 text-ink-400"
                  >
                    <HiOutlineDotsVertical className="w-4 h-4" />
                  </button>

                  {openMenu === survey.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-xl shadow-xl border border-ink-200 py-1.5 animate-scale-in">
                        <button
                          onClick={() => { navigate(`/surveys/${survey.id}/edit`); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-canvas"
                        >
                          <HiOutlinePencil className="w-4 h-4" /> Edit Survey
                        </button>
                        {survey.status !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(survey.id, 'active')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                          >
                            <HiOutlinePlay className="w-4 h-4" /> Activate
                          </button>
                        )}
                        {survey.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(survey.id, 'paused')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                          >
                            <HiOutlinePause className="w-4 h-4" /> Pause
                          </button>
                        )}
                        {(survey.status === 'expired' || survey.status === 'closed') &&
                          hasPermission(profile?.role, 'resume_survey') && (
                          <button
                            onClick={() => handleStatusChange(survey.id, 'active')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-pri-600 hover:bg-pri-50"
                          >
                            <HiOutlineRefresh className="w-4 h-4" /> Resume Survey
                          </button>
                        )}
                        {hasPermission(profile?.role, 'delete_survey') && (
                          <button
                            onClick={() => handleDelete(survey.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <HiOutlineTrash className="w-4 h-4" /> Delete
                          </button>
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
