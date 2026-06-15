"use client";

import { useEffect, type ReactNode } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

interface Props {
  children: ReactNode;
  onClose?: () => void;
  zIndex?: string;
  backdrop?: string;
}

export default function CenteredModal({
  children,
  onClose,
  zIndex = "z-[9999]",
  backdrop = "bg-black/65 backdrop-blur-sm",
}: Props) {
  useEffect(() => {
    lockScroll();
    return () => unlockScroll();
  }, []);

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 ${backdrop}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>
  );
}
