import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { ROLE_LABELS, hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
export default function TeamManagement(){
  const{profile}=useAuthStore();const[ms,sMs]=useState([]);const[loading,setLoading]=useState(true);const[show,setShow]=useState(false);const[iE,sIE]=useState('');const[iR,sIR]=useState('viewer');const[iN,sIN]=useState('');const[busy,setBusy]=useState(false);
  useEffect(()=>{if(profile?.id)load();},[profile?.id]);
  async function load(){const{data}=await supabase.from('user_profiles').select('*').order('created_at');sMs(data||[]);setLoading(false);}
  async function invite(e){e.preventDefault();if(!iE)return toast.error('Email required');setBusy(true);try{const res=await fetch('/.netlify/functions/invite-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:iE,role:iR,fullName:iN,tenantId:profile.tenant_id,invitedBy:profile.id})});const d=await res.json();if(!res.ok)throw new Error(d.error);toast.success(`Invited ${iE}`);setShow(false);sIE('');sIN('');sIR('viewer');load();}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  async function chg(uid,role){if(uid===profile.id)return toast.error("Can't change own");await supabase.from('user_profiles').update({role}).eq('id',uid);toast.success('Updated');load();}
  async function deact(uid){if(uid===profile.id||!confirm('Deactivate?'))return;await supabase.from('user_profiles').update({is_active:false}).eq('id',uid);toast.success('Done');load();}
  const inp="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-dark text-sm placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors";
  return(<div>
    <div className="flex items-end justify-between mb-10"><div><h1 className="text-4xl font-extrabold text-dark tracking-tight">Team</h1><p className="text-muted mt-1">{ms.length} member{ms.length!==1?'s':''}</p></div>
    {hasPermission(profile?.role,'manage_team')&&<button onClick={()=>setShow(true)} className="bg-dark text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent transition-colors flex items-center gap-2"><HiOutlineUserAdd className="w-4 h-4"/>Invite</button>}</div>
    {loading?<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>:(
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{ms.map(m=>(<div key={m.id} className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-all ${!m.is_active?'opacity-40':''}`}>
        <div className="w-12 h-12 rounded-full bg-dark text-white flex items-center justify-center text-lg font-bold flex-shrink-0">{m.full_name?.[0]?.toUpperCase()||'?'}</div>
        <div className="flex-1 min-w-0"><p className="font-semibold text-dark truncate">{m.full_name||'Unnamed'}{m.id===profile.id&&<span className="text-muted ml-1 font-normal text-sm">(you)</span>}</p><p className="text-xs text-muted truncate">{m.email}</p></div>
        {hasPermission(profile?.role,'manage_team')&&m.id!==profile.id?(<select value={m.role} onChange={e=>chg(m.id,e.target.value)} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 bg-white">{Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>):(<span className={`badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>)}
        {hasPermission(profile?.role,'manage_team')&&m.id!==profile.id&&m.is_active&&<button onClick={()=>deact(m.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><HiOutlineTrash className="w-4 h-4"/></button>}
      </div>))}</div>)}
    {show&&(<div className="fixed inset-0 bg-dark/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShow(false)}><div className="bg-white rounded-3xl shadow-lg w-full max-w-sm p-8" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold text-dark">Invite member</h3><button onClick={()=>setShow(false)} className="p-1 rounded-lg hover:bg-gray-100"><HiOutlineX className="w-5 h-5"/></button></div>
    <form onSubmit={invite} className="space-y-4"><div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Name</label><input value={iN} onChange={e=>sIN(e.target.value)} className={inp} placeholder="Jane Smith"/></div><div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Email *</label><input type="email" value={iE} onChange={e=>sIE(e.target.value)} className={inp} placeholder="jane@company.com" required/></div><div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Role</label><select value={iR} onChange={e=>sIR(e.target.value)} className={inp}><option value="viewer">Viewer</option><option value="creator">Creator</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
    <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-3 rounded-full text-sm font-semibold border border-gray-200 text-dark hover:bg-gray-100">Cancel</button><button type="submit" disabled={busy} className="flex-1 py-3 rounded-full text-sm font-semibold bg-dark text-white hover:bg-accent transition-colors disabled:opacity-40">{busy?'Sending...':'Send invite'}</button></div></form></div></div>)}
  </div>);
}
