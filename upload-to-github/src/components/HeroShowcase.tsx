"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/** Two product photos that float and follow the pointer — replaces the old 3D knot. */
export default function HeroShowcase() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });

  const aX = useTransform(sx, (v) => v * -22);
  const aY = useTransform(sy, (v) => v * -22);
  const bX = useTransform(sx, (v) => v * 30);
  const bY = useTransform(sy, (v) => v * 30);
  const tiltY = useTransform(sx, (v) => v * 10);
  const tiltX = useTransform(sy, (v) => v * -10);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  const reset = () => { mx.set(0); my.set(0); };

  const frame = "relative block overflow-hidden rounded-[2rem] border-[6px] border-white/90 bg-white shadow-[0_30px_70px_-20px_rgba(122,29,0,.55)]";

  return (
    <div
      onPointerMove={onMove} onPointerLeave={reset}
      className="relative mx-auto aspect-[2/3] w-full max-w-[520px] sm:aspect-auto sm:h-[580px]"
      style={{ perspective: 1000 }}
    >
      {/* white tulip bouquet */}
      <motion.div
        style={{ x: aX, y: aY, rotateX: tiltX, rotateY: tiltY }}
        initial={{ opacity: 0, y: 60, rotate: -14 }} animate={{ opacity: 1, rotate: -6 }}
        transition={{ duration: 1.1, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute left-0 top-0 z-10 w-[52%]"
      >
        <motion.div animate={{ y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}>
          <Link href="/product/pearl-tulip-bouquet" data-hot className={`${frame} group aspect-[9/16]`}>
            <Image src="/products/white-tulip-bouquet.jpg" alt="Handmade white crochet tulip bouquet with a pink ribbon" fill priority sizes="270px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          </Link>
        </motion.div>
      </motion.div>

      {/* sunflower keychain */}
      <motion.div
        style={{ x: bX, y: bY, rotateX: tiltX, rotateY: tiltY }}
        initial={{ opacity: 0, y: 80, rotate: 14 }} animate={{ opacity: 1, rotate: 5 }}
        transition={{ duration: 1.1, delay: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute bottom-0 right-0 z-20 w-[50%]"
      >
        <motion.div animate={{ y: [0, 16, 0] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 0.8 }}>
          <Link href="/product/surya-sunflower-keychain" data-hot className={`${frame} group aspect-[3/4]`}>
            <Image src="/products/sunflower-keychain.jpg" alt="Handmade crochet sunflower keychain held in a hand" fill priority sizes="260px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          </Link>
        </motion.div>
      </motion.div>

      {/* yarn & hooks photo: lives here on phones, because the headline has no room for it */}
      <motion.div
        initial={{ opacity: 0, y: 60, rotate: -12 }} animate={{ opacity: 1, rotate: -5 }}
        transition={{ duration: 1.1, delay: 1, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute bottom-0 left-0 z-20 w-[36%] sm:hidden"
      >
        <div className="float relative aspect-[2/3] overflow-hidden rounded-2xl border-[5px] border-white/90 bg-white shadow-[0_24px_60px_-18px_rgba(122,29,0,.55)]">
          <Image src="/products/yarn-and-hooks.jpg" alt="Pastel cotton yarn, wooden crochet hooks and daisies" fill sizes="150px" className="object-cover" />
        </div>
      </motion.div>

      {/* floating labels */}
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, type: "spring" }}
        className="glass absolute right-2 top-10 z-30 rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
      >
        💐 Never wilts
      </motion.span>
      <motion.span
        initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9, type: "spring" }}
        className="glass absolute bottom-[42%] left-[34%] z-30 rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
      >
        🌻 little ray of happiness
      </motion.span>
    </div>
  );
}
