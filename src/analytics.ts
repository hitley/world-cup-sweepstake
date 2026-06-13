import { track } from "@vercel/analytics";

// Resolve the current competition for tagging events: the ?c=<slug> query when
// running locally, or the first path segment (/<slug>/) on the static deploy.
export function currentCompetition(): string {
  const fromQuery = new URLSearchParams(window.location.search).get("c");
  if (fromQuery) return fromQuery;
  const fromPath = window.location.pathname.split("/").filter(Boolean)[0];
  return fromPath || "root";
}

// Fire a Vercel Web Analytics custom event, always stamped with the competition.
// No-ops automatically off the Vercel deployment (e.g. local dev).
export function trackEvent(name: string, props: Record<string, string | number | boolean> = {}) {
  track(name, { competition: currentCompetition(), ...props });
}
