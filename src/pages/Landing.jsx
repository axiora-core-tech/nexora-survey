import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import { HiOutlineArrowRight } from 'react-icons/hi';

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuthStore();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <div className="bg-white">
      {/* ═══════ STICKY NAV — transparent, floats over hero ═══════ */}
      <nav className="fixed top-0 w-full z-50 mix-blend-difference">
        <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">nexora</span>
          <div className="flex items-center gap-6">
            {user ? (
              <Link to="/dashboard" className="text-sm font-medium text-white hover:text-accent transition-colors">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Sign in</Link>
                <Link to="/register" className="text-sm font-medium text-dark bg-white px-5 py-2.5 rounded-full hover:bg-accent hover:text-white transition-all duration-300">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════ HERO — full viewport, dark, massive type ═══════ */}
      <motion.section ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }}
        className="h-screen bg-dark relative flex items-center overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-8 w-full">
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-accent font-medium text-sm tracking-[0.2em] uppercase mb-8">
            Survey Platform for Modern Teams
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(3rem,8vw,7rem)] font-extrabold text-white leading-[0.95] tracking-tight max-w-[900px]">
            Surveys that
            <br />
            <span className="text-accent">people love</span>
            <br />
            to complete
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-xl text-white/50 mt-8 max-w-[500px] leading-relaxed font-light">
            Psychology-driven design that turns survey fatigue into survey delight. Built for teams who care about every response.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="flex items-center gap-5 mt-12">
            <Link to="/register" className="group bg-accent text-white px-8 py-4 rounded-full text-base font-semibold hover:bg-white hover:text-dark transition-all duration-300 flex items-center gap-2">
              Start Free <HiOutlineArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
              or sign in →
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </motion.section>

      {/* ═══════ NUMBERS — big, impactful, edge-to-edge ═══════ */}
      <section className="py-24 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { n: '87%', label: 'Average completion rate' },
              { n: '10k+', label: 'Surveys created' },
              { n: '2.4s', label: 'Avg response per question' },
              { n: '500+', label: 'Teams worldwide' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center md:text-left">
                <p className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold text-dark tracking-tight leading-none">{s.n}</p>
                <p className="text-muted text-sm mt-2 font-medium">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES — large alternating sections ═══════ */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-8 space-y-32">
          {[
            {
              tag: '01 — Create', title: 'Build surveys in\nminutes, not hours',
              desc: '11 question types. Drag-and-drop builder. Conditional logic. Beautiful by default.',
              visual: (
                <div className="bg-soft rounded-3xl p-8 h-[400px] flex items-center justify-center relative overflow-hidden">
                  <div className="space-y-4 w-full max-w-sm">
                    {['How satisfied are you?', 'What could we improve?', 'Would you recommend us?'].map((q, i) => (
                      <motion.div key={i} whileHover={{ x: 8, scale: 1.02 }}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/60 cursor-pointer">
                        <p className="text-xs text-muted mb-1">Question {i + 1}</p>
                        <p className="text-sm font-semibold text-dark">{q}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              tag: '02 — Collect', title: 'One link.\nThousands of insights.',
              desc: 'Auto-save every 2 responses. Resume where you left off. Expiry dates with one-click resume.',
              visual: (
                <div className="bg-dark rounded-3xl p-8 h-[400px] flex items-center justify-center relative overflow-hidden">
                  <div className="text-center">
                    <p className="text-white/40 text-xs tracking-widest uppercase mb-6">nexora.io/s/abc123</p>
                    <p className="text-white text-2xl font-bold mb-8">How would you rate<br/>your experience?</p>
                    <div className="flex gap-3 justify-center">
                      {['😢', '😐', '🙂', '😊', '🤩'].map((e, i) => (
                        <motion.div key={i} whileHover={{ scale: 1.3, y: -8 }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl cursor-pointer transition-colors ${i === 4 ? 'bg-accent/20 ring-2 ring-accent' : 'bg-white/10'}`}>
                          {e}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              tag: '03 — Analyze', title: 'Insights that\nspeak for themselves',
              desc: 'Real-time charts. Drop-off analysis. One-click CSV export. Share within your team only.',
              visual: (
                <div className="bg-soft rounded-3xl p-8 h-[400px] flex items-center justify-center">
                  <div className="space-y-6 w-full max-w-sm">
                    {[
                      { label: 'Very satisfied', pct: 68, color: 'bg-accent' },
                      { label: 'Satisfied', pct: 22, color: 'bg-accent/60' },
                      { label: 'Neutral', pct: 7, color: 'bg-gray-300' },
                      { label: 'Unsatisfied', pct: 3, color: 'bg-gray-200' },
                    ].map((bar, i) => (
                      <Reveal key={i} delay={i * 0.1}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-dark">{bar.label}</span>
                          <span className="text-sm font-bold text-dark">{bar.pct}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} whileInView={{ width: `${bar.pct}%` }}
                            transition={{ duration: 1, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                            viewport={{ once: true }}
                            className={`h-full rounded-full ${bar.color}`} />
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              ),
            },
          ].map((feat, i) => (
            <div key={i} className={`grid lg:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <Reveal className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="text-accent font-medium text-xs tracking-[0.2em] uppercase mb-4">{feat.tag}</p>
                <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold text-dark leading-[1.1] tracking-tight whitespace-pre-line mb-6">{feat.title}</h2>
                <p className="text-muted text-lg leading-relaxed max-w-md">{feat.desc}</p>
              </Reveal>
              <Reveal delay={0.2} className={i % 2 === 1 ? 'lg:order-1' : ''}>
                {feat.visual}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CTA — full dark section ═══════ */}
      <section className="bg-dark py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" />
        <Reveal className="relative z-10 text-center max-w-3xl mx-auto px-8">
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-extrabold text-white tracking-tight leading-tight mb-6">
            Ready to build surveys<br/>people actually enjoy?
          </h2>
          <p className="text-white/40 text-lg mb-10 font-light">Free to start. No credit card required.</p>
          <Link to="/register" className="group inline-flex items-center gap-2 bg-accent text-white px-10 py-5 rounded-full text-lg font-semibold hover:bg-white hover:text-dark transition-all duration-300">
            Get Started Free <HiOutlineArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 text-center text-xs text-muted border-t border-gray-100">
        © {new Date().getFullYear()} Nexora Survey. All rights reserved.
      </footer>
    </div>
  );
}
