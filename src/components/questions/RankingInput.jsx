import { useState, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

/**
 * RankingInput
 * Drag-to-rank question type for SurveyRespond.
 *
 * Props:
 *   q   — question object { options: [{label, value}] }
 *   val — current value: array of option values in ranked order
 *   set — setter fn(newVal)
 *   tc  — theme color string e.g. '#FF4500'
 */
export default function RankingInput({ q, val, set, tc }) {
  // Initialise ranked list from val or default to original option order
  const init = () => {
    if (Array.isArray(val) && val.length === (q.options || []).length) return val;
    return (q.options || []).map(o => o.value);
  };

  const [items, setItems] = useState(init);
  const dragItem   = useRef(null);
  const dragOver   = useRef(null);

  // Keep parent in sync
  function reorder(newOrder) {
    setItems(newOrder);
    set(newOrder);
  }

  const getLabel = v => (q.options || []).find(o => o.value === v)?.label || v;

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Instruction chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 999,
        background: `${tc}12`, marginBottom: 20,
      }}>
        <span style={{ fontSize: 13 }}>↕</span>
        <span style={{
          fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: tc,
        }}>
          Drag to rank · 1 = highest
        </span>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={reorder}
        style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((v, i) => (
          <Reorder.Item key={v} value={v}
            style={{ cursor: 'grab' }}
            whileDrag={{
              scale: 1.03,
              boxShadow: `0 16px 48px rgba(22,15,8,0.14)`,
              zIndex: 50,
            }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              background: 'var(--warm-white)',
              border: `1.5px solid rgba(22,15,8,0.09)`,
              borderRadius: 16,
              transition: 'border-color 0.2s',
              userSelect: 'none',
            }}>

              {/* Rank badge */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: i === 0 ? tc : 'var(--cream-deep)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.3s',
              }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11,
                  color: i === 0 ? '#fff' : 'rgba(22,15,8,0.4)',
                  transition: 'color 0.3s',
                }}>
                  {i + 1}
                </span>
              </div>

              {/* Label */}
              <span style={{
                fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 17,
                color: 'var(--espresso)', flex: 1, lineHeight: 1.4,
              }}>
                {getLabel(v)}
              </span>

              {/* Drag handle */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                flexShrink: 0, opacity: 0.25, paddingRight: 2,
              }}>
                {[0, 1, 2].map(n => (
                  <div key={n} style={{
                    width: 18, height: 2, borderRadius: 2,
                    background: 'var(--espresso)',
                  }} />
                ))}
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Ranked summary pill */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            marginTop: 18, padding: '10px 16px',
            background: 'var(--cream-deep)', borderRadius: 12,
            fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(22,15,8,0.35)',
          }}>
          Top pick: <span style={{ color: tc }}>{getLabel(items[0])}</span>
        </motion.div>
      )}
    </div>
  );
}
