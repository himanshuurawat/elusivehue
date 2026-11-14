import {useEffect, useRef, useState} from 'react';

/*
 * DottedOrb: a small canvas particle orb, inspired by the user's
 * reference clip of dotted state orbs. Used ONLY for genuine waits
 * (an image that has not finished loading yet) - never as decoration
 * or fake progress. Original hand-rolled implementation, no third-party
 * code.
 */
export function DottedOrb({size, label}: {size: number; label: string}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // Fibonacci sphere point cloud.
    const N = 110;
    const pts: Array<[number, number, number]> = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = reduced ? 0 : (now - start) / 1000;
      const rot = t * 0.55;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const R = canvas.width * 0.38;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (const [x0, y0, z0] of pts) {
        const x = x0 * cosR - z0 * sinR;
        const z = x0 * sinR + z0 * cosR;
        const wob = 1 + 0.06 * Math.sin(t * 1.8 + y0 * 3);
        const depth = Math.max(0.25, (z + 1.6) / 2.6);
        ctx.beginPath();
        ctx.arc(cx + x * R * wob, cy + y0 * R * wob, Math.max(0.6, canvas.width * 0.012 * depth), 0, 7);
        ctx.fillStyle = `rgba(208, 213, 171, ${0.22 + 0.6 * depth})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <span className="pub-orb" role="status" aria-label={label}>
      <canvas ref={ref} style={{width: size, height: size}} aria-hidden="true" />
      <span className="pub-orb-label">{label}</span>
    </span>
  );
}

/*
 * WaitOrb: the DottedOrb for a wait that has actually started. It stays
 * invisible for the first `delay` ms, so a fast response never flashes a
 * loader and no artificial delay is added. `inline` is the small version
 * used inside buttons.
 */
export function WaitOrb({label, size = 40, delay = 280, inline = false}: {label: string; size?: number; delay?: number; inline?: boolean}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(id);
  }, [delay]);
  if (!show) return inline ? null : <span className="sr-only" role="status">{label}</span>;
  return <span className={`wait-orb${inline ? ' wait-orb-inline' : ''}`}><DottedOrb size={size} label={label} /></span>;
}
