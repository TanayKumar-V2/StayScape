# StayScape frontend page audit

**Scope:** All 35 Next.js App Router `page.tsx` routes under `apps/web/src/app`, their shared root/admin layouts, and shared navigation, footer, discovery, messaging, booking, and home components. This is a source-level audit using the incumbent UI as design authority. The installed Impeccable CLI does not expose an `audit` subcommand; its supported detector was run once over `src/app` and `src/components` and returned `[]`. Fixes below were applied to the implementation after the initial audit. No browser, axe scan, responsive screenshot, keyboard-only session, or contrast measurement was available, so visual claims below are limited to code evidence.

## Audit health score

| Dimension                |     Score | Key finding                                                                                                                                                   |
| ------------------------ | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility            |       3/4 | Conversation rows are buttons; custom overlays now have dialog semantics and focus handling. Runtime accessibility verification remains.                      |
| Performance              |       2/4 | React-rendered remote images use `next/image`; 33 of 35 page files remain client components; the Leaflet popup image is size-bounded for supported providers. |
| Responsive design        |       2/4 | Responsive Tailwind variants exist, but no viewport rendering was available to verify overflow, scaling, or touch targets.                                    |
| Theming                  |       3/4 | Repeated palette values now use semantic CSS variables; contextual status colors remain local and there is no dark theme.                                     |
| Implementation integrity |       3/4 | Footer placeholders no longer look interactive and message conversation selection is keyboard operable. Runtime behavior remains unverified.                  |
| **Total**                | **13/20** | **Acceptable; client-bundle and responsive verification work remains.**                                                                                       |

## Executive summary

The initial audit found **2 P1, 4 P2, and 1 P3** issues. The P1 issues and three P2 issues have been addressed. Remaining findings are **1 P2 and 1 P3**: broad client-component boundaries and unverified responsive behavior. The strongest product-system positives are the consistent StayScape palette/type pairing, explicit route headings on most pages, use of shared layout and domain components, and labeled core forms. The detector found no mechanical anti-patterns, but it does not replace runtime or assistive-technology testing.

## Findings

### P1 — Conversation selection is not keyboard accessible

- **Location:** `apps/web/src/components/messages/conversation-list.tsx:157`
- **Category:** Accessibility / Implementation integrity
- **Impact:** When `onSelect` is provided, a conversation is wrapped in a clickable `<div>` with no keyboard role, tab stop, or key handler. Keyboard and switch users cannot select that conversation through this branch.
- **Standard:** WCAG 2.1.1 Keyboard; 4.1.2 Name, Role, Value.
- **Resolution:** The selection branch now renders a full-width button with a participant-specific accessible name, active-state announcement, and visible keyboard focus ring.
- **Suggested command:** `$impeccable harden src/components/messages/conversation-list.tsx`

### P1 — Custom overlays are not exposed or managed as dialogs

- **Location:** Examples include `apps/web/src/components/stays/property-comparison-modal.tsx:76`, `apps/web/src/components/stays/report-listing-button.tsx:71`, `apps/web/src/components/layout/navbar.tsx:539` and `:592`, and `apps/web/src/app/account/page.tsx:320`.
- **Category:** Accessibility
- **Impact:** The overlay markup uses fixed-position containers without `role="dialog"`/`aria-modal`, and the inspected frontend contains no focus trap, initial focus, focus return, or Escape handling. Screen readers may not identify the active dialog, and keyboard focus can move behind it.
- **Standard:** WCAG 2.1.1 Keyboard; 2.4.3 Focus Order; 4.1.2 Name, Role, Value.
- **Resolution:** Added the shared `AccessibleDialog` wrapper and applied it to all 17 custom overlays. It provides an accessible name, modal semantics, initial focus, Tab containment, Escape handling, and focus restoration. Browser/axe verification remains pending.
- **Suggested command:** `$impeccable harden` on the shared modal components and their callers.

### P2 — App pages hydrate broadly as client components

- **Location:** 33 of 35 `page.tsx` files begin with `use client`; representative read-heavy routes include `apps/web/src/app/stays/[slug]/page.tsx` and `apps/web/src/app/admin/audit-logs/page.tsx`.
- **Category:** Performance
- **Impact:** Page-level client boundaries ship rendering and interaction code for the whole route. This increases hydration work and JavaScript delivery, especially on detail and admin read views.
- **Recommendation:** Keep the interactive islands client-side, but move static page shells and data-independent content to Server Components. Measure route bundle impact before/after; do not remove necessary auth or interaction behavior.
- **Suggested command:** `$impeccable optimize apps/web/src/app`

### P2 — Several rendered images bypass Next Image

- **Location:** `apps/web/src/app/host/page.tsx:250`, `apps/web/src/app/admin/properties/page.tsx:225`, `apps/web/src/app/admin/properties/[propertyId]/page.tsx:236`, `apps/web/src/app/host/listings/[id]/edit/page.tsx` (uploaded image preview), `apps/web/src/app/host/listings/page.tsx` (listing cover), `apps/web/src/app/host/listings/new/page.tsx` (uploaded image preview), and the map image URL handling in `apps/web/src/components/stays/discovery-map.tsx:25`.
- **Category:** Performance / Responsive design
- **Impact:** React-rendered images bypassed Next sizing. The map popup still uses Leaflet HTML and requires URL-safe optimization there.
- **Resolution:** React-rendered remote images now use `next/image` with fixed layout containers and `sizes`. The map popup keeps Leaflet-managed HTML and applies bounded 440?220 Cloudinary or Unsplash transformations while retaining URL escaping.
- **Suggested command:** `$impeccable optimize apps/web/src/app`

