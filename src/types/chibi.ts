/**
 * Types for the live-3D chibi path (Road 2): one GLB + a side-car manifest per
 * character, rendered in three.js. The manifest carries the per-submesh shader
 * assignment and the per-clip mouth timeline that glTF can't express — see the
 * deliverable's `<cid>.manifest.json`. Mirrors only the fields the viewer reads.
 */

/** A single `SetMouthTile` event: at time `t` the mouth switches to atlas cell `(col, row)`. */
export interface ChibiMouthEvent {
  /** Clip-local time in seconds. */
  t: number;
  /** Raw BA event code (`col = code % 100`, `row = code // 100`). */
  code: number;
  /** Atlas column (0-indexed). */
  col: number;
  /** Atlas row (0-indexed). */
  row: number;
}

/** Per-submesh material definition (matched against the GLB by material name). */
interface ChibiMaterialDef {
  /** How the viewer renders this submesh: cel body, the eye/mouth overlay, or an unlit additive halo. */
  shader: 'cel' | 'eyemouth' | 'unlit' | 'overlay';
  /** Blend mode for `unlit` (the halo is additive). */
  blend?: 'additive' | 'normal';
  /** External texture filenames (base maps are embedded in the GLB; the mouth atlas/mask are not). */
  textures?: Record<string, string>;
  /** Raw `.mat` params (tint, shadow, outline, …) — reference for cel-fidelity polish. */
  params?: Record<string, unknown>;
}

export interface ChibiManifest {
  /** Folder/file id, lowercased — e.g. `ch0158`. */
  name: string;
  /** Devname — e.g. `CH0158`. */
  dev: string;
  /** GLB filename, relative to the character folder. */
  model: string;
  /** Bake fps the clips were authored at. */
  fps: number;
  /** Clips intended for the roaming pet (idle/walk/reaction/victory). */
  petClips: string[];
  /** Submesh → material definition, keyed by material name. */
  materials: Record<string, ChibiMaterialDef>;
  /** Per-clip mouth timeline, keyed by bare clip name (the `CH####_` prefix stripped). */
  mouth: Record<string, ChibiMouthEvent[]>;
}
