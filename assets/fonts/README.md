# Inter web fonts

Inter variable normal, weights 300–900, from the Inter v20 files served by Google Fonts. License: [OFL.txt](OFL.txt), copyright The Inter Project Authors.

The Latin font covers the site's English, Italian, and Spanish text. The second subset covers Serbian Latin ČĆĐŠŽ and lowercase forms; other glyphs use the browser's fallback font. Both retain variable weights and use WOFF2. FontTools subsetting removed hinting and unused glyphs. The files are checked in so builds never depend on a font service.

Sources:
- Latin: https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2
- Extended Latin: https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5n-wU.woff2
- License: https://github.com/rsms/inter/blob/master/LICENSE.txt

The unicode ranges are declared in `index.css`. Vite emits hashed, separately cacheable font assets. `font-display: optional` allows an immediate fallback on slow connections and avoids late font swaps.
