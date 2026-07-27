import { AppNav } from "@resonance/ui";

/**
 * The in-app shell: the persistent 80px left rail (`@resonance/ui` `AppNav`, Figma
 * `Navigation/SideBar` `1443:78284`) beside the route's own surface.
 *
 * Every screen inside the product proper shares this chrome — the design manifest calls it
 * out as cross-cutting (`design/manifest/_index.md` § Persistent shell chrome), and until now
 * it was composed by exactly one screen (`interview-client.tsx` rendered `AppNav` itself), so
 * `/creator/[id]` had no rail and `/discover` would have had to re-compose it. Promoting it
 * to a route-group layout makes the rail a property of *being inside the app* rather than of
 * one component, which is what a layout is for.
 *
 * The route group `(app)` adds no URL segment: `/onboarding/creator`, `/creator/[id]` and
 * `/discover` keep their paths. The `(onboarding)` group — signup/verify/start — deliberately
 * stays outside it: those screens are cardless-on-white with no rail (Figma `CreateAccount` /
 * `EmailVerication`).
 *
 * **Session-optional.** The layout renders no session-dependent content and gates nothing;
 * each route owns its own auth decision (`/onboarding/creator` redirects anonymous visitors,
 * `/discover` and `/creator/[id]` serve them). A layout that read the session would force a
 * session lookup onto every route inside it, including the public ones.
 *
 * Composition only — the rail's markup, tokens and inert placeholder icons all live in
 * `@resonance/ui` (ADR-0002/ADR-0012). Sizing here reproduces exactly the box the interview
 * screen built inline, so promoting it is a no-op for that screen's captured parity: a
 * full-height flex row, the rail at its intrinsic 80px, and the route surface filling the
 * rest with `min-w-0` so long content can shrink rather than overflow the row. Scrolling is
 * each route's own business (the interview manages an inner scroll region; `/discover`
 * scrolls its content column), so the wrapper clips rather than scrolls.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
