import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { ChibiManifest } from '@/types/chibi';
import {
  applyManifestMaterials,
  makeGradient,
  makeHaloFollower,
  setHaloOverride,
  updateHaloFollower,
} from '../chibi3dCore';

function createHalo() {
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  const head = new THREE.Group();
  head.name = 'Bip001_Head';
  head.position.y = 0.7;
  const visual = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.3));
  visual.name = 'Ako_Original_Halo';
  visual.position.set(0.387, 1.312, 6.87);
  visual.rotation.y = Math.PI / 2;
  const child = new THREE.Group();
  child.name = 'HaloTrail';
  child.position.set(0.1, 0.2, 0.3);
  visual.add(child);
  head.add(visual);
  root.add(head);
  scene.add(root);
  const follower = makeHaloFollower(root, scene);
  if (!follower) throw new Error('Expected a halo follower');
  return { scene, root, head, visual, child, follower };
}

describe('scene-driven halo corrections', () => {
  it('preserves the exported visual hierarchy and transform by default', () => {
    const { follower, visual, child } = createHalo();
    expect(follower.visual).toBe(visual);
    expect(visual.parent).toBe(follower.halo);
    expect(child.parent).toBe(visual);
    const position = visual.position.clone();
    const quaternion = visual.quaternion.clone();
    setHaloOverride(follower, null);
    expect(visual.position).toEqual(position);
    expect(visual.quaternion.toArray()).toEqual(quaternion.toArray());
    expect(child.position.toArray()).toEqual([0.1, 0.2, 0.3]);
  });

  it('corrects only the visual position, without widening or moving the spring target', () => {
    const { follower, visual } = createHalo();
    const quaternion = visual.quaternion.clone();
    const scale = visual.scale.clone();
    setHaloOverride(follower, { visualPos: [0, 0, 0] });
    expect(visual.position.toArray()).toEqual([0, 0, 0]);
    expect(visual.quaternion.toArray()).toEqual(quaternion.toArray());
    expect(visual.scale).toEqual(scale);
    expect(follower.relPos).toEqual(follower.relPos0);
    expect(follower.clampMin).toEqual(follower.clampMin0);
    expect(follower.clampMax).toEqual(follower.clampMax0);
  });

  it('keeps the corrected halo near the head during translation and turns', () => {
    const { scene, root, head, visual, follower } = createHalo();
    setHaloOverride(follower, { visualPos: [0, 0, 0] });
    const headPosition = new THREE.Vector3();
    const haloPosition = new THREE.Vector3();
    for (let frame = 0; frame < 360; frame++) {
      root.position.set(frame / 120, 0, Math.sin(frame / 60));
      root.rotation.y = frame >= 180 ? Math.PI / 2 : Math.PI;
      head.rotation.z = Math.sin(frame / 30) * 0.15;
      updateHaloFollower(follower);
      scene.updateMatrixWorld(true);
      head.getWorldPosition(headPosition);
      visual.getWorldPosition(haloPosition);
      expect(haloPosition.distanceTo(headPosition)).toBeLessThan(0.6);
    }
    expect(root.position.x).toBeCloseTo(359 / 120);
  });

  it('restores the exported position when an override is removed or replaced', () => {
    const { follower, visual } = createHalo();
    const original = visual.position.clone();
    setHaloOverride(follower, { visualPos: [0, 0, 0], pos: [1, 2, 3] });
    setHaloOverride(follower, { rot: [180, 0, 0] });
    expect(visual.position).toEqual(original);
    expect(follower.relPos).toEqual(follower.relPos0);
    setHaloOverride(follower, { visualPos: [0, 0, 0] });
    setHaloOverride(follower, null);
    expect(visual.position).toEqual(original);
    expect(follower.extraTweak).toBeNull();
    expect(follower.clampMin).toEqual(follower.clampMin0);
  });

  it('keeps the existing Maki position and rotation override unchanged', () => {
    const { follower, visual } = createHalo();
    const original = visual.position.clone();
    setHaloOverride(follower, { pos: [1.714, -0.261, 0.362], rot: [90, 0, -90] });
    expect(follower.relPos.toArray()).toEqual([1.714, -0.261, 0.362]);
    const expected = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2),
    );
    expect(follower.extraTweak?.angleTo(expected)).toBeCloseTo(0);
    expect(visual.position).toEqual(original);
  });
});

describe('halo material sidedness', () => {
  it.each([THREE.FrontSide, THREE.BackSide, THREE.DoubleSide])(
    'preserves exported side %s when replacing an unlit halo material',
    (side) => {
      const root = new THREE.Group();
      const original = new THREE.MeshBasicMaterial({ side, color: 0x808080 });
      original.name = 'Ako_Original_Halo';
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), original);
      root.add(mesh);
      const manifest: ChibiManifest = {
        name: 'ch0231',
        dev: 'CH0231',
        model: 'ch0231.glb',
        fps: 30,
        petClips: [],
        materials: { Halo: { shader: 'unlit', blend: 'additive' } },
        mouth: {},
      };
      const gradient = makeGradient();
      applyManifestMaterials(root, manifest, null, null, gradient, 'ch0231');
      expect(mesh.material.side).toBe(side);
      expect(mesh.material.color.equals(original.color)).toBe(true);
      expect(mesh.material.depthWrite).toBe(false);
      expect(mesh.material.blending).toBe(THREE.CustomBlending);
      mesh.geometry.dispose();
      mesh.material.dispose();
      original.dispose();
      gradient.dispose();
    },
  );
});
