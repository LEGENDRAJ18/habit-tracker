"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  levelFromXP,
  XP_PER_HABIT,
  XP_BONUS_ALL_DONE,
  XP_BONUS_STREAK_7,
  XP_BONUS_STREAK_30,
  DURATION_BONUS_XP,
} from "@/lib/xp";

export type AchievementId =
  | "first_habit"
  | "streak_7"
  | "streak_30"
  | "all_week"
  | "level_10";

export const ACHIEVEMENT_META: Record<
  AchievementId,
  { emoji: string; title: string; desc: string }
> = {
  first_habit: { emoji: "🎯", title: "First Step",     desc: "Completed your very first habit" },
  streak_7:    { emoji: "🔥", title: "On Fire",        desc: "Maintained a 7-day streak" },
  streak_30:   { emoji: "💎", title: "Diamond Habit",  desc: "Reached a 30-day streak" },
  all_week:    { emoji: "👑", title: "Perfect Week",   desc: "Completed habits 7 days in a row" },
  level_10:    { emoji: "⚡", title: "Power User",     desc: "Reached level 10" },
};

// IDs of milestones that reset daily vs. are one-time achievements
const DAILY_MILESTONE_IDS = ["first_habit_today", "all_habits_today"] as const;
type DailyMilestoneId = (typeof DAILY_MILESTONE_IDS)[number];

interface DailyMilestoneState {
  date: string;
  achieved: DailyMilestoneId[];
}

