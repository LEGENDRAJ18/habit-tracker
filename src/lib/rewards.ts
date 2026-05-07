export interface LevelReward {
  level: number;
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5,   id: "streak_shield",    icon: "🛡️",  name: "Streak Shield",       desc: "Automatically protects your streak once per week" },
  { level: 10,  id: "custom_icons",     icon: "🎨",  name: "Custom Habit Icons",   desc: "Pick custom emoji icons for any habit" },
  { level: 15,  id: "habit_templates",  icon: "📋",  name: "Habit Templates",       desc: "Pre-made habit packs for fitness, study & wellness" },
  { level: 20,  id: "badge_dedicated",  icon: "🏅",  name: "Dedicated Badge",       desc: "Profile badge displayed on your public profile" },
  { level: 25,  id: "habit_challenges", icon: "🤝",  name: "Habit Challenges",      desc: "Create challenges and invite friends to join" },
  { level: 50,  id: "legend_border",    icon: "✨",  name: "Legend Border",          desc: "Exclusive animated gold border on your profile" },
  { level: 100, id: "legendary_status", icon: "👑",  name: "Legendary Status",      desc: "Special gold badge visible to all friends" },
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
