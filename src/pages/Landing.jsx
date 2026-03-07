import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import {
  HiOutlineSparkles, HiOutlineShieldCheck, HiOutlineChartBar,
  HiOutlineClock, HiOutlineUserGroup, HiOutlineLightningBolt,
  HiOutlineArrowRight,
} from 'react-icons/hi';

const features = [
  { icon: HiOutlineUserGroup, title: 'Multi-Tenant', desc: 'Fully isolated data per organization with granular role-based access controls.' },
  { icon: HiOutlineChartBar, title: 'Real-Time Analytics', desc: 'Beautiful visualizations, completion funnels, and one-click CSV export.' },
  { icon: HiOutlineClock, title: 'Smart Auto-Save', desc: 'Responses save every 2 answers. Resume exactly where you left off.' },
  { icon: HiOutlineShieldCheck, title: 'Secure by Design', desc: 'Row-level security ensures zero data leaks between organizations.' },
  { icon: HiOutlineLightningBolt, title: 'Instant Distribution', desc: 'Every survey gets a unique link, ready to share in seconds.' },
  { icon: HiOutlineSparkles, title: 'Delightful UX', desc: 'Buttery-smooth animations and a design that maximizes completion.' },
];

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen noise-bg">
      {/* ====== NAVBAR ====== */}
      <nav className="fixed top-0 w-full z-50 bg-canvas/80 backdrop-blur-xl border-b border-ink-200/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="logo-mark">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-[19px] font-display font-bold text-ink-900 tracking-tight">
              Nexora
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary">Dashboard <HiOutlineArrowRight className="w-4 h-4" /></Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Sign in</Link>
                <Link to="/register" className="btn-accent">
                  Get Started <HiOutlineArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-pri-400/[0.04] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-acc-400/[0.04] rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="max-w-[800px] mx-auto text-center relative">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white rounded-full border border-ink-200 shadow-xs mb-8 animate-enter">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span className="text-[13px] font-semibold text-ink-600">Now in Public Beta</span>
          </div>

          <h1 className="text-[3.2rem] md:text-[4.2rem] lg:text-[4.8rem] font-display font-bold text-ink-900 leading-[1.05] tracking-tight mb-7 animate-enter" style={{ animationDelay: '0.1s' }}>
            Surveys that<br />
            people{' '}
            <span className="gradient-text">actually love</span>
          </h1>

          <p className="text-lg md:text-xl text-ink-500 max-w-[560px] mx-auto mb-10 leading-relaxed animate-enter font-normal" style={{ animationDelay: '0.2s' }}>
            Create beautiful, intelligent surveys with real-time analytics.
            Built for teams who care about the quality of every response.
          </p>

          <div className="flex items-center justify-center gap-4 animate-enter" style={{ animationDelay: '0.3s' }}>
            <Link to="/register" className="btn-primary-lg shadow-glow hover:shadow-glow-lg">
              Start Creating — Free
            </Link>
            <Link to="/login" className="btn-secondary text-base px-7 py-3.5">
              Sign In
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-14 animate-enter" style={{ animationDelay: '0.5s' }}>
            <div className="flex -space-x-2">
              {['bg-pri-400', 'bg-acc-400', 'bg-emerald-400', 'bg-rose-400'].map((c, i) => (
                <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white shadow-xs flex items-center justify-center text-white text-[10px] font-bold`}>
                  {['J', 'A', 'M', 'K'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-ink-500">
              <span className="font-semibold text-ink-700">500+</span> teams already building
            </p>
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="overline text-pri-600 mb-3">What's included</p>
            <h2 className="text-[2.2rem] md:text-[2.8rem] font-display font-bold text-ink-900 tracking-tight mb-4">
              Everything you need,<br />nothing you don't
            </h2>
            <p className="text-ink-500 text-lg max-w-lg mx-auto">
              A complete survey platform crafted for modern organizations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="card-hover p-6 group animate-enter"
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-pri-50 ring-1 ring-pri-100 flex items-center justify-center mb-5 group-hover:bg-pri-100 group-hover:shadow-xs transition-all">
                  <f.icon className="w-5 h-5 text-pri-600" />
                </div>
                <h3 className="text-[17px] font-display font-semibold text-ink-900 mb-2 tracking-tight">{f.title}</h3>
                <p className="text-ink-500 text-[14px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-elevated p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pri-600/[0.03] to-acc-500/[0.03]" />
            <div className="relative">
              <h2 className="text-[2rem] md:text-[2.4rem] font-display font-bold text-ink-900 tracking-tight mb-4">
                Ready to transform your surveys?
              </h2>
              <p className="text-ink-500 text-lg mb-8 max-w-md mx-auto">
                Join hundreds of teams creating surveys people love to fill out.
              </p>
              <Link to="/register" className="btn-accent text-base px-8 py-3.5">
                Get Started — Free <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-ink-200/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pri-600 flex items-center justify-center">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-semibold text-ink-600 text-sm">Nexora Survey</span>
          </div>
          <p className="text-[13px] text-ink-400">&copy; {new Date().getFullYear()} Nexora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
