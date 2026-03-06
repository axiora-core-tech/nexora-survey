import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { HiOutlineSparkles, HiOutlineShieldCheck, HiOutlineChartBar, HiOutlineClock, HiOutlineUserGroup, HiOutlineLightningBolt } from 'react-icons/hi';

const features = [
  { icon: HiOutlineUserGroup, title: 'Multi-Tenant', desc: 'Each organization gets fully isolated data with granular role-based access.' },
  { icon: HiOutlineChartBar, title: 'Rich Analytics', desc: 'Real-time response analytics with beautiful visualizations and export options.' },
  { icon: HiOutlineClock, title: 'Auto-Save', desc: 'Responses save automatically so respondents never lose their progress.' },
  { icon: HiOutlineShieldCheck, title: 'Secure by Design', desc: 'Row-level security ensures no data leaks between organizations.' },
  { icon: HiOutlineLightningBolt, title: 'Instant Links', desc: 'Every survey gets a unique, shareable link ready to distribute instantly.' },
  { icon: HiOutlineSparkles, title: 'Beautiful UX', desc: 'Soothing, addictive survey experience that maximizes completion rates.' },
];

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-surface-200/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nexora-600 to-nexora-700 flex items-center justify-center shadow-sm">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display text-surface-900">Nexora Survey</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-nexora-50 rounded-full border border-nexora-100 mb-6">
            <div className="w-2 h-2 rounded-full bg-nexora-500 animate-pulse-soft" />
            <span className="text-sm font-medium text-nexora-700">Now in Public Beta</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display text-surface-900 leading-[1.1] mb-6">
            Surveys that people{' '}
            <span className="bg-gradient-to-r from-nexora-600 to-warm-500 bg-clip-text text-transparent">
              love to fill
            </span>
          </h1>

          <p className="text-lg md:text-xl text-surface-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create beautiful, intelligent surveys with real-time analytics.
            Multi-tenant platform designed for teams who care about response quality.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3">
              Start Creating — Free
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display text-surface-900 mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-surface-500 text-lg max-w-xl mx-auto">
              A complete survey platform built for modern teams and organizations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card-hover p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-nexora-50 border border-nexora-100 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-nexora-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">{f.title}</h3>
                <p className="text-surface-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-nexora-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-surface-700">Nexora Survey</span>
          </div>
          <p className="text-sm text-surface-400">
            &copy; {new Date().getFullYear()} Nexora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
