import { useEffect } from 'react';

/**
 * CustomCursor
 * ─────────────────────────────────────────────────────────────
 * Renders the branded coral dot + trailing ring cursor that was
 * previously only on the Landing page.  Mount once in App.jsx
 * (outside Routes) so it persists on every page including
 * SurveyRespond, EmbedView, Login, Register, etc.
 *
 * The DOM elements (#np-cur-dot, #np-cur-ring) are styled in
 * index.css so they are always present and never FOUC'd.
 */
export default function CustomCursor() {
  useEffect(() => {
    const dot  = document.getElementById('np-cur-dot');
    const ring = document.getElementById('np-cur-ring');
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    let raf;

    const onMove = e => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    };

    const loopRing = () => {
      rx += (mx - rx) * 0.07;
      ry += (my - ry) * 0.07;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      raf = requestAnimationFrame(loopRing);
    };

    const onEnter = () => document.documentElement.classList.add('np-hovering');
    const onLeave = () => document.documentElement.classList.remove('np-hovering');
    const onDown  = () => document.documentElement.classList.add('np-clicking');
    const onUp    = () => document.documentElement.classList.remove('np-clicking');
    const onOut   = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onIn    = () => { dot.style.opacity = ''; ring.style.opacity = ''; };

    // Attach hover listeners dynamically so newly mounted elements are included
    function addHoverListeners() {
      document.querySelectorAll('a, button, [role="button"], input, textarea, select, label, [tabindex]').forEach(el => {
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
      });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onOut);
    document.addEventListener('mouseenter', onIn);
    loopRing();

    // Run once now, then re-run after a short delay to catch dynamic content
    addHoverListeners();
    const t = setTimeout(addHoverListeners, 800);

    // MutationObserver keeps hover listeners fresh as components mount
    const obs = new MutationObserver(() => addHoverListeners());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      obs.disconnect();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onOut);
      document.removeEventListener('mouseenter', onIn);
    };
  }, []);

  return null; // DOM elements are injected via index.html / App.jsx
}
