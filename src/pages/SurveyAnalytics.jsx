import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { formatDateTime } from '../lib/constants';
import { HiOutlineArrowLeft, HiOutlineDownload } from 'react-icons/hi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
const cols=['#10B981','#FF5733','#8B5CF6','#F59E0B','#3B82F6','#EC4899','#14B8A6','#6366F1','#F43F5E','#84CC16'];

export default function SurveyAnalytics() {
  const{id}=useParams();const{profile}=useAuthStore();
  const[sv,setSv]=useState(null);const[qs,setQs]=useState([]);const[rs,setRs]=useState([]);const[ans,setAns]=useState([]);const[loading,setLoading]=useState(true);

  useEffect(()=>{if(profile?.id)load();},[id,profile?.id]);
  async function load(){try{
    const{data:s}=await supabase.from('surveys').select('*').eq('id',id).single();setSv(s);
    const{data:q}=await supabase.from('survey_questions').select('*').eq('survey_id',id).order('sort_order');setQs(q||[]);
    const{data:r}=await supabase.from('survey_responses').select('*').eq('survey_id',id).order('started_at');setRs(r||[]);
    if(r?.length){const{data:a}=await supabase.from('survey_answers').select('*').in('response_id',r.map(x=>x.id));setAns(a||[]);}
  }catch(e){console.error(e);}finally{setLoading(false);}}

  const total=rs.length;const done=rs.filter(r=>r.status==='completed').length;const rate=total?Math.round((done/total)*100):0;

  function getQA(q){const qa=ans.filter(a=>a.question_id===q.id);if(!qa.length)return null;
    if(['single_choice','dropdown','yes_no'].includes(q.question_type)){const c={};qa.forEach(a=>{const v=a.answer_value||'—';c[v]=(c[v]||0)+1;});
      return{type:'doughnut',data:{labels:Object.keys(c).map(k=>(q.options||[]).find(o=>o.value===k)?.label||k),datasets:[{data:Object.values(c),backgroundColor:cols.slice(0,Object.keys(c).length),borderWidth:0,hoverOffset:4}]},total:qa.length};}
    if(q.question_type==='multiple_choice'){const c={};qa.forEach(a=>(a.answer_json||[]).forEach(v=>{c[v]=(c[v]||0)+1;}));
      return{type:'bar',data:{labels:Object.keys(c).map(k=>(q.options||[]).find(o=>o.value===k)?.label||k),datasets:[{data:Object.values(c),backgroundColor:cols,borderRadius:8,barThickness:28}]},total:qa.length};}
    if(['rating','scale'].includes(q.question_type)){const vs=qa.map(a=>parseInt(a.answer_value)||0).filter(Boolean);const avg=vs.length?(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(1):0;
      const mx=q.question_type==='rating'?5:10;const d={};for(let i=1;i<=mx;i++)d[i]=0;vs.forEach(v=>{if(d[v]!==undefined)d[v]++;});
      return{type:'bar',data:{labels:Object.keys(d),datasets:[{data:Object.values(d),backgroundColor:cols,borderRadius:4,barThickness:20}]},avg,total:vs.length};}
    return{type:'text',items:qa.map(a=>a.answer_value).filter(Boolean),total:qa.length};}

  function csv(){const h=['#','Status','Email','Started','Completed',...qs.map(q=>q.question_text)];
    const rows=rs.map((r,i)=>{const ra=ans.filter(a=>a.response_id===r.id);
      return[i+1,r.status,r.respondent_email||'',r.started_at,r.completed_at||'',...qs.map(q=>{const a=ra.find(x=>x.question_id===q.id);return a?.answer_value||(a?.answer_json?JSON.stringify(a.answer_json):'');})];});
    const c=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/csv'}));a.download=`${sv?.title||'survey'}-responses.csv`;a.click();}

  const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{cornerRadius:8}}};
  if(loading)return<div className="text-center py-20 text-n-400">Loading...</div>;
  if(!sv)return<div className="text-center py-20 text-n-400">Not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><Link to={`/surveys/${id}/edit`} className="text-sm text-n-400 hover:text-green-600 flex items-center gap-1 mb-1"><HiOutlineArrowLeft className="w-3.5 h-3.5"/>Back</Link><h1 className="page-title">{sv.title}</h1></div>
        <button onClick={csv} className="btn-outline"><HiOutlineDownload className="w-4 h-4"/>Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[{l:'Responses',v:total,e:'💬'},{l:'Completed',v:done,e:'✅'},{l:'Rate',v:`${rate}%`,e:'📊'}].map((s,i)=>(
          <div key={i} className="card p-5"><span className="text-2xl block mb-2">{s.e}</span><p className="text-2xl font-extrabold text-n-900">{s.v}</p><p className="text-xs text-n-400 mt-1">{s.l}</p></div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-n-400 uppercase tracking-wider mb-4">Question Breakdown</h2>
      <div className="space-y-4">
        {qs.map((q,i)=>{const a=getQA(q);return(
          <div key={q.id} className="card p-6">
            <div className="flex items-start gap-3 mb-4"><span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0 mt-0.5">{i+1}</span>
              <div><p className="text-sm font-bold text-n-800">{q.question_text}</p><p className="text-[11px] text-n-400">{a?.total||0} responses</p></div></div>
            {!a?<p className="text-xs text-n-300 italic">No responses</p>:
             a.type==='doughnut'?(<div className="flex items-center gap-6"><div className="w-[140px] h-[140px]"><Doughnut data={a.data} options={{...opts,cutout:'65%'}}/></div>
               <div className="space-y-2 flex-1">{a.data.labels.map((l,j)=>(<div key={j} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:cols[j]}}/><span className="text-sm text-n-600">{l}</span></div><span className="text-sm font-bold text-n-800">{a.data.datasets[0].data[j]}</span></div>))}</div></div>):
             a.type==='bar'?(<div>{a.avg&&<p className="text-sm text-n-400 mb-2">Average: <span className="font-extrabold text-n-900 text-lg">{a.avg}</span></p>}<div className="h-[160px]"><Bar data={a.data} options={{...opts,scales:{y:{beginAtZero:true,ticks:{stepSize:1}},x:{grid:{display:false}}}}}/></div></div>):
             (<div className="max-h-40 overflow-y-auto space-y-1.5">{a.items.slice(0,20).map((r,j)=>(<div key={j} className="text-sm text-n-700 bg-n-50 rounded-xl px-4 py-2">{r}</div>))}{a.items.length>20&&<p className="text-[11px] text-n-400">+{a.items.length-20} more</p>}</div>)}
          </div>);
        })}
      </div>

      <div className="card p-6 mt-6"><h3 className="text-sm font-bold text-n-400 uppercase tracking-wider mb-3">Individual Responses</h3>
        {!rs.length?<p className="text-xs text-n-300">None yet</p>:(
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-n-200">{['#','Status','Email','Started','Completed'].map(h=><th key={h} className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-n-400">{h}</th>)}</tr></thead>
            <tbody>{rs.slice(0,50).map((r,i)=>(<tr key={r.id} className="border-b border-n-100 hover:bg-green-50/20">
              <td className="py-2.5 px-3 text-n-400 text-xs">{i+1}</td>
              <td className="py-2.5 px-3"><span className={r.status==='completed'?'badge-active':r.status==='in_progress'?'badge bg-blue-50 text-blue-600':'badge-closed'}>{r.status}</span></td>
              <td className="py-2.5 px-3 text-n-500 text-xs">{r.respondent_email||'—'}</td>
              <td className="py-2.5 px-3 text-n-400 text-xs">{formatDateTime(r.started_at)}</td>
              <td className="py-2.5 px-3 text-n-400 text-xs">{r.completed_at?formatDateTime(r.completed_at):'—'}</td>
            </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
