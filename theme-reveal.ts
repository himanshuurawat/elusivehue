import {flushSync} from 'react-dom';

/* Ink reveal for the light/dark switch. The new theme grows out of the tapped button
   through an irregular ink-shaped mask. Uses the View Transitions API (one GPU-composited
   mask animation, no per-frame JS). Without it, or with reduced motion, the theme switches at once. */
export function revealTheme(origin: HTMLElement | null, apply: () => void) {
    const doc = document as Document & {startViewTransition?: (cb: () => void) => {ready: Promise<void>; finished: Promise<void>}};
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) { apply(); return; }
    const rect = origin?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const far = Math.max(Math.hypot(x, y), Math.hypot(window.innerWidth - x, y), Math.hypot(x, window.innerHeight - y), Math.hypot(window.innerWidth - x, window.innerHeight - y));
    const size = Math.ceil((far * 2) / 0.66);
    const url = `url(${import.meta.env.BASE_URL}ink-mask.svg)`;
    const root = document.documentElement;
    root.classList.add('theme-reveal');
    const vt = doc.startViewTransition(() => { flushSync(apply); });
    vt.ready.then(() => {
        root.animate(
            {maskSize: ['0px 0px', `${size}px ${size}px`], webkitMaskSize: ['0px 0px', `${size}px ${size}px`], maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`], webkitMaskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`]} as unknown as PropertyIndexedKeyframes,
            {duration: 2200, easing: 'cubic-bezier(.4,.0,.35,1)', pseudoElement: '::view-transition-new(root)'}
        );
    }).catch(() => undefined);
    // mask position/image are static, set through CSS vars on the root
    root.style.setProperty('--ink-x', `${x}px`);
    root.style.setProperty('--ink-y', `${y}px`);
    root.style.setProperty('--ink-url', url);
    vt.finished.finally(() => { root.classList.remove('theme-reveal'); root.style.removeProperty('--ink-x'); root.style.removeProperty('--ink-y'); root.style.removeProperty('--ink-url'); });
}
