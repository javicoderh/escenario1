import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFreeCamera } from '../src/free-camera.js';

test('wheel zoom is smooth, bounded and works without keyboard focus', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = Object.assign(new EventTarget(), { pointerLockElement: null, activeElement: null });
  globalThis.window = new EventTarget();
  const canvas = Object.assign(new EventTarget(), { setAttribute() {}, clientHeight: 800 });
  const camera = new THREE.PerspectiveCamera(65, 1, .1, 24000);
  const initialPosition = camera.position.clone(), initialProjection = camera.projectionMatrix.clone();
  const controls = createFreeCamera(camera, canvas, () => {});
  function wheel(deltaY, deltaMode = 0) {
    const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode, ctrlKey: false });
    canvas.dispatchEvent(event); return event;
  }
  function settle() { for (let i = 0; i < 90; i++) controls.update(1 / 60, 2); }
  try {
    assert.equal(wheel(-120).defaultPrevented, false, 'inactive flight leaves orbital wheel handling alone');
    controls.setEnabled(true);
    assert.equal(wheel(-120).defaultPrevented, true);
    controls.update(1 / 60, 2);
    assert.ok(camera.fov < 65 && camera.fov > 65 * Math.exp(-.18), 'zoom eases toward its target');
    settle(); const closeFov = camera.fov;
    wheel(120); settle(); assert.ok(camera.fov > closeFov, 'reverse wheel zooms out');
    for (let i = 0; i < 40; i++) wheel(-1000, 1);
    settle(); assert.ok(camera.fov >= 18 && camera.fov < 18.01, 'zoom-in limit');
    for (let i = 0; i < 40; i++) wheel(1000, 2);
    settle(); assert.ok(camera.fov <= 85 && camera.fov > 84.99, 'zoom-out limit');
    assert.ok(camera.position.equals(initialPosition), 'zoom preserves the camera coordinate');
    assert.equal(camera.projectionMatrix.equals(initialProjection), false, 'projection is refreshed');
    controls.dispose();
    assert.equal(wheel(-120).defaultPrevented, false, 'cleanup removes wheel handling');
  } finally {
    controls.dispose();
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});
