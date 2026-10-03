"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { SplitText } from "./Reveal";
import Kolam from "./Kolam";
import Greeting from "./Greeting";
import Image from "next/image";
import PongalScene from "./PongalScene";
import SunriseScene from "./SunriseScene";
import HeroShowcase from "./HeroShowcase";

export default function HeroSection() {
  return (
    <section className="relative -mx-[var(--side)] flex min-h-screen items-center overflow-hidden px-[calc(var(--side)+1rem)] pb-[300px] pt-44 sm:px-[calc(var(--side)+1.5rem)] sm:pb-[290px] md:pb-[320px]">
      <div className="aurora"><i /><i /><i /></div>
      <div className="grid-bg absolute inset-0 -z-[1]" />
      <PongalScene />
      <SunriseScene />
      <Kolam className="pointer-events-none absolute -left-52 top-1/2 -z-[1] h-[760px] w-[760px] -translate-y-1/2 opacity-35" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-dim"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-mint" /> <Greeting />
          </motion.p>
          <div className="relative isolate">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 12 }} animate={{ opacity: 1, scale: 1, rotate: 6 }}
              transition={{ duration: 1, delay: 1, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute -top-8 right-0 z-10 hidden w-[132px] sm:-top-10 sm:block lg:-right-4 lg:-top-12 lg:w-[148px]"
            >
              <div className="float">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border-[5px] border-white/90 bg-white shadow-[0_24px_60px_-18px_rgba(122,29,0,.55)]">
                  <Image
                    src="/products/yarn-and-hooks.jpg" alt="Pastel cotton yarn, wooden crochet hooks and daisies"
                    fill priority sizes="150px" className="object-cover"
                  />
                </div>
              </div>
            </motion.div>
            <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight min-[400px]:text-5xl sm:text-7xl sm:leading-[1.02]">
              <SplitText text="Handmade" delay={0.3} />
              <br />
              <SplitText text="crochet," delay={0.5} className="font-serif font-normal italic text-gradient" />
              <br />
              <SplitText text="with a South Indian soul." delay={0.7} />
            </h1>
          </div>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
            className="mt-6 max-w-md text-base text-dim sm:text-lg"
          >
            Everlasting crochet bouquets, keychains and accessories — inspired by jasmine strands, temple borders and kolam courtyards. Hand-looped in the South, shipped across India.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
            className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-4"
          >
            <Link href="/shop" className="btn btn-primary w-full min-h-12 sm:w-auto">Shop the collection →</Link>
            <Link href="/#custom" className="btn btn-ghost w-full min-h-12 sm:w-auto">Design your own</Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
            className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 text-sm text-dim sm:mt-12 sm:flex sm:flex-wrap sm:gap-x-10"
          >
            <div><p className="text-2xl font-bold text-ink">100%</p>handmade</div>
            <div><p className="text-2xl font-bold text-ink">4.9★</p>customer love</div>
            <div><p className="text-2xl font-bold text-ink">Pan-India</p>delivery</div>
            <div><p className="text-2xl font-bold text-ink">Never wilts</p>bouquets</div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative z-10"
        >
          <HeroShowcase />
        </motion.div>
      </div>

      
    </section>
  );
}
