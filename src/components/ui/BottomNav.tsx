"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Calendar, Users, User } from "lucide-react";

const TABS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home"      },
  { href: "/analytics", icon: BarChart2,       label: "Analytics" },
  { href: "/calendar",  icon: Calendar,        label: "Calendar"  },
  { href: "/friends",   icon: Users,           label: "Friends"   },
  { href: "/profile",   icon: User,            label: "Profile"   },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#09090f]/95 backdrop-blur-xl border-t border-violet-900/25"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-all relative overflow-hidden"
            >
              {/* Active background highlight */}
              {active && (
                <div
                  className="absolute inset-x-1.5 inset-y-1 rounded-2xl"
                  style={{ backgroundColor: "rgba(var(--a-r), var(--a-g), var(--a-b), 0.15)" }}
                />
              )}

              {/* Top indicator bar */}
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                  style={{ backgroundColor: "var(--a-500)" }}
                />
              )}

              {/* Icon */}
              <div
                className="p-1.5 rounded-xl transition-all relative z-10"
                style={active ? {
                  backgroundColor: "rgba(var(--a-r), var(--a-g), var(--a-b), 0.22)",
                } : undefined}
              >
                <Icon
                  className={`w-5 h-5 transition-all nav-tab-icon ${active ? "stroke-[2.4] active" : "stroke-[1.7]"}`}
                  style={{ color: active ? "var(--a-400)" : "#475569" }}
                />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] leading-none relative z-10 ${active ? "font-bold" : "font-medium"}`}
                style={{ color: active ? "var(--a-400)" : "#475569" }}
              >
                {label}
              </span>

              {/* Bottom dot */}
              {active && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "var(--a-500)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
