# Loading performance — October 3, 2026

Implemented locally; not deployed. The result is a substantial improvement, **not a verified 100 on every page/device**.

## Measured results

Lighthouse 13.5.0 against Vite production previews, with default simulated mobile throttling and the desktop preset. The original source was rebuilt in an isolated temporary directory with the same installed dependencies and backend configuration for the catalogue/FAQ comparisons. The homepage baseline was captured before edits. Public product reads used the configured backend.

| Page / profile | Before | After | Final FCP | Final LCP | Final CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home / mobile | 84 | 97 | 1.8 s | 2.3 s | 0 |
| Home / desktop | 100 | 100 | 0.4 s | 0.5 s | 0 |
| Catalogue / mobile | 65 | 95 | 2.0 s | 2.6 s | 0 |
| FAQ / mobile | 76 | 96 | 1.9 s | 2.5 s | 0 |
| Login / mobile | Not measured | 94 | 1.9 s | 2.8 s | 0 |
| Contact / mobile | Not measured | 96 | 1.9 s | 2.5 s | 0 |

Two runs after conditional auth initialization scored 97 with zero total blocking time. The preceding pass scored 96 twice with total blocking time of 20 ms and 0 ms. The catalogue row uses the public-read follow-up below. The other rows retain their most recent measurements from earlier passes. Baseline mobile homepage FCP was 3.2 s, LCP 3.5 s, and total blocking time 110 ms. The original catalogue and FAQ layout shifts were 0.463 and 0.400 respectively.

| Build budget | Before | After |
| --- | ---: | ---: |
| All startup JavaScript, gzip | 191.8 kB | 123.3 kB (36% smaller) |
| Render-blocking stylesheet, gzip | 16.4 kB | 7.5 kB (54% smaller) |
| Entry JavaScript, gzip | 42.5 kB | 30.7 kB |

