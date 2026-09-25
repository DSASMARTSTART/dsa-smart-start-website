import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/assets/optimized');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;

// Build display-sized derivatives; retain source artwork and downloadable files.
for (const folder of ['ebooks', 'images', 'quiz']) {
  const base = path.join(root, 'public/assets', folder);
  for (const relative of await readdir(base, { recursive: true })) {
    if (!/\.(png|jpe?g)$/i.test(relative)) continue;
    const source = await readFile(path.join(base, relative));
    const metadata = await sharp(source).metadata();
    const widths =
      folder === 'ebooks' ? [320, 640, 960] : folder === 'quiz' ? [240, 480] : [160, 320, 640];
    const variants = [];
    for (const width of widths) {
      const { data, info } = await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toBuffer({ resolveWithObject: true });
      if (variants.some((item) => item.width === info.width)) continue;
      const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
      const name = `${path.parse(relative).name}-${info.width}-${hash}.webp`;
      await writeFile(path.join(output, name), data);
      variants.push({ src: `/assets/optimized/${name}`, width: info.width, bytes: data.length });
    }
    const src = `/assets/${folder}/${relative.split(path.sep).join('/')}`;
    manifest[src] = { width: metadata.width, height: metadata.height, variants };
    originalBytes += source.length;
    optimizedBytes += variants.at(-1).bytes;
  }
}
await writeFile(
  path.join(root, 'data/imageManifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
console.log(
  `Optimized ${Object.keys(manifest).length} images: ${(originalBytes / 1e6).toFixed(2)} MB → ${(optimizedBytes / 1e6).toFixed(2)} MB (largest variants).`
);
