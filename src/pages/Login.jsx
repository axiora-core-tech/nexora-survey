import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false);
  const { signIn } = useAuthStore(); const nav = useNavigate();
  const go = async e => { e.preventDefault(); if (!email || !pw) return toast.error('Fill in all fields'); setBusy(true);
    try { await signIn(email, pw); toast.success('Welcome back!'); nav('/dashboard'); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };

  return (
    <div className="min-h-screen flex">
      {/* Dark left — big statement */}
      <div className="hidden lg:flex lg:w-1/2 bg-dark items-center justify-center relative overflow-hidden">
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 px-16 max-w-lg">
          <p className="text-accent text-sm font-semibold tracking-[0.2em] uppercase mb-6">Welcome back</p>
          <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
            Your insights<br />are waiting.
          </h1>
          <p className="text-white/30 mt-6 text-base leading-relaxed">Sign in to pick up where you left off.</p>
        </motion.div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[380px]">
          <Link to="/" className="text-2xl font-bold text-dark tracking-tight mb-12 block">nexora</Link>

          <h2 className="text-3xl font-bold text-dark tracking-tight mb-2">Sign in</h2>
          <p className="text-muted mb-8">Enter your credentials to continue</p>

          <form onSubmit={go} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 text-dark text-lg placeholder:text-gray-300 focus:outline-none focus:border-accent transition-colors"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Password</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                className="w-full px-0 py-3 border-0 border-b-2 border-gray-200 text-dark text-lg placeholder:text-gray-300 focus:outline-none focus:border-accent transition-colors"
                placeholder="••••••••" />
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={busy}
              className="w-full py-4 bg-dark text-white font-semibold rounded-full text-base hover:bg-accent transition-colors duration-300 disabled:opacity-40 mt-4">
              {busy ? 'Signing in...' : 'Sign in →'}
            </motion.button>
          </form>

          <p className="text-muted text-sm mt-8 text-center">
            No account? <Link to="/register" className="text-dark font-semibold hover:text-accent transition-colors">Create one →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
