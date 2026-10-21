"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MASK_B64, MASK_H, MASK_W } from "./globeMask";

// Turquoise palette (same as the buttons)
const BRIGHT = "15, 239, 240"; // #0fefef
const MAIN = "8, 221, 240"; // #08ddf0
const DEEP = "6, 126, 146"; // #067e92

const TILT = 0.38; // axial tilt in radians
const SPEED = 0.16; // radians per second (~40 s per full turn)
const DEG = Math.PI / 180;

type Vec = [number, number, number];

function decodeMask(): Uint8Array {
  const bin = atob(MASK_B64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function isLand(mask: Uint8Array, latDeg: number, lonDeg: number): boolean {
  const row = Math.min(MASK_H - 1, Math.max(0, Math.round((89 - latDeg) / 2)));
  const col = Math.min(MASK_W - 1, Math.max(0, Math.round((lonDeg + 179) / 2)));
  const i = row * MASK_W + col;
  return (mask[i >> 3] & (1 << (i & 7))) !== 0;
}

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

const NODES: [number, number][] = [
  [55.7, 12.6], // Copenhagen
  [40.7, -74], // New York
  [51.5, -0.1], // London
  [25.2, 55.3], // Dubai
  [1.35, 103.8], // Singapore
  [35.7, 139.7], // Tokyo
  [-33.9, 151.2], // Sydney
  [-23.5, -46.6], // São Paulo
  [37.8, -122.4], // San Francisco
  [-1.3, 36.8], // Nairobi
];
const LINKS: [number, number][] = [
  [0, 1], [0, 3], [0, 5], [1, 8], [2, 7], [3, 4], [4, 6], [5, 8], [0, 9], [2, 1],
];

export default function GlobeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  const isAuthScreen = pathname === "/" || pathname.startsWith("/login");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mask = decodeMask();
    const dots: Vec[] = [];
    const N = 16000;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;
      const lat = Math.asin(y) / DEG;
      const lon = Math.atan2(x, z) / DEG;
      if (isLand(mask, lat, lon)) dots.push([x, y, z]);
    }

    const lines: Vec[][] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const l: Vec[] = [];
      for (let lon = -180; lon <= 180; lon += 6) l.push(toVec(lat, lon));
      lines.push(l);
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const l: Vec[] = [];
      for (let lat = -90; lat <= 90; lat += 6) l.push(toVec(lat, lon));
      lines.push(l);
    }

    const nodeVecs = NODES.map(([la, lo]) => toVec(la, lo));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    function project(v: Vec, cosA: number, sinA: number, R: number, cx: number, cy: number) {
      const x1 = v[0] * cosA + v[2] * sinA;
      const z1 = -v[0] * sinA + v[2] * cosA;
      const y1 = v[1];
      const y2 = y1 * cosT - z1 * sinT;
      const z2 = y1 * sinT + z1 * cosT;
      return { x: cx + x1 * R, y: cy - y2 * R, z: z2 };
    }

    let raf = 0;
    let last = performance.now();
    let angle = 1.1;
    let running = true;

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduceMotion) angle += dt * SPEED;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const portrait = h > w * 1.1;
      const R = portrait ? w * 0.62 : Math.min(w, h) * 0.5;
      const cx = w / 2;
      const cy = portrait ? h * 0.36 : h / 2;
      const t = now / 1000;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const glow = ctx!.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.35);
      glow.addColorStop(0, `rgba(${MAIN}, 0.16)`);
      glow.addColorStop(0.45, `rgba(${DEEP}, 0.07)`);
      glow.addColorStop(1, `rgba(${DEEP}, 0)`);
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx!.fill();

      const body = ctx!.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      body.addColorStop(0, `rgba(${DEEP}, 0.20)`);
      body.addColorStop(1, `rgba(${DEEP}, 0.03)`);
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.lineWidth = 1.5;
      ctx!.strokeStyle = `rgba(${BRIGHT}, 0.55)`;
      ctx!.shadowColor = `rgba(${BRIGHT}, 0.8)`;
      ctx!.shadowBlur = 18;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      ctx!.lineWidth = 0.7;
      for (const line of lines) {
        let prev: ReturnType<typeof project> | null = null;
        for (const v of line) {
          const p = project(v, cosA, sinA, R, cx, cy);
          if (prev && p.z > 0 && prev.z > 0) {
            ctx!.strokeStyle = `rgba(${MAIN}, ${0.05 + 0.13 * Math.min(1, (p.z + prev.z) / 2)})`;
            ctx!.beginPath();
            ctx!.moveTo(prev.x, prev.y);
            ctx!.lineTo(p.x, p.y);
            ctx!.stroke();
          }
          prev = p;
        }
      }

      const size = Math.max(1.1, R / 240);
      for (const v of dots) {
        const p = project(v, cosA, sinA, R, cx, cy);
        if (p.z > 0) {
          const a = 0.3 + 0.7 * p.z;
          ctx!.fillStyle = `rgba(${p.z > 0.55 ? BRIGHT : MAIN}, ${a})`;
          ctx!.fillRect(p.x - size / 2, p.y - size / 2, size * (1 + p.z * 0.6), size * (1 + p.z * 0.6));
        } else {
          ctx!.fillStyle = `rgba(${DEEP}, ${0.1 + 0.06 * -p.z})`;
          ctx!.fillRect(p.x - size / 3, p.y - size / 3, size * 0.7, size * 0.7);
        }
      }

      LINKS.forEach(([ia, ib], i) => {
        const a = nodeVecs[ia];
        const b = nodeVecs[ib];
        const steps = 36;
        const pts = [];
        for (let s = 0; s <= steps; s++) pts.push(project(arcPoint(a, b, s / steps, 0.12), cosA, sinA, R, cx, cy));

        ctx!.lineWidth = 1;
        for (let s = 1; s <= steps; s++) {
          const p0 = pts[s - 1];
          const p1 = pts[s];
          if (p0.z > -0.05 && p1.z > -0.05) {
            ctx!.strokeStyle = `rgba(${MAIN}, 0.28)`;
            ctx!.beginPath();
            ctx!.moveTo(p0.x, p0.y);
            ctx!.lineTo(p1.x, p1.y);
            ctx!.stroke();
          }
        }

        const prog = (t * 0.22 + i * 0.37) % 1;
        const idx = Math.floor(prog * steps);
        const pp = pts[idx];
        if (pp.z > 0) {
          ctx!.shadowColor = `rgba(${BRIGHT}, 1)`;
          ctx!.shadowBlur = 12;
          ctx!.fillStyle = `rgba(${BRIGHT}, 0.95)`;
          ctx!.beginPath();
          ctx!.arc(pp.x, pp.y, 2.2, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      });

      nodeVecs.forEach((v, i) => {
        const p = project(v, cosA, sinA, R, cx, cy);
        if (p.z <= 0) return;
        const pulse = (t * 0.8 + i * 0.5) % 1;
        ctx!.strokeStyle = `rgba(${BRIGHT}, ${0.6 * (1 - pulse)})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 3 + pulse * 14, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.shadowColor = `rgba(${BRIGHT}, 1)`;
        ctx!.shadowBlur = 10;
        ctx!.fillStyle = `rgba(${BRIGHT}, 1)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
      });

      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500"
      style={{ opacity: isAuthScreen ? 0.9 : 0.8, backgroundColor: 'transparent' }}
    />
  );
}
