"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/customers", "Customers"],
  ["/admin/payments", "Payments"],
] as const;

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto px-2 py-3 -mx-2 -my-3" aria-label="Admin sections">
      {TABS.map(([href, label]) => {
        const on = path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={`btn !min-h-11 shrink-0 !px-5 !py-2 text-sm ${on ? "btn-primary" : "btn-ghost"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
