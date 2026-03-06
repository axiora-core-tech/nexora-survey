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
      {/* Left - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-nexora-600 via-nexora-700 to-nexora-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-warm-400/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <HiOutlineSparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-display text-white">Nexora</span>
          </div>
          <h2 className="text-4xl font-display text-white leading-snug mb-4">
            Create surveys that<br />spark conversations
          </h2>
          <p className="text-nexora-200 text-lg max-w-md leading-relaxed">
            Join thousands of teams using Nexora to gather meaningful insights with beautiful, intelligent surveys.
          </p>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-nexora-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display text-surface-900">Nexora</span>
          </div>

          <h1 className="text-2xl font-display text-surface-900 mb-2">Welcome back</h1>
          <p className="text-surface-500 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-nexora-600 font-semibold hover:text-nexora-700">
              Create organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