export function useXP() {
  const [xp, setXP]                         = useState(0);
  const [level, setLevel]                   = useState(1);
  const [achievements, setAchievements]     = useState<AchievementId[]>([]);
  const [dailyMilestones, setDailyMilestones] = useState<DailyMilestoneState>({
    date: "",
    achieved: [],
  });
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [justLeveledUp, setJustLeveledUp]   = useState<number | null>(null);
  const [xpLoading, setXPLoading]           = useState(true);

  // Use refs to avoid stale closure in callbacks
  const xpRef           = useRef(0);
  const levelRef        = useRef(1);
  const achievementsRef = useRef<AchievementId[]>([]);
  const dailyRef        = useRef<DailyMilestoneState>({ date: "", achieved: [] });
  const totalRef        = useRef(0);

  const supabase = useRef(createClient()).current;
  // Prevents XP-awarding callbacks from running before the initial DB fetch completes
  const initialLoadDone = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setXPLoading(false); return; }
        const { data } = await supabase
          .from("profiles")
          .select("xp, level, achievements, daily_milestones, total_completions")
          .eq("id", user.id)
          .single();

        const loadedXP    = data?.xp ?? 0;
        // Always recompute level from XP — never trust the stored level value,
        // which can drift if writes race during onboarding or first login.
        const loadedLevel = levelFromXP(loadedXP);
        const loadedAch   = (data?.achievements as AchievementId[]) ?? [];
        const loadedTotal = data?.total_completions ?? 0;
        const today       = new Date().toISOString().split("T")[0];
        const rawDM       = data?.daily_milestones as DailyMilestoneState | null;
        const loadedDM: DailyMilestoneState =
          rawDM?.date === today
            ? rawDM
            : { date: today, achieved: [] };

        xpRef.current           = loadedXP;
        levelRef.current        = loadedLevel;
        achievementsRef.current = loadedAch;
        dailyRef.current        = loadedDM;
        totalRef.current        = loadedTotal;

        setXP(loadedXP);
        setLevel(loadedLevel);
        setAchievements(loadedAch);
        setDailyMilestones(loadedDM);
        setTotalCompletions(loadedTotal);

        // Sync the corrected level back to DB if it differs from what was stored
        if (data?.level !== undefined && data.level !== loadedLevel) {
          await supabase.from("profiles").update({ level: loadedLevel }).eq("id", user.id);
        }
      } catch {
        // ignore — loading state cleaned up below
      } finally {
        initialLoadDone.current = true;
        setXPLoading(false);
      }
    })();
  }, [supabase]);

  // Core: award XP and detect level-up
  const awardXP = useCallback(
    async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const newXP    = xpRef.current + amount;
      const newLevel = levelFromXP(newXP);
      const leveled  = newLevel > levelRef.current;

      xpRef.current    = newXP;
      levelRef.current = newLevel;

      setXP(newXP);
      setLevel(newLevel);
      if (leveled) setJustLeveledUp(newLevel);

      await supabase
        .from("profiles")
        .update({ xp: newXP, level: newLevel })
        .eq("id", user.id);

      return leveled;
    },
    [supabase],
  );

  // Called every time a habit is toggled TO completed
  const onHabitCompleted = useCallback(async (
    validityScore?: "valid" | "partial" | "invalid",
    howLong?: string | null,
    xpValue?: number | null,
    currentStreak?: number,
  ): Promise<{ luckyBonus: boolean }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { luckyBonus: false };

    const newTotal = totalRef.current + 1;
    totalRef.current = newTotal;
    setTotalCompletions(newTotal);
    await supabase
      .from("profiles")
      .update({ total_completions: newTotal })
      .eq("id", user.id);

    const habitXP = xpValue ?? XP_PER_HABIT;
    const streakMult = (currentStreak ?? 0) >= 30 ? 2 : (currentStreak ?? 0) >= 7 ? 1.5 : 1;
    const baseXP =
      validityScore === "invalid" ? 0
      : validityScore === "partial" ? Math.round(habitXP * 0.5 * streakMult)
      : Math.round(habitXP * streakMult);
    const durationBonus = baseXP > 0 && howLong ? (DURATION_BONUS_XP[howLong] ?? 0) : 0;
    const xpToAward = baseXP + durationBonus;
    if (xpToAward > 0) await awardXP(xpToAward);

    // ~12% chance lucky bonus
    const lucky = baseXP > 0 && Math.random() < 0.12;
    if (lucky) await awardXP(20);

    return { luckyBonus: lucky };
  }, [supabase, awardXP]);

  // Award +5 XP once per calendar day on first app open.
  // Guard: must wait until the initial DB fetch is done so xpRef has the real value.
  const onDailyOpen = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!initialLoadDone.current) return false; // race-condition guard
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem("habitai_last_login_xp") === today) return false;
    localStorage.setItem("habitai_last_login_xp", today);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    await awardXP(5);
    return true;
  }, [supabase, awardXP]);

  // Check daily + streak milestones; award XP for newly unlocked ones.
  // Returns a Set of newly achieved milestone IDs so the caller can animate/play sounds.
  const checkMilestones = useCallback(
    async (completedCount: number, totalHabits: number, maxStreak: number): Promise<Set<string>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set();

      const newly = new Set<string>();
      const today = new Date().toISOString().split("T")[0];

      // Reset daily milestones when day changes
      const dm: DailyMilestoneState =
        dailyRef.current.date === today
          ? { ...dailyRef.current }
          : { date: today, achieved: [] };

      let bonusXP = 0;

      // --- Daily: first habit completed ---
      if (completedCount >= 1 && !dm.achieved.includes("first_habit_today")) {
        dm.achieved.push("first_habit_today");
        bonusXP += 10;
        newly.add("first_habit_today");
      }

      // --- Daily: all habits done ---
      if (
        totalHabits > 0 &&
        completedCount >= totalHabits &&
        !dm.achieved.includes("all_habits_today")
      ) {
        dm.achieved.push("all_habits_today");
        bonusXP += XP_BONUS_ALL_DONE;
        newly.add("all_habits_today");
      }

      // Update daily milestones in state + DB if changed
      if (newly.size > 0) {
        dailyRef.current = dm;
        setDailyMilestones({ ...dm });
        await supabase
          .from("profiles")
          .update({ daily_milestones: dm })
          .eq("id", user.id);
      }

      // --- One-time achievements ---
      const ach = [...achievementsRef.current];
      let achChanged = false;

      const grantAch = (id: AchievementId, xpBonus: number) => {
        if (!ach.includes(id)) {
          ach.push(id);
          bonusXP += xpBonus;
          newly.add(id);
          achChanged = true;
        }
      };

      if (totalRef.current >= 1)  grantAch("first_habit", 0);   // XP already from onHabitCompleted
      if (maxStreak >= 7)          grantAch("streak_7",    XP_BONUS_STREAK_7);
      if (maxStreak >= 30)         grantAch("streak_30",   XP_BONUS_STREAK_30);
      if (levelRef.current >= 10)  grantAch("level_10",    0);

      // "all_week": proxy — 7+ consecutive days with at least 1 completion each
      // We approximate this as total_completions >= 7 × totalHabits
      if (totalHabits > 0 && totalRef.current >= 7 * totalHabits) {
        grantAch("all_week", 0);
      }

      if (achChanged) {
        achievementsRef.current = ach;
        setAchievements([...ach]);
        await supabase
          .from("profiles")
          .update({ achievements: ach })
          .eq("id", user.id);
      }

      if (bonusXP > 0) await awardXP(bonusXP);

      return newly;
    },
    [supabase, awardXP],
  );

  const dismissLevelUp = useCallback(() => setJustLeveledUp(null), []);

  const isDailyAchieved = useCallback(
    (id: DailyMilestoneId) => {
      const today = new Date().toISOString().split("T")[0];
      return dailyMilestones.date === today && dailyMilestones.achieved.includes(id);
    },
    [dailyMilestones],
  );

  return {
    xp,
    level,
    achievements,
    totalCompletions,
    justLeveledUp,
    xpLoading,
    isDailyAchieved,
    onHabitCompleted,
    onDailyOpen,
    checkMilestones,
    dismissLevelUp,
  };
}
