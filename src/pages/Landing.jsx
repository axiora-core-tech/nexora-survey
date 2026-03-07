import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { HiOutlineArrowRight, HiOutlinePlay } from 'react-icons/hi';

export default function Landing() {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Soft gradient blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-brand/[0.04] blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-violet/[0.04] blur-3xl animate-float" style={{animationDelay:'3s'}} />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-mint/[0.03] blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-lg font-bold text-txt">Nexora</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-primary text-xs">Go to Dashboard</Link>
          ) : (
            <><Link to="/login" className="btn-ghost text-xs">Sign in</Link>
            <Link to="/register" className="btn-primary text-xs">Get Started Free</Link></>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-enter">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-pill border border-border text-xs font-medium text-txt-secondary mb-6 shadow-card">
              <div className="pulse-dot" />Trusted by 500+ teams
            </div>
            <h1 className="text-h1 text-txt mb-6 tracking-tight leading-[1.15]">
              Understand Your Users.<br/>
              <span className="gradient-text">Build What They Love.</span>
            </h1>
            <p className="text-lg text-txt-secondary mb-8 leading-relaxed max-w-lg">
              Beautiful surveys designed to reveal real human behavior. Get 3x more responses with our psychology-driven design.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/register" className="btn-primary-lg">
                Create Your First Survey <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
              <button className="btn-ghost text-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center"><HiOutlinePlay className="w-3.5 h-3.5 text-brand ml-0.5" /></div>
                View Demo
              </button>
            </div>
          </div>

          {/* Right — Product visualization */}
          <div className="animate-enter hidden lg:block" style={{animationDelay:'0.2s'}}>
            <div className="relative">
              {/* Mock survey card */}
              <div className="card p-6 mb-4 animate-float">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-txt-secondary">Live Survey</span>
                </div>
                <p className="text-sm font-semibold text-txt mb-4">How would you rate your experience?</p>
                <div className="flex gap-2">
                  {['😢','😐','🙂','😊','🤩'].map((e,i) => (
                    <div key={i} className={`w-10 h-10 rounded-card flex items-center justify-center text-lg transition-all cursor-pointer ${i===3 ? 'bg-brand-50 border-2 border-brand scale-110' : 'bg-gray-50 border border-border'}`}>{e}</div>
                  ))}
                </div>
              </div>
              {/* Mock analytics overlay */}
              <div className="card p-4 w-[200px] absolute -bottom-4 -right-4 animate-float" style={{animationDelay:'2s'}}>
                <p className="text-[10px] font-semibold text-txt-secondary mb-2">Completion Rate</p>
                <p className="text-h3 text-success font-bold">87%</p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2"><div className="h-full bg-success rounded-full" style={{width:'87%'}} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '🎯', title: 'Psychology-Driven', desc: 'Questions designed with behavioral science to maximize completion.' },
            { icon: '📊', title: 'Real-Time Analytics', desc: 'Insights appear the moment responses come in. No waiting.' },
            { icon: '🔒', title: 'Enterprise Security', desc: 'Multi-tenant isolation with row-level security. Zero data leaks.' },
          ].map((f, i) => (
            <div key={i} className="card-interactive p-6 animate-enter" style={{animationDelay:`${0.3+i*0.1}s`}}>
              <span className="text-2xl mb-4 block">{f.icon}</span>
              <h3 className="text-base font-semibold text-txt mb-2">{f.title}</h3>
              <p className="text-sm text-txt-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-6 px-6 text-center text-xs text-txt-tertiary">
        © {new Date().getFullYear()} Nexora Survey. All rights reserved.
      </footer>
    </div>
  );
}
