import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Register() {
  const [f,setF]=useState({fullName:'',email:'',password:'',tenantName:'',tenantSlug:''});
  const [busy,setBusy]=useState(false);const {signUp}=useAuthStore();const nav=useNavigate();
  const s=(k,v)=>setF(p=>{const n={...p,[k]:v};if(k==='tenantName')n.tenantSlug=v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return n;});

  const go=async e=>{e.preventDefault();if(!f.fullName||!f.email||!f.password||!f.tenantName)return toast.error('Fill in all fields');
    if(f.password.length<6)return toast.error('Password ≥ 6 chars');setBusy(true);
    try{const r=await signUp(f.email,f.password,f.tenantName,f.tenantSlug,f.fullName);
      if(r.existing){toast.success(r.message);r.session?nav('/dashboard'):nav('/login');}
      else if(r.needsConfirmation){toast.success('Check email to confirm!',{duration:8000});nav('/login');}
      else{toast.success('Welcome to Nexora!');nav('/dashboard');}
    }catch(e){toast.error(e.message);}finally{setBusy(false);}};

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-n-50">
      <div className="w-full max-w-[420px] animate-in">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center"><svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg></div>
          <span className="text-xl font-bold text-n-900">Nexora</span>
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-n-900 text-center mb-1">Create your workspace</h1>
          <p className="text-sm text-n-500 text-center mb-6">Start gathering insights in minutes</p>
          <form onSubmit={go} className="space-y-3">
            <div><label className="input-label">Your name</label><input value={f.fullName} onChange={e=>s('fullName',e.target.value)} className="input" placeholder="Jane Smith"/></div>
            <div><label className="input-label">Work email</label><input type="email" value={f.email} onChange={e=>s('email',e.target.value)} className="input" placeholder="jane@company.com"/></div>
            <div><label className="input-label">Password</label><input type="password" value={f.password} onChange={e=>s('password',e.target.value)} className="input" placeholder="Min 6 characters"/></div>
            <div><label className="input-label">Organization</label><input value={f.tenantName} onChange={e=>s('tenantName',e.target.value)} className="input" placeholder="Acme Inc."/></div>
            <div><label className="input-label">Workspace URL</label><div className="flex"><input value={f.tenantSlug} onChange={e=>s('tenantSlug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} className="input rounded-r-none border-r-0 font-mono text-sm" placeholder="acme"/><span className="px-3 py-3 bg-n-100 border border-n-200 border-l-0 rounded-r-xl text-xs text-n-500">.nexora.io</span></div></div>
            <button type="submit" disabled={busy} className="btn-green w-full py-3.5 mt-1">{busy?'Creating...':'Create workspace'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-n-500 mt-6">Have an account? <Link to="/login" className="text-green-600 font-semibold hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
