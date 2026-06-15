// iOS-safe body scroll lock.
// Uses position:fixed instead of overflow:hidden — overflow:hidden on body freezes
// touch events inside fixed elements on iOS Safari (known WebKit bug).
// Reference-counted so nested modals open/close in any order without leaking a lock.

let lockCount = 0;
let savedScrollY = 0;

export function lockScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top      = `-${savedScrollY}px`;
    document.body.style.width    = "100%";
  }
  lockCount++;
}

export function unlockScroll(): void {
  if (typeof window === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top      = "";
    document.body.style.width    = "";
    window.scrollTo(0, savedScrollY);
  }
}
