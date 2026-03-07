import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [busy,setBusy]=useState(false);
  const {signIn}=useAuthStore(); const nav=useNavigate();
  const go=async e=>{e.preventDefault();if(!email||!pw)return toast.error('Fill in all fields');setBusy(true);
    try{await signIn(email,pw);toast.success('Welcome back!');nav('/dashboard');}catch(e){toast.error(e.message);}finally{setBusy(false);}};

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-n-50">
      <div className="w-full max-w-[400px] animate-in">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center"><svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg></div>
          <span className="text-xl font-bold text-n-900">Nexora</span>
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-n-900 text-center mb-1">Welcome back</h1>
          <p className="text-sm text-n-500 text-center mb-6">Sign in to continue</p>
          <form onSubmit={go} className="space-y-4">
            <div><label className="input-label">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@company.com"/></div>
            <div><label className="input-label">Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="input" placeholder="••••••••"/></div>
            <button type="submit" disabled={busy} className="btn-green w-full py-3.5">{busy?'Signing in...':'Sign in'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-n-500 mt-6">No account? <Link to="/register" className="text-green-600 font-semibold hover:underline">Create one</Link></p>
      </div>
    </div>
  );
}
