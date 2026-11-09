# Accessibility audit

## Reviewed

Reviewed major App Router flows and shared controls for semantic elements, image alternatives, labels, dialog patterns, keyboard interaction, focus behavior, and reduced-motion handling by static source inspection. Existing pages include many labeled form controls and alt text; a source review cannot establish contrast ratios or complete keyboard usability.

## Gaps

No axe/Playwright accessibility runner or browser environment is configured. No automated scan or manual screen-reader/keyboard session was run, so no certification claim is made. Review image alt text for generic labels in gallery/admin views, modal focus return, status announcements during booking/payment, focus visibility, and contrast across muted text.

## Follow-up

Add axe-core to browser tests and scan home, search, property, login/register, checkout, messaging, host, and admin flows at desktop and mobile widths. Fix serious violations and manually verify keyboard-only forms and dialogs, reduced-motion settings, and status announcements.
