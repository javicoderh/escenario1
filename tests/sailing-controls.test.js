import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSailingControls } from '../src/sailing-controls.js';

test('holding backward input keeps a straight course instead of chasing camera yaw', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = new EventTarget(); globalThis.window = new EventTarget();
  const canvas = new EventTarget(); globalThis.document.activeElement = canvas;
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 24000);
  const controls = createSailingControls(camera, canvas, { x: 0, z: 0 }, () => {});
  try {
    controls.setEnabled(true); controls.focus();
    const start = controls.state.position.clone();
    const direction = camera.getWorldDirection(new THREE.Vector3()); direction.y = 0; direction.normalize().negate();
    document.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyS' }));
    for (let i = 0; i < 300; i++) controls.update(1 / 60, 4, true);
    const movement = controls.state.position.clone().sub(start);
    assert.ok(movement.length() > 18, 'boat travels away from the source');
    assert.ok(movement.normalize().dot(direction) > .9999, 'camera following does not rotate the movement basis');
  } finally {
    controls.dispose();
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
