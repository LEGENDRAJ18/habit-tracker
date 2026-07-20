"use client";

import { useEffect, useState, type ReactNode } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

interface Props {
  children: ReactNode;
  onClose: () => void;
  zIndex?: string;
}

// Mobile-style slide-up sheet, centered card on wider screens. Sibling of
// CenteredModal — reuses its scroll-lock/backdrop pattern but animates from
// the bottom edge instead of fading in centered.
export default function BottomSheet({ children, onClose, zIndex = "z-[9999]" }: Props) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    lockScroll();
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => { unlockScroll(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md sm:mx-4 bg-[#0f0f1a] border border-violet-900/30 rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl max-h-[90vh] overflow-y-auto transition-transform duration-250 ease-out"
        style={{ transform: entered ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-violet-800/50" />
        </div>
        {children}
      </div>
    </div>
  );
}
