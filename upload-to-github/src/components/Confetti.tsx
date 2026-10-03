"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Lightweight yarn-colored confetti burst using GSAP; no canvas lib needed. */
export default function Confetti() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#e8334f", "#f5a623", "#19c58a", "#ffd166"];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement("i");
      Object.assign(d.style, {
        position: "absolute", left: "50%", top: "40%", width: "8px", height: "14px",
        background: colors[i % 4], borderRadius: "2px",
      });
      el.appendChild(d);
      gsap.to(d, {
        x: gsap.utils.random(-500, 500), y: gsap.utils.random(-400, 500),
        rotation: gsap.utils.random(-720, 720), opacity: 0, duration: gsap.utils.random(1.6, 3), ease: "power3.out",
      });
    }
    return () => { el.innerHTML = ""; };
  }, []);
  return <div ref={box} className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden />;
}
