import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * SliderInput
 * Smooth slider question type for SurveyRespond.
 *
 * Reads from q.validation_rules: { min, max, step, min_label, max_label }
 * Defaults: min=0, max=100, step=1
 *
 * Props:
 *   q   — question object
 *   val — current value (string or number)
 *   set — setter fn(newVal)
 *   tc  — theme color string
 */
export default function SliderInput({ q, val, set, tc }) {
  const rules    = q.validation_rules || {};
  const min      = Number(rules.min ?? 0);
  const max      = Number(rules.max ?? 100);
  const step     = Number(rules.step ?? 1);
  const minLabel = rules.min_label || String(min);
  const maxLabel = rules.max_label || String(max);

  // Unset until user touches — show placeholder state
  const [touched, setTouched] = useState(val !== '' && val != null);
  const current = touched ? Number(val) : Math.round((min + max) / 2);

  const pct = ((current - min) / (max - min)) * 100;

  function handleChange(e) {
    setTouched(true);
    set(Number(e.target.value));
  }

  return (
    <div style={{ maxWidth: 540 }}>

      {/* Value bubble */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <motion.div
          key={current}
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: touched ? tc : 'var(--cream-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
          }}>
          <span style={{
            fontFamily: 'Playfair Display, serif', fontWeight: 900,
            fontSize: 28, letterSpacing: '-1.5px',
            color: touched ? '#fff' : 'rgba(22,15,8,0.25)',
          }}>
            {touched ? current : '?'}
          </span>
        </motion.div>
      </div>

      {/* Slider track + thumb */}
      <div style={{ position: 'relative', paddingBottom: 4 }}>
        {/* Filled track behind native input */}
        <div style={{
          position: 'absolute', top: '50%', left: 0,
          width: '100%', height: 6, borderRadius: 999,
          background: 'rgba(22,15,8,0.08)',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: `${touched ? pct : 50}%`,
            height: '100%', borderRadius: 999,
            background: touched ? tc : 'rgba(22,15,8,0.15)',
            transition: 'background 0.3s',
          }} />
        </div>

        <input
          type="range"
          min={min} max={max} step={step}
          value={current}
          onChange={handleChange}
          style={{
            width: '100%', position: 'relative', zIndex: 1,
            '--tc': tc,
            appearance: 'none', WebkitAppearance: 'none',
            background: 'transparent', outline: 'none', cursor: 'pointer',
            height: 24, margin: 0,
          }}
        />
      </div>

      {/* Min / Max labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 10,
        fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(22,15,8,0.35)',
      }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>

      {/* Tick marks for visual reference */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
        {Array.from({ length: 5 }, (_, i) => {
          const v = Math.round(min + (i / 4) * (max - min));
          const active = touched && current >= v;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 1, height: 6, borderRadius: 1,
                background: active ? tc : 'rgba(22,15,8,0.15)',
                transition: 'background 0.2s',
              }} />
              <span style={{
                fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 300,
                color: active ? 'rgba(22,15,8,0.55)' : 'rgba(22,15,8,0.2)',
                transition: 'color 0.2s',
              }}>{v}</span>
            </div>
          );
        })}
      </div>

      {!touched && (
        <p style={{
          textAlign: 'center', marginTop: 20,
          fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13,
          color: 'rgba(22,15,8,0.3)', fontStyle: 'italic',
        }}>
          Slide to select a value
        </p>
      )}

      {/* Scoped slider thumb styles */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: var(--thumb-color, #FF4500);
          border: 3px solid #fff;
          box-shadow: 0 2px 12px rgba(22,15,8,0.18);
          cursor: pointer;
          transition: transform 0.15s;
        }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }
        input[type=range]::-moz-range-thumb {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: var(--thumb-color, #FF4500);
          border: 3px solid #fff;
          box-shadow: 0 2px 12px rgba(22,15,8,0.18);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
