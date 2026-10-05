"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart, cartCount } from "@/lib/cart";
import { useMounted } from "@/lib/use-mounted";

type User = { name: string; role: string } | null;

const PILL = {
  background: "linear-gradient(180deg,#a8321a,#7a1d00)",
  border: "2px solid #f5a623",
  boxShadow: "0 10px 30px -10px rgba(122,29,0,.6), inset 0 1px 0 rgba(255,255,255,.18)",
} as const;

export default function Navbar() {
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const pathname = usePathname();
  const mounted = useMounted();
  const [user, setUser] = useState<User>(null);
  const [scrolled, setScrolled] = useState(false);
  // the phone menu is "open for this page": navigating to another page closes it automatically
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === pathname;
  // after signing in, come back to the page the visitor was on
  const signIn = pathname === "/" || pathname.startsWith("/login") ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // close the phone menu on Escape or when the screen grows to desktop size
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuAt(null);
    const grow = () => window.innerWidth >= 768 && setMenuAt(null);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", grow);
    return () => { window.removeEventListener("keydown", esc); window.removeEventListener("resize", grow); };
  }, [menu]);

  const count = mounted ? cartCount(lines) : 0;
  const links: [string, string][] = [
    ["/shop", "Shop"],
    ["/#custom", "Custom orders"],
    ["/#story", "Our story"],
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-[calc(var(--side)+10px)] sm:top-4"
    >
      <div className="relative w-full max-w-5xl">
        {/* tap-outside area for the phone menu */}
        {menu && <button aria-label="Close menu" onClick={() => setMenuAt(null)} className="fixed inset-0 -z-10 cursor-default md:hidden" />}

        <nav
          style={PILL}
          className={`flex w-full items-center justify-between gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-[#fff4e0] transition-all duration-500 sm:py-2 sm:pl-5 sm:pr-2 ${scrolled ? "scale-[.985]" : ""}`}
        >
          <Link href="/" className="flex min-h-11 items-center gap-2 font-bold tracking-tight">
            <span className="float inline-block text-xl">🧶</span>
            <span className="whitespace-nowrap">Craft <span className="text-[#ffd166]">&</span> Cart</span>
          </Link>

          <div className="hidden items-center gap-1 text-sm text-[#fff4e0]/85 md:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full px-3.5 py-2.5 transition hover:bg-white/10 hover:text-white">{label}</Link>
            ))}
            {user && user.role !== "CUSTOMER" && <Link className="rounded-full px-3.5 py-2.5 text-[#ffd166] transition hover:bg-white/10" href="/admin/dashboard">Admin</Link>}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href={user ? "/account" : signIn}
              className="hidden rounded-full px-3.5 py-2.5 text-sm text-[#fff4e0]/85 transition hover:bg-white/10 hover:text-white md:block"
            >
              {user ? user.name.split(" ")[0] : "Sign in"}
            </Link>
            <button
              id="cart-button"
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${count} items`}
              className="btn !min-h-11 !px-4 !py-2 text-sm"
              style={{ background: "linear-gradient(110deg,#ffe08a,#f5a623)", color: "#5a1500", boxShadow: "0 6px 18px -6px rgba(0,0,0,.45)" }}
            >
              Cart
              <motion.span
                key={count}
                initial={{ scale: 1.8 }}
                animate={{ scale: 1 }}
                className="grid h-5 min-w-5 place-items-center rounded-full bg-[#7a1d00] px-1 text-xs font-bold text-[#fff4e0]"
              >
                {count}
              </motion.span>
            </button>

            <button
              onClick={() => setMenuAt(menu ? null : pathname)}
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-white/10 md:hidden"
            >
              <span className="relative block h-3.5 w-5" aria-hidden>
                <span className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-[#fff4e0] transition ${menu ? "translate-y-[6px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[6px] h-0.5 w-5 rounded bg-[#fff4e0] transition ${menu ? "opacity-0" : ""}`} />
                <span className={`absolute left-0 top-3 h-0.5 w-5 rounded bg-[#fff4e0] transition ${menu ? "-translate-y-[6px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menu && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              style={PILL}
              className="absolute inset-x-0 top-full mt-2 origin-top rounded-3xl p-2 text-[#fff4e0] md:hidden"
            >
              <ul className="space-y-1">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} onClick={() => setMenuAt(null)} className="flex min-h-12 items-center rounded-2xl px-4 text-lg font-medium transition active:bg-white/15">{label}</Link>
                  </li>
                ))}
                <li>
                  <Link href={user ? "/account" : signIn} onClick={() => setMenuAt(null)} className="flex min-h-12 items-center rounded-2xl px-4 text-lg font-medium transition active:bg-white/15">
                    {user ? `Hi, ${user.name.split(" ")[0]} · My orders` : "Sign in"}
                  </Link>
                </li>
                {user && user.role !== "CUSTOMER" && (
                  <li>
                    <Link href="/admin/dashboard" onClick={() => setMenuAt(null)} className="flex min-h-12 items-center rounded-2xl px-4 text-lg font-medium text-[#ffd166] transition active:bg-white/15">Admin dashboard</Link>
                  </li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