### P2 — Theme tokens are not the dominant source of truth

- **Location:** `apps/web/src/app/globals.css:3-13` defines CSS variables, while shared components such as `apps/web/src/components/layout/navbar.tsx` and `footer.tsx` repeat literal hex colors throughout.
- **Category:** Theming
- **Impact:** Palette updates and contrast corrections must be repeated across many files; the app has no dark-theme variant to switch these surfaces coherently.
- **Resolution:** Repeated palette literals in UI TSX now reference semantic root variables for surfaces, text, accents, borders, disabled text, and deep accent surfaces. Contextual status colors remain local. Dark mode remains a separate product decision.
- **Suggested command:** `$impeccable extract apps/web/src`

### P2 — Footer presents inert items as actions

- **Location:** `apps/web/src/components/layout/footer.tsx:163-165`; the decorative icon row is near `:27-50`.
- **Category:** Implementation integrity / Accessibility
- **Impact:** “Privacy Policy,” “Terms of Service,” “Sitemap,” and the icon actions look interactive but do not navigate or perform an action. Screen-reader users also encounter text rather than links for the legal items.
- **Resolution:** Placeholder social/contact icon circles are now decorative and hidden from assistive technology; legal and sitemap labels are plain text without pointer/hover affordances. They can become links when real destinations exist.
- **Suggested command:** `$impeccable clarify apps/web/src/components/layout/footer.tsx`

### P3 — Responsive and touch behavior remains unverified

- **Location:** All 35 routes; shared headers and dense admin tables are highest-priority runtime checks.
- **Category:** Responsive design / Accessibility
- **Impact:** Source contains mobile breakpoints, but static classes cannot show whether tables, dialogs, booking controls, and host forms fit narrow widths or retain practical touch targets at 200% zoom.
- **Recommendation:** Capture key guest, host, messaging, and admin routes at 320px, 768px, and desktop widths; verify no horizontal scroll except intentional carousels, and confirm controls remain comfortably tappable.
- **Suggested command:** `$impeccable adapt apps/web/src/app`

## Coverage inventory

All 35 page routes were enumerated: `/`, `/login`, `/register`, `/stays`, `/stays/[slug]`, `/staymatch`, `/account`, `/account/wishlist`, `/account/bookings`, `/account/bookings/[bookingReference]/review`, `/bookings/[bookingReference]`, `/bookings/[bookingReference]/confirmation`, `/messages`, `/messages/[conversationId]`, `/host`, `/host/onboarding`, `/host/listings`, `/host/listings/new`, `/host/listings/[id]/edit`, `/admin`, `/admin/ai-usage`, `/admin/audit-logs`, `/admin/bookings`, `/admin/bookings/[bookingReference]`, `/admin/hosts`, `/admin/hosts/[hostProfileId]`, `/admin/payments`, `/admin/properties`, `/admin/properties/[propertyId]`, `/admin/refunds`, `/admin/reports`, `/admin/reports/[reportId]`, `/admin/reviews`, `/admin/users`, and `/admin/users/[userId]`.

## Positive findings

- The app has a recognizable, consistent warm neutral / sage / terracotta visual language and shared DM Sans / DM Serif typography.
- Most route source files include an `<h1>` (the homepage delegates its main content to home sections); core login/registration/profile forms use visible labels.
- Responsive Tailwind variants are common, and reduced-motion, focus, and alt-text patterns exist in parts of the UI.
- Property discovery and detail use domain components rather than duplicating all interface logic in route files.
- Impeccable detector output was empty for the scanned app and component trees; this is a clean mechanical signal, not an accessibility pass.

## Recommended actions

1. **[P2] `$impeccable optimize`**: Measure routes before refactoring the remaining broad client boundaries; no page-level client rewrite was made without behavior-level evidence.
2. **[P2] `$impeccable optimize`**: Review the Leaflet popup image URL sizing separately; ordinary React-rendered remote photos now use `next/image`.
3. **[P3] `$impeccable adapt`**: Verify all route families at narrow, tablet, and desktop widths with browser and keyboard interaction checks.
4. **`$impeccable polish`**: Run after runtime accessibility and responsive verification.

## Fix and build follow-up

Implemented the two P1 accessibility fixes, semantic palette tokens, non-interactive footer placeholders, and Next Image optimization for React-rendered Cloudinary/remote photos. `pnpm typecheck` passed for API and web. The production web build passed and generated all 27 static pages; remaining build warnings concern pre-existing admin effect dependencies. The resulting build reports shared first-load JavaScript of 103 KB and route first-load values from 114 KB (`/login`) to 145 KB (`/messages`); the message route remains the heaviest. These are build metrics, not real-user or transfer-size measurements. The post-change Impeccable detector returned `[]`; browser/axe and responsive verification remain pending.
