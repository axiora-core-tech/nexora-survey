import { motion } from 'framer-motion';

/**
 * MatrixInput
 * Row × Column grid question type for SurveyRespond.
 *
 * Reads from q.options:
 *   { rows: [{label, value}], columns: [{label, value}] }
 *   OR legacy flat array fallback treated as columns with auto-rows.
 *
 * val  — object: { [rowValue]: columnValue }
 * set  — setter fn(newVal)
 * tc   — theme color string
 */
export default function MatrixInput({ q, val = {}, set, tc }) {
  const opts = q.options || {};

  // Support both structured { rows, columns } and legacy flat array
  const rows = Array.isArray(opts)
    ? (q.matrix_rows || [{ label: 'Item 1', value: 'row_1' }, { label: 'Item 2', value: 'row_2' }])
    : (opts.rows || []);
  const cols = Array.isArray(opts)
    ? opts
    : (opts.columns || []);

  function toggle(rowVal, colVal) {
    set({ ...val, [rowVal]: colVal });
  }

  const answered = Object.keys(val).length;
  const pct      = rows.length ? Math.round((answered / rows.length) * 100) : 0;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>

      {/* Progress indicator */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            flex: 1, height: 3, borderRadius: 999,
            background: 'rgba(22,15,8,0.07)',
          }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: tc, borderRadius: 999 }}
            />
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(22,15,8,0.35)', flexShrink: 0,
          }}>
            {answered}/{rows.length}
          </span>
        </div>
      )}

      <table style={{
        width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px',
        minWidth: cols.length > 3 ? 480 : 'auto',
      }}>
        {/* Column headers */}
        <thead>
          <tr>
            {/* Empty corner cell */}
            <th style={{ width: '35%', paddingBottom: 8 }} />
            {cols.map(col => (
              <th key={col.value} style={{
                fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(22,15,8,0.4)', textAlign: 'center',
                paddingBottom: 8, padding: '0 6px 12px',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Rows */}
        <tbody>
          {rows.map((row, ri) => {
            const selected = val[row.value];
            return (
              <motion.tr
                key={row.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ri * 0.04, duration: 0.3 }}>

                {/* Row label */}
                <td style={{
                  fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 15,
                  color: 'var(--espresso)', paddingRight: 16, paddingTop: 4, paddingBottom: 4,
                  verticalAlign: 'middle',
                }}>
                  {row.label}
                </td>

                {/* Column cells */}
                {cols.map(col => {
                  const active = selected === col.value;
                  return (
                    <td key={col.value} style={{ textAlign: 'center', padding: '4px 6px', verticalAlign: 'middle' }}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggle(row.value, col.value)}
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          border: `2px solid ${active ? tc : 'rgba(22,15,8,0.15)'}`,
                          background: active ? tc : 'transparent',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                          margin: '0 auto',
                        }}>
                        {active && (
                          <motion.svg
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                            width="12" height="12" viewBox="0 0 24 24"
                            fill="none" stroke="white" strokeWidth="3"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </motion.svg>
                        )}
                      </motion.button>
                    </td>
                  );
                })}
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {/* Completion nudge */}
      {answered > 0 && answered < rows.length && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            marginTop: 14, fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 12,
            color: 'rgba(22,15,8,0.35)', fontStyle: 'italic',
          }}>
          {rows.length - answered} row{rows.length - answered !== 1 ? 's' : ''} remaining
        </motion.p>
      )}
    </div>
  );
}
