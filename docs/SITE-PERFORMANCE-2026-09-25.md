# Site-wide performance work — 25 September 2026

Implemented locally on top of the homepage fixes. Nothing has been deployed by this task.

## Measured changes

| Resource | Before | After |
| --- | ---: | ---: |
| 106 local display images, largest generated variants | 18.57 MB | 1.16 MB |
| Seven local e-book covers, 640 px variants | 8.81 MB | 0.17 MB |
| A1 cover as used in the catalog | 1,904 kB | 24.8 kB |
| Lesson viewer JavaScript, uncompressed | 102.82 kB | 21.04 kB |
| Lesson viewer JavaScript, gzip | 20.98 kB | 5.44 kB |
| Main application JavaScript, gzip, versus original live build | 71.44 kB | 40.82 kB |

These are file/download sizes, not measured percentages of total page load time. Image totals exclude remote custom thumbnails. The main entry is slightly larger than the first homepage-only pass because it now includes shared image metadata and request controls.

## Implementation

- Generate responsive WebP derivatives for e-book covers, payment logos, supporting images and quiz artwork. Original files remain available. Build and development startup generate the derivatives automatically with Sharp.
- Use responsive sizes in the catalog, e-book details, syllabus, dashboard, checkout, footer, quizzes and live-learning photos. Public course thumbnails stored in this project's Supabase storage use its image transformation endpoint. Both local and remote transformed images fall back to the original on failure.
- Cache content-hashed image derivatives for a year, alongside the existing hashed JS/CSS policy. HTML and original unversioned images continue to revalidate.
- Share concurrent course reads, keep filter-specific results separate, reuse catalog data for product details/cart/checkout, and invalidate on course edits or account changes. Invalidated in-flight requests cannot repopulate the cache with stale data. This also fixes the old filtered-list cache returning the wrong catalog subset.
- Fetch cart item details concurrently and ignore stale results after navigation. Checkout item names update when the language changes.
- Load admin screens separately instead of downloading the complete admin section. Load placement tests, quizzes, final tests and question banks only when opened. Shared storage identifiers no longer import the final-test question bank into every lesson.
- Run dashboard enrollment and purchase reads concurrently after the existing enrollment repair. Move housekeeping and batched quiz history outside the course-list loading gate. Preserve pagination for long quiz histories and prevent overlapping dashboard polls.
- Fetch admin course counts concurrently and remove the unnecessary enrollment download behind an unimplemented progress metric.
- Pause recurring learning/library refreshes in hidden tabs, avoid overlapping scheduled refreshes, and limit global workspace polling to learning/admin views after its initial navigation lookup. Explicit mutation refreshes still run.
- Cap decorative canvas drawing at 30 frames per second on 11 pages; stop drawing while off-screen, in hidden tabs or when reduced motion is requested. Defer off-screen team photos and product-preview iframes.

## Verification

- `npm run build`: passed.
- `npm test`: all 101 tests passed. New coverage includes shared requests, filter isolation, invalidation races, polling visibility and dashboard rendering while housekeeping/quiz requests remain unresolved.
- `npm run check:performance`: passed. Checks cap startup JS at 50 kB gzip, lesson viewer JS at 8 kB gzip, e-book derivatives at 65 kB each, and combined largest image variants at 15% of source size. It also checks generated images exist in the production build.
- New TypeScript modules pass ESLint. The repository's 113 existing TypeScript errors are unchanged after normalizing shifted line numbers.
- Browser checks covered homepage, about, both catalog tabs, e-book details, FAQ, contact, login, empty/nonempty checkout, and signed-out dashboard/live-learning/admin guards, with no unexpected page exceptions.
- A fresh catalog visit made one course-list request instead of the two observed before this pass. Navigating to a product and adding two products to checkout reused cached details; checkout displayed the expected EUR 70 total without more course reads.
- Mobile catalog inspection at 390 × 844 had no horizontal overflow; the responsive cover was legible. Payment logos retained their proportions.
- Deliberately blocked optimized-image and Supabase image-transform requests recovered to original images.
- Browser instrumentation recorded decorative canvas drawing stopping after scrolling away, and remaining stopped with reduced motion enabled.

Authenticated student/admin flows were covered by automated tests, not a production account login. The local environment does not configure a payment gateway, so verification stopped at cart rendering; no payment was initiated. Production timing, CDN headers and real authenticated sessions still require a check after deployment.

## Reproducing the checks

Run `npm ci`, `npm run build`, `npm run check:performance`, then `npm test`. `npm run images:optimize` regenerates the committed image manifest and ignored `public/assets/optimized/` files. `npm run dev` also generates images before starting Vite. Keep the prebuild step when configuring deployment.

References: [Sharp resizing](https://sharp.pixelplumbing.com/api-resize/), [Sharp WebP output](https://sharp.pixelplumbing.com/api-output/), and [Vercel header configuration](https://vercel.com/docs/project-configuration/vercel-json).
