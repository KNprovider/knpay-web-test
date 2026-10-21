"use client";

import { useEffect, useRef, useState } from "react";

/**
 * KNprovider splash screen (3.5 s total)
 *   0.0 – 2.0 s  holographic wireframe globe rotates in the centre
 *   1.2 – 2.8 s  "KNprovider" + tagline fade in directly below the globe
 *   2.8 – 3.5 s  whole screen fades out, revealing the login portal
 *
 * Shown once per browser session. Add ?splash to any URL to force it.
 * Skipped when the user prefers reduced motion.
 */

const TOTAL_MS = 3500;

// Same turquoise as the rest of the site (login, buttons, background globe)
const PRIMARY = "8, 221, 240"; // #08ddf0
const HIGHLIGHT = "15, 239, 240"; // #0fefef
const SHADOW = "6, 126, 146"; // #067e92

const DEG = Math.PI / 180;
const TILT = 0.4;
const SPEED = 1.0; // rad/s — steady rotation

type Vec = [number, number, number];

function toVec(latDeg: number, lonDeg: number): Vec {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}

function arcPoint(a: Vec, b: Vec, t: number, lift: number): Vec {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  const s = Math.sin(om) || 1;
  const k1 = Math.sin((1 - t) * om) / s;
  const k2 = Math.sin(t * om) / s;
  const h = 1 + lift * Math.sin(Math.PI * t);
  return [(a[0] * k1 + b[0] * k2) * h, (a[1] * k1 + b[1] * k2) * h, (a[2] * k1 + b[2] * k2) * h];
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Decide whether to play
    let skip = false;
    try {
      const forced = new URLSearchParams(window.location.search).has("splash");
      if (!forced && sessionStorage.getItem("knpay-splash")) skip = true;
    } catch {
      /* storage unavailable — just play */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) skip = true;

    if (skip) {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem("knpay-splash", "1");
    } catch {
      /* ignore */
    }

    const timer = window.setTimeout(() => setVisible(false), TOTAL_MS);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return () => window.clearTimeout(timer);

    const S = 260; // css px
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    canvas.style.width = `${S}px`;
    canvas.style.height = `${S}px`;

    // Wireframe: latitude rings + meridians
    const lines: Vec[][] = [];
    for (let lat = -70; lat <= 70; lat += 20) {
      const l: Vec[] = [];
      for (let lon = -180; lon <= 180; lon += 6) l.push(toVec(lat, lon));
      lines.push(l);
    }
    for (let lon = -180; lon < 180; lon += 20) {
      const l: Vec[] = [];
      for (let lat = -90; lat <= 90; lat += 6) l.push(toVec(lat, lon));
      lines.push(l);
    }

    // Network nodes on the grid intersections
    const nodes: Vec[] = [];
    for (let lat = -50; lat <= 50; lat += 20)
      for (let lon = -180; lon < 180; lon += 40) nodes.push(toVec(lat, lon + (lat % 40 === 10 ? 20 : 0)));
    nodes.push(toVec(90, 0), toVec(-90, 0));

    // A few data links between nodes
    const links: [number, number][] = [];
    for (let i = 0; i < 9; i++) links.push([(i * 7 + 3) % nodes.length, (i * 13 + 20) % nodes.length]);

    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    const R = S * 0.4;
    const cx = S / 2;
    const cy = S / 2;

    function project(v: Vec, cosA: number, sinA: number) {
      const x1 = v[0] * cosA + v[2] * sinA;
      const z1 = -v[0] * sinA + v[2] * cosA;
      const y2 = v[1] * cosT - z1 * sinT;
      const z2 = v[1] * sinT + z1 * cosT;
      return { x: cx + x1 * R, y: cy - y2 * R, z: z2 };
    }

    const start = performance.now();
    let raf = 0;

    function frame(now: number) {
      // rAF timestamps can precede `start` on the very first frame — never let t go negative
      const t = Math.max(0, (now - start) / 1000);
      const angle = 0.6 + t * SPEED;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, S, S);

      // Hologram glow
      const g = ctx!.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.45);
      g.addColorStop(0, `rgba(${PRIMARY}, 0.10)`);
      g.addColorStop(0.7, `rgba(${SHADOW}, 0.06)`);
      g.addColorStop(1, `rgba(${SHADOW}, 0)`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
      ctx!.fill();

      // Wireframe — segments batched into depth buckets so each bucket is stroked once (glow stays cheap)
      const BUCKETS = 5;
      const front: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      const back = new Path2D();
      for (const line of lines) {
        let prev = project(line[0], cosA, sinA);
        for (let i = 1; i < line.length; i++) {
          const p = project(line[i], cosA, sinA);
          const z = (p.z + prev.z) / 2;
          const target = z > 0 ? front[Math.min(BUCKETS - 1, Math.floor(z * BUCKETS))] : back;
          target.moveTo(prev.x, prev.y);
          target.lineTo(p.x, p.y);
          prev = p;
        }
      }
      ctx!.lineWidth = 0.6;
      ctx!.strokeStyle = `rgba(${SHADOW}, 0.35)`;
      ctx!.stroke(back);

      ctx!.lineWidth = 0.9;
      ctx!.shadowColor = `rgba(${HIGHLIGHT}, 0.9)`;
      ctx!.shadowBlur = 6;
      front.forEach((path, i) => {
        const a = 0.25 + (0.75 * (i + 1)) / BUCKETS;
        ctx!.strokeStyle = `rgba(${i >= BUCKETS - 2 ? HIGHLIGHT : PRIMARY}, ${a})`;
        ctx!.stroke(path);
      });
      ctx!.shadowBlur = 0;

      // Holographic scan ring sweeping up and down
      const scanLat = Math.sin(t * 2.2) * 70;
      ctx!.lineWidth = 1.4;
      ctx!.shadowColor = `rgba(${HIGHLIGHT}, 1)`;
      ctx!.shadowBlur = 10;
      ctx!.strokeStyle = `rgba(${HIGHLIGHT}, 0.55)`;
      ctx!.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = project(toVec(scanLat, lon), cosA, sinA);
        if (p.z > 0) {
          if (!started) ctx!.moveTo(p.x, p.y);
          else ctx!.lineTo(p.x, p.y);
          started = true;
        } else started = false;
      }
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // Rim
      ctx!.lineWidth = 1.4;
      ctx!.strokeStyle = `rgba(${PRIMARY}, 0.75)`;
      ctx!.shadowColor = `rgba(${HIGHLIGHT}, 0.9)`;
      ctx!.shadowBlur = 14;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // Data links with travelling pulses
      links.forEach(([ia, ib], i) => {
        const a = nodes[ia];
        const b = nodes[ib];
        const steps = 28;
        const pts = [];
        for (let s = 0; s <= steps; s++) pts.push(project(arcPoint(a, b, s / steps, 0.16), cosA, sinA));
        ctx!.lineWidth = 0.9;
        ctx!.strokeStyle = `rgba(${HIGHLIGHT}, 0.4)`;
        ctx!.beginPath();
        let open = false;
        for (const p of pts) {
          if (p.z > 0) {
            if (!open) ctx!.moveTo(p.x, p.y);
            else ctx!.lineTo(p.x, p.y);
            open = true;
          } else open = false;
        }
        ctx!.stroke();
        const pp = pts[Math.floor(((t * 0.6 + i * 0.29) % 1) * steps)];
        if (pp.z > 0) {
          ctx!.shadowColor = `rgba(${HIGHLIGHT}, 1)`;
          ctx!.shadowBlur = 10;
          ctx!.fillStyle = `rgba(${HIGHLIGHT}, 1)`;
          ctx!.beginPath();
          ctx!.arc(pp.x, pp.y, 1.8, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      });

      // Network nodes
      ctx!.shadowColor = `rgba(${HIGHLIGHT}, 1)`;
      ctx!.shadowBlur = 8;
      nodes.forEach((v, i) => {
        const p = project(v, cosA, sinA);
        if (p.z <= 0) {
          ctx!.fillStyle = `rgba(${SHADOW}, 0.4)`;
          ctx!.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
          return;
        }
        const pulse = 0.65 + 0.35 * Math.sin(t * 3 + i);
        ctx!.fillStyle = `rgba(${HIGHLIGHT}, ${0.5 + 0.5 * p.z * pulse})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.3 + p.z * 1.2, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="splash-root fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      role="status"
      aria-label="Loading KNprovider"
    >
      <canvas ref={canvasRef} className="splash-globe" aria-hidden="true" />

      <div className="splash-text mt-2 text-center">
        <h1 className="text-4xl font-extrabold tracking-wide text-white [text-shadow:0_0_18px_rgba(15,239,240,0.55)]">
          KNprovider
        </h1>
        <div className="line-turq-metal mx-auto mt-3 h-[2px] w-24 rounded-full" />
        <p className="text-turq-metal mt-3 text-sm font-medium tracking-[0.22em]">Known. Needed. Proven.</p>
      </div>
    </div>
  );
}
