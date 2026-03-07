import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ fullName:'', email:'', password:'', tenantName:'', tenantSlug:'' });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const set = (k,v) => setForm(f => { const n={...f,[k]:v}; if(k==='tenantName') n.tenantSlug=v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); return n; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName||!form.email||!form.password||!form.tenantName) return toast.error('Please fill in all fields');
    if (form.password.length<6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const r = await signUp(form.email,form.password,form.tenantName,form.tenantSlug,form.fullName);
      if (r.existing) { toast.success(r.message||'Org exists'); r.session?navigate('/dashboard'):navigate('/login'); }
      else if (r.needsConfirmation) { toast.success('Check your email to confirm!',{duration:8000}); navigate('/login'); }
      else { toast.success('Welcome to Nexora!'); navigate('/dashboard'); }
    } catch(e) { toast.error(e.message||'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] animate-enter">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-xl font-bold text-txt">Nexora</span>
        </div>

        <div className="card p-8">
          <h1 className="text-h4 text-txt text-center mb-1">Create your organization</h1>
          <p className="text-sm text-txt-secondary text-center mb-6">Start collecting insights in minutes</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="input-label">Name</label><input value={form.fullName} onChange={e=>set('fullName',e.target.value)} className="input" placeholder="Jane Smith" /></div>
            <div><label className="input-label">Work Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className="input" placeholder="jane@company.com" /></div>
            <div><label className="input-label">Password</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} className="input" placeholder="Min. 6 characters" /></div>
            <div><label className="input-label">Organization</label><input value={form.tenantName} onChange={e=>set('tenantName',e.target.value)} className="input" placeholder="Acme Inc." /></div>
            <div>
              <label className="input-label">Organization URL</label>
              <div className="flex"><input value={form.tenantSlug} onChange={e=>set('tenantSlug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} className="input rounded-r-none border-r-0 font-mono text-sm" placeholder="acme" />
              <span className="px-3 py-3 bg-bg-alt border border-border border-l-0 rounded-r-card text-xs text-txt-secondary whitespace-nowrap">.nexora.io</span></div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-1">
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-txt-secondary mt-6">
          Already have an account? <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
