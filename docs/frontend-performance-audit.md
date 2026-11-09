# Frontend performance audit

## Inspected

Reviewed Next.js 15 App Router page/component boundaries, images, maps, Razorpay script hook, dashboards, chat socket lifecycle, auth context, and API client. Next/Image and `remotePatterns` are used for many property images; Leaflet maps are dynamically imported in host listing flows. Razorpay script is injected only by the booking hook. The discovery map uses a Leaflet map implementation and should remain dynamically loaded at its page boundary.

## Findings

- Many major pages are client components because they own interaction and auth state; a broad Server Component conversion would require architectural redesign and was not attempted.
- Some host/admin galleries still use plain `<img>` elements; convert those to `next/image` with stable dimensions where practical.
- No bundle analyzer or production Web Vitals data is configured. No production build/Lighthouse run has yet generated field data, so LCP/INP/CLS values are not claimed.
- Production build output after dynamically splitting the discovery map reported route first-load JavaScript from 114 KB (`/login`) to 145 KB (`/messages`) and 103 KB shared JS. These are build figures, not transfer sizes or Core Web Vitals.
- CSP allows inline scripts/styles to support current hydration and Razorpay integration; nonce-based CSP requires runtime validation.
- Leaflet tile hosts are now present in CSP image sources.

## Follow-up

Capture `next build` output and add the official Next.js bundle analyzer after validating package/version compatibility. Measure lab Web Vitals on key routes and separately collect field metrics after launch. Prioritize dynamic import of discovery map and admin charts, stable image dimensions, and avoiding duplicate auth/data requests. Respect reduced motion and avoid client-side hydration of static content when possible.
