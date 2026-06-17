"use client";

import React from "react";
import posthog from "posthog-js";

interface Props {
  children: React.ReactNode;
  /** Name of the section — logged to console and PostHog for triage */
  section?: string;
  /** Custom fallback. Defaults to null (section silently hidden). */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Wrap individual dashboard sections so one broken widget can't take down
 * the whole page. Logs the caught error to the console and PostHog.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const section = this.props.section ?? "unknown";
    console.error(`[ErrorBoundary:${section}]`, error.message, info.componentStack);
    try {
      posthog.capture("section_error_boundary", {
        section,
        error_message:    error.message,
        error_stack:      error.stack?.slice(0, 500),
        component_stack:  info.componentStack?.slice(0, 500),
        url: typeof window !== "undefined" ? window.location.href : "",
      });
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
