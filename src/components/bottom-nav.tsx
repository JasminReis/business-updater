"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/website", label: "Website", icon: "▤" },
  { href: "/business", label: "Business", icon: "◉" },
  { href: "/assistant", label: "AI", icon: "✦" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-raised/90 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active ? "font-semibold text-accent" : "text-content-muted"
              }`}
            >
              <span aria-hidden className="text-xl leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
