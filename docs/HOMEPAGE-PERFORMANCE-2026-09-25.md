# Homepage loading investigation — 25 September 2026

Implemented and verified locally. Production deployment is still required.

## Findings

- The live homepage responded successfully during the check. One fresh browser visit showed content after roughly 2 seconds; this is one observation, not a representative customer benchmark.
- Blocking the Italian translation chunk reproduced a completely empty React root on the live build. Startup waited on an uncaught translation promise, outside the React error boundary.
- Every visit downloaded English translations for all pages. Italian, Serbian and Spanish visitors also downloaded an entire second language before rendering the homepage.
- The homepage included the placement test code before anyone opened it, fetched the course catalog for off-screen footer links, and immediately downloaded off-screen photos and payment logos. The Visa and DinaCard images alone transferred about 308 kB.
- The Google Fonts stylesheet was render-blocking.
- A live JavaScript response had `Cache-Control: public, max-age=0, must-revalidate`. The catch-all header rule came after the intended immutable asset rule, overriding it.

## Changes and measured payloads

Startup now loads only the common and home translation namespaces. Other namespaces and the placement test load when used. English homepage strings remain bundled as a fallback. Failed or stalled locale requests finish with fallback content after at most four seconds per request, preserving the selected language. Static HTML supplies a translated loading state and a reload link if the entry script cannot start.

Homepage images use native lazy loading and asynchronous decoding. Footer catalog fetching starts when the footer approaches the viewport. Fonts no longer block rendering. Versioned JavaScript and CSS receive the immutable caching rule after the general rule; HTML and unversioned assets still revalidate.

| Production build payload | Before (gzip) | After (gzip) |
| --- | ---: | ---: |
| Main application JavaScript | 71.44 kB | 34.81 kB |
| Italian startup translations | 38.15 kB | 5.98 kB |

The main application chunk is about 51% smaller. These numbers describe individual downloads, not a claim that total page load time improved by the same percentage. Shared vendor files remain separate downloads.

## Verification

- Production build passes without warnings.
- All 91 tests pass, including translation failure, timeout, and namespace-loading regressions.
- Browser checks passed for English, Italian, Serbian, and Spanish; Italian language switching; FAQ, contact, terms, login and courses navigation; and opening the placement test.
- Failed locale downloads show English content instead of a blank page. With locale and font requests deliberately stalled, the homepage still rendered and retained the Italian preference.
- Mobile inspection at 390 × 844 showed no horizontal overflow. Footer data was fetched on scroll and its course links populated.
- Cold-cache mobile simulation used 150 ms latency, 200 kB/s download throughput and 4× CPU slowdown. The revised homepage did not request the placement test, route translation bundles, footer logos, distant pathway photos or footer catalog before scrolling.
- Changed TypeScript files have no ESLint errors; six existing unused-symbol warnings remain. Repository-wide TypeScript checking has 113 pre-existing errors, with identical diagnostics against `HEAD` and this change.
- The cache matcher was checked against hashed JS/CSS and unversioned assets using the path parser used by Vercel. Actual response headers need verification after deployment.

After deployment, verify the homepage in all four languages, check the deployed JS/CSS cache headers, and repeat a cold-load check from the clients' devices or network conditions. Deployment and production performance improvements have not yet been verified.

Implementation references: [i18next lazy translation loading](https://www.i18next.com/how-to/add-or-load-translations), [i18next backend plugins](https://www.i18next.com/misc/creating-own-plugins), and [Vercel response headers](https://vercel.com/docs/project-configuration/vercel-json).
