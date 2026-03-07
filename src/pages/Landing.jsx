import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { HiOutlineArrowRight } from 'react-icons/hi';

export default function Landing() {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen bg-canvas">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-ink-900 tracking-tight text-lg">Nexora</span>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-xs">Dashboard</Link>
            ) : (
              <><Link to="/login" className="btn-ghost text-xs">Sign in</Link>
              <Link to="/register" className="btn-primary text-xs">Get Started</Link></>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pri-50 rounded-full text-xs font-semibold text-pri-700 mb-8 anim-enter">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Public Beta
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-ink-900 tracking-tight leading-[1.1] mb-6 anim-enter anim-enter-1">
            Surveys people<br/><span className="gradient-text">actually finish</span>
          </h1>
          <p className="text-lg text-ink-400 max-w-md mx-auto mb-10 leading-relaxed anim-enter anim-enter-2">
            Beautiful forms. Real-time analytics. Built for teams that care about response quality.
          </p>
          <div className="flex items-center justify-center gap-3 anim-enter anim-enter-3">
            <Link to="/register" className="btn-accent">Start Free <HiOutlineArrowRight className="w-4 h-4" /></Link>
            <Link to="/login" className="btn-secondary">Sign In</Link>
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { t: 'Multi-tenant', d: 'Complete data isolation between organizations. Row-level security on every table.' },
            { t: 'Auto-save', d: 'Responses save every 2 answers. Close the tab, come back later. Nothing lost.' },
            { t: 'Analytics', d: 'Charts, completion rates, CSV export. Share insights within your team only.' },
          ].map((f, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-ink-100 anim-enter" style={{animationDelay:`${0.2+i*0.08}s`}}>
              <h3 className="font-display font-semibold text-ink-900 mb-2">{f.t}</h3>
              <p className="text-sm text-ink-400 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink-100 py-6 px-6 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Nexora Survey
      </footer>
    </div>
  );
}
