import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createResonanceState, nearestWaterLotus, stepResonance, RESONANCE_RANGE } from '../src/lotus-resonance.js';
import { createBoatLotus, DECK_LOTUS_DIAMETER } from '../src/boat-lotus.js';
import { createSailboat } from '../src/sailboat.js';
import { disposeMeshes } from '../src/world-guides.js';
import { createElectricLink } from '../src/electric-link.js';

const waterLotus = (id, x, z, extra = {}) => ({ id, role: 'water-lotus', visible: true, position: { x, y: 0, z }, ...extra });
const source = { ...waterLotus('one', 0, 0), distance: 5 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} equals ${expected}`);

test('nearest source includes only visible water lotuses within the connection radius', () => {
  const position = { x: 0, z: 0 };
  const sources = [waterLotus('hidden', 1, 0, { visible: false }), waterLotus('deck', 0, 0, { role: 'receiver' }),
    waterLotus('submerged', 0, 0, { position: { x: 0, y: -15, z: 0 } }), waterLotus('far', RESONANCE_RANGE + 1, 0),
    waterLotus('edge', RESONANCE_RANGE, 0), waterLotus('near', 3, 4)];
  assert.equal(nearestWaterLotus(position, sources).id, 'near');
  assert.equal(nearestWaterLotus(position, [sources[4]]).id, 'edge');
  assert.equal(nearestWaterLotus(position, sources.slice(0, 4)), null);
});

test('power ramps linearly for 40 seconds in both directions, including partial discharge', () => {
  const state = createResonanceState();
  for (const expected of [.25, .5, .75, 1]) { stepResonance(state, 10, source); close(state.charge, expected); }
  stepResonance(state, 10, source); close(state.charge, 1);
  for (const expected of [.75, .5, .25, 0]) { stepResonance(state, 10, null); close(state.charge, expected); }
  stepResonance(state, 100, null); close(state.charge, 0);
  stepResonance(state, 10, source); close(state.charge, .25);
  stepResonance(state, 20, null); close(state.charge, .125);
  stepResonance(state, 20, null); close(state.charge, 0);
});

test('reconnecting preserves brightness; a source change keeps charging; pause freezes time', () => {
  const state = createResonanceState();
  stepResonance(state, 20, source); close(state.charge, .5);
  stepResonance(state, 20, null); close(state.charge, .25);
  stepResonance(state, 20, source); close(state.charge, .625);
  stepResonance(state, 20, { ...source, id: 'two' }); close(state.charge, 1);
  const previous = structuredClone(state);
  stepResonance(state, 0, null); assert.deepEqual(state, previous);
  stepResonance(state, .75, null); close(state.linkOpacity, .5);
  assert.ok(state.charge > .9, 'link fades before stored power is exhausted');
  stepResonance(state, .75, null); close(state.linkOpacity, 0);
});

test('charge timing is independent of frame rate', () => {
  for (const fps of [15, 30, 60, 144]) {
    const state = createResonanceState();
    for (let frame = 0; frame < fps * 20; frame++) stepResonance(state, 1 / fps, source);
    close(state.charge, .5);
  }
});

test('deck lotus is a separate receiver that inherits boat transforms and owns its light', () => {
  const previous = globalThis.document;
  const ctx = { createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }), putImageData() {}, fillRect() {},
    createRadialGradient: () => ({ addColorStop() {} }) };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  const renderer = { capabilities: { getMaxAnisotropy: () => 1 } };
  const boat = createSailboat(renderer), lotus = createBoatLotus(renderer, 'ember');
  boat.lotusMount.add(lotus.group);
  try {
    assert.equal(boat.group.userData.entityType, 'vehicle');
    assert.equal(lotus.group.userData.role, 'receiver');
    close(DECK_LOTUS_DIAMETER, 1.4);
    boat.update(0, 0); lotus.update(0, 0); boat.group.updateMatrixWorld(true);
    const point = new THREE.Vector3(); lotus.getLinkPosition(point);
    const local = boat.group.worldToLocal(point.clone());
    boat.group.position.set(50, .08, -25); boat.group.rotation.y = Math.PI / 2; boat.group.updateMatrixWorld(true);
    lotus.getLinkPosition(point);
    assert.ok(point.distanceTo(boat.group.localToWorld(local.clone())) < 1e-8);
    const lights = [], glowingMaterials = [];
    lotus.group.traverse(object => {
      if (object.isPointLight) lights.push(object);
      if (object.material?.emissive?.getHex() > 0) glowingMaterials.push(object.material);
    });
    assert.ok(lights.every(light => light.intensity === 0));
    assert.ok(glowingMaterials.every(material => material.emissiveIntensity === 0));
    lotus.update(0, .5); const halfLight = lights[0].intensity;
    lotus.update(0, 1); close(lights[0].intensity, halfLight * 2);
    boat.setEnergy(1); assert.equal(boat.group.userData.power, 1);
    boat.update(1, 4);
    const electricity = boat.group.getObjectByName('Circuitos y descargas del velero');
    assert.equal(electricity.visible, true);
    const arcs = electricity.children[1].children[0].geometry.attributes.position;
    const frozenArcs = arcs.array.slice();
    boat.update(1, 4); assert.deepEqual(arcs.array, frozenArcs, 'paused electricity keeps its exact shape');
    lotus.update(0, 0); assert.equal(boat.group.userData.power, 1, 'receiver and vehicle retain distinct responsibilities');
    boat.setEnergy(0); assert.equal(electricity.visible, false, 'zero charge switches off circuits and arcs');
  } finally {
    lotus.dispose(); boat.dispose(); disposeMeshes(boat.group);
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});

test('lightning forks stay attached and geometry remains continuous in time and vertical links', () => {
  const link = createElectricLink(), start = new THREE.Vector3(0, .2, 0), end = new THREE.Vector3(8, 1, 4);
  link.update(1, start, end, 1);
  const geometry = link.group.children[0].geometry, positions = geometry.attributes.position;
  const point = index => new THREE.Vector3().fromBufferAttribute(positions, index);
  assert.ok(point(3 * 130).distanceTo(point(15 * 2)) < 1e-6);
  assert.ok(point(3 * 130 + 128).distanceTo(point(29 * 2)) < 1e-6);
  const frozen = positions.array.slice();
  link.update(1, start, end, 1); assert.deepEqual(positions.array, frozen);
  link.update(1 + 1e-5, start, end, 1);
  assert.ok(positions.array.every((value, i) => Math.abs(value - frozen[i]) < .001));
  link.update(2, start, new THREE.Vector3(0, 8, 0), 1);
  assert.ok(positions.array.every(Number.isFinite));
  link.update(2, start, start, 1); assert.equal(link.group.visible, false);
  disposeMeshes(link.group);
});

test('lightning preserves endpoint anchors, has finite geometry and fades to invisible', () => {
  const link = createElectricLink(), start = new THREE.Vector3(0, .2, 0), end = new THREE.Vector3(8, 1, 4);
  link.update(1, start, end, 1);
  const geometry = link.group.children[0].geometry;
  assert.ok(geometry.attributes.position.array.every(Number.isFinite));
  const first = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
  const last = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, 129);
  assert.ok(first.distanceTo(start) < 1e-6); assert.ok(last.distanceTo(end) < 1e-6);
  link.update(2, start, end, 0); assert.equal(link.group.visible, false);
  disposeMeshes(link.group);
});
