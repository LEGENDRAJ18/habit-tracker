import { Brain, Flame, BarChart3, Bell, Target, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get personalized recommendations based on your habit patterns. Our AI learns your optimal times and conditions for success.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: Flame,
    title: "Streak Tracking",
    description:
      "Visual streak counters that keep you motivated day after day. Losing a streak feels real — winning one feels incredible.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description:
      "Detailed charts showing your improvement over time. See patterns, identify blockers, and celebrate milestones.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Context-aware notifications at the perfect moment. habitAI learns when you're most likely to complete each habit.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Target,
    title: "Goal Setting",
    description:
      "Set measurable outcomes for every habit. Track not just completions, but the impact habits have on your bigger goals.",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    icon: Users,
    title: "Accountability",
    description:
      "Share your progress with trusted friends. A little social pressure goes a long way in maintaining consistency.",
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-800/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-6">
            Everything you need
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5">
            Built for lasting{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              transformation
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Every feature is designed with one goal in mind: helping you build habits
            that stick far beyond the initial motivation.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative bg-[#0f0f1a] border border-violet-900/20 hover:border-violet-700/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/40"
              >
                <div
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${f.bg} border ${f.border} mb-5`}
                >
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
