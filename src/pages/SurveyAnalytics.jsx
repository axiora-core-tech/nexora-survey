// ─────────────────────────────────────────────────────────────────────────────
// SurveyAnalytics.jsx  —  World-class analytics dashboard · Nexora Pulse
// Tabs: Overview · Drop-off · Questions · Text Insights · AI Insights
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { formatDateTime } from '../lib/constants';
import AIInsightsPanel from '../components/AIInsightsPanel';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLoading } from '../context/LoadingContext';

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
);

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLS = [
  '#FF4500','#FFB800','#1E7A4A','#0047FF',
  '#D63B1F','#7C3AED','#00D4FF','#FF6B35','#84CC16','#EC4899',
];

const S = {
  tag:       { fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--coral)', marginBottom:10 },
  h1:        { fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:'clamp(26px,3.5vw,42px)', letterSpacing:'-2px', color:'var(--espresso)', margin:0, lineHeight:1.05 },
  card:      { background:'var(--warm-white)', borderRadius:20, border:'1px solid rgba(22,15,8,0.07)', padding:'24px 28px 22px' },
  secLabel:  { fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)', marginBottom:18 },
  qNum:      { fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)' },
  qText:     { fontFamily:'Playfair Display,serif', fontWeight:700, fontSize:18, color:'var(--espresso)', lineHeight:1.3, letterSpacing:'-0.3px', marginBottom:4 },
  qResp:     { fontFamily:'Fraunces,serif', fontWeight:300, fontSize:12, color:'rgba(22,15,8,0.35)', marginBottom:20 },
  statNum:   { fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:42, letterSpacing:'-3px', color:'var(--espresso)', lineHeight:1 },
  statLbl:   { fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)', marginTop:8 },
  body:      { fontFamily:'Fraunces,serif', fontWeight:300, fontSize:14, color:'rgba(22,15,8,0.65)', lineHeight:1.65 },
  textResp:  { fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'var(--espresso)', background:'var(--cream)', borderRadius:10, padding:'10px 14px', lineHeight:1.6, borderLeft:'3px solid var(--coral)' },
  exportBtn: { display:'inline-flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:999, border:'1px solid rgba(22,15,8,0.12)', background:'transparent', color:'rgba(22,15,8,0.55)', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s' },
  backLink:  { display:'inline-flex', alignItems:'center', gap:6, fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)', textDecoration:'none', marginBottom:14, transition:'color 0.2s' },
};

