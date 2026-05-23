export const AVATARS = [
  { id: "ghost",   name: "Ghost",   emoji: "👻", bg: "from-slate-600 to-slate-800",   animClass: "anim-float"  },
  { id: "robot",   name: "Robot",   emoji: "🤖", bg: "from-cyan-600 to-blue-800",     animClass: "anim-pulse-scale" },
  { id: "ninja",   name: "Ninja",   emoji: "🥷", bg: "from-slate-700 to-zinc-900",    animClass: "anim-spin-slow" },
  { id: "wizard",  name: "Wizard",  emoji: "🧙", bg: "from-violet-600 to-purple-900", animClass: "anim-float"  },
  { id: "fire",    name: "Fire",    emoji: "🔥", bg: "from-orange-600 to-red-800",    animClass: "anim-flame"  },
  { id: "star",    name: "Star",    emoji: "⭐", bg: "from-amber-500 to-yellow-700",  animClass: "anim-pulse-scale" },
  { id: "rocket",  name: "Rocket",  emoji: "🚀", bg: "from-blue-600 to-indigo-900",   animClass: "anim-float"  },
  { id: "cat",     name: "Cat",     emoji: "🐱", bg: "from-amber-600 to-orange-800",  animClass: "anim-wiggle" },
  { id: "diamond", name: "Diamond", emoji: "💎", bg: "from-cyan-500 to-teal-700",     animClass: "anim-pulse-scale" },
] as const;

export type AvatarId = typeof AVATARS[number]["id"];
export const DEFAULT_AVATAR: AvatarId = "ghost";
