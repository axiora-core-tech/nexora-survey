import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try { await signIn(email, password); toast.success('Welcome back!'); navigate('/dashboard'); }
    catch (err) { toast.error(err.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] animate-enter">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-xl font-bold text-txt">Nexora</span>
        </div>

        <div className="card p-8">
          <h1 className="text-h4 text-txt text-center mb-1">Welcome back</h1>
          <p className="text-sm text-txt-secondary text-center mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@company.com" autoComplete="email" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input" placeholder="••••••••" autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in...</span> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-txt-secondary mt-6">
          Don't have an account? <Link to="/register" className="text-brand font-semibold hover:underline">Create organization</Link>
        </p>
      </div>
    </div>
  );
}
