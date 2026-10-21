import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLivingLotus, createPetalGeometry } from '../src/lotus.js';

test('petal surface has finite normals and continuous edges', () => {
  const geometry = createPetalGeometry({ length: 3.8, width: .55, phase: 1.4 });
  const { position, normal, skinWeight, skinIndex } = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i);
    const n = new THREE.Vector3().fromBufferAttribute(normal, i);
    assert.ok(point.toArray().every(Number.isFinite));
    assert.ok(Math.abs(n.length() - 1) < .0001, `normal ${i} is normalized`);
    assert.ok(Math.abs(skinWeight.getX(i) + skinWeight.getY(i) - 1) < .0001);
    assert.ok(skinIndex.getY(i) <= 18);
  }
  for (let row = 0; row <= 96; row++) {
    const first = row * 25, last = first + 24;
    assert.ok(new THREE.Vector3().fromBufferAttribute(position, first).distanceTo(new THREE.Vector3().fromBufferAttribute(position, last)) < 1e-7);
    assert.ok(new THREE.Vector3().fromBufferAttribute(normal, first).distanceTo(new THREE.Vector3().fromBufferAttribute(normal, last)) < 1e-7);
  }
  geometry.dispose();
});

// Only the texture canvas is stubbed; geometry, skeletons and skinning use Three.js.
function textureCanvas() {
  const context = {
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData() {}, fillRect() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return { getContext: () => context };
}

test('all petals deform independently and remain stable through bloom extremes', () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: textureCanvas };
  const lotus = createLivingLotus('sakura', { capabilities: { getMaxAnisotropy: () => 1 } });
  const meshes = [];
  lotus.group.traverse(object => { if (object.isSkinnedMesh) meshes.push(object); });
  function pose(time, bloom) {
    lotus.update(time, bloom);
    lotus.group.updateMatrixWorld(true);
    meshes.forEach(mesh => mesh.skeleton.update());
  }
  function tips() {
    return meshes.map(mesh => mesh.getVertexPosition(mesh.geometry.attributes.position.count - 13, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
  }
  try {
    assert.equal(meshes.length, 25);
    pose(0, .85); const first = tips();
    pose(1.5, .85); const next = tips();
    const velocities = next.map((tip, i) => tip.clone().sub(first[i]));
    assert.ok(velocities.every(velocity => velocity.length() > .008));
    for (let i = 0; i < 8; i++) assert.ok(velocities[i].distanceTo(velocities[i + 1]) > .015);
    // Repeating the same time must not move the flower (pause behavior).
    pose(1.5, .85);
    tips().forEach((tip, i) => assert.ok(tip.distanceTo(next[i]) < 1e-8));
    for (const bloom of [0, .5, 1]) for (const time of [0, 3, 9, 24]) {
      pose(time, bloom);
      for (const mesh of meshes) {
        const bounds = new THREE.Box3();
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 9) {
          const vertex = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
          assert.ok(vertex.toArray().every(Number.isFinite));
          assert.ok(vertex.length() < 5.5, 'skinned surface stays in the camera envelope');
          bounds.expandByPoint(vertex);
        }
        assert.ok(bounds.getSize(new THREE.Vector3()).length() > 1, 'petal never collapses');
        assert.ok(bounds.min.y > -.18, 'petals stay above the pond');
      }
    }
  } finally {
    lotus.dispose();
    const geometries = new Set(), materials = new Set();
    lotus.group.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