// ── Shared chart tooltip defaults ─────────────────────────────────────────────
const tip = {
  cornerRadius:12, padding:12,
  backgroundColor:'rgba(22,15,8,0.92)',
  titleFont:{ family:'Syne', size:10 }, bodyFont:{ family:'Fraunces', size:12 },
  titleColor:'rgba(253,245,232,0.55)', bodyColor:'#FDF5E8',
};
const barOpts = {
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ display:false }, tooltip:tip },
  scales:{
    x:{ grid:{ display:false }, ticks:{ font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.4)' } },
    y:{ beginAtZero:true, ticks:{ stepSize:1, font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.4)' }, grid:{ color:'rgba(22,15,8,0.04)' } },
  },
};
const hBarOpts = {
  indexAxis:'y', responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ display:false }, tooltip:tip },
  scales:{
    x:{ beginAtZero:true, ticks:{ font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.4)' }, grid:{ color:'rgba(22,15,8,0.04)' } },
    y:{ grid:{ display:false }, ticks:{ font:{ family:'Syne', size:11 }, color:'rgba(22,15,8,0.5)' } },
  },
};
const donutOpts = {
  responsive:true, maintainAspectRatio:false, cutout:'68%',
  plugins:{ legend:{ display:false }, tooltip:tip },
};
const lineOpts = {
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{ position:'top', labels:{ font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.45)', boxWidth:10, boxHeight:2, padding:20 } },
    tooltip:tip,
  },
  scales:{
    x:{ grid:{ display:false }, ticks:{ font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.4)' } },
    y:{ beginAtZero:true, ticks:{ stepSize:1, font:{ family:'Syne', size:10 }, color:'rgba(22,15,8,0.4)' }, grid:{ color:'rgba(22,15,8,0.04)' } },
  },
};

// ── Text analytics helpers ────────────────────────────────────────────────────
const POS_WORDS = new Set(['good','great','excellent','love','amazing','helpful','best','easy','fantastic','wonderful','satisfied','happy','nice','recommend','perfect','clear','fast','efficient','smooth','intuitive','simple','beautiful','awesome','brilliant','outstanding','impressive','quick','reliable','enjoy','enjoyed','pleased','delighted','appreciate','valuable','useful','effective','clean','solid','superb','thorough','friendly']);
const NEG_WORDS = new Set(['bad','poor','difficult','confusing','frustrated','awful','terrible','hate','worst','disappointing','slow','problem','issue','broken','wrong','unclear','complicated','annoying','expensive','hard','buggy','crash','error','missing','useless','waste','horrible','mediocre','underwhelming','incomplete','inconsistent','unreliable','clunky','awkward','painful','tedious','boring','irrelevant','lack','fails','failed','worse','ugly']);
const STOPS = new Set(['the','a','an','and','or','but','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','must','can','to','of','in','for','on','with','at','by','from','as','it','its','that','this','these','those','i','me','my','we','our','you','your','he','she','they','their','not','no','so','if','when','what','how','which','who','there','then','than','more','also','just','very','really','quite','too','up','out','about','into','through','after','before','get','got','make','made','use','used','like','even','much','some','here','need','want','feel','think','know','said','them','all','one','two','any','many','each','same','both','such']);

function sentimentScore(text) {
  if (!text) return 'neutral';
  const ws = text.toLowerCase().match(/\b\w+\b/g) || [];
  let p = 0, n = 0;
  ws.forEach(w => { if (POS_WORDS.has(w)) p++; if (NEG_WORDS.has(w)) n++; });
  return p > n + 0.5 ? 'positive' : n > p + 0.5 ? 'negative' : 'neutral';
}

function extractKeywords(items) {
  const freq = {};
  items.forEach(t => {
    if (!t) return;
    (t.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).forEach(w => {
      if (!STOPS.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
  });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([word,count])=>({ word, count }));
}

// ── Reusable atoms ────────────────────────────────────────────────────────────
function StatCard({ label, value, accent='var(--coral)', sub }) {
  return (
    <motion.div whileHover={{ y:-3, boxShadow:'0 20px 48px rgba(22,15,8,0.1)' }}
      style={{ ...S.card, borderTop:`3px solid ${accent}`, padding:'20px 22px 18px' }}>
      <div style={S.statNum}>{value}</div>
      <div style={S.statLbl}>{label}</div>
      {sub && <div style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:11, color:'rgba(22,15,8,0.28)', marginTop:4 }}>{sub}</div>}
    </motion.div>
  );
}

function AutoInsight({ type='info', children }) {
  const map = {
    info:     { bg:'rgba(0,71,255,0.06)',   border:'rgba(0,71,255,0.12)',  color:'#0047FF',           icon:'i' },
    positive: { bg:'rgba(30,122,74,0.08)',  border:'rgba(30,122,74,0.15)', color:'var(--sage)',       icon:'↑' },
    warning:  { bg:'rgba(255,184,0,0.09)',  border:'rgba(255,184,0,0.2)',  color:'#9A6D00',           icon:'!' },
    alert:    { bg:'rgba(255,69,0,0.07)',   border:'rgba(255,69,0,0.14)',  color:'var(--coral)',      icon:'→' },
  };
  const st = map[type] || map.info;
  return (
    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 16px', borderRadius:14, background:st.bg, border:`1px solid ${st.border}` }}>
      <div style={{ width:20, height:20, borderRadius:6, background:st.border, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:10, color:st.color, flexShrink:0 }}>{st.icon}</div>
      <span style={{ fontFamily:'Fraunces,serif', fontWeight:400, fontSize:13, color:st.color, lineHeight:1.5 }}>{children}</span>
    </motion.div>
  );
}

function EmptyState({ message='No data yet.' }) {
  return (
    <div style={{ ...S.card, textAlign:'center', padding:'52px 32px' }}>
      <div style={{ fontFamily:'Playfair Display,serif', fontSize:44, color:'rgba(22,15,8,0.05)', fontWeight:900, marginBottom:12 }}>Empty</div>
      <p style={{ ...S.body, color:'rgba(22,15,8,0.28)', margin:0 }}>{message}</p>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = [
  { id:'Overview',      label:'Overview'      },
  { id:'Dropoff',       label:'Drop-off'      },
  { id:'Questions',     label:'Questions'     },
  { id:'TextInsights',  label:'Text Insights' },
  { id:'AI',            label:'✦ AI Insights' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, borderBottom:'1px solid rgba(22,15,8,0.07)', marginBottom:40, overflowX:'auto' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
            padding:'10px 18px', border:'none', background:'transparent', cursor:'pointer', whiteSpace:'nowrap',
            color: active === t.id ? 'var(--espresso)' : 'rgba(22,15,8,0.3)',
            borderBottom: active === t.id ? '2px solid var(--coral)' : '2px solid transparent',
            marginBottom:'-1px', transition:'all 0.18s',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ analytics }) {
  const { total, completedCount, abandonedCount, completionRate, abandonRate, avgTimeMin, nps, responseTrend, deviceBreakdown } = analytics;
  const inProgress = total - completedCount - abandonedCount;

  const statCards = [
    { label:'Total Responses',  value:total,                    accent:'var(--coral)'      },
    { label:'Completed',        value:completedCount,           accent:'var(--sage)'       },
    { label:'In Progress',      value:Math.max(0,inProgress),   accent:'var(--cobalt)'     },
    { label:'Abandoned',        value:abandonedCount,           accent:'var(--terracotta)' },
    { label:'Completion Rate',  value:`${completionRate}%`,     accent:'var(--espresso)'   },
    { label:'Avg. Time',        value:avgTimeMin?`${avgTimeMin}m`:'—', accent:'var(--saffron)', sub:'to complete' },
  ];

  const hasTrend = responseTrend.some(d => d.started > 0);
  const trendData = {
    labels: responseTrend.map(d=>d.date),
    datasets:[
      { label:'Completed', data:responseTrend.map(d=>d.completed), borderColor:'#FF4500', backgroundColor:'rgba(255,69,0,0.07)', fill:true, tension:0.45, pointBackgroundColor:'#FF4500', pointRadius:3, pointHoverRadius:5, borderWidth:2 },
      { label:'Started',   data:responseTrend.map(d=>d.started),   borderColor:'#0047FF', backgroundColor:'rgba(0,71,255,0.04)', fill:true, tension:0.45, pointBackgroundColor:'#0047FF', pointRadius:3, pointHoverRadius:5, borderWidth:1.5 },
    ],
  };

  const devEntries = Object.entries(deviceBreakdown).filter(([,v])=>v>0);
  const npsColors = { Excellent:'var(--sage)', Good:'var(--cobalt)', 'Needs work':'#9A6D00', Critical:'var(--terracotta)' };

  const insights = [];
  if (total > 5 && completionRate < 50) insights.push({ type:'warning', msg:`Completion rate is only ${completionRate}% — survey may be too long or have friction points.` });
  if (total >= 5 && completionRate >= 75) insights.push({ type:'positive', msg:`${completionRate}% completion rate is excellent — respondents find this survey engaging.` });
  if (total > 5 && abandonRate > 30) insights.push({ type:'alert', msg:`${abandonRate}% abandon rate detected — check the Drop-off tab for the problematic question.` });
  if (nps && nps.score < 0) insights.push({ type:'alert', msg:`NPS score of ${nps.score} is negative — detractors outnumber promoters. Urgent attention needed.` });
  if (nps && nps.score >= 50) insights.push({ type:'positive', msg:`NPS of ${nps.score} (${nps.label}) — you're in the top tier for respondent satisfaction.` });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
      {insights.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {insights.map((ins,i) => <AutoInsight key={i} type={ins.type}>{ins.msg}</AutoInsight>)}
        </div>
      )}

      {/* Stat grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:14 }}>
        {statCards.map((sc,i) => (
          <motion.div key={i} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}>
            <StatCard {...sc} />
          </motion.div>
        ))}
      </div>

      {/* 14-day trend */}
      {hasTrend ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }} style={S.card}>
          <div style={S.secLabel}>14-Day Response Trend</div>
          <div style={{ height:210 }}><Line options={lineOpts} data={trendData} /></div>
        </motion.div>
      ) : (
        <div style={{ ...S.card, textAlign:'center', padding:'32px' }}>
          <p style={{ ...S.body, color:'rgba(22,15,8,0.28)', margin:0 }}>No responses in the last 14 days.</p>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:nps?'1fr 1fr':'1fr', gap:20 }}>
        {/* NPS card */}
        {nps && (
          <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }}>
            <div style={{ ...S.card, height:'100%', boxSizing:'border-box' }}>
              <div style={S.secLabel}>NPS Score</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:20 }}>
                <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:56, letterSpacing:'-3px', color:'var(--espresso)', lineHeight:1 }}>{nps.score}</span>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:npsColors[nps.label]||'var(--coral)' }}>{nps.label}</span>
              </div>
              {[
                { label:'Promoters',  val:nps.breakdown.promoters,  color:'#1E7A4A' },
                { label:'Passives',   val:nps.breakdown.passives,   color:'#FFB800' },
                { label:'Detractors', val:nps.breakdown.detractors, color:'#D63B1F' },
              ].map(row => {
                const pct = Math.round((row.val/nps.breakdown.total)*100);
                return (
                  <div key={row.label} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.55)' }}>{row.label}</span>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, color:'var(--espresso)' }}>
                        {row.val} <span style={{ color:'rgba(22,15,8,0.3)' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height:4, background:'var(--cream-deep)', borderRadius:999 }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8, ease:[0.16,1,0.3,1] }}
                        style={{ height:'100%', background:row.color, borderRadius:999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Device breakdown */}
        {devEntries.length > 0 && (
          <motion.div initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.35 }}>
            <div style={{ ...S.card, height:'100%', boxSizing:'border-box' }}>
              <div style={S.secLabel}>Device Breakdown</div>
              <div style={{ display:'flex', gap:24, alignItems:'center' }}>
                <div style={{ width:110, height:110, flexShrink:0 }}>
                  <Doughnut options={donutOpts} data={{ labels:devEntries.map(([k])=>k), datasets:[{ data:devEntries.map(([,v])=>v), backgroundColor:COLS.slice(0,devEntries.length), borderWidth:0 }] }} />
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  {devEntries.map(([key,val],i) => (
                    <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:COLS[i] }} />
                        <span style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'var(--espresso)', textTransform:'capitalize' }}>{key}</span>
                      </div>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, color:'rgba(22,15,8,0.45)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: DROP-OFF FUNNEL
// ─────────────────────────────────────────────────────────────────────────────
function DropoffTab({ analytics }) {
  const { dropOffFunnel, timingHeatmap } = analytics;
  if (!dropOffFunnel.length) return <EmptyState message="No response data available yet." />;

  const maxReached = dropOffFunnel[0]?.reached || 1;
  const biggestDrop = [...dropOffFunnel].sort((a,b)=>b.dropPct-a.dropPct)[0];
  const timingData = timingHeatmap.filter(t=>t.responses>0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
      {/* Auto-insights */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {biggestDrop && biggestDrop.dropPct > 10 && (
          <AutoInsight type="alert">
            Largest drop-off at Q{dropOffFunnel.findIndex(s=>s.questionId===biggestDrop.questionId)+1}: &ldquo;{biggestDrop.questionText.slice(0,60)}&rdquo; — {biggestDrop.dropPct}% abandon here.
          </AutoInsight>
        )}
        {dropOffFunnel.filter(s=>s.dropPct===0).length > dropOffFunnel.length * 0.7 && (
          <AutoInsight type="positive">Flow is strong — most questions have under 5% drop-off. Survey pacing is well-calibrated.</AutoInsight>
        )}
      </div>

      {/* Funnel bars */}
      <div style={S.card}>
        <div style={S.secLabel}>Response Funnel</div>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {dropOffFunnel.map((step, i) => {
            const w = Math.max(14, Math.round((step.reached/maxReached)*100));
            const isWorst = biggestDrop && step.questionId === biggestDrop.questionId && step.dropPct > 10;
            return (
              <div key={step.questionId}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:3 }}>
                  <div style={{ width:28, fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)', flexShrink:0, textAlign:'right' }}>Q{i+1}</div>
                  <div style={{ flex:1, position:'relative', height:34, background:'var(--cream-deep)', borderRadius:8, overflow:'hidden' }}>
                    <motion.div
                      initial={{ width:0 }} animate={{ width:`${w}%` }}
                      transition={{ duration:0.7, delay:i*0.055, ease:[0.16,1,0.3,1] }}
                      style={{ height:'100%', background:isWorst?'rgba(214,59,31,0.18)':'rgba(22,15,8,0.1)', borderRadius:8, display:'flex', alignItems:'center', paddingLeft:12, border:isWorst?'1px solid rgba(214,59,31,0.25)':'none' }}>
                      <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:isWorst?'var(--terracotta)':'rgba(22,15,8,0.5)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'88%' }}>
                        {step.questionText.slice(0,60)}{step.questionText.length>60?'...':''}
                      </span>
                    </motion.div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', width:118, flexShrink:0 }}>
                    <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:15, color:'var(--espresso)' }}>{step.reached}</span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:'rgba(22,15,8,0.28)', textTransform:'uppercase', letterSpacing:'0.06em' }}>reached</span>
                  </div>
                </div>
                {i < dropOffFunnel.length-1 && step.dropped > 0 && (
                  <div style={{ display:'flex', alignItems:'center', paddingLeft:42, marginBottom:3 }}>
                    <div style={{ flex:1 }} />
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:step.dropPct>20?'var(--terracotta)':'rgba(22,15,8,0.28)', letterSpacing:'0.05em', width:118, flexShrink:0 }}>
                      down {step.dropped} dropped ({step.dropPct}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timing heatmap */}
      {timingData.length > 0 && (
        <div style={S.card}>
          <div style={S.secLabel}>Time per Question</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {timingHeatmap.map((t,i) => {
              const maxS = Math.max(...timingHeatmap.map(x=>x.avgSecs), 1);
              const pct = Math.round((t.avgSecs/maxS)*100);
              const hc = t.avgSecs<5?'#1E7A4A':t.avgSecs<15?'#FFB800':t.avgSecs<30?'#FF4500':'#D63B1F';
              return (
                <div key={t.questionId} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:26, fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:'rgba(22,15,8,0.3)', flexShrink:0, textAlign:'right' }}>Q{i+1}</div>
                  <div style={{ flex:1, height:26, background:'var(--cream-deep)', borderRadius:6, overflow:'hidden' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                      transition={{ duration:0.6, delay:i*0.04, ease:[0.16,1,0.3,1] }}
                      style={{ height:'100%', background:hc, opacity:0.65, borderRadius:6 }} />
                  </div>
                  <div style={{ width:80, flexShrink:0, display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, color:'var(--espresso)' }}>{t.avgSecs}s</span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:8, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:hc }}>{t.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:16, display:'flex', gap:14, flexWrap:'wrap' }}>
            {[{ l:'Fast (<5s)', c:'#1E7A4A' }, { l:'Normal (5-15s)', c:'#FFB800' }, { l:'Slow (15-30s)', c:'#FF4500' }, { l:'Very slow (>30s)', c:'#D63B1F' }].map(x => (
              <div key={x.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:x.c }} />
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)' }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary table */}
      <div style={{ ...S.card, padding:'24px 28px' }}>
        <div style={S.secLabel}>Drop-off Summary</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(22,15,8,0.07)' }}>
                {['#','Question','Reached','Answered','Dropped','Drop Rate'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 10px', fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dropOffFunnel.map((s,i) => (
                <tr key={s.questionId} style={{ borderBottom:'1px solid rgba(22,15,8,0.04)', transition:'background 0.14s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--cream)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'9px 10px', fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:'rgba(22,15,8,0.3)' }}>Q{i+1}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'var(--espresso)', maxWidth:260 }}>{s.questionText.slice(0,60)}{s.questionText.length>60?'...':''}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.5)' }}>{s.reached}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.5)' }}>{s.answered}</td>
                  <td style={{ padding:'9px 10px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:s.dropped>0?'var(--terracotta)':'rgba(22,15,8,0.3)' }}>{s.dropped}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 8px', borderRadius:999, background:s.dropPct>25?'rgba(214,59,31,0.1)':s.dropPct>10?'rgba(255,184,0,0.1)':'rgba(30,122,74,0.08)', color:s.dropPct>25?'var(--terracotta)':s.dropPct>10?'#9A6D00':'var(--sage)' }}>{s.dropPct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
function QuestionCard({ question:q, data:d, index:i }) {
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }} style={S.card}>
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={S.qNum}>Q{i+1}</span>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 8px', borderRadius:999, background:'rgba(22,15,8,0.05)', color:'rgba(22,15,8,0.4)' }}>
            {q.question_type.replace(/_/g,' ')}
          </span>
          {q.is_required && <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:'var(--coral)' }}>required</span>}
        </div>
        <div style={S.qText}>{q.question_text}</div>
        <div style={S.qResp}>{d?.total||0} response{d?.total!==1?'s':''}</div>
      </div>

      {!d ? (
        <div style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.25)', fontStyle:'italic' }}>No responses yet</div>

      ) : d.type === 'doughnut' ? (
        // Single choice / Dropdown / Yes-No
        <div style={{ display:'flex', gap:32, alignItems:'center' }}>
          <div style={{ width:140, height:140, flexShrink:0 }}>
            <Doughnut options={donutOpts} data={{ labels:d.labels, datasets:[{ data:d.values, backgroundColor:COLS.slice(0,d.values.length), borderWidth:0 }] }} />
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:9 }}>
            {d.labels.map((lbl,j) => {
              const pct = Math.round((d.values[j]/d.total)*100);
              return (
                <div key={j}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'var(--espresso)', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:COLS[j], flexShrink:0, display:'inline-block' }} />{lbl}
                    </span>
                    <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:11, color:'var(--espresso)' }}>{d.values[j]} <span style={{ color:'rgba(22,15,8,0.3)' }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:3, background:'var(--cream-deep)', borderRadius:999 }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}
                      style={{ height:'100%', background:COLS[j], borderRadius:999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : d.type === 'bar' ? (
        // Multiple choice / Rating / Scale / Slider
        <div>
          {d.avg !== undefined && (
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:16 }}>
              <span style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:38, letterSpacing:'-2px', color:'var(--espresso)' }}>{d.avg}</span>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(22,15,8,0.35)' }}>average</span>
            </div>
          )}
          {d.min !== undefined && (
            <div style={{ display:'flex', gap:20, marginBottom:16 }}>
              {[{ l:'Min', v:d.min }, { l:'Max', v:d.max }, { l:'Avg', v:d.avg }].map(s => (
                <div key={s.l}>
                  <div style={{ fontFamily:'Playfair Display,serif', fontWeight:900, fontSize:22, letterSpacing:'-1px', color:'var(--espresso)' }}>{s.v}</div>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ height:170 }}>
            <Bar options={barOpts} data={{ labels:d.labels, datasets:[{ data:d.values, backgroundColor:d.labels.map((_,j)=>COLS[j%COLS.length]), borderRadius:6, barThickness:26 }] }} />
          </div>
        </div>

      ) : d.type === 'ranking' ? (
        // Ranking — horizontal bar (lower avg rank = better)
        <div>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)', marginBottom:16 }}>Avg rank — lower = ranked first by respondents</div>
          <div style={{ height:Math.max(140, d.labels.length*38) }}>
            <Bar options={hBarOpts} data={{ labels:d.labels, datasets:[{ data:d.values, backgroundColor:d.labels.map((_,j)=>COLS[j%COLS.length]), borderRadius:6, barThickness:22 }] }} />
          </div>
        </div>

      ) : d.type === 'matrix' ? (
        // Matrix heatmap
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr>
                <th style={{ padding:'6px 10px', minWidth:120 }} />
                {d.cols.map(c => (
                  <th key={c.value} style={{ padding:'6px 8px', fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(22,15,8,0.45)', textAlign:'center', minWidth:64 }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.rows.map(row => {
                const rowMax = Math.max(...d.cols.map(c=>d.matrix[row.value]?.[c.value]||0), 1);
                return (
                  <tr key={row.value}>
                    <td style={{ padding:'6px 10px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'var(--espresso)', whiteSpace:'nowrap' }}>{row.label}</td>
                    {d.cols.map(col => {
                      const val = d.matrix[row.value]?.[col.value] || 0;
                      const intensity = rowMax > 0 ? val/rowMax : 0;
                      return (
                        <td key={col.value} style={{ padding:'6px 8px', textAlign:'center', background:`rgba(255,69,0,${(intensity*0.55).toFixed(2)})`, borderRadius:6 }}>
                          <span style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, color:intensity>0.45?'var(--cream)':'var(--espresso)' }}>{val}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      ) : (
        // Text responses (short_text / long_text preview)
        <div>
          <div style={{ display:'flex', flexDirection:'column', gap:7, maxHeight:220, overflowY:'auto' }}>
            {d.items.slice(0,18).map((r,j) => <div key={j} style={S.textResp}>{r}</div>)}
            {d.items.length > 18 && (
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(22,15,8,0.28)', paddingLeft:4 }}>
                +{d.items.length-18} more — view full analysis in Text Insights tab
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function QuestionsTab({ analytics }) {
  const { questionAnalytics } = analytics;
  if (!questionAnalytics.length) return <EmptyState message="No questions found in this survey." />;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {questionAnalytics.map(({ question, data }, i) => (
        <QuestionCard key={question.id} question={question} data={data} index={i} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: TEXT INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────
function TextInsightsTab({ analytics }) {
  const textQs = analytics.questionAnalytics.filter(({ question:q }) =>
    ['short_text','long_text'].includes(q.question_type)
  );
  if (!textQs.length) return <EmptyState message="No open-text questions in this survey." />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
      {textQs.map(({ question:q, data:d }, qi) => {
        if (!d?.items?.length) return (
          <div key={q.id} style={S.card}>
            <div style={S.qNum}>{q.question_type==='long_text'?'Long Text':'Short Text'}</div>
            <div style={S.qText}>{q.question_text}</div>
            <p style={{ ...S.body, color:'rgba(22,15,8,0.28)', marginTop:8 }}>No responses yet.</p>
          </div>
        );

        const kws  = extractKeywords(d.items);
        const maxKw = kws[0]?.count || 1;
        const sents = d.items.map(sentimentScore);
        const pos = sents.filter(s=>s==='positive').length;
        const neg = sents.filter(s=>s==='negative').length;
        const neu = sents.filter(s=>s==='neutral').length;

        return (
          <motion.div key={q.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:qi*0.06 }} style={S.card}>
            <div style={{ marginBottom:20 }}>
              <div style={{ ...S.qNum, marginBottom:4 }}>
                {q.question_type==='long_text'?'Long Text':'Short Text'} · {d.total} responses
              </div>
              <div style={S.qText}>{q.question_text}</div>
            </div>

            {/* Sentiment bar */}
            <div style={{ marginBottom:24 }}>
              <div style={S.secLabel}>Sentiment Distribution</div>
              <div style={{ display:'flex', height:28, borderRadius:8, overflow:'hidden', gap:2, marginBottom:10 }}>
                {[{ v:pos, c:'#1E7A4A', l:'Positive' }, { v:neu, c:'rgba(22,15,8,0.12)', l:'Neutral' }, { v:neg, c:'#D63B1F', l:'Negative' }]
                  .filter(s=>s.v>0).map(s => {
                    const pct = Math.round((s.v/d.total)*100);
                    return (
                      <motion.div key={s.l} title={`${s.l}: ${s.v} (${pct}%)`}
                        initial={{ scaleX:0, originX:0 }} animate={{ scaleX:1 }} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}
                        style={{ width:`${pct}%`, background:s.c, display:'flex', alignItems:'center', justifyContent:'center', minWidth:s.v>0?22:0 }}>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.85)', letterSpacing:'0.05em' }}>{pct>9?`${pct}%`:''}</span>
                      </motion.div>
                    );
                  })}
              </div>
              <div style={{ display:'flex', gap:16 }}>
                {[{ l:'Positive', v:pos, c:'var(--sage)' }, { l:'Neutral', v:neu, c:'rgba(22,15,8,0.4)' }, { l:'Negative', v:neg, c:'var(--terracotta)' }].map(s => (
                  <div key={s.l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:s.c }} />
                    <span style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:12, color:'rgba(22,15,8,0.5)' }}>
                      {s.l} <strong style={{ color:'var(--espresso)', fontWeight:600 }}>{s.v}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-insights */}
            {neg > pos && neg > d.total*0.3 && (
              <div style={{ marginBottom:20 }}>
                <AutoInsight type="warning">{Math.round((neg/d.total)*100)}% of responses carry negative sentiment. Review keywords below for common complaints.</AutoInsight>
              </div>
            )}
            {pos > d.total*0.6 && (
              <div style={{ marginBottom:20 }}>
                <AutoInsight type="positive">{Math.round((pos/d.total)*100)}% of responses are positive — respondents are satisfied here.</AutoInsight>
              </div>
            )}

            {/* Keywords */}
            {kws.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <div style={S.secLabel}>Top Keywords</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {kws.map(({ word, count }) => {
                    const pct = Math.round((count/maxKw)*100);
                    const isP = POS_WORDS.has(word);
                    const isN = NEG_WORDS.has(word);
                    const kc = isP?'#1E7A4A':isN?'#D63B1F':'var(--coral)';
                    return (
                      <div key={word} style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:90, fontFamily:'Fraunces,serif', fontWeight:400, fontSize:13, color:'var(--espresso)', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
                          {isP && <span style={{ color:'#1E7A4A', fontSize:10 }}>+</span>}
                          {isN && <span style={{ color:'#D63B1F', fontSize:10 }}>–</span>}
                          {word}
                        </div>
                        <div style={{ flex:1, height:6, background:'var(--cream-deep)', borderRadius:999 }}>
                          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}
                            style={{ height:'100%', background:kc, borderRadius:999, opacity:0.55 + pct*0.004 }} />
                        </div>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:10, fontWeight:700, color:'rgba(22,15,8,0.4)', width:24, textAlign:'right', flexShrink:0 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All responses with sentiment color */}
            <div>
              <div style={S.secLabel}>All Responses</div>
              <div style={{ display:'flex', flexDirection:'column', gap:7, maxHeight:320, overflowY:'auto' }}>
                {d.items.map((r,j) => {
                  const s = sentimentScore(r);
                  const bc = s==='positive'?'#1E7A4A':s==='negative'?'#D63B1F':'rgba(22,15,8,0.12)';
                  return (
                    <div key={j} style={{ ...S.textResp, borderLeftColor:bc }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <span style={{ flex:1 }}>{r}</span>
                        <span style={{ fontFamily:'Syne,sans-serif', fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:bc, flexShrink:0, marginTop:2, opacity:0.75 }}>{s}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSES TABLE (always shown below tabs)
// ─────────────────────────────────────────────────────────────────────────────
function ResponsesTable({ rs, qs, ans }) {
  return (
    <div style={{ ...S.card, padding:'28px 28px 24px' }}>
      <div style={S.secLabel}>All Responses</div>
      {!rs.length ? (
        <EmptyState message="No responses yet — share your survey to get started." />
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(22,15,8,0.08)' }}>
                {['#','Status','Email','Started','Completed'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(22,15,8,0.3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rs.slice(0,50).map((r,i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid rgba(22,15,8,0.04)', transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--cream)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'11px 12px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.35)' }}>{i+1}</td>
                  <td style={{ padding:'11px 12px' }}>
                    <span style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', padding:'3px 10px', borderRadius:999,
                      background:r.status==='completed'?'rgba(30,122,74,0.1)':r.status==='in_progress'?'rgba(0,71,255,0.08)':'rgba(22,15,8,0.06)',
                      color:r.status==='completed'?'var(--sage)':r.status==='in_progress'?'var(--cobalt)':'rgba(22,15,8,0.4)' }}>{r.status}</span>
                  </td>
                  <td style={{ padding:'11px 12px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.5)' }}>{r.respondent_email||'—'}</td>
                  <td style={{ padding:'11px 12px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.5)' }}>{formatDateTime(r.started_at)}</td>
                  <td style={{ padding:'11px 12px', fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.5)' }}>{r.completed_at?formatDateTime(r.completed_at):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rs.length>50 && <div style={{ fontFamily:'Syne,sans-serif', fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(22,15,8,0.28)', padding:'14px 12px 0', textAlign:'center' }}>Showing 50 of {rs.length} — export CSV for all</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SurveyAnalytics() {
  const { id }          = useParams();
  const { profile }     = useAuthStore();
  const { stopLoading } = useLoading();
  const [sv,  setSv]    = useState(null);
  const [qs,  sQs]      = useState([]);
  const [rs,  sRs]      = useState([]);
  const [ans, sAns]     = useState([]);
  const [tab, setTab]   = useState('Overview');

  useEffect(() => { if (profile?.id) load(); else stopLoading(); }, [id, profile?.id]);

  async function load() {
    try {
      const { data:s } = await supabase.from('surveys').select('*').eq('id', id).single();
      setSv(s);
      const { data:q } = await supabase.from('survey_questions').select('*').eq('survey_id', id).order('sort_order');
      sQs(q || []);
      const { data:r } = await supabase.from('survey_responses').select('*').eq('survey_id', id).order('started_at');
      sRs(r || []);
      sAns([]);
      if (r?.length) {
        const { data:a } = await supabase.from('survey_answers').select('*').in('response_id', r.map(x=>x.id));
        sAns(a || []);
      }
    } catch(e) { console.error(e); }
    finally { stopLoading(); }
  }

  const analytics = useAnalytics(qs, rs, ans);

  function csv() {
    const h = ['#','Status','Email','Started','Completed',...qs.map(q=>q.question_text)];
    const rows = rs.map((r,i) => {
      const ra = ans.filter(a=>a.response_id===r.id);
      return [i+1, r.status, r.respondent_email||'', r.started_at, r.completed_at||'',
        ...qs.map(q=>{ const a=ra.find(x=>x.question_id===q.id); return a?.answer_value||(a?.answer_json?JSON.stringify(a.answer_json):''); })];
    });
    const c = [h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([c],{type:'text/csv'}));
    a.download = `${sv?.title||'survey'}.csv`;
    a.click();
  }

  if (!sv) return (
    <div style={{ textAlign:'center', padding:'80px 0', fontFamily:'Fraunces,serif', color:'rgba(22,15,8,0.3)' }}>Survey not found</div>
  );

  return (
    <div style={{ maxWidth:940, margin:'0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:40, gap:20 }}>
        <div>
          <Link to={`/surveys/${id}/edit`} style={S.backLink}
            onMouseEnter={e=>e.currentTarget.style.color='var(--coral)'}
            onMouseLeave={e=>e.currentTarget.style.color='rgba(22,15,8,0.35)'}>
            ← Back to survey
          </Link>
          <div style={S.tag}>Analytics</div>
          <h1 style={S.h1}>{sv.title}</h1>
          <div style={{ fontFamily:'Fraunces,serif', fontWeight:300, fontSize:13, color:'rgba(22,15,8,0.35)', marginTop:8 }}>
            {sv.status.charAt(0).toUpperCase()+sv.status.slice(1)} · Created {formatDateTime(sv.created_at)}
            {sv.expires_at && ` · Expires ${formatDateTime(sv.expires_at)}`}
          </div>
        </div>
        <button onClick={csv} style={S.exportBtn}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--espresso)'; e.currentTarget.style.color='var(--espresso)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(22,15,8,0.12)'; e.currentTarget.style.color='rgba(22,15,8,0.55)'; }}>
          ↓ Export CSV
        </button>
      </div>

      {/* ── Tabs ── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
          transition={{ duration:0.2, ease:[0.16,1,0.3,1] }}>

          {tab === 'Overview'     && <OverviewTab     analytics={analytics} />}
          {tab === 'Dropoff'      && <DropoffTab      analytics={analytics} />}
          {tab === 'Questions'    && <QuestionsTab    analytics={analytics} />}
          {tab === 'TextInsights' && <TextInsightsTab analytics={analytics} />}
          {tab === 'AI'           && (
            <AIInsightsPanel
              survey={sv}
              analytics={analytics}
              questionAnalytics={analytics.questionAnalytics}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Responses table (always below tabs, except AI) ── */}
      {tab !== 'AI' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }} style={{ marginTop:40 }}>
          <ResponsesTable rs={rs} qs={qs} ans={ans} />
        </motion.div>
      )}
    </div>
  );
}
