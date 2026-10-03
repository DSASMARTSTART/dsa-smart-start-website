import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const html = await readFile('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+\.js)"/)[1];
const entryBytes = gzipSync(await readFile(`dist${entry}`)).length;
assert(entryBytes < 50_000, `Startup JS exceeds 50 kB gzip: ${entryBytes}`);
// Measure every statically imported chunk, not just the entry file. A small
// entry can otherwise hide a large database, quiz or learning library preload.
const build = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
function staticImports(key, collected = new Set()) {
  if (collected.has(key)) return collected;
  assert(build[key], `Missing manifest import: ${key}`);
  collected.add(key);
  for (const dependency of build[key].imports ?? []) staticImports(dependency, collected);
  return collected;
}
const startup = staticImports('index.html');
let startupBytes = 0;
const styles = new Set();
for (const key of startup) {
  const chunk = build[key];
  startupBytes += gzipSync(await readFile(`dist/${chunk.file}`)).length;
  for (const css of chunk.css ?? []) styles.add(css);
  assert(
    !/(?:supabase|query|quiz|CourseEditor)/i.test(chunk.file),
    `Nonessential library blocks first render: ${chunk.file}`
  );
}
assert(startupBytes < 130_000, `Total startup JS exceeds 130 kB gzip: ${startupBytes}`);
let cssBytes = 0;
for (const css of styles) cssBytes += gzipSync(await readFile(`dist/${css}`)).length;
assert(cssBytes < 9_000, `Render-blocking CSS exceeds 9 kB gzip: ${cssBytes}`);
for (const [file, budget] of [['route.css', 13_000], ['workspace.css', 16_000]]) {
  const css = build[file];
  assert(css, `Missing route stylesheet: ${file}`);
  const bytes = gzipSync(await readFile(`dist/${css.file}`)).length;
  assert(bytes < budget, `${file} exceeds ${budget / 1000} kB gzip: ${bytes}`);
}
assert(!html.includes('fonts.googleapis.com'), 'Fonts must not require a third-party stylesheet');
for (const page of ['CoursesPage', 'EbookDetailPage', 'CourseSyllabusPage', 'LiveCourseDetailPage']) {
  for (const key of staticImports(`components/${page}.tsx`)) {
    assert(!/supabase/i.test(build[key].file), `Public product page waits for the auth SDK: ${page} -> ${build[key].file}`);
  }
}
for (const [key, chunk] of Object.entries(build)) {
  if (!chunk.isDynamicEntry || !/components\//.test(key)) continue;
  const bytes = gzipSync(await readFile(`dist/${chunk.file}`)).length;
  assert(bytes < 25_000, `Page chunk exceeds 25 kB gzip: ${key} (${bytes})`);
}
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
  `Performance budgets passed: entry ${(entryBytes / 1000).toFixed(1)} kB, total startup JS ${(startupBytes / 1000).toFixed(1)} kB, CSS ${(cssBytes / 1000).toFixed(1)} kB gzip, lesson viewer ${(viewerBytes / 1000).toFixed(1)} kB gzip, images ${(optimized / 1e6).toFixed(2)} MB.`
);
