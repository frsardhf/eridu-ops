#!/usr/bin/env node
/**
 * Chibi3d deliverable sync and GLB repacker (meshopt).
 *
 * Reads master assets from ~/Documents/Data/deliverable and writes the local
 * development mirror under public/chibi3d. Character GLBs are packed directly
 * from the master source with EXT_meshopt_compression and KHR_mesh_quantization.
 * Original character GLBs are never copied into public and no _orig archive is
 * created there. Manifests and only the external mouth textures referenced by
 * each manifest are copied alongside the packed model.
 *
 * Furniture GLBs stay unpacked. Packed furniture showed visible artifacts, and
 * these files are small compared with the animation-heavy character models.
 * scenes.json is synced from the deliverable POC.
 *
 *   npm run chibi3d:pack
 *   CHIBI3D_SOURCE=/path/to/deliverable npm run chibi3d:pack
 *
 * After uploading public/chibi3d to R2, invalidate the edge with Purge
 * Everything. The host serves Vary: Origin, so per-URL purges can miss the
 * Origin-keyed browser variant. The runtime loader supports packed and unpacked
 * GLBs, which keeps stale cached copies compatible during rollout.
 *
 * Flag rationale:
 *   -kn -km -ke   keep node names, material names, and extras
 *   -ar 16        use 16-bit rotation quantization
 *   -af 0         preserve the sparse Unity-exported animation curves
 *   -ac           retain constant tracks so clip changes reset every bone
 *   -vpf          keep positions as floats so the halo geometry stays aligned
 *   -cc           use maximum meshopt compression
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputBase = join(root, 'public', 'chibi3d');
const sourceBase =
  process.env.CHIBI3D_SOURCE ?? join(homedir(), 'Documents', 'Data', 'deliverable');
const characterSource = join(sourceBase, 'characters');
const furnitureSource = join(sourceBase, 'furniture');

const GLTFPACK_ARGS = ['-cc', '-kn', '-km', '-ke', '-ar', '16', '-af', '0', '-ac', '-vpf'];
const SKIPPED_CHARACTER_IDS = new Set(['ch0114']);
const mb = (path) => (statSync(path).size / 1048576).toFixed(2);

if (!existsSync(characterSource)) {
  console.error(`Character source not found: ${characterSource}`);
  process.exit(1);
}

mkdirSync(outputBase, { recursive: true });
let failures = 0;
let packed = 0;

for (const charId of readdirSync(characterSource).sort()) {
  const sourceDir = join(characterSource, charId);
  if (!statSync(sourceDir).isDirectory()) continue;
  if (SKIPPED_CHARACTER_IDS.has(charId)) {
    console.warn(`SKIP ${charId}: excluded from the chibi picker.`);
    continue;
  }
  const manifestSource = join(sourceDir, `${charId}.manifest.json`);
  if (!existsSync(manifestSource)) continue;

  const manifest = JSON.parse(readFileSync(manifestSource, 'utf8').replace(/^\uFEFF/, ''));
  const modelSource = join(sourceDir, manifest.model);
  if (!existsSync(modelSource)) {
    console.warn(`SKIP ${charId}: ${manifest.model} is missing from the deliverable.`);
    continue;
  }

  const outputDir = join(outputBase, charId);
  const modelOutput = join(outputDir, basename(manifest.model));
  mkdirSync(outputDir, { recursive: true });
  copyFileSync(manifestSource, join(outputDir, `${charId}.manifest.json`));

  const eyeMouthTextures = manifest.materials?.EyeMouth?.textures ?? {};
  for (const file of [eyeMouthTextures.mouthAtlas, eyeMouthTextures.mouthMask]) {
    if (!file) continue;
    const textureSource = join(sourceDir, 'textures', file);
    if (!existsSync(textureSource)) {
      console.error(`MISSING ${charId}/textures/${file}`);
      failures++;
      continue;
    }
    const textureOutput = join(outputDir, 'textures', file);
    mkdirSync(dirname(textureOutput), { recursive: true });
    copyFileSync(textureSource, textureOutput);
  }

  const result = spawnSync(
    'npx',
    ['-y', 'gltfpack', '-i', modelSource, '-o', modelOutput, ...GLTFPACK_ARGS],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (result.status !== 0 || !existsSync(modelOutput)) {
    console.error(`FAILED ${charId}/${manifest.model}`);
    failures++;
    continue;
  }
  packed++;
  console.log(`${charId}/${manifest.model}: ${mb(modelSource)} MB -> ${mb(modelOutput)} MB`);
}

const furnitureOutput = join(outputBase, 'furniture');
mkdirSync(furnitureOutput, { recursive: true });
for (const file of readdirSync(furnitureSource)
  .filter((name) => name.endsWith('.glb'))
  .sort()) {
  copyFileSync(join(furnitureSource, file), join(furnitureOutput, file));
}
copyFileSync(join(sourceBase, 'poc', 'scenes.json'), join(outputBase, 'scenes.json'));

console.log(`Packed ${packed} characters and synced furniture plus scenes.json.`);
process.exit(failures ? 1 : 0);
