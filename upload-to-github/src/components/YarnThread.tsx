"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** A neon yarn thread that draws itself down the page as you scroll. */
export default function YarnThread() {
  const path = useRef<SVGPathElement>(null);
  const ball = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const p = path.current;
    if (!p) return;
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        gsap.set(p, { strokeDashoffset: len * (1 - self.progress) });
        const pt = p.getPointAtLength(len * self.progress);
        ball.current?.setAttribute("cx", String(pt.x));
        ball.current?.setAttribute("cy", String(pt.y));
      },
    });
    return () => st.kill();
  }, []);

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 4000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute left-0 top-0 -z-[1] h-full w-full opacity-60"
    >
      <defs>
        <linearGradient id="yarn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8334f" />
          <stop offset=".5" stopColor="#f5a623" />
          <stop offset="1" stopColor="#19c58a" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <path
        ref={path}
        d="M 120 0 C 120 300, 900 350, 880 700 S 100 1100, 140 1500 S 900 1900, 860 2300 S 120 2700, 160 3100 S 880 3500, 500 4000"
        fill="none" stroke="url(#yarn)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
      <circle ref={ball} r="10" cx="120" cy="0" fill="#fff" filter="url(#glow)" />
    </svg>
  );
}
