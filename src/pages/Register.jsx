import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Register() {
  const [f, sf] = useState({ fullName: '', email: '', password: '', tenantName: '', tenantSlug: '' });
  const [busy, setBusy] = useState(false); const { signUp } = useAuthStore(); const nav = useNavigate();
  const s = (k, v) => sf(p => { const n = { ...p, [k]: v }; if (k === 'tenantName') n.tenantSlug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return n; });

  const go = async e => { e.preventDefault();
    if (!f.fullName || !f.email || !f.password || !f.tenantName) return toast.error('Fill all fields');
    if (f.password.length < 6) return toast.error('Password ≥ 6 chars');
    setBusy(true);
    try {
      const r = await signUp(f.email, f.password, f.tenantName, f.tenantSlug, f.fullName);
      if (r.existing) { toast.success(r.message); r.session ? nav('/dashboard') : nav('/login'); }
      else if (r.needsConfirmation) { toast.success('Check your email!', { duration: 8000 }); nav('/login'); }
      else { toast.success('Welcome!'); nav('/dashboard'); }
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const Field = ({ label, children }) => (
    <div><label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">{label}</label>{children}</div>
  );
  const inp = "w-full px-0 py-3 border-0 border-b-2 border-gray-200 text-dark text-base placeholder:text-gray-300 focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-dark items-center justify-center relative overflow-hidden">
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] left-[30%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]" />
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 px-16 max-w-lg">
          <p className="text-accent text-sm font-semibold tracking-[0.2em] uppercase mb-6">Get started</p>
          <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
            Build something<br />your users love.
          </h1>
          <p className="text-white/30 mt-6 leading-relaxed">Create your workspace in under a minute. No credit card needed.</p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[380px]">
          <Link to="/" className="text-2xl font-bold text-dark tracking-tight mb-12 block">nexora</Link>
          <h2 className="text-3xl font-bold text-dark tracking-tight mb-2">Create workspace</h2>
          <p className="text-muted mb-8">Set up your team's survey platform</p>

          <form onSubmit={go} className="space-y-4">
            <Field label="Your name"><input value={f.fullName} onChange={e => s('fullName', e.target.value)} className={inp} placeholder="Jane Smith" /></Field>
            <Field label="Work email"><input type="email" value={f.email} onChange={e => s('email', e.target.value)} className={inp} placeholder="jane@company.com" /></Field>
            <Field label="Password"><input type="password" value={f.password} onChange={e => s('password', e.target.value)} className={inp} placeholder="Min 6 characters" /></Field>
            <Field label="Organization"><input value={f.tenantName} onChange={e => s('tenantName', e.target.value)} className={inp} placeholder="Acme Inc." /></Field>
            <Field label="Workspace URL">
              <div className="flex items-baseline border-b-2 border-gray-200 focus-within:border-accent transition-colors">
                <input value={f.tenantSlug} onChange={e => s('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 py-3 border-0 text-dark text-base placeholder:text-gray-300 focus:outline-none font-mono" placeholder="acme" />
                <span className="text-muted text-sm pb-3">.nexora.io</span>
              </div>
            </Field>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={busy}
              className="w-full py-4 bg-dark text-white font-semibold rounded-full text-base hover:bg-accent transition-colors duration-300 disabled:opacity-40 mt-2">
              {busy ? 'Creating...' : 'Create workspace →'}
            </motion.button>
          </form>

          <p className="text-muted text-sm mt-8 text-center">
            Have an account? <Link to="/login" className="text-dark font-semibold hover:text-accent transition-colors">Sign in →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
