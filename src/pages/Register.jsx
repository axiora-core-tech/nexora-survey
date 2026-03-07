import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiOutlineSparkles, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineCheck } from 'react-icons/hi';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', tenantName: '', tenantSlug: '' });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'tenantName') {
        next.tenantSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.tenantName) return toast.error('Please fill in all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (!form.tenantSlug || form.tenantSlug.length < 3) return toast.error('Organization URL must be at least 3 characters');

    setLoading(true);
    try {
      const result = await signUp(form.email, form.password, form.tenantName, form.tenantSlug, form.fullName);
      if (result.existing) {
        toast.success(result.message || 'Organization already exists. Redirecting...', { duration: 5000 });
        result.session ? navigate('/dashboard') : navigate('/login');
      } else if (result.needsConfirmation) {
        toast.success('Organization created! Check your email to confirm.', { duration: 8000 });
        navigate('/login');
      } else {
        toast.success('Welcome to Nexora!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const perks = ['Unlimited surveys', 'Auto-save & resume', 'Beautiful analytics', 'Role-based access'];

  return (
    <div className="min-h-screen flex">
      {/* Left decorative */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-acc-600 via-pri-700 to-ink-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[15%] w-80 h-80 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="absolute bottom-[15%] right-[10%] w-64 h-64 rounded-full bg-pri-400/[0.06] blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-14 xl:px-20">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              <HiOutlineSparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">Nexora</span>
          </div>
          <h2 className="text-[2.5rem] font-display font-bold text-white leading-[1.15] tracking-tight mb-5">
            Start your<br />survey journey<br />today
          </h2>
          <p className="text-white/60 text-base max-w-[340px] leading-relaxed mb-12">
            Create an organization, invite your team, and start collecting insights in minutes.
          </p>
          <div className="space-y-3.5">
            {perks.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                  <HiOutlineCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/70 text-[14px]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-pri-600 flex items-center justify-center"><HiOutlineSparkles className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-display font-bold text-ink-900 tracking-tight">Nexora</span>
          </div>

          <h1 className="text-[26px] font-display font-bold text-ink-900 tracking-tight mb-1.5">Create your organization</h1>
          <p className="text-ink-500 text-[15px] mb-8">Set up a new workspace for your team</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Your Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="text" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} className="input-field pl-11" placeholder="Jane Smith" />
              </div>
            </div>
            <div>
              <label className="input-label">Work Email</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="input-field pl-11" placeholder="jane@company.com" />
              </div>
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} className="input-field pl-11" placeholder="Min. 6 characters" />
              </div>
            </div>
            <div>
              <label className="input-label">Organization Name</label>
              <div className="relative">
                <HiOutlineOfficeBuilding className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="text" value={form.tenantName} onChange={(e) => updateField('tenantName', e.target.value)} className="input-field pl-11" placeholder="Acme Inc." />
              </div>
            </div>
            <div>
              <label className="input-label">Organization URL</label>
              <div className="flex items-center">
                <input type="text" value={form.tenantSlug}
                  onChange={(e) => updateField('tenantSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="input-field rounded-r-none border-r-0 font-mono text-sm" placeholder="acme-inc" />
                <span className="px-4 py-3 bg-ink-100 border border-ink-200 rounded-r-xl text-[13px] text-ink-500 whitespace-nowrap font-mono">.nexora.io</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-[15px] mt-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating...
                </span>
              ) : 'Create Organization'}
            </button>
          </form>

          <p className="text-center text-[14px] text-ink-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-pri-600 font-semibold hover:text-pri-700 underline decoration-pri-300 underline-offset-2">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
