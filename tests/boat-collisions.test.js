import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BOAT_RADIUS, NAVIGATION_RADIUS, createBoatState, moveBoatWithCollisions, setBoatDestination, stepBoat } from '../src/boat-motion.js';

const flower = (overrides = {}) => ({ x: 0, y: 0, z: 0, diameter: 2, visible: true, ...overrides });
function boat(x, z) {
  const state = createBoatState({ x: 0, z: 0 });
  state.position.set(x, 0, z);
  return state;
}

test('swept collision prevents tunneling through every flower size', () => {
  for (const diameter of [2, 3, 5, 8, 13, 20, 60]) {
    const state = boat(-50, 0), lotus = flower({ diameter, energy: 0 });
    state.velocity.set(100, 0, 0);
    assert.equal(moveBoatWithCollisions(state, new THREE.Vector3(100, 0, 0), [lotus]), true);
    assert.ok(state.position.x <= -(BOAT_RADIUS + diameter / 2));
    assert.equal(state.velocity.x, 0);
  }
});

test('oblique contact slides, and the boat can move away from a flower', () => {
  const state = boat(-10, 0), lotus = flower({ diameter: 8 });
  state.velocity.set(10, 0, 4);
  moveBoatWithCollisions(state, state.velocity.clone(), [lotus]);
  assert.ok(state.position.z > 3);
  assert.ok(state.position.length() >= BOAT_RADIUS + 4);
  assert.ok(state.velocity.z > 0);
  const before = state.position.clone();
  moveBoatWithCollisions(state, before.clone().normalize().multiplyScalar(2), [lotus]);
  assert.ok(state.position.length() > before.length());
});

test('only visible sea-level flowers block the hull', () => {
  for (const lotus of [flower({ visible: false }), flower({ y: 15 }), flower({ y: -15 })]) {
    const state = boat(-10, 0);
    assert.equal(moveBoatWithCollisions(state, new THREE.Vector3(20, 0, 0), [lotus]), false);
    assert.equal(state.position.x, 10);
  }
});

test('automatic navigation stops at an obstacle at different frame rates', () => {
  for (const fps of [20, 60, 144]) {
    const state = boat(-15, 0), lotus = flower();
    setBoatDestination(state, { x: 15, z: 0 });
    for (let i = 0; i < fps * 10 && state.destination; i++) stepBoat(state, { x: 0, z: 0 }, 1 / fps, 24, [lotus]);
    assert.equal(state.destination, null);
    assert.equal(state.blocked, true);
    assert.ok(state.position.x <= -(BOAT_RADIUS + 1));
    assert.equal(state.velocity.length(), 0);
  }
});

test('manual control stays outside flowers and pause preserves position', () => {
  const state = boat(-10, 0), lotus = flower();
  for (let i = 0; i < 300; i++) stepBoat(state, { x: 1, z: 0 }, 1 / 60, 24, [lotus]);
  assert.ok(state.position.x <= -(BOAT_RADIUS + 1));
  const before = state.position.clone();
  stepBoat(state, { x: 1, z: 0 }, 0, 24, [lotus]);
  assert.deepEqual(state.position, before);
  for (let i = 0; i < 60; i++) stepBoat(state, { x: -1, z: 0 }, 1 / 60, 24, [lotus]);
  assert.ok(state.position.x < before.x - 10);
});

test('edited overlapping flowers eject the hull without leaving the map', () => {
  const state = boat(0, 0), lotuses = [flower(), flower({ x: 3 })];
  moveBoatWithCollisions(state, new THREE.Vector3(), lotuses);
  for (const lotus of lotuses) assert.ok(Math.hypot(state.position.x - lotus.x, state.position.z - lotus.z) >= BOAT_RADIUS + 1);
  assert.ok(state.position.length() <= NAVIGATION_RADIUS);
  const edge = boat(NAVIGATION_RADIUS - 12, 0), lotus = flower({ x: NAVIGATION_RADIUS, diameter: 10 });
  moveBoatWithCollisions(edge, new THREE.Vector3(30, 0, 10), [lotus]);
  assert.ok(edge.position.length() <= NAVIGATION_RADIUS + 1e-8);
  assert.ok(Math.hypot(edge.position.x - lotus.x, edge.position.z) >= BOAT_RADIUS + 5);
});
