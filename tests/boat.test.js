import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoatState, stepBoat, setBoatDestination, NAVIGATION_RADIUS } from '../src/boat-motion.js';
import { createBoatWake } from '../src/boat-wake.js';

test('sailing supports destinations, manual override, braking and normalized diagonal input', () => {
  const state = createBoatState({ x: 0, z: 0 });
  setBoatDestination(state, { x: -20, z: -30 });
  for (let i = 0; i < 1800; i++) stepBoat(state, { x: 0, z: 0 }, 1 / 60);
  assert.equal(state.destination, null);
  assert.ok(state.position.distanceTo(new THREE.Vector3(-20, 0, -30)) < .01);
  assert.equal(state.velocity.length(), 0);
  setBoatDestination(state, { x: 25, z: 30 });
  stepBoat(state, { x: 1, z: 1 }, 1 / 60);
  assert.equal(state.destination, null, 'WASD overrides click movement');
  for (let i = 0; i < 300; i++) stepBoat(state, { x: 1, z: 1 }, 1 / 60);
  assert.ok(Math.abs(state.velocity.length() - 4.8) < .001, 'default speed increases by 20% without a diagonal boost');
  for (let i = 0; i < 120; i++) stepBoat(state, { x: 0, z: 0 }, 1 / 60);
  assert.ok(state.velocity.length() < .001, 'releasing keys brakes the boat');
  assert.equal(state.position.y, 0, 'boat remains at sea level');
});

test('spawn, destinations and manual movement stay inside the world boundary', () => {
  const state = createBoatState({ x: 1000, z: 0 });
  assert.ok(state.position.length() <= NAVIGATION_RADIUS + 1e-9);
  setBoatDestination(state, { x: 5000, z: 5000 });
  assert.ok(state.destination.length() <= NAVIGATION_RADIUS + 1e-9);
  for (let i = 0; i < 600; i++) stepBoat(state, { x: 1, z: 0 }, 1 / 30, 12);
  assert.ok(state.position.length() <= NAVIGATION_RADIUS + 1e-9);
  const previous = state.destination;
  setBoatDestination(state, { x: NaN, z: 0 });
  assert.equal(state.destination, previous);
});

test('ink wake stays on the historical route, fades out and follows the sky palette', () => {
  const wake = createBoatWake(), state = createBoatState({ x: 0, z: 0 });
  state.velocity.set(0, 0, -4);
  wake.update(.1, 1, state, true);
  const matrix = new THREE.Matrix4(); wake.mesh.getMatrixAt(0, matrix);
  const original = new THREE.Vector3().setFromMatrixPosition(matrix);
  state.position.x += 50;
  wake.update(.1, 1.1, state, true);
  wake.mesh.getMatrixAt(0, matrix);
  assert.ok(original.distanceTo(new THREE.Vector3().setFromMatrixPosition(matrix)) < 1e-6, 'old foam does not move with the hull');
  const moonColor = wake.mesh.material.uniforms.uSky.value.clone();
  wake.update(7, 8, state, false, false);
  assert.equal(wake.mesh.geometry.attributes.aLife.getX(0), 0, 'foam expires');
  assert.equal(wake.mesh.material.uniforms.uSky.value.equals(moonColor), false, 'warm sunset and cool moonlight differ');
  wake.mesh.geometry.dispose(); wake.mesh.material.dispose();
});

test('wake spacing is stable across frame rates and pause preserves all deposited strokes', () => {
  const routes = [];
  for (const fps of [20, 60, 144]) {
    const wake = createBoatWake(), state = createBoatState({ x: 0, z: 0 });
    state.heading = 0; state.velocity.set(0, 0, -12);
    wake.update(1 / fps, 0, state, true);
    for (let i = 1; i <= fps * 2; i++) {
      state.position.z = 9 - 12 * i / fps;
      wake.update(1 / fps, i / fps, state, true);
    }
    const matrix = new THREE.Matrix4(), positions = [];
    for (let i = 0; i < wake.mesh.count; i++) if (wake.mesh.geometry.attributes.aLife.getX(i) > 0) {
      wake.mesh.getMatrixAt(i, matrix); positions.push(matrix.elements[14]);
    }
    routes.push(positions);
    const frozenMatrices = wake.mesh.instanceMatrix.array.slice();
    const frozenLife = wake.mesh.geometry.attributes.aLife.array.slice();
    wake.update(0, 10, state, true);
    assert.deepEqual(wake.mesh.instanceMatrix.array, frozenMatrices);
    assert.deepEqual(wake.mesh.geometry.attributes.aLife.array, frozenLife);
    assert.equal(wake.mesh.material.uniforms.uTime.value, 2);
    wake.mesh.geometry.dispose(); wake.mesh.material.dispose();
  }
  assert.equal(routes[0].length, routes[1].length);
  assert.equal(routes[0].length, routes[2].length);
  for (let i = 0; i < routes[0].length; i++) {
    assert.ok(Math.abs(routes[0][i] - routes[1][i]) < 1e-5);
    assert.ok(Math.abs(routes[0][i] - routes[2][i]) < 1e-5);
  }
});

test('ink strokes align with diagonal travel instead of crossing the heading', () => {
  const wake = createBoatWake(), state = createBoatState({ x: 0, z: 0 });
  state.heading = Math.PI / 4;
  state.velocity.set(-Math.sin(state.heading) * 4, 0, -Math.cos(state.heading) * 4);
  wake.update(.1, 1, state, true);
  const matrix = new THREE.Matrix4(); wake.mesh.getMatrixAt(0, matrix);
  const strokeDirection = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
  assert.ok(strokeDirection.dot(state.velocity.clone().normalize()) > .99999);
  wake.mesh.geometry.dispose(); wake.mesh.material.dispose();
});
