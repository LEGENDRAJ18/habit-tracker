"use client";

import { createContext, useContext } from "react";
import type { UpgradeReason } from "@/components/dashboard/UpgradeModal";

interface UpgradeCtxValue {
  openUpgradeModal: (reason?: UpgradeReason) => void;
}

const UpgradeCtx = createContext<UpgradeCtxValue>({
  openUpgradeModal: () => {},
});

export const UpgradeProvider = UpgradeCtx.Provider;

export function useUpgrade() {
  return useContext(UpgradeCtx);
}
