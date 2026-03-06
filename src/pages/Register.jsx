import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiOutlineSparkles, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineOfficeBuilding } from 'react-icons/hi';

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    tenantName: '',
    tenantSlug: '',
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from tenant name
      if (field === 'tenantName') {
        next.tenantSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.tenantName) {
      return toast.error('Please fill in all fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (!form.tenantSlug || form.tenantSlug.length < 3) {
      return toast.error('Organization URL must be at least 3 characters');
    }

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.tenantName, form.tenantSlug, form.fullName);
      toast.success('Organization created! Welcome to Nexora.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-warm-500 via-nexora-600 to-nexora-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-32 left-16 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-32 right-16 w-64 h-64 rounded-full bg-nexora-300/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <HiOutlineSparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-display text-white">Nexora</span>
          </div>
          <h2 className="text-4xl font-display text-white leading-snug mb-4">
            Start your survey<br />journey today
          </h2>
          <p className="text-white/70 text-lg max-w-md leading-relaxed">
            Create an organization, invite your team, and start collecting insights in minutes.
          </p>

          <div className="mt-12 space-y-4">
            {['Unlimited surveys on free plan', 'Auto-save prevents data loss', 'Beautiful analytics dashboard'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
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

          <h1 className="text-2xl font-display text-surface-900 mb-2">Create your organization</h1>
          <p className="text-surface-500 mb-8">Set up a new workspace for your team</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Your Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className="input-field pl-11"
                  placeholder="Jane Smith"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Work Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="input-field pl-11"
                  placeholder="jane@company.com"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="input-field pl-11"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Organization Name</label>
              <div className="relative">
                <HiOutlineOfficeBuilding className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={form.tenantName}
                  onChange={(e) => updateField('tenantName', e.target.value)}
                  className="input-field pl-11"
                  placeholder="Acme Inc."
                />
              </div>
            </div>

            <div>
              <label className="input-label">Organization URL</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={form.tenantSlug}
                  onChange={(e) => updateField('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="input-field rounded-r-none border-r-0"
                  placeholder="acme-inc"
                />
                <span className="px-4 py-3 bg-surface-100 border border-surface-200 rounded-r-xl text-sm text-surface-500 whitespace-nowrap">
                  .nexora.io
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating organization...
                </span>
              ) : (
                'Create Organization'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-nexora-600 font-semibold hover:text-nexora-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
