import Link from "next/link";
import { Sparkles } from "lucide-react";
import CurrencySelector from "@/components/ui/CurrencySelector";

const links: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Features",  href: "/#features"  },
    { label: "Pricing",   href: "/#pricing"   },
    { label: "Changelog", href: "/changelog"  },
  ],
  Company: [
    { label: "About",    href: "#" },
    { label: "Blog",     href: "#" },
    { label: "Careers",  href: "#" },
  ],
  Legal: [
    { label: "Privacy",        href: "/privacy"         },
    { label: "Terms",          href: "/terms"           },
    { label: "Payment Policy", href: "/payment-policy"  },
    { label: "Cookies",        href: "#"                },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-violet-900/20 bg-[#09090f] py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white">
                habit<span className="text-violet-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI-powered habit tracking for people who want to build a better life,
              one day at a time.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-violet-900/20">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} habitAI. All rights reserved.
            </p>
            <span className="text-slate-400 hidden sm:inline">·</span>
            <p className="text-xs text-slate-400">Made by Mannraj Jubbal</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://forms.gle/AsS3J4uug48sG4EM9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
            >
              Give Feedback 📝
            </a>
            <span className="text-slate-400">·</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Currency:</span>
              <CurrencySelector />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
