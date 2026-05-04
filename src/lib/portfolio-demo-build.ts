/**
 * When true: `/` is the public demo, `/app` is the signed-in app (and `/demo` redirects to `/`).
 * When false: `/` and `/member/...` require auth (original layout).
 */
export function isPortfolioDemoBuild(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}
