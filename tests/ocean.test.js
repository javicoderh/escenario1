import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { oceanHeight, sampleOcean, MAX_SWELL_HEIGHT } from '../src/ocean-waves.js';
import { createOceanGeometry } from '../src/ocean-geometry.js';
import { createBoatBuoyancy, sampleHullSupport, BOAT_WATERLINE } from '../src/boat-buoyancy.js';

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('ocean normals match the height field across the map and waves stay bounded', () => {
  const epsilon = .001;
  for (const [x, z] of [[0, 0], [5, 9], [-499, 836], [999, -12]]) {
    const heights = [];
    for (let time = 0; time <= 12; time += .25) {
      const water = sampleOcean(x, z, time);
      near(water.height, oceanHeight(x, z, time));
      assert.ok(Math.abs(water.height) <= MAX_SWELL_HEIGHT);
      near(water.slopeX, (oceanHeight(x + epsilon, z, time) - oceanHeight(x - epsilon, z, time)) / (2 * epsilon));
      near(water.slopeZ, (oceanHeight(x, z + epsilon, time) - oceanHeight(x, z - epsilon, time)) / (2 * epsilon));
      heights.push(water.height);
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) > .6, 'a stationary boat encounters passing swells');
  }
});

test('hull support follows wave height and converts slopes to pitch and roll for its heading', () => {
  const position = { x: 4, y: 0, z: 9 };
  const plane = (x, z) => .05 * x + .08 * z;
  const north = sampleHullSupport(position, 0, 0, {}, plane);
  near(north.height, BOAT_WATERLINE + plane(position.x, position.z));
  near(north.pitch, Math.atan(-.08)); near(north.roll, Math.atan(.05));
  const west = sampleHullSupport(position, Math.PI / 2, 0, {}, plane);
  near(west.pitch, Math.atan(-.05)); near(west.roll, Math.atan(-.08));
  assert.equal(position.y, 0, 'buoyancy leaves the navigation plane intact');
});

test('buoyancy is stable across frame rates, freezes on pause and resets after teleporting', () => {
  const poses = [];
  for (const fps of [30, 60, 144]) {
    const buoyancy = createBoatBuoyancy(), position = { x: 5, y: 0, z: 9 };
    buoyancy.update(position, 0, 0, 0);
    let maxError = 0;
    for (let i = 1; i <= fps * 10; i++) {
      const time = i / fps; position.z = 9 - 4.8 * time;
      const pose = buoyancy.update(position, 0, time, 1 / fps, 4.8);
      maxError = Math.max(maxError, Math.abs(pose.height - BOAT_WATERLINE - oceanHeight(position.x, position.z, time)));
      assert.ok(Math.abs(pose.pitch) < .21 && Math.abs(pose.roll) < .27);
    }
    assert.ok(maxError < .16, `hull stays close to the passing surface: ${maxError}`);
    poses.push({ ...buoyancy.pose });
    const frozen = { ...buoyancy.pose };
    buoyancy.update(position, 0, 50, 0, 4.8); assert.deepEqual(buoyancy.pose, frozen);
    position.x = 800;
    buoyancy.update(position, 0, 10, 0, 0);
    near(buoyancy.pose.height, sampleHullSupport(position, 0, 10).height);
  }
  for (const pose of poses.slice(1)) for (const axis of ['height', 'pitch', 'roll']) near(pose[axis], poses[0][axis], .015);
});

test('ocean mesh resolves nearby waves with a bounded budget and upward-facing triangles', () => {
  const geometry = createOceanGeometry(), position = geometry.attributes.position;
  assert.ok(position.count < 16000); assert.ok(geometry.index.count / 3 < 31000);
  assert.ok(position.array.every(Number.isFinite));
  const normal = geometry.attributes.normal;
  for (let i = 0; i < normal.count; i++) assert.ok(normal.getZ(i) > .999);
  const point = new THREE.Vector3().fromBufferAttribute(position, position.count - 1);
  near(point.length(), 10000, .001);
  geometry.dispose();
});
