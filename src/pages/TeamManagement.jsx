import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { ROLE_LABELS, hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineMail, HiOutlineX } from 'react-icons/hi';

export default function TeamManagement() {
  const{profile}=useAuthStore();const[ms,setMs]=useState([]);const[loading,setLoading]=useState(true);
  const[show,setShow]=useState(false);const[iE,setIE]=useState('');const[iR,setIR]=useState('viewer');const[iN,setIN]=useState('');const[busy,setBusy]=useState(false);

  useEffect(()=>{if(profile?.id)load();},[profile?.id]);
  async function load(){const{data}=await supabase.from('user_profiles').select('*').order('created_at');setMs(data||[]);setLoading(false);}

  async function invite(e){e.preventDefault();if(!iE)return toast.error('Email required');setBusy(true);try{
    const res=await fetch('/.netlify/functions/invite-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:iE,role:iR,fullName:iN,tenantId:profile.tenant_id,invitedBy:profile.id})});
    const d=await res.json();if(!res.ok)throw new Error(d.error);toast.success(`Invited ${iE}`);setShow(false);setIE('');setIN('');setIR('viewer');load();
  }catch(e){toast.error(e.message);}finally{setBusy(false);}}

  async function chg(uid,role){if(uid===profile.id)return toast.error("Can't change own");await supabase.from('user_profiles').update({role}).eq('id',uid);toast.success('Updated');load();}
  async function deact(uid){if(uid===profile.id)return;if(!confirm('Deactivate?'))return;await supabase.from('user_profiles').update({is_active:false}).eq('id',uid);toast.success('Done');load();}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Team</h1><p className="text-sm text-n-400 mt-1">{ms.length} member{ms.length!==1?'s':''}</p></div>
        {hasPermission(profile?.role,'manage_team')&&<button onClick={()=>setShow(true)} className="btn-green"><HiOutlineUserAdd className="w-5 h-5"/>Invite</button>}
      </div>

      {loading?<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-n-100 rounded-2xl animate-pulse"/>)}</div>:(
        <div className="card divide-y divide-n-100">{ms.map(m=>(
          <div key={m.id} className={`flex items-center gap-3 px-5 py-4 ${!m.is_active?'opacity-40':''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold flex-shrink-0">{m.full_name?.[0]?.toUpperCase()||'?'}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-n-800 truncate">{m.full_name||'Unnamed'}{m.id===profile.id&&<span className="text-n-400 ml-1 font-normal">(you)</span>}</p><p className="text-[11px] text-n-400 truncate">{m.email}</p></div>
            {hasPermission(profile?.role,'manage_team')&&m.id!==profile.id?(<select value={m.role} onChange={e=>chg(m.id,e.target.value)} className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-n-200 bg-white">{Object.entries(ROLE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>):(<span className={`badge role-${m.role}`}>{ROLE_LABELS[m.role]}</span>)}
            {hasPermission(profile?.role,'manage_team')&&m.id!==profile.id&&m.is_active&&<button onClick={()=>deact(m.id)} className="btn-ghost p-2 text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4"/></button>}
          </div>
        ))}</div>
      )}

      {show&&(<div className="fixed inset-0 bg-n-900/15 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={()=>setShow(false)}>
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 animate-pop" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-n-900">Invite member</h3><button onClick={()=>setShow(false)} className="btn-ghost p-1"><HiOutlineX className="w-5 h-5"/></button></div>
          <form onSubmit={invite} className="space-y-3">
            <div><label className="input-label">Name</label><input value={iN} onChange={e=>setIN(e.target.value)} className="input" placeholder="Jane Smith"/></div>
            <div><label className="input-label">Email *</label><div className="relative"><HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-n-400"/><input type="email" value={iE} onChange={e=>setIE(e.target.value)} className="input pl-10" placeholder="jane@company.com" required/></div></div>
            <div><label className="input-label">Role</label><select value={iR} onChange={e=>setIR(e.target.value)} className="input"><option value="viewer">Viewer</option><option value="creator">Creator</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
            <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShow(false)} className="btn-outline flex-1">Cancel</button><button type="submit" disabled={busy} className="btn-green flex-1">{busy?'Sending...':'Send invite'}</button></div>
          </form>
        </div>
      </div>)}
    </div>
  );
}
