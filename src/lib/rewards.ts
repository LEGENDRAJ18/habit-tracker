export interface LevelReward {
  level: number;
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5,   id: "streak_shield",      icon: "🛡️",  name: "Streak Shield",       desc: "Automatically protects your streak once per week" },
  { level: 10,  id: "custom_icons",       icon: "🎨",  name: "Custom Habit Icons",  desc: "Pick custom emoji icons for any habit" },
  { level: 15,  id: "habit_templates",    icon: "📋",  name: "Habit Templates",     desc: "Pre-made habit packs for fitness, study & wellness" },
  { level: 20,  id: "badge_dedicated",    icon: "🏅",  name: "Dedicated Badge",     desc: "Profile badge displayed on your public profile" },
  { level: 25,  id: "habit_challenges",   icon: "🤝",  name: "Habit Challenges",    desc: "Create challenges and invite friends to join" },
  { level: 30,  id: "custom_themes",      icon: "🌈",  name: "Custom Themes",       desc: "Unlock exclusive colour themes for your dashboard" },
  { level: 40,  id: "habit_stacking",     icon: "🔗",  name: "Habit Stacking",      desc: "Chain habits together for automatic reminder sequences" },
  { level: 50,  id: "legend_border",      icon: "✨",  name: "Legend Border",       desc: "Exclusive animated gold border on your profile" },
  { level: 75,  id: "elite_badge",        icon: "💎",  name: "Elite Badge",         desc: "Rare diamond badge shown on your public profile" },
  { level: 100, id: "legendary_status",   icon: "👑",  name: "Legendary Status",    desc: "Special gold badge visible to all friends" },
  { level: 150, id: "century_theme",      icon: "🌌",  name: "Century Theme",       desc: "Unlock the deep-space century dashboard theme" },
  { level: 200, id: "mentor",             icon: "🎓",  name: "Mentor",              desc: "Become a mentor and guide newcomers in the community" },
  { level: 250, id: "hall_of_fame",       icon: "🏛️",  name: "Hall of Fame",        desc: "Permanent entry in the all-time Hall of Fame leaderboard" },
  { level: 300, id: "habit_architect",    icon: "🧠",  name: "Habit Architect",     desc: "Unlock AI-generated personalised habit optimisation plans" },
  { level: 400, id: "immortal_border",    icon: "⚡",  name: "Immortal Border",     desc: "Exclusive electric animated border — only for legends" },
  { level: 500, id: "goat",              icon: "🐐",  name: "GOAT",                desc: "Greatest Of All Time — you have reached the absolute pinnacle" },
];

export function getNextReward(level: number): LevelReward | null {
  return LEVEL_REWARDS.find((r) => r.level > level) ?? null;
}

export function getJustUnlockedReward(level: number): LevelReward | null {
  return LEVEL_REWARDS.find((r) => r.level === level) ?? null;
}

export function getUnlockedRewards(level: number): LevelReward[] {
  return LEVEL_REWARDS.filter((r) => r.level <= level);
}
