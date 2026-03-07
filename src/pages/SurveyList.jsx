import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, SURVEY_STATUS, timeAgo, isExpired, formatDate } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineDotsVertical, HiOutlineChartBar, HiOutlinePencil, HiOutlineTrash, HiOutlineLink, HiOutlinePlay, HiOutlinePause, HiOutlineRefresh, HiOutlineArrowRight } from 'react-icons/hi';

export default function SurveyList() {
  const{profile}=useAuthStore();const nav=useNavigate();
  const[surveys,setSurveys]=useState([]);const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');const[menu,setMenu]=useState(null);

  useEffect(()=>{if(profile?.id)load();},[profile?.id]);
  async function load(){setLoading(true);const{data}=await supabase.from('surveys').select('*,creator:user_profiles!created_by(full_name)').order('created_at',{ascending:false});setSurveys(data||[]);setLoading(false);}
  const list=surveys.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||s.status===filter));

  async function del(id){if(!confirm('Delete?'))return;await supabase.from('surveys').delete().eq('id',id);setSurveys(p=>p.filter(s=>s.id!==id));toast.success('Deleted');setMenu(null);}
  async function chg(id,st){const u={status:st};if(st==='active'&&isExpired(surveys.find(s=>s.id===id)?.expires_at)){const d=prompt('Days to extend:','7');if(!d)return;const x=new Date();x.setDate(x.getDate()+parseInt(d));u.expires_at=x.toISOString();}await supabase.from('surveys').update(u).eq('id',id);toast.success('Updated');setMenu(null);load();}
  function copy(slug){navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);toast.success('Link copied!');setMenu(null);}

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-dark tracking-tight">Surveys</h1>
          <p className="text-muted mt-1">{surveys.length} total</p>
        </div>
        {hasPermission(profile?.role,'create_survey')&&<Link to="/surveys/new" className="bg-dark text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent transition-colors flex items-center gap-2"><HiOutlinePlus className="w-4 h-4"/>New Survey</Link>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-full text-sm placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors" placeholder="Search surveys..."/>
        </div>
        <div className="flex gap-2 flex-wrap">{['all','active','draft','paused','expired','closed'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all ${filter===f?'bg-dark text-white':'text-muted hover:bg-gray-100'}`}>
            {f==='all'?'All':SURVEY_STATUS[f]?.label||f}
          </button>
        ))}</div>
      </div>

      {loading?(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ):list.length===0?(
        <div className="bg-white rounded-3xl border border-gray-100 text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-muted mb-6">{search||filter!=='all'?'No matches':'No surveys yet'}</p>
        </div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s,i)=>(
            <motion.div key={s.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor:s.theme_color||'#10B981'}}/>
                  <div className="flex items-center gap-2">
                    <span className={SURVEY_STATUS[s.status]?.class||'badge-draft'}>{SURVEY_STATUS[s.status]?.label}</span>
                    <div className="relative">
                      <button onClick={()=>setMenu(menu===s.id?null:s.id)} className="p-1 rounded-lg hover:bg-gray-100"><HiOutlineDotsVertical className="w-4 h-4 text-muted"/></button>
                      {menu===s.id&&(<><div className="fixed inset-0 z-10" onClick={()=>setMenu(null)}/><div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-2xl shadow-lg border border-gray-100 py-2">
                        <button onClick={()=>{nav(`/surveys/${s.id}/edit`);setMenu(null);}} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"><HiOutlinePencil className="w-4 h-4"/>Edit</button>
                        <button onClick={()=>copy(s.slug)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"><HiOutlineLink className="w-4 h-4"/>Copy link</button>
                        <Link to={`/surveys/${s.id}/analytics`} onClick={()=>setMenu(null)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark hover:bg-gray-50"><HiOutlineChartBar className="w-4 h-4"/>Analytics</Link>
                        {s.status!=='active'&&<button onClick={()=>chg(s.id,'active')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent hover:bg-accent/5"><HiOutlinePlay className="w-4 h-4"/>Activate</button>}
                        {s.status==='active'&&<button onClick={()=>chg(s.id,'paused')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-yellow-600 hover:bg-yellow-50"><HiOutlinePause className="w-4 h-4"/>Pause</button>}
                        {['expired','closed'].includes(s.status)&&hasPermission(profile?.role,'resume_survey')&&<button onClick={()=>chg(s.id,'active')} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent hover:bg-accent/5"><HiOutlineRefresh className="w-4 h-4"/>Resume</button>}
                        {hasPermission(profile?.role,'delete_survey')&&<button onClick={()=>del(s.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4"/>Delete</button>}
                      </div></>)}
                    </div>
                  </div>
                </div>
                <Link to={`/surveys/${s.id}/edit`} className="flex-1">
                  <h3 className="text-lg font-bold text-dark group-hover:text-accent transition-colors mb-2 line-clamp-2">{s.title}</h3>
                  <p className="text-xs text-muted">{timeAgo(s.created_at)} · {s.creator?.full_name||'—'}</p>
                  {s.expires_at&&<p className={`text-xs mt-1 ${isExpired(s.expires_at)?'text-red-500':'text-muted'}`}>{isExpired(s.expires_at)?'Expired':`Expires ${formatDate(s.expires_at)}`}</p>}
                </Link>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link to={`/surveys/${s.id}/analytics`} className="text-xs font-medium text-muted hover:text-accent transition-colors">Analytics</Link>
                  <Link to={`/surveys/${s.id}/edit`}><HiOutlineArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors"/></Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
