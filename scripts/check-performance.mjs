import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const html = await readFile('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)[1];
const entryBytes = gzipSync(await readFile(`dist${entry}`)).length;
assert(entryBytes < 50_000, `Startup JS exceeds 50 kB gzip: ${entryBytes}`);
const viewer = (await readdir('dist/assets')).find((name) => /^CourseViewer-.*\.js$/.test(name));
assert(viewer, 'Missing lesson viewer chunk');
const viewerBytes = gzipSync(await readFile(`dist/assets/${viewer}`)).length;
assert(viewerBytes < 8_000, `Lesson viewer exceeds 8 kB gzip: ${viewerBytes}`);

const manifest = JSON.parse(await readFile('data/imageManifest.json', 'utf8'));
let original = 0;
let optimized = 0;
for (const [source, image] of Object.entries(manifest)) {
  original += (await stat(`public${source}`)).size;
  for (const variant of image.variants) {
    const bytes = (await stat(`dist${variant.src}`)).size;
    if (source.startsWith('/assets/ebooks/')) {
      assert(bytes < 65_000, `E-book display image too large: ${variant.src}`);
    }
  }
  optimized += (await stat(`dist${image.variants.at(-1).src}`)).size;
}
assert(optimized < original * 0.15, 'Display image payload must stay below 15% of the originals');
console.log(
  `Performance budgets passed: startup ${(entryBytes / 1000).toFixed(1)} kB gzip, lesson viewer ${(viewerBytes / 1000).toFixed(1)} kB gzip, images ${(optimized / 1e6).toFixed(2)} MB.`
);
