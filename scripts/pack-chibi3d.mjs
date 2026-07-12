#!/usr/bin/env node
/**
 * Chibi3d GLB repacker (meshopt).
 *
 * Repacks every GLB under public/chibi3d/ with gltfpack:
 *   EXT_meshopt_compression + KHR_mesh_quantization, ~5-10x smaller files
 *   (ch0333: 28.1 MB -> 5.2 MB) with no visible quality loss.
 *
 *   npm run chibi3d:pack               # repack in place (originals kept in _orig/)
 *
 * The first run moves each original to public/chibi3d/_orig/<same relative path>
 * and writes the packed file to the live path; later runs repack from _orig, so
 * the script is idempotent and the originals are never lost. Upload the packed
 * live files to the R2 bucket (assets.eriduops.com/chibi3d) and purge the
 * Cloudflare cache for /chibi3d/* afterwards; the old edge copies are cached for
 * a year. Old (unpacked) GLBs keep loading fine: the app loader always has the
 * meshopt decoder attached (chibi3dCore.createGltfLoader), so code can ship
 * before or after the asset swap.
 *
 * Flag rationale (quality first, verified numerically against the originals:
 * max rotation error 0.1 deg on a hair bone, translation/scale error ~1e-4,
 * all node/material/animation names and clip durations preserved):
 *   -kn -km -ke   keep node names (halo/head/pelvis lookups), material names
 *                 (manifest material matching), and extras
 *   -ar 16        16-bit rotation quantization (default 12 visibly coarser on chibis)
 *   -af 0         no keyframe resampling: Unity-exported curves are already sparse,
 *                 resampling at 30/60 Hz is BIGGER and lossier here
 *   -ac           keep constant tracks, so switching clips still resets every bone
 *   -vpf          keep positions as floats: position quantization inserts an unnamed
 *                 dequantization child node under each mesh, which broke the halo
 *                 spring (it reads the halo geometry's local bounding box; the packed
 *                 int coordinates put the halo thousands of units off-screen). Costs
 *                 ~0.01 MB per file, geometry is a rounding error next to animation.
 *   -cc           max meshopt compression
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'public', 'chibi3d');
const origBase = join(base, '_orig');

const GLTFPACK_ARGS = ['-cc', '-kn', '-km', '-ke', '-ar', '16', '-af', '0', '-ac', '-vpf'];

const glbs = globSync('**/*.glb', { cwd: base, exclude: ['_orig/**'] });
if (!glbs.length) {
  console.error(`No GLBs found under ${base} (assets are gitignored; copy them in first).`);
  process.exit(1);
}

const mb = (path) => (statSync(path).size / 1048576).toFixed(2);
let failures = 0;
for (const rel of glbs.sort()) {
  const live = join(base, rel);
  const orig = join(origBase, rel);
  if (!existsSync(orig)) {
    mkdirSync(dirname(orig), { recursive: true });
    renameSync(live, orig);
  }
  const before = mb(orig);
  const res = spawnSync('npx', ['-y', 'gltfpack', '-i', orig, '-o', live, ...GLTFPACK_ARGS], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (res.status !== 0 || !existsSync(live)) {
    console.error(`FAILED ${rel} (original preserved at _orig/${rel})`);
    failures++;
    continue;
  }
  console.log(`${rel}: ${before} MB -> ${mb(live)} MB`);
}
process.exit(failures ? 1 : 0);
