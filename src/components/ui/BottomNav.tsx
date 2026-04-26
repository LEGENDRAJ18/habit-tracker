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
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#09090f]/95 backdrop-blur-xl border-t border-violet-900/25"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-stretch h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-all ${
                active ? "text-violet-400" : "text-slate-600 active:text-slate-400"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-violet-600/20" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-violet-400" : "text-slate-600"}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-violet-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
