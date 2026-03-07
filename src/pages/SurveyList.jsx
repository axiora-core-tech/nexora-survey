import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, SURVEY_STATUS, timeAgo, isExpired, formatDate } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlusCircle, HiOutlineSearch, HiOutlineDotsVertical, HiOutlineChartBar, HiOutlinePencil, HiOutlineTrash, HiOutlineLink, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh } from 'react-icons/hi';

export default function SurveyList() {
  const{profile}=useAuthStore();const nav=useNavigate();
  const[surveys,setSurveys]=useState([]);const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');const[menu,setMenu]=useState(null);

  useEffect(()=>{if(profile?.id)load();},[profile?.id]);
  async function load(){setLoading(true);const{data}=await supabase.from('surveys').select('*,creator:user_profiles!created_by(full_name)').order('created_at',{ascending:false});setSurveys(data||[]);setLoading(false);}
  const list=surveys.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||s.status===filter));

  async function del(id){if(!confirm('Delete survey and all responses?'))return;await supabase.from('surveys').delete().eq('id',id);setSurveys(p=>p.filter(s=>s.id!==id));toast.success('Deleted');setMenu(null);}
  async function chg(id,st){const u={status:st};if(st==='active'&&isExpired(surveys.find(s=>s.id===id)?.expires_at)){const d=prompt('Days to extend:','7');if(!d)return;const x=new Date();x.setDate(x.getDate()+parseInt(d));u.expires_at=x.toISOString();}await supabase.from('surveys').update(u).eq('id',id);toast.success('Updated');setMenu(null);load();}
  function copy(slug){navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);toast.success('Link copied!');setMenu(null);}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Surveys</h1>
        {hasPermission(profile?.role,'create_survey')&&<Link to="/surveys/new" className="btn-green"><HiOutlinePlusCircle className="w-5 h-5"/>New Survey</Link>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-n-400"/><input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-10" placeholder="Search..."/></div>
        <div className="flex gap-1 flex-wrap">{['all','active','draft','paused','expired','closed'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filter===f?'bg-green-50 text-green-700':'text-n-400 hover:bg-n-100'}`}>{f==='all'?'All':SURVEY_STATUS[f]?.label||f}</button>
        ))}</div>
      </div>

      {loading?<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-n-100 rounded-2xl animate-pulse"/>)}</div>
      :list.length===0?(
        <div className="card text-center py-20"><span className="text-4xl block mb-4">🔍</span><p className="text-n-500 mb-4">{search||filter!=='all'?'No matches':'No surveys yet'}</p>
          {!search&&filter==='all'&&hasPermission(profile?.role,'create_survey')&&<Link to="/surveys/new" className="btn-green">Create Survey</Link>}
        </div>
      ):(
        <div className="card divide-y divide-n-100">
          {list.map(s=>(
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-green-50/20 transition-colors">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{backgroundColor:s.theme_color||'#10B981'}}/>
              <div className="flex-1 min-w-0">
                <Link to={`/surveys/${s.id}/edit`} className="text-sm font-semibold text-n-800 hover:text-green-700 truncate block">{s.title}</Link>
                <div className="flex items-center gap-3 text-[11px] text-n-400 mt-0.5">
                  <span>{s.creator?.full_name||'—'}</span><span>{timeAgo(s.created_at)}</span>
                  {s.expires_at&&<span className={isExpired(s.expires_at)?'text-red-500':''}>{isExpired(s.expires_at)?'Expired':`Exp ${formatDate(s.expires_at)}`}</span>}
                </div>
              </div>
              <span className={SURVEY_STATUS[s.status]?.class||'badge-draft'}>{SURVEY_STATUS[s.status]?.label}</span>
              <div className="flex items-center gap-1">
                <button onClick={()=>copy(s.slug)} className="btn-ghost p-2"><HiOutlineLink className="w-4 h-4"/></button>
                <Link to={`/surveys/${s.id}/analytics`} className="btn-ghost p-2"><HiOutlineChartBar className="w-4 h-4"/></Link>
                <div className="relative">
                  <button onClick={()=>setMenu(menu===s.id?null:s.id)} className="btn-ghost p-2"><HiOutlineDotsVertical className="w-4 h-4"/></button>
                  {menu===s.id&&(<><div className="fixed inset-0 z-10" onClick={()=>setMenu(null)}/>
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-2xl shadow-lg border border-n-200 py-1.5 animate-pop">
                      <button onClick={()=>{nav(`/surveys/${s.id}/edit`);setMenu(null);}} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-n-700 hover:bg-n-50"><HiOutlinePencil className="w-4 h-4"/>Edit</button>
                      {s.status!=='active'&&<button onClick={()=>chg(s.id,'active')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"><HiOutlinePlay className="w-4 h-4"/>Activate</button>}
                      {s.status==='active'&&<button onClick={()=>chg(s.id,'paused')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"><HiOutlinePause className="w-4 h-4"/>Pause</button>}
                      {['expired','closed'].includes(s.status)&&hasPermission(profile?.role,'resume_survey')&&<button onClick={()=>chg(s.id,'active')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"><HiOutlineRefresh className="w-4 h-4"/>Resume</button>}
                      {hasPermission(profile?.role,'delete_survey')&&<button onClick={()=>del(s.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4"/>Delete</button>}
                    </div></>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
