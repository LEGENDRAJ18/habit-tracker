/**
 * Returns false and shows a friendly toast when the browser is offline.
 * Use before any feature that genuinely requires an internet connection.
 *
 * Usage:
 *   if (!requireOnline()) return;
 *   // proceed with network call
 */

import { toast } from "@/components/ui/Toast";

export function requireOnline(message?: string): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    toast(
      message ?? "This needs internet — we'll do it when you're back online 🌐",
      "error",
      undefined,
      3500,
    );
    return false;
  }
  return true;
}
