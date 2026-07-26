// Shared persona data — used by both the primary onboarding flow
// (src/app/onboarding/page.tsx) and the in-dashboard fallback modal
// (src/components/dashboard/OnboardingModal.tsx) so the two never drift.

export type PersonaId =
  | "student"
  | "professional"
  | "athlete"
  | "breaking_bad_habits"
  | "entrepreneur"
  | "parent"
  | "wellness"
  | "just_improving";

export interface Persona {
  id: PersonaId;
  emoji: string;
  label: string;
  tagline: string;
}

export const PERSONAS: Persona[] = [
  { id: "student",             emoji: "🎓", label: "Student",             tagline: "Crush your academic goals"              },
  { id: "professional",        emoji: "💼", label: "Professional",        tagline: "Level up your career & productivity"    },
  { id: "athlete",             emoji: "💪", label: "Athlete",             tagline: "Build peak physical performance"        },
  { id: "breaking_bad_habits", emoji: "🚫", label: "Breaking Bad Habits", tagline: "Quit what's holding you back"           },
  { id: "entrepreneur",        emoji: "🚀", label: "Entrepreneur",        tagline: "Build discipline & ship faster"         },
  { id: "parent",              emoji: "👨‍👩‍👧", label: "Parent",             tagline: "Model good habits for your family"     },
  { id: "wellness",            emoji: "🧘", label: "Wellness Seeker",     tagline: "Improve sleep, stress & mental health"  },
  { id: "just_improving",      emoji: "🌱", label: "Just Improving",      tagline: "Become a better version of yourself"   },
];

export type PersonaUserMode = "student" | "parent" | "personal";

export const PERSONA_TO_USER_MODE: Record<PersonaId, PersonaUserMode> = {
  student:             "student",
  professional:        "personal",
  athlete:             "personal",
  breaking_bad_habits: "personal",
  entrepreneur:        "personal",
  parent:              "parent",
  wellness:            "personal",
  just_improving:      "personal",
};
