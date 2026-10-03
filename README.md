# vaidasbagdonas.com

Personal site, plain static HTML on Vercel (deploys from `master`). Same green/lime style as the
paslaugos.lt profile gallery (`~/Sites/paslaugos/gallery/v3`).

- `index.html` – Lithuanian (clients from paslaugos.lt), `en/index.html` – English (LinkedIn).
- `style.css` – shared styles. `img/` – avatar, project screenshots, `og.jpg` share image.
- `tools/og.html` / `tools/og-en.html` – sources of `img/og.jpg` / `img/og-en.jpg` (1200×630); render with a headless browser screenshot.
- Links kept professional only: email, LinkedIn, paslaugos.lt. No phone number (spam).
- Keep prices and the launch offer in sync with `~/Sites/paslaugos` (README "Pricing in use").
- Vercel project Node version must be 24.x — 20.x is discontinued and fails every deploy (fixed 2026-10-03).
