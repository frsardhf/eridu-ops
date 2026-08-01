/**
 * Types for the live-3D chibi path (Road 2): one GLB + a side-car manifest per
 * character, rendered in three.js. The manifest carries the per-submesh shader
 * assignment and the per-clip mouth timeline that glTF can't express: see the
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

/** A renderer visibility event emitted by Unity's child-renderer animation callbacks. */
export interface ChibiRendererEvent {
  /** Clip-local time in seconds. */
  t: number;
  /** glTF mesh index. */
  idx: number;
  /** Whether the mesh is visible after this event. */
  on: boolean;
}

export interface ChibiHaloOverride {
  /** Head-local halo target position. */
  pos?: [number, number, number];
  /** Extra halo rotation in degrees. */
  rot?: [number, number, number];
}

/** Curated per-character fixes for asset details that glTF cannot describe. */
export interface ChibiCharacterConfig {
  /** Mesh-name substrings that should never render. */
  hide?: string[];
  /** Ancestor node containing the eye-only half of a split EyeMouth face. */
  eyeNode?: string;
  /** Character-wide halo correction. */
  halo?: ChibiHaloOverride;
}

/** Per-submesh material definition (matched against the GLB by material name). */
interface ChibiMaterialDef {
  /** How the viewer renders this submesh: cel body, the eye/mouth overlay, or an unlit additive halo. */
  shader: 'cel' | 'eyemouth' | 'unlit' | 'overlay';
  /** Blend mode for `unlit` (the halo is additive). */
  blend?: 'additive' | 'normal';
  /** External texture filenames (base maps are embedded in the GLB; the mouth atlas/mask are not). */
  textures?: Record<string, string>;
  /** Raw `.mat` params (tint, shadow, outline, ...): reference for cel-fidelity polish. */
  params?: Record<string, unknown>;
}

/**
 * Per-furniture curated overrides from `scenes.json` (game knowledge not in the asset data),
 * keyed by furniture GLB label. `show`/`solo` are keyed by clip variant suffix (`01`/`02`/...).
 */
export interface ChibiFurnitureConfig {
  /** Default furniture rotation in degrees (face-camera tuning). */
  ry?: number;
  /** Per-variant character visibility: variant -> shown cids (null/absent = all). */
  show?: Record<string, string[] | null>;
  /** Per-variant split into one picker entry per listed cid. */
  solo?: Record<string, string[]>;
  /** Mesh-name substrings for unsupported transparent or portal layers. */
  hide?: string[];
  /** Re-seat the exported sky backdrop directly behind the window frame. */
  seatSky?: boolean;
}

/**
 * Per-victory curated overrides from `scenes.json`, keyed by the party's cids sorted + joined
 * with `|` (e.g. `ch0242|ch0243`). For the post-battle/raid victory interaction that a party of
 * 2-4 characters shares.
 */
export interface ChibiVictoryConfig {
  /** Face-camera default: false for "face each other" groups (leave the raw clip orientation). */
  autoflip?: boolean;
  /** Mirror the authored horizontal X stage path while facing the camera. */
  mirrorMotionX?: boolean;
  /** Mirror the authored horizontal Z stage path while facing the camera. */
  mirrorMotionZ?: boolean;
  /** World-space nudge applied to the first character (characters[0]) to seat the party. */
  offset?: { x?: number; y?: number; z?: number };
  /** World-space nudge applied to the second character (characters[1]). */
  secondOffset?: { x?: number; y?: number; z?: number };
  /** Legacy second-character offset key. */
  lastOffset?: { x?: number; y?: number; z?: number };
  /** Clip-name fragments belonging to a different partner pairing. */
  exclude?: string[];
  /** Per-character halo corrections for this interaction group. */
  halo?: Record<string, ChibiHaloOverride>;
}

/** Root shape of `scenes.json`: curated furniture + victory overrides. */
export interface ChibiScenesConfig {
  characters?: Record<string, ChibiCharacterConfig>;
  furniture?: Record<string, ChibiFurnitureConfig>;
  duo?: Record<string, ChibiVictoryConfig>;
  /** Legacy key accepted so older deployed scene catalogs remain loadable. */
  victory?: Record<string, ChibiVictoryConfig>;
}

export interface ChibiManifest {
  /** Folder/file id, lowercased: e.g. `ch0158`. */
  name: string;
  /** Devname: e.g. `CH0158`. */
  dev: string;
  /** GLB filename, relative to the character folder. */
  model: string;
  /** Bake fps the clips were authored at. */
  fps: number;
  /** Mouth-atlas dimensions. Most characters use 8x8; some use 4x4. */
  mouthAtlas?: { cols: number; rows: number; atlas?: string; decode?: string };
  /** Clips intended for the roaming pet (idle/walk/reaction/victory). */
  petClips: string[];
  /** Submesh -> material definition, keyed by material name. */
  materials: Record<string, ChibiMaterialDef>;
  /** Per-clip mouth timeline, keyed by bare clip name (the `CH####_` prefix stripped). */
  mouth: Record<string, ChibiMouthEvent[]>;
  /** Default mesh visibility plus per-clip child-renderer events. */
  renderers?: {
    default: Record<string, boolean>;
    clips: Record<string, ChibiRendererEvent[]>;
  };
}
