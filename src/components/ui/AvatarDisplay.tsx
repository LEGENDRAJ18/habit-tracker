"use client";
import { AVATARS, type AvatarId } from "@/lib/avatars";

interface Props {
  avatarId: AvatarId | string | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function AvatarDisplay({ avatarId, size = "md" }: Props) {
  const avatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];
  const sz = size === "sm" ? "w-8 h-8 text-lg" : size === "lg" ? "w-14 h-14 text-4xl" : "w-10 h-10 text-2xl";
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      <span className={avatar.animClass}>{avatar.emoji}</span>
    </div>
  );
}
