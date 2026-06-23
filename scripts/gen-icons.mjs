// Rasterizes assets/icon.svg into the PNG sizes the stores + manifest need.
// Reproducible: `node scripts/gen-icons.mjs`. Output committed to public/icons/.
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'assets/icon.svg');
const outDir = resolve(root, 'public/icons');
const sizes = [16, 32, 48, 128];

await mkdir(outDir, { recursive: true });
const svg = await readFile(src);

for (const size of sizes) {
  const out = resolve(outDir, `${size}.png`);
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}
