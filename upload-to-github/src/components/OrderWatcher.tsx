"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

/** Clears the cart once the order is confirmed; while payment is pending, re-checks every few seconds. */
export default function OrderWatcher({ confirmed, pending }: { confirmed: boolean; pending: boolean }) {
  const router = useRouter();
  const clear = useCart((s) => s.clear);

  useEffect(() => { if (confirmed) clear(); }, [confirmed, clear]);

  useEffect(() => {
    if (!pending) return;
    let n = 0;
    const t = setInterval(() => { if (++n > 20) clearInterval(t); else router.refresh(); }, 4000);
    return () => clearInterval(t);
  }, [pending, router]);

  return null;
}
