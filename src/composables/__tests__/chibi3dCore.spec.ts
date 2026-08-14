import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { createRendererTimeline, driveRenderers } from '../chibi3dCore';
import type { ChibiManifest } from '@/types/chibi';

const manifest: ChibiManifest = {
  name: 'ch0114',
  dev: 'CH0114',
  model: 'ch0114.glb',
  fps: 30,
  petClips: [],
  materials: {},
  mouth: {},
  renderers: {
    default: { '2': true, '3': false },
    clips: {
      Victory_Start_Random: [
        { t: 0, node: 'Root/CH0114__Face01_Outline', on: false },
        { t: 0, idx: 2, on: true },
        { t: 0, idx: 3, on: false },
        { t: 0.9, node: 'Root/CH0114__Face01_Outline', on: true },
        { t: 0.9, idx: 2, on: false },
        { t: 0.9, idx: 3, on: true },
      ],
    },
  },
};

describe('chibi renderer timeline', () => {
  it('combines node-path events with curated renderer index mappings', () => {
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.name = 'CH0114_Body';
    const tree = new THREE.Group();
    tree.name = 'CH0114_Tree_Outline';
    const face = new THREE.Group();
    face.name = 'CH0114__Face01_Outline';
    face.visible = true;
    root.add(body, tree, face);

    const timeline = createRendererTimeline(root, manifest, [], {
      rendererNodes: { '2': body.name, '3': tree.name },
    });
    const events = manifest.renderers?.clips.Victory_Start_Random ?? [];

    driveRenderers(timeline, events, 0);
    expect([body.visible, tree.visible, face.visible]).toEqual([true, false, false]);

    driveRenderers(timeline, events, 1);
    expect([body.visible, tree.visible, face.visible]).toEqual([false, true, true]);
  });
});
