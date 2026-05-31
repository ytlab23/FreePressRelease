# FreePressRelease — site/app integration

Two surfaces make up the product:

| Surface | Host | Owns |
| --- | --- | --- |
| **Static marketing site** | `freepressrelease.io` (this folder) | Landing, policies, contact, and the **public release pages** at `/press/<slug>` |
| **Portal app** | `my.freepressrelease.io` (`pressroom/apps/freepressrelease`) | Auth (login/signup/forgot/verify), dashboard, submit, admin, API, and the `/press/<slug>` **renderer** |

The release pages are *rendered* by the portal app (they're DB-backed) but *served*
under the apex so the public URL is `freepressrelease.io/press/<slug>`.

## 1. `/press` reverse proxy (this site)

`.htaccess` path-proxies the apex `/press/*` to the portal app:

```
freepressrelease.io/press/my-title  →  my.freepressrelease.io/press/my-title
```

- Requires Apache **mod_proxy + mod_proxy_http + mod_rewrite** (usually on by
  default on cPanel). Verify with your host.
- If mod_proxy is unavailable, do the rewrite at the edge instead — e.g. a
  Cloudflare rule, or host this static site on a platform with rewrites
  (Vercel/Netlify) and translate `.htaccess` into that platform's rewrite config.
- A plain 301/302 redirect is **not** a substitute: it would change the browser
  URL to `my.freepressrelease.io`, defeating the apex-canonical goal.

`.htaccess` also proxies `/press-sitemap.xml` and `/press-rss.xml` to the app's
`/sitemap.xml` and `/rss` (DB-backed). Reference `/press-sitemap.xml` from this
site's `robots.txt`/sitemap so the release URLs get indexed under the apex.

## 2. Canonical URLs (portal app)

The app builds public release URLs from `PUBLIC_SITE_URL` (default
`https://freepressrelease.io`):

- `app/press/[slug]/page.tsx` sets `<link rel="canonical">` and `og:url` to
  `PUBLIC_SITE_URL/press/<slug>`.
- `sitemap.ts`, `rss/route.ts`, submission approval emails, and the dashboard
  "view public page" link all use the same apex `/press/<slug>` form.
- `robots.ts` on `my.freepressrelease.io` disallows all crawling (the portal is
  private); indexing happens on the apex.

Set `PUBLIC_SITE_URL=https://freepressrelease.io` in the app's environment
(`.env.local` / hosting env). It defaults to the apex if unset.

## 3. Auth handoff (this site)

The static auth pages are gateways — they do **not** authenticate. The header
**Login** CTA links straight to `my.freepressrelease.io/login`, and the
login/signup/forgot forms hand off to the matching portal route (forwarding only
the typed email as a prefill hint; credentials are never posted from the static
site). The portal app owns the real, secure auth flow.

## Open item

There is no public **index/listing** of all releases on the apex (the app's old
`/latest` and `/category` browse pages were removed when the portal was slimmed to
auth + dashboard). If release discovery is needed on `freepressrelease.io`, add a
`/press` (or `/latest`) listing — either a static page that links to the proxied
app listing, or restore a read-only listing route in the app behind the proxy.
