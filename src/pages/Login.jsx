import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiOutlineSparkles, HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';

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
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-pri-700 via-pri-800 to-ink-950 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-pri-500/10 blur-3xl" />
          <div className="absolute bottom-[20%] right-[5%] w-64 h-64 rounded-full bg-acc-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1.5\'/%3E%3C/g%3E%3C/svg%3E")'}} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-14 xl:px-20">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              <HiOutlineSparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">Nexora</span>
          </div>

          <h2 className="text-[2.5rem] font-display font-bold text-white leading-[1.15] tracking-tight mb-5">
            Create surveys<br />that spark real<br />conversations
          </h2>
          <p className="text-pri-200/80 text-base max-w-[340px] leading-relaxed">
            Join thousands of teams using Nexora to gather meaningful insights with beautiful, intelligent surveys.
          </p>

          {/* Decorative cards */}
          <div className="mt-14 space-y-3">
            {[
              { value: '98%', label: 'Average completion rate' },
              { value: '2.4s', label: 'Average response time per question' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.06] backdrop-blur border border-white/10">
                <span className="text-2xl font-display font-bold text-white">{stat.value}</span>
                <span className="text-sm text-pri-200/70">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-pri-600 flex items-center justify-center"><HiOutlineSparkles className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-display font-bold text-ink-900 tracking-tight">Nexora</span>
          </div>

          <h1 className="text-[26px] font-display font-bold text-ink-900 tracking-tight mb-1.5">Welcome back</h1>
          <p className="text-ink-500 text-[15px] mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11" placeholder="you@company.com" autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11" placeholder="••••••••" autoComplete="current-password" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-[15px]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[14px] text-ink-500 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-pri-600 font-semibold hover:text-pri-700 underline decoration-pri-300 underline-offset-2">
              Create organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
