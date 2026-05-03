import Link from "next/link";
import { Users } from "lucide-react";

const DISCORD_URL = "https://discord.gg/U3FFHFq3";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function Community() {
  return (
    <section id="community" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0a2e] via-[#0f0f1a] to-[#09090f] border border-violet-700/30 rounded-3xl px-8 sm:px-14 py-14"
          style={{ boxShadow: "0 0 80px rgba(109,40,217,0.15)" }}>

          {/* Background glow blobs */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-700/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-700/10 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-10">
            {/* Left: text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-700/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-5">
                <Users className="w-4 h-4" />
                HabitAI Community
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                You don&rsquo;t have to do this{" "}
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  alone.
                </span>
              </h2>

              <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-xl">
                Join the HabitAI community on Discord. Share your wins, find accountability partners, and connect with people on the exact same journey as you.
              </p>

              <Link
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-7 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all duration-200 shadow-xl shadow-indigo-900/40 text-sm"
              >
                <DiscordIcon />
                Join Discord — it&apos;s free
              </Link>
            </div>

            {/* Right: stat pills */}
            <div className="flex flex-col gap-3 w-full lg:w-64 flex-shrink-0">
              {[
                { emoji: "🏆", label: "Weekly streak leaderboard" },
                { emoji: "🤝", label: "Find accountability partners" },
                { emoji: "💡", label: "Habit tips & strategies" },
                { emoji: "🎉", label: "Celebrate milestones together" },
              ].map(({ emoji, label }) => (
                <div key={label} className="flex items-center gap-3 bg-violet-950/30 border border-violet-800/25 rounded-xl px-4 py-3">
                  <span className="text-xl leading-none flex-shrink-0">{emoji}</span>
                  <p className="text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