Scores vary with hardware, network, backend response times, and measurement conditions. These are local lab results, not production field measurements or exhaustive physical-device coverage. See [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

## Changes

- Fresh anonymous informational pages, product catalogues, product details, and saved-cart price reads do not download the authentication SDK until an account-dependent feature needs it. Saved sessions, auth callbacks, protected navigation, cross-tab storage changes, and focus checks still initialize auth; blocked storage falls back to normal initialization. Authentication remains in one mounted provider, restores sessions asynchronously, preserves redirects and profile checks, and cleans up subscriptions when unmounted. Public catalogue requests still overlap page/translation downloads.
- Product detail pages synchronously reuse cached details, ignore results after unmount, and reset state when the selected product changes. Loading nodes are replaced rather than recycled into the product hero. Admin syllabus requests depend on access booleans rather than unstable callback identities.
- Published catalogue/detail reads use a small REST module with the public project key, the existing published filter and RLS, and bounded read timeouts. They never use a saved user token. Private reads and writes retain the authenticated SDK. Both paths share course mapping and cache invalidation.
- Course cache invalidation is separate from the database implementation. Footer, cart, live-learning actions, and enrollment checks load their API code when needed.
- React Query loads with the dashboard and lesson viewer, using the existing shared query client.
- Quiz image metadata ships with quizzes, not the public shell. Existing responsive image generation still covers all 106 local images.
- Unsplash photos now use responsive widths. Below-viewport homepage sections use `content-visibility: auto`; their content remains in the document and normal rendering is restored for printing.
- A small initial Tailwind stylesheet covers the shell and homepage. Public routes load a smaller utility sheet; protected dashboards, lessons, admin, and live-learning screens load the complete sheet. A shared loader reuses the complete sheet on later public navigation and preserves utility ordering. All placement-test entry points wait for their code, translations, and styles together.
- Inter fonts are local, subsetted, and use optional display. Hashed font assets receive immutable caching; fonts are not embedded in the blocking stylesheet. Attribution and source details are in `assets/fonts/README.md`.
- Route loading reserves a full viewport so the footer cannot appear and then jump away during page download. The catalogue renders its actual heading immediately and reserves loading placeholders for product cards. Removed mouse-move state updates that rerendered the entire catalogue for a decorative effect.
- Footer catalogue reads require actual visibility, avoiding the old 400-pixel preload margin that downloaded the full catalogue while a single product was loading. A browser check confirmed zero SDK/catalogue requests before scrolling, then one catalogue request when the footer became visible.
- Contact submission code loads when the form receives focus or is submitted; the contact-page check showed zero SDK requests before focus and no POST requests during the focus-only test.
- Data-dependent routes receive an early API connection hint in HTML. It performs no data request or auth operation. See [resource hints](https://web.dev/learn/performance/resource-hints).
- Marketing video previews use a local poster and translated Play button; the Vimeo player and its scripts load only on activation. Enter starts playback and focus moves into the player. Product/language changes reset the preview. Regional browser languages such as `en-US`, `it-IT`, and `es-MX` resolve to the configured language video instead of silently hiding it.
- Contact and Who We Are no longer rerender their entire content on mouse movement. Large decorative glows on those pages and product heroes follow the existing mobile/coarse-pointer limits.
- The footer stays stacked on tablets to prevent payment logos from overflowing horizontally.
- `npm run check:performance` now measures the full static JavaScript import graph, initial CSS, and page chunks, in addition to existing lesson-viewer/image budgets. Database, query, and quiz chunks are prohibited in the initial static import graph. The auth SDK is also prohibited in the static dependencies of all four public product pages.

## Validation

- Production build and performance budgets pass.
- 195 tests pass across 35 files, including new checks for asynchronous auth startup, subscription cleanup, a catalogue heading that remains mounted during slow product reads, deferred anonymous auth, cross-tab wakeups, synchronous product cache reads, and footer request gating.
- Browser route matrix: 14 public/anonymous routes at 390, 768, and 1440 pixels (42 combinations), with no JavaScript exceptions, broken loaded images, or horizontal overflow.
- Homepage and catalogue in English, Italian, Serbian, and Spanish at all three widths (24 combinations): correct document language and headings, no exceptions or horizontal overflow.
- Follow-up product/auth route matrix: homepage, FAQ, login, anonymous dashboard, e-book detail, interactive syllabus, and live-course detail at all three widths (21 combinations), with no exceptions or horizontal overflow.
- Product detail → add to cart → checkout displays the selected e-book and its price. No purchase was submitted.
- Placement test opens from the homepage with its complete modal styles. Mobile homepage and desktop modal screenshots inspected.
- Lint on changed application files reports no errors; existing warnings remain.
- TypeScript still reports existing checkout, seed-data, and Deno-function errors. Diagnostic comparison against the original source found no new diagnostic groups.

Raw reports, browser observations, and screenshots are under ignored `output/playwright/performance/`. Use `next-home-*.json`, `next-faq-mobile.json`, and `next-contact-mobile.json` for the latest corresponding results; the current catalogue measurement is `public-read-catalogue-mobile.json`, and the retained login measurement is in `release-*.json`. Earlier experimental reports do not represent the final build; in particular `after-mobile-2.json` and `after-mobile-3.json` came from a discarded chunk-splitting experiment that failed startup and are invalid performance evidence.

## Product detail follow-up

The A1 e-book page initially measured 67 mobile, LCP 4.0 s, CLS 0.437 at the start of the second pass. Replacing the recycled loading nodes reduced CLS to zero. The final footer-gated sample scored 90 with LCP 3.4 s and FCP 1.9 s; intermediate zero-CLS runs ranged from 86 to 93 as the external API timings varied. Desktop scored 100 with LCP 0.7 s and zero CLS. This is still below the requested mobile 100.

That pass’s product report is `next-product-mobile-footer.json`; it contains a single course-detail GET (about 2.4 kB). Earlier samples also downloaded the full catalogue (about 20 kB) while the loading placeholder put the footer near the viewport. The new footer visibility rule removes that competing request. The connection hint and in-memory cache do not eliminate an uncached backend round trip.

## Media and interaction follow-up

On a 390-pixel Chromium browser, the Kids Basic e-book initially made 15 Vimeo/player/CDN requests before its preview entered the viewport. Native iframe lazy loading started those requests with the frame about 1,752 pixels below the viewport top. The new preview makes zero Vimeo requests both before scrolling and with its poster visible, until the visitor presses Play. A keyboard-driven browser check confirmed actual playback (`paused: false`, `readyState: 4`, advancing time, no media error), then paused the video. See `video-traffic-before.txt`, `video-traffic-after.txt`, and `video-playback.txt`.

The Kids e-book measured 93 mobile before and after this pass, with LCP 3.0 s and zero CLS; the earlier desktop sample scored 100. These Lighthouse runs did not load the original video iframe, so their scores do not capture the background traffic observed in the separate browser check. Who We Are remained at 97 mobile, LCP 2.3 s, zero CLS. Removing mouse-driven React state updates targets interaction work, not a claimed Lighthouse score gain. The preview follows the [third-party embed guidance](https://web.dev/articles/embed-best-practices).

Five changed routes passed browser checks at 390, 768, and 1440 pixels (15 combinations): no page exceptions or horizontal overflow, and mobile decorative glows were hidden. Preview labels were checked in all four languages; Serbian correctly has no preview because none is configured. Mobile and desktop preview screenshots were inspected. New tests cover deferred player creation, preserved embed parameters, focus transfer, and resetting when the video changes.

Cross-engine checks covered 24 WebKit mobile route/viewport combinations (320, 402, and 768 pixels) and 16 Firefox combinations (390 and 1440 pixels). All expected page headings rendered without horizontal overflow. The WebKit check exposed a pre-existing video lookup bug with the default `en-US` browser language; that bug is fixed and covered by five regional-language tests. Repeats confirmed one-tap playback on WebKit and one-key playback on Firefox, with advancing video time and no media error in both. Chromium playback was also verified. See `video-webkit-final.txt` and `video-firefox-final.txt`. These are emulated browser checks, not physical iOS-device performance measurements.

Firefox reported an SDK lock-acquisition exception during initialization. A controlled comparison reproduced it in both the original source build and the changed build. Both completed the catalogue request and rendered the Starter Path card, with no pending/held navigator locks and no DOM `error` or `unhandledrejection` events. The installed SDK catches this timeout during its automatic refresh tick. No locking bypass or suppression was added. Raw observations are in `routes-firefox.txt`, `firefox-lock-comparison.txt`, and `firefox-lock-inspect.txt`; authenticated Firefox refresh remains outside the account-free verification scope.

An experiment inlining the shell stylesheet scored 98 instead of 97 on the homepage in one sample. It was not retained: the small measured difference did not justify sending the stylesheet again with every HTML response instead of caching it separately. `inline-home-mobile.json` is experimental, not the final build.

## Published product loading follow-up

Published product reads now start without downloading or initializing the authentication SDK. The REST path always selects published products with anonymous credentials, never reads stored user tokens, shares the existing 60-second in-memory cache, and uses the existing bounded fetch implementation. A runtime unpublished flag cannot write into the admin cache. Admin draft previews, enrollment checks, checkout, and session restoration keep their authenticated path. The public endpoint retains Supabase’s [Data API row-level security](https://supabase.com/docs/guides/api).

Matched A1 e-book mobile measurements before and after this change:

| Metric | Before | After |
| --- | ---: | ---: |
| Performance score | 93 | 95 |
| FCP | 2.1 s | 2.0 s |
| LCP | 3.0 s | 2.7 s |
| Total script transfer | 206.3 kB | 154.1 kB |
| Layout shift | 0 | 0 |

The script reduction is about 52 kB (25%). The current catalogue measured 95 mobile, FCP 2.0 s, LCP 2.6 s, and zero CLS. These are single local lab samples with real backend reads; they do not prove a universal score. Reports: `public-read-before-mobile.json`, `public-read-after-mobile.json`, and `public-read-catalogue-mobile.json`.

Public catalogue, A1 e-book, interactive syllabus, and live-course detail passed 36 browser checks across Chromium, Firefox, and WebKit, at three viewport widths each. All rendered their expected content with zero auth-SDK script requests, page exceptions, or horizontal overflow. The catalogue check waited for its actual Starter Path product card, not just the header. In the new anonymous public path, Firefox no longer reaches the SDK initialization that produced the lock report above. Authenticated Firefox behavior is unchanged.

A saved A1 cart showed €35.00 after one public read and zero SDK requests. Clicking the cart opened checkout, loaded the authenticated code, and displayed the correct product; no payment was submitted. Tests verify public/SDK cache reuse, anonymous credentials, published filtering, encoded IDs, retry after missing/failed responses, cache invalidation, saved-session bootstrap, deferred enrollment checks, and preserved admin draft reads. Static build checks reject a reintroduced SDK dependency in any public product page.

## Route stylesheet follow-up

The public route stylesheet is now 12,190 bytes gzip instead of 14,904 bytes, an 18% reduction. The workspace sheet is byte-for-byte identical to the prior complete stylesheet. Protected routes load that sheet directly; visiting a public route afterward reuses it rather than downloading a subset and changing rule order. When a public route is visited first, its sheet precedes the complete workspace sheet. New loader tests and browser navigation checks cover both orders.

Rendered-style comparisons on nine routes at 390, 768, and 1440 pixels found zero differences across 27 combinations. Checks covered display, positioning, flex/grid layout, dimensions, spacing, borders, typography, colors, overflow, shadows, filters, and transforms. The comparison appended the previous full sheet to the same document and compared computed styles. Animations and transitions were disabled for stable comparisons. Mobile placement-test screenshots and dialog layout matched both from a cold homepage and after visiting the anonymous dashboard; the latter downloaded no public route sheet. Artifacts: `css-split-comparison.txt`, `css-split-popup.txt`, and `css-popup-*.png`.

The associated A1 e-book Lighthouse sample scored 94 mobile with FCP 2.2 s, LCP 2.7 s, and zero CLS. The previous sample scored 95 with the same LCP. No score improvement is claimed for this change; the verified gain is less stylesheet transfer. `css-split-product-mobile.json` records that sample. Production build, stylesheet budgets, and 180 tests pass; no new TypeScript diagnostic groups were introduced.

## Live production baseline

A read-only production audit confirmed that the deployed site still serves the older bundle (`index-BqvuPjz6.js`) with eager Supabase and React Query scripts and remote Google Fonts. None of the local changes described above have been deployed. The HTML response was a Vercel cache hit; the hashed JavaScript already had one-year immutable caching, so missing asset cache headers were not the observed production issue.

The first mobile Lighthouse sample from `https://eduway.academy/` scored 71 with FCP/LCP 4.7 s, zero blocking time, and zero CLS. It followed the production 307 redirect to `https://www.eduway.academy/`; Lighthouse attributed about 887 ms to the redirect and warned to test the destination directly. A direct `www` sample scored 95 with FCP 2.1 s, LCP 2.6 s, zero blocking time, and CLS 0.001. Both final screenshots show the actual homepage, and neither run reported a runtime error. These are variable lab samples of the existing deployment; the entire difference cannot be attributed to the redirect or to local code changes.

A repeat from the apex hostname scored 73 with FCP 4.6 s and LCP 4.6 s; Lighthouse measured 851 ms of redirect delay. This reinforces the need to report the test URL and multiple samples. Reports: `production-home-mobile.json`, `production-www-home-mobile.json`, and `production-apex-home-mobile-repeat.json`. The site metadata and sitemap still advertise the apex hostname even though production redirects to `www`; aligning advertised URLs with the chosen production hostname is a deployment follow-up.

## Enrolled lesson loading follow-up

The lesson viewer now uses the existing `get_course_for_enrolled_user` RPC as its primary authenticated read. That server function checks active enrollment (or an admin/editor role) before returning a course and supports enrolled access to unpublished courses. A successful student load therefore needs one read in one network stage, instead of a published-course read and enrollment read followed by the enrolled-course RPC (three reads in two stages). No backend permissions or SQL were changed.

If the RPC returns no course or is unavailable, the viewer retains the explicit active-enrollment check plus published-course fallback. That exceptional path can take an additional stage; published content alone never grants lesson access. Anonymous visitors retain a public course-info read, and admins/editors retain their draft-preview API. Requests wait for session restoration, use stable user/role dependencies, and ignore late responses after a course or account change. Previously loaded content is hidden while the new access check is pending.

Ten new regression tests cover the one-read success path, denial, null/rejected RPC fallback, both privileged roles, session restoration, callback identity changes, navigation races, logout, and user switching. Existing live-course integration tests continue to pass. The full suite now passes 190 tests across 34 files, the production build and performance budgets pass, and TypeScript diagnostic groups are unchanged from the existing baseline. The lesson viewer is 5.7 kB gzip. Chromium checks at 390, 768, and 1440 pixels verified the real anonymous access-denied page, one public course read, no enrollment RPC, no horizontal overflow, and no page exceptions. Artifacts: `tests-viewer-access*.txt`, `viewer-access-anonymous.txt`, and `build-viewer-access.txt`.

This verifies fewer requests and removal of the successful-path waterfall in controlled tests. It does not establish a real student-account timing or a physical-device Lighthouse score; test-account details are still pending.

## Background request follow-up

The booking calendar and admin payment-orphan badge now reuse the existing visibility-aware polling helper. They make no background polls while the document is hidden, avoid starting another read while the previous read is pending, refresh after returning to a stale visible tab, and remove timers/listeners on unmount. The admin badge also waits for verified access and stops when access is revoked. Existing visible polling intervals remain 30 seconds for availability and 60 seconds for the badge.

The booking calendar now initializes its selected day to today. It previously initialized to Monday and changed to today in an effect, which could issue an unnecessary availability request on the first render. Controlled component tests now verify exactly one initial availability read, zero additional reads during 90 hidden seconds, a single refresh across simultaneous visibility/focus events, and no overlapping reads during a slow response. Three admin tests cover hidden startup/resume, revoked access, and overlapping requests. These are simulated timing tests, not real-account network benchmarks.

The full suite passes 195 tests in 35 files. The production build, performance budgets, and changed-file lint pass; TypeScript diagnostic groups remain unchanged. Startup transfer budgets are unchanged. Artifacts: `tests-visible-polling-full.txt`, `build-visible-polling.txt`, `lint-visible-polling.txt`, and `types-visible-polling.txt`.

## Current release verification

After the lesson and background-request changes, the current production-preview homepage again scored 97 mobile: FCP 1.8 s, LCP 2.3 s, zero blocking time, and zero CLS. The final screenshot showed the actual homepage, with no Lighthouse runtime error. This sample is `release-current-home-mobile.json`; its built entry was `assets/index-9_pAPgAe.js`. The remaining unused-JavaScript finding in the earlier homepage audit identifies the shared React runtime rather than a separately deferrable product feature.

## Remaining scope

The optimized build must be deployed and measured separately from the existing production baseline above. Deployment discovery found no linked project or repository deployment workflow. The existing Vercel CLI login is valid, but read-only domain and deployment inspection failed for `eduway.academy` / `www.eduway.academy` in both accessible teams. No hosting configuration or deployment was changed. The owning project/account is required before publishing; the user has been asked for the existing target. Authenticated student/admin/teacher workflows have automated regression coverage, but were not benchmarked with real accounts. Actual lesson video startup, downloads, payments, and API response time depend on their providers and the visitor's connection. Achieving 100 for every route and device has not been demonstrated. Reaching materially faster first loads beyond this point may warrant server-rendered, URL-addressable pages rather than the current hash-routed SPA; that is an architectural follow-up, not part of this change.

Reproduce checks:

```sh
npm run build
npm run check:performance
npm test
npm run preview -- --host 127.0.0.1 --port 4173
npx --yes lighthouse@13.5.0 http://127.0.0.1:4173/ --only-categories=performance --chrome-flags='--headless'
```
