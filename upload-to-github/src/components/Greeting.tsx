"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const HELLOS = [
  ["வணக்கம்", "Tamil"],
  ["നമസ്കാരം", "Malayalam"],
  ["నమస్కారం", "Telugu"],
  ["ನಮಸ್ಕಾರ", "Kannada"],
];

/** Cycles "hello" through the four South Indian scripts. */
export default function Greeting() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HELLOS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex h-6 min-w-[9.5rem] items-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="whitespace-nowrap"
        >
          <span className="font-semibold text-amber">{HELLOS[i][0]}</span>
          <span className="ml-2 text-xs text-dim">{HELLOS[i][1]}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
