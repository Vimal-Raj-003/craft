"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/account", "My orders"],
  ["/account/profile", "Profile"],
  ["/account/addresses", "Addresses"],
] as const;

export default function AccountTabs() {
  const path = usePathname();
  return (
    <nav className="-mx-2 mt-3 -mb-3 flex gap-2 overflow-x-auto px-2 py-3" aria-label="Account sections">
      {TABS.map(([href, label]) => {
        const on = href === "/account" ? path === "/account" || path.startsWith("/account/orders") : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`btn !min-h-11 shrink-0 !px-5 !py-2 text-sm ${on ? "btn-primary" : "btn-ghost"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
