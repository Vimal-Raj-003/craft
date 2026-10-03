"use client";
import { motion } from "motion/react";

/** A kolam (rangoli) that draws itself petal by petal, then slowly rotates. */
export default function Kolam({ className = "" }: { className?: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const dots = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg viewBox="-200 -200 400 400" className={className} aria-hidden>
      <g fill="none" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="80s" repeatCount="indefinite" />
        {petals.map((a, i) => (
          <motion.ellipse
            key={a} cx="0" cy="-95" rx="34" ry="78" transform={`rotate(${a})`}
            stroke={i % 2 ? "#f5a623" : "#e8334f"} strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.5 + i * 0.12, ease: "easeInOut" }}
          />
        ))}
        {[60, 120, 175].map((r, i) => (
          <motion.circle
            key={r} r={r} stroke="#7a1d00" strokeOpacity=".4" strokeWidth="1.5" strokeDasharray="2 8"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.4, delay: 1 + i * 0.3 }}
          />
        ))}
        {dots.map((a) => (
          <motion.circle
            key={a} r="3.5" fill="#7a1d00"
            cx={Math.cos((a * Math.PI) / 180) * 190} cy={Math.sin((a * Math.PI) / 180) * 190}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2 + a / 360, type: "spring" }}
          />
        ))}
        <circle r="10" fill="#f5a623" />
      </g>
    </svg>
  );
}
