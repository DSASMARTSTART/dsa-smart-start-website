# Loading investigation — September 25, 2026

Follow-up to the asset optimizations in `7e00ff8`, tested against the deployed site in Chrome using a 390 × 844 viewport, 4× CPU slowdown, 150 ms network latency, 200 KB/s download throughput and disabled browser cache.

## Reproduced problems

- Opening a product deep link first rendered the homepage, then loaded the requested page and its translation bundles. In the sampled live run the wrong heading appeared at 1.88 s and the product heading at 3.14 s.
- Page code and translations downloaded sequentially on navigation.
- An intercepted, stalled catalogue request left the live page showing empty skeletons after 17 s, without reaching its existing retry state.
- The live-learning provider keyed the whole application by user ID. Session restoration therefore remounted every page. A regression test reproduces and guards against this behavior.
- The dashboard awaited purchase/enrollment repair before reading existing courses, so an unrelated stalled repair could block the page.

## Changes

- One route parser resolves direct links before the first React render and also handles subsequent navigation.
- Initial route code, its namespaces and public product reads start concurrently. Data preloads reuse the existing cache; a populated catalogue renders without another loading skeleton.
- Database reads have a 15 s timeout that covers both headers and response bodies and preserves caller cancellation. Writes, payment operations and uploads retain their existing behavior. Read-only live-workspace/availability RPCs also use the timeout.
- Lazy page downloads have a 15 s deadline and reach the existing reload/home recovery screen on failure.
- Account changes reset live-learning context without remounting the application; responses belonging to a previous account are discarded.
- Enrollment repair runs in the background. A completed repair triggers a fresh enrollment read, including when it overlaps the initial fetch.
- Catalogue failure messages are localized in all four languages.

## Validation

- 108 tests pass, including cancellation, stalled response bodies, retry after timeout, account changes and delayed enrollment repair.
- Production build and performance budgets pass (entry about 41.8 KB gzip; lesson viewer about 5.4 KB gzip).
- No new TypeScript errors compared with the existing repository baseline; the repository still has unrelated type errors.
- Browser: a stalled catalogue reaches its retry state; removing the simulated failure and clicking retry restores the products.
- Preliminary local-production comparison: the product heading appears directly at 2.19 s, with route code, translations and data requests overlapping. This is a sample, not a field-performance guarantee; the local asset origin differs from production.
- Browser: home, about, contact, login, both catalogues, all four policies, empty checkout and the anonymous dashboard guard load without JavaScript exceptions or horizontal overflow. Catalogue loading succeeds in English, Italian, Serbian and Spanish. A stalled FAQ chunk reaches the reload/home recovery screen.
- Authenticated lifecycle and dashboard behavior are covered with controlled tests. No real client account or payment was used.
