import React from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../hooks/useAuth';
import { HiOutlineArrowRight, HiOutlineStar, HiOutlineCheck } from 'react-icons/hi';

export default function Landing() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-n-0 overflow-hidden">
      {/* Background blobs — alive, breathing */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] blob-green animate-float" />
        <div className="absolute top-[50%] -left-20 w-[500px] h-[500px] blob-coral animate-float-slow" />
        <div className="absolute -bottom-20 right-[30%] w-[400px] h-[400px] blob-plum animate-float" style={{animationDelay:'2s'}} />
      </div>

      {/* Nav */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shadow-green">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
          </div>
          <span className="text-xl font-bold text-n-900">Nexora</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-green text-sm">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-green">Get started free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-green-50 rounded-full text-sm font-semibold text-green-700 mb-6 animate-in">
              <HiOutlineStar className="w-4 h-4" /> Trusted by 500+ teams
            </div>

            <h1 className="text-[3rem] md:text-[3.5rem] lg:text-[4rem] font-extrabold text-n-900 leading-[1.1] tracking-tight mb-6 animate-in-delay-1">
              Let user research be
              <br />your{' '}
              <span className="text-green-500">superpower</span>
            </h1>

            <p className="text-lg text-n-500 leading-relaxed mb-8 max-w-lg animate-in-delay-2">
              Beautiful surveys that people actually enjoy filling out.
              Gather feedback, understand behavior, and build what users love.
            </p>

            <div className="flex items-center gap-4 animate-in-delay-3">
              <Link to="/register" className="btn-green-lg">
                Start for free <HiOutlineArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-outline px-8 py-4 rounded-2xl">Log in</Link>
            </div>

            <p className="text-sm text-n-400 mt-4 flex items-center gap-2">
              <HiOutlineCheck className="w-4 h-4 text-green-500" /> No credit card required
            </p>
          </div>

          {/* Right — Live product preview (Lyssna-style) */}
          <div className="hidden lg:block relative animate-in-delay-2">
            {/* Floating sticky notes */}
            <div className="sticky bg-yellow-100 text-yellow-800 absolute -top-4 -left-6 z-10 animate-float" style={{'--rotate':'-3deg'}}>
              📝 Quick feedback
            </div>
            <div className="sticky bg-green-100 text-green-800 absolute -bottom-2 -right-4 z-10 animate-float-slow" style={{'--rotate':'2deg'}}>
              ✅ 87% completion rate
            </div>

            {/* Main survey preview card */}
            <div className="card p-6 relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
                <span className="text-xs font-semibold text-n-500">Live Survey</span>
                <span className="badge-active ml-auto">Active</span>
              </div>

              <p className="font-bold text-n-900 text-lg mb-5">How would you rate your overall experience?</p>

              {/* Star rating preview */}
              <div className="flex gap-2 mb-6">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${i<=4 ? 'bg-yellow-50 border-2 border-yellow-300 scale-105' : 'bg-n-100 border border-n-200'}`}>
                    {i<=4 ? '⭐' : '☆'}
                  </div>
                ))}
              </div>

              {/* Option preview */}
              <div className="space-y-2.5">
                {['Very satisfied','Somewhat satisfied','Neutral'].map((opt,i) => (
                  <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${i===0 ? 'border-green-500 bg-green-50' : 'border-n-200'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${i===0 ? 'border-green-500 bg-green-500' : 'border-n-300'}`}>
                      {i===0 && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className={`text-sm font-medium ${i===0 ? 'text-green-700' : 'text-n-600'}`}>{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating stats card */}
            <div className="card p-4 absolute -bottom-8 -left-8 w-48 animate-float" style={{animationDelay:'1.5s'}}>
              <p className="text-[10px] font-bold text-n-400 uppercase tracking-wider mb-1">Responses today</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-extrabold text-n-900">247</span>
                <span className="text-xs font-bold text-green-500 mb-1">+23%</span>
              </div>
              <div className="flex gap-0.5 mt-2">
                {[40,60,35,80,65,90,55].map((h,i) => (
                  <div key={i} className="flex-1 bg-green-200 rounded-full" style={{height:`${h*0.3}px`}} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-n-900 tracking-tight">
            Research made simple and beautiful
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { emoji:'🎯', title:'Smart Surveys', desc:'11 question types, conditional logic, and auto-save that never loses a response.' },
            { emoji:'👥', title:'Team Workspace', desc:'Multi-tenant isolation with roles. Every organization gets its own secure space.' },
            { emoji:'📊', title:'Live Analytics', desc:'Charts, trends, and CSV export. See insights the moment responses land.' },
          ].map((f,i) => (
            <div key={i} className="card p-7 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 animate-in" style={{animationDelay:`${0.2+i*0.1}s`}}>
              <span className="text-3xl block mb-4">{f.emoji}</span>
              <h3 className="text-lg font-bold text-n-900 mb-2">{f.title}</h3>
              <p className="text-sm text-n-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — dark section (Yellow Slice-inspired) */}
      <section className="relative z-10 bg-n-900 rounded-t-[32px]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-5">
            Ready to understand your users?
          </h2>
          <p className="text-n-400 text-lg mb-8 max-w-md mx-auto">
            Start creating surveys in minutes. No credit card, no commitment.
          </p>
          <Link to="/register" className="btn-green-lg">
            Get started — it's free <HiOutlineArrowRight className="w-5 h-5" />
          </Link>
        </div>
        <div className="border-t border-n-800 py-6 px-6 text-center text-sm text-n-600">
          © {new Date().getFullYear()} Nexora Survey
        </div>
      </section>
    </div>
  );
}
