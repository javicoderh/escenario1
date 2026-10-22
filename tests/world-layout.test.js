import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, WORLD_RADIUS, isValidPosition, emptyLayout, parseLayout, flightInput } from '../src/world-layout.js';

test('the five levels are 15 m apart and the build area is a circle with a 1 km radius', () => {
  assert.deepEqual(LEVELS.map(level => level.y), [-30, -15, 0, 15, 30]);
  for (const level of LEVELS) {
    assert.ok(isValidPosition({ x: WORLD_RADIUS, y: level.y, z: 0 }));
    assert.ok(isValidPosition({ x: 600, y: level.y, z: 800 }));
  }
  assert.equal(isValidPosition({ x: 1000, y: 0, z: 1000 }), false);
  assert.equal(isValidPosition({ x: 0, y: 10, z: 0 }), false);
  assert.equal(isValidPosition({ x: NaN, y: 0, z: 0 }), false);
  assert.equal(isValidPosition({ x: '', y: 0, z: 0 }), false);
});

test('layout survives JSON export and discards malformed or duplicated anchors', () => {
  const layout = emptyLayout();
  layout.lotus = { x: 100, y: -15, z: 200, visible: true };
  layout.markers.push({ id: 'one', name: 'Portal', x: -250, y: 30, z: 750, kind: 'anchor' });
  assert.deepEqual(parseLayout(JSON.parse(JSON.stringify(layout))), layout);
  layout.markers.push({ ...layout.markers[0] }, { id: 'bad', x: 9999, y: 0, z: 0 }, null);
  assert.equal(parseLayout(layout).markers.length, 1);
  assert.deepEqual(parseLayout({ version: 999 }), emptyLayout());
});

test('flight input normalizes diagonals and cancels opposite keys', () => {
  assert.deepEqual(flightInput(new Set()), { x: 0, y: 0, z: 0 });
  assert.deepEqual(flightInput(new Set(['KeyW', 'KeyS', 'KeyQ', 'KeyE'])), { x: 0, y: 0, z: 0 });
  const input = flightInput(new Set(['KeyW', 'KeyD', 'Space']));
  assert.ok(Math.abs(Math.hypot(input.x, input.y, input.z) - 1) < 1e-10);
  assert.equal(flightInput(new Set(['ControlLeft'])).y, -1);
});
