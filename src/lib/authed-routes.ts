import { isPortfolioDemoBuild } from "@/lib/portfolio-demo-build";

/** Home URL for the signed-in app (`/app` when root is the public demo). */
export function authedHomePath(): string {
  return isPortfolioDemoBuild() ? "/app" : "/";
}

/** Member dashboard URL for the signed-in app. */
export function authedMemberPath(memberId: string): string {
  return isPortfolioDemoBuild() ? `/app/member/${memberId}` : `/member/${memberId}`;
}

/** Family list / dashboard base (demo session uses public root when portfolio layout is on). */
export function familyListPath(portfolioDemoSession: boolean): string {
  if (isPortfolioDemoBuild() && portfolioDemoSession) return "/";
  if (isPortfolioDemoBuild()) return "/app";
  return "/";
}

/** Member detail URL: public demo at root vs signed-in app under `/app`. */
export function memberDashboardPath(portfolioDemoSession: boolean, memberId: string): string {
  if (isPortfolioDemoBuild() && portfolioDemoSession) return `/member/${memberId}`;
  if (isPortfolioDemoBuild()) return `/app/member/${memberId}`;
  return `/member/${memberId}`;
}
