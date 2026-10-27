import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BOAT_RADIUS, NAVIGATION_RADIUS } from '../src/boat-motion.js';
import { ORB_RANGE, ORB_SPEED, ORB_COOLDOWN, pointOnOrbPath, buildOrbPath, createOrbState, launchOrb, dismissOrb, stepOrb,
  senseLotuses, lotusEmissionRadius, orbLanding } from '../src/illusory-orb.js';
import { TELEPORT_CAMERA_SPEED, createSailingControls } from '../src/sailing-controls.js';
import { createOrbVisual } from '../src/orb-visual.js';
import { disposeMeshes } from '../src/world-guides.js';
import { seededLotuses } from '../src/world-zones.js';
import { buildWorldContent } from '../src/world-content.js';
import { planCheckpointTravel } from '../src/checkpoint-travel.js';
import { emptyWorldProgress } from '../src/world-progress.js';

const origin = { x: 0, z: 0 }, target = { x: 300, z: 0 };
const giver = (values = {}) => ({ id: 'source', name: 'Fuente', x: 0, y: 0, z: 0,
  visible: true, diameter: 2, size: 'small', energyRole: 'giver', energy: 100, ...values });
function flying(curve = 0) {
  const state = createOrbState(); state.aiming = true;
  assert.equal(launchOrb(state, buildOrbPath(origin, target, curve)), true);
  return state;
}

test('straight and curved trajectories share a 300 m arc-length budget and remain in the map', () => {
  assert.equal(ORB_RANGE, 300);
  for (const curve of [-1, -.4, 0, .4, 1]) {
    const path = buildOrbPath(origin, target, curve);
    assert.ok(Math.abs(path.length - ORB_RANGE) < 1e-8);
    assert.ok(path.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)));
    const middle = path.points[Math.floor(path.points.length / 2)];
    if (curve) assert.equal(Math.sign(middle.z), Math.sign(curve));
    else assert.equal(middle.z, 0);
  }
  const edge = buildOrbPath({ x: NAVIGATION_RADIUS - 2, z: 0 }, { x: NAVIGATION_RADIUS + 100, z: 0 });
  assert.ok(Math.abs(edge.length - 2) < 1e-6);
  assert.ok(edge.points.every(point => point.length() <= NAVIGATION_RADIUS + 1e-7));
});

test('emission is spherical, increases by size, and strengthens in 10 m bands', () => {
  assert.equal(lotusEmissionRadius(giver()), 50);
  assert.equal(lotusEmissionRadius(giver({ size: 'huge' })), 100);
  for (const [distance, band] of [[49, 1], [40, 1], [39.9, 2], [29, 3], [19, 4], [9, 5]]) {
    const signal = senseLotuses(new THREE.Vector3(distance, 0, 0), [giver()]);
    assert.equal(signal.band, band);
    assert.equal(signal.intensity, band / 5);
  }
  assert.equal(senseLotuses(new THREE.Vector3(50, 0, 0), [giver()]), null);
  assert.equal(senseLotuses(new THREE.Vector3(30, 40, 0), [giver()]), null);
  assert.equal(senseLotuses(new THREE.Vector3(99, 0, 0), [giver({ size: 'huge' })]).band, 1);
  for (const values of [{ visible: false }, { energy: 0 }, { energyRole: 'taker' }, { y: 15 }, { y: -15 }]) {
    assert.equal(senseLotuses(new THREE.Vector3(), [giver(values)]), null);
  }
  assert.equal(senseLotuses(new THREE.Vector3(), [giver({ x: 40 }), giver({ id: 'nearer', x: 10 })]).id, 'nearer');
});

test('raised curves use 3D arc length, keep the map boundary, and land at sea level', () => {
  const path = buildOrbPath(origin, target, .2, new THREE.Vector3(0, 180, 40));
  assert.ok(Math.abs(path.length - 300) < 1e-8);
  const high = pointOnOrbPath(path, 100);
  assert.ok(high.y > 30);
  assert.equal(orbLanding(high, []).y, 0);
  const edge = buildOrbPath({ x: NAVIGATION_RADIUS - 2, z: 0 }, { x: 2000, z: 0 }, 0, new THREE.Vector3(0, 300, 0));
  assert.ok(edge.points.every(point => Math.hypot(point.x, point.z) <= NAVIGATION_RADIUS + 1e-7));
  assert.ok(edge.points.at(-1).y > 0);
});

test('flight senses sources while passing and does not spend cooldown before disappearance', () => {
  assert.equal(ORB_COOLDOWN, 1);
  const state = flying(), flowers = [giver({ x: 75 })];
  stepOrb(state, 1, flowers);
  assert.equal(state.signal, null);
  stepOrb(state, 1, flowers);
  assert.equal(state.signal.band, 2);
  assert.equal(state.cooldown, 0);
  assert.equal(state.active, true);
  stepOrb(state, ORB_RANGE / ORB_SPEED - 2, flowers);
  assert.equal(state.active, false);
  assert.equal(state.cooldown, ORB_COOLDOWN);
  assert.equal(state.signal, null);
  state.aiming = true;
  assert.equal(launchOrb(state, buildOrbPath(origin, target)), false);
  stepOrb(state, .9, flowers);
  assert.ok(state.cooldown > 0);
  stepOrb(state, .1, flowers);
  assert.ok(state.cooldown < 1e-8);
  assert.equal(launchOrb(state, buildOrbPath(origin, target)), true, 'can cast again after one second');
});

test('flight, expiration and cooldown are independent of frame rate, with no second launch in flight', () => {
  const positions = [];
  for (const fps of [20, 60, 144]) {
    const state = flying(.8);
    state.aiming = true;
    assert.equal(launchOrb(state, buildOrbPath(origin, target)), false);
    for (let i = 0; i < fps * 2; i++) stepOrb(state, 1 / fps, []);
    positions.push(state.position.clone());
    assert.ok(Math.abs(state.travelled - 40) < 1e-8);
    assert.equal(state.cooldown, 0);
    for (let i = 0; i < fps * (ORB_RANGE / ORB_SPEED - 2); i++) stepOrb(state, 1 / fps, []);
    assert.equal(state.active, false);
    assert.ok(Math.abs(state.cooldown - ORB_COOLDOWN) < 1e-7);
  }
  assert.ok(positions[0].distanceTo(positions[2]) < 1e-8);
  const state = flying(); stepOrb(state, ORB_RANGE / ORB_SPEED + .25, []);
  assert.equal(state.cooldown, .75, 'remaining frame time counts after expiry');
  dismissOrb(state);
  assert.equal(state.cooldown, .75, 'dismissing an absent orb cannot restart cooldown');
});

test('teleport landings respect flower collisions and map bounds, and can fail safely', () => {
  const flowers = [giver({ diameter: 20 }), giver({ x: 14, diameter: 8 })];
  const landing = orbLanding(origin, flowers);
  assert.ok(landing);
  for (const flower of flowers) assert.ok(Math.hypot(landing.x - flower.x, landing.z - flower.z) >= BOAT_RADIUS + flower.diameter / 2);
  assert.ok(orbLanding({ x: 5000, z: 0 }, []).length() <= NAVIGATION_RADIUS);
  assert.equal(orbLanding(origin, [giver({ diameter: 1000 })]), null);
});

function withControls(callback) {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = new EventTarget(); globalThis.window = new EventTarget();
  const canvas = new EventTarget();
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  let captured = null;
  canvas.setPointerCapture = id => { captured = id; };
  canvas.hasPointerCapture = id => captured === id;
  canvas.releasePointerCapture = id => { if (captured === id) captured = null; };
  canvas.focus = () => { document.activeElement = canvas; };
  canvas.blur = () => { document.activeElement = null; };
  const camera = new THREE.PerspectiveCamera(55, 800 / 600, .1, 24000), messages = [], notifications = [];
  const controls = createSailingControls(camera, canvas, origin, message => messages.push(message), snapshot => notifications.push(snapshot));
  const key = (code, repeat = false) => document.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code, repeat }));
  const mouse = (type, extra = {}) => canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { clientX: 400, clientY: 400, button: 0, pointerId: 1, ...extra }));
  try {
    controls.setEnabled(true); controls.focus(); canvas.focus();
    controls.update(1 / 60, 4.8, true, []);
    callback({ controls, canvas, camera, messages, notifications, key, mouse });
  } finally {
    controls.dispose();
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
}

test('T, click and R complete the ability while the wheel keeps camera zoom', () => {
  withControls(({ controls, key, mouse, camera }) => {
    const initial = controls.state.position.clone();
    key('KeyT'); assert.equal(controls.orb.state.aiming, true);
    key('KeyT', true); assert.equal(controls.orb.state.aiming, true);
    mouse('pointermove');
    const beforeWheel = camera.position.clone();
    mouse('wheel', { deltaY: 180, deltaMode: 0 });
    controls.update(.1, 4.8, true, []);
    assert.ok(camera.position.distanceTo(beforeWheel) > .1, 'wheel zooms while selected');
    assert.equal(controls.orb.state.path, null, 'selecting and hovering do not create a guide');
    mouse('pointerdown'); mouse('pointerup'); assert.equal(controls.orb.state.active, true);
    controls.update(1, 4.8, true, []);
    const orb = controls.orb.state.position.clone();
    assert.deepEqual(controls.state.position, initial);
    key('KeyT'); assert.equal(controls.orb.state.aiming, false);
    key('KeyR');
    assert.ok(controls.state.position.distanceTo(orb) < 1e-8);
    assert.equal(controls.orb.state.active, false);
    assert.equal(controls.orb.state.cooldown, ORB_COOLDOWN);
    assert.equal(controls.state.distance, 0, 'teleport does not add sailed distance');
    key('KeyT'); assert.equal(controls.orb.state.aiming, false);
  });
});

test('click casts straight toward its sea intersection, regardless of previous hover or boat movement', () => {
  for (const clientX of [150, 650]) withControls(({ controls, key, mouse, camera }) => {
    key('KeyT'); mouse('pointermove', { clientX: 800 - clientX });
    controls.state.position.x += 12;
    controls.update(.1, 4.8, true, []);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(clientX / 400 - 1, 1 - 400 / 300), camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    const start = controls.state.position.clone(), expected = hit.sub(start).normalize();
    mouse('pointerdown', { clientX }); mouse('pointerup', { clientX });
    const state = controls.orb.state;
    assert.equal(state.active, true);
    assert.ok(Math.abs(state.path.length - 300) < 1e-8);
    for (const point of state.path.points.slice(1)) {
      assert.ok(point.clone().sub(start).normalize().dot(expected) > .999999);
      assert.equal(point.y, 0);
    }
    const path = state.path;
    mouse('pointermove', { clientX: 20, clientY: 20 });
    assert.equal(state.path, path, 'flight direction stays fixed');
  });
});

test('H, pointer cancellation, lost capture, blur, pause and mode changes abort held clicks', () => {
  for (const reason of ['h', 'cancel', 'capture', 'blur', 'pause', 'mode', 'hidden']) withControls(({ controls, key, mouse, canvas }) => {
    key('KeyT'); mouse('pointerdown');
    if (reason === 'h') key('KeyH');
    if (reason === 'cancel') mouse('pointercancel');
    if (reason === 'capture') mouse('lostpointercapture');
    if (reason === 'blur') canvas.dispatchEvent(new Event('blur'));
    if (reason === 'pause') controls.update(.1, 4.8, false, []);
    if (reason === 'mode') controls.setEnabled(false);
    if (reason === 'hidden') { document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); }
    mouse('pointerup');
    assert.equal(controls.orb.state.active, false, reason);
    assert.equal(controls.orb.state.cooldown, 0);
    assert.equal(canvas.hasPointerCapture(1), false);
  });
});

test('drags, clicks above the horizon, and a second pointer cannot cast', () => {
  withControls(({ controls, key, mouse }) => {
    key('KeyT'); mouse('pointerdown');
    mouse('pointermove', { clientX: 440 }); mouse('pointermove'); mouse('pointerup');
    assert.equal(controls.orb.state.active, false, 'returning a drag to its origin is still not a click');
    mouse('pointerdown', { clientY: 0 }); mouse('pointerup', { clientY: 0 });
    assert.equal(controls.orb.state.active, false, 'sky has no sea target');
    mouse('pointerdown'); mouse('pointerup', { pointerId: 2 });
    assert.equal(controls.orb.state.active, false);
    mouse('pointerup'); assert.equal(controls.orb.state.active, true);
  });
});

test('ability button selects or cancels; a touch on water launches and the button teleports', () => {
  withControls(({ controls, mouse }) => {
    controls.activateOrb(); assert.equal(controls.orb.state.aiming, true);
    controls.activateOrb(); assert.equal(controls.orb.state.aiming, false);
    assert.equal(controls.orb.state.active, false, 'skill button cannot fire using an old pointer position');
    controls.activateOrb();
    mouse('pointerdown', { pointerType: 'touch' }); mouse('pointerup', { pointerType: 'touch' });
    assert.equal(controls.orb.state.active, true);
    assert.equal(controls.state.destination, null, 'casting must not send the boat to the tapped location');
    controls.update(1, 4.8, true, []);
    controls.activateOrb(); assert.equal(controls.orb.state.active, false);
    assert.equal(controls.orb.state.cooldown, ORB_COOLDOWN);
    controls.activateOrb(); assert.equal(controls.orb.state.aiming, false);
  });
});

test('touch tap navigates, camera drags and cancelled touches never set a destination', () => {
  withControls(({ controls, mouse }) => {
    mouse('pointerdown', { pointerType: 'touch', clientX: 600, clientY: 350 });
    mouse('pointerup', { pointerType: 'touch', clientX: 600, clientY: 350 });
    assert.ok(controls.state.destination);
    controls.stop();
    mouse('pointerdown', { pointerType: 'touch' });
    mouse('pointermove', { pointerType: 'touch', clientX: 500 });
    mouse('pointerup', { pointerType: 'touch', clientX: 500 });
    assert.equal(controls.state.destination, null);
    mouse('pointerdown', { pointerType: 'touch' }); mouse('pointercancel', { pointerType: 'touch' });
    mouse('pointerup', { pointerType: 'touch' }); assert.equal(controls.state.destination, null);
    controls.update(.1, 4.8, false, []);
    mouse('pointerdown', { pointerType: 'touch' }); mouse('pointerup', { pointerType: 'touch' });
    assert.equal(controls.state.destination, null, 'pause blocks new destinations');
  });
});

test('thumb steering takes over destinations, keeps its camera basis and stops on release or blur', () => {
  withControls(({ controls, camera, canvas }) => {
    controls.navigateTo({ x: 90, z: 90 }); assert.ok(controls.state.destination);
    const initial = controls.state.position.clone();
    const direction = camera.getWorldDirection(new THREE.Vector3()); direction.y = 0; direction.normalize().negate();
    controls.setHelm(0, .5);
    for (let i = 0; i < 300; i++) controls.update(1 / 60, 4, true, []);
    const movement = controls.state.position.clone().sub(initial);
    assert.equal(controls.state.destination, null);
    assert.ok(movement.length() > 9 && movement.length() < 11, 'half deflection gives half speed');
    assert.ok(movement.normalize().dot(direction) > .9999, 'holding back does not turn in circles');
    controls.setHelm(0, 0);
    for (let i = 0; i < 120; i++) controls.update(1 / 60, 4, true, []);
    assert.ok(controls.state.velocity.length() < .001);
    controls.setHelm(1, 0); canvas.dispatchEvent(new Event('blur'));
    controls.update(1, 4, true, []); assert.ok(controls.state.velocity.length() < .001);
    controls.setHelm(1, 0); controls.update(1, 4, false, []);
    controls.update(1, 4, true, []); assert.ok(controls.state.velocity.length() < .001);
  });
});

test('pause freezes flight and cooldown and blocks casting/teleport; H cancels aim', () => {
  withControls(({ controls, key, mouse }) => {
    key('KeyT'); key('KeyH'); assert.equal(controls.orb.state.aiming, false);
    controls.selectOrb(); mouse('pointerdown'); mouse('pointerup');
    controls.update(.5, 4.8, true, []);
    const position = controls.orb.state.position.clone();
    controls.update(10, 4.8, false, []);
    key('KeyR');
    assert.equal(controls.orb.state.active, true);
    assert.deepEqual(controls.orb.state.position, position);
    controls.update(.1, 4.8, true, []); key('KeyR');
    controls.update(10, 4.8, false, []);
    assert.equal(controls.orb.state.cooldown, ORB_COOLDOWN);
    controls.update(ORB_COOLDOWN, 4.8, true, []); key('KeyT');
    assert.equal(controls.orb.state.aiming, true);
    mouse('pointerdown', { button: 2 });
    assert.equal(controls.orb.state.aiming, false);
    assert.equal(controls.state.destination, null, 'right click cancels aim instead of navigating');
  });
});

test('orb has no aim guide or trail and keeps finite geometry during flight and sensing', () => {
  const visual = createOrbVisual(), state = createOrbState();
  try {
    state.aiming = true; state.path = buildOrbPath(origin, target, -1);
    visual.update(state, 0, true);
    assert.ok(visual.group.children.every(child => !child.visible), 'selection draws no aim guide');
    visual.group.traverse(object => assert.equal(!!object.isLine, false, 'no preview or tail geometry'));
    launchOrb(state, state.path); stepOrb(state, 2, [giver({ x: 30 })]);
    visual.update(state, 2, true);
    visual.group.traverse(object => {
      assert.equal(!!object.isLight, false);
      if (object.geometry) assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
    });
    dismissOrb(state); visual.update(state, 3, true);
    assert.ok(visual.group.children.every(child => !child.visible));
  } finally { disposeMeshes(visual.group); }
});

test('teleport starts an immediate fast camera transfer without snapping its pose', () => {
  for (const fps of [20, 60, 144]) withControls(({ controls, key, mouse, camera }) => {
    const initialBoat = controls.state.position.clone();
    const offset = camera.position.clone().sub(initialBoat);
    key('KeyT'); mouse('pointerdown'); mouse('pointerup');
    for (let i = 0; i < fps * 7; i++) controls.update(1 / fps, 4.8, true, []);
    const initialCamera = camera.position.clone(), rotation = camera.quaternion.clone();
    key('KeyR');
    assert.ok(controls.state.position.distanceTo(initialBoat) > 139);
    assert.deepEqual(camera.position, initialCamera, 'R must not snap the camera position');
    assert.ok(camera.quaternion.equals(rotation), 'R must not snap the camera orientation');
    controls.update(.05, 4.8, true, []);
    assert.ok(camera.position.distanceTo(initialCamera) > 0, 'camera starts travelling on the first frame after teleport');
    assert.ok(camera.position.distanceTo(initialCamera) <= TELEPORT_CAMERA_SPEED * .05 + 1e-7);
    for (let i = 0; i < fps * 5; i++) {
      const previous = camera.position.clone();
      controls.update(1 / fps, 4.8, true, []);
      assert.ok(camera.position.distanceTo(previous) <= TELEPORT_CAMERA_SPEED / fps + 1e-7);
    }
    assert.ok(camera.position.distanceTo(controls.state.position.clone().add(offset)) < .06);
  });
});

test('camera eases in and out without view flips or a final snap at different distances and frame rates', () => {
  for (const fps of [20, 60, 144]) for (const flightSeconds of [.1, 1, 7, 14]) {
    withControls(({ controls, key, mouse, camera }) => {
      key('KeyT'); mouse('pointerdown'); mouse('pointerup');
      controls.update(flightSeconds, 4.8, true, []);
      const rotation = camera.quaternion.clone();
      key('KeyR');
      const speeds = [];
      for (let i = 0; i < fps * 6; i++) {
        const previous = camera.position.clone();
        controls.update(1 / fps, 4.8, true, []);
        speeds.push(camera.position.distanceTo(previous) * fps);
        assert.ok(camera.quaternion.angleTo(rotation) < 1e-6,
          'stationary boat keeps the view direction throughout the transfer and handoff');
      }
      assert.ok(speeds[0] > 0 && speeds[0] < TELEPORT_CAMERA_SPEED * .12,
        'movement starts immediately with a gradual acceleration');
      const moving = speeds.filter(speed => speed > 1e-5);
      assert.ok(moving[moving.length - 1] < TELEPORT_CAMERA_SPEED * .12,
        'movement decelerates before normal following resumes');
      assert.ok(Math.max(...speeds) <= TELEPORT_CAMERA_SPEED + 1e-6);
      assert.ok(speeds[speeds.length - 1] < 1e-5);
    });
  }
});

test('boat senses local sources without an orb and mirrors remote contacts at the hull', () => {
  withControls(({ controls, key, mouse }) => {
    const local = giver({ x: controls.state.position.x + 10, z: controls.state.position.z });
    controls.update(.1, 4.8, true, [local]);
    assert.equal(controls.orb.snapshot().boatSignal.band, 4);
    assert.equal(controls.orb.state.active, false);
    const visual = createOrbVisual();
    try {
      visual.update(controls.orb.state, 0, true, controls.state.position);
      const rings = visual.group.children.filter(child => child.name === 'Sense del velero');
      assert.equal(rings.length, 3);
      assert.ok(rings.every(ring => ring.visible && ring.position.x === controls.state.position.x));
      const localColor = rings[0].material.color.clone();
      key('KeyT'); mouse('pointerdown'); mouse('pointerup');
      const remote = giver({ x: controls.orb.state.path.points[100].x, z: controls.orb.state.path.points[100].z });
      controls.update(7, 4.8, true, [remote]);
      assert.equal(controls.orb.state.boatSignal, null);
      assert.ok(controls.orb.state.signal);
      visual.update(controls.orb.state, 7, true, controls.state.position);
      assert.ok(rings.every(ring => ring.visible));
      assert.equal(rings[0].material.color.equals(localColor), false, 'remote echo uses its own color');
      key('KeyR');
      assert.ok(controls.orb.state.boatSignal, 'sensor updates immediately at the teleport landing');
      visual.update(controls.orb.state, 7, true, controls.state.position);
      assert.ok(rings.every(ring => ring.visible && ring.position.x === controls.state.position.x));
    } finally { disposeMeshes(visual.group); }
  });
});

test('map input suspension freezes and resumes a route without holding movement keys', () => {
  withControls(({ controls, key }) => {
    controls.navigateTo({x:150,z:-300});controls.update(.3,4.8,true,[]);
    const position=controls.state.position.clone(),destination=controls.state.destination.clone();
    controls.setEnabled(false,{preserveMovement:true});
    controls.update(2,4.8,false,[]);
    assert.deepEqual(controls.state.position,position);assert.deepEqual(controls.state.destination,destination);
    controls.setEnabled(true);controls.update(.3,4.8,true,[]);
    assert.ok(controls.state.position.distanceTo(position)>0);assert.deepEqual(controls.state.destination,destination);
    key('KeyW');controls.setEnabled(false,{preserveMovement:true});controls.update(2,4.8,false,[]);
    controls.setEnabled(true);controls.update(.1,4.8,true,[]);
    assert.deepEqual(controls.state.destination,destination,'opening the map releases held manual controls');
  });
});

test('vertical passage transitions pause, block steering, preserve distance and retain the orb layer',()=>{
  for(const levelY of [15,30,-15,-30])withControls(({controls,key,mouse,camera})=>{
    const start=controls.state.position.clone(),distance=controls.state.distance;
    assert.equal(controls.transitionTo(new THREE.Vector3(start.x,levelY,start.z)),true);
    assert.equal(controls.transitionTo(new THREE.Vector3(start.x,0,start.z)),false);
    controls.update(.8,4.8,true,[]);const intermediate=controls.state.position.clone();
    assert.ok(Math.abs(intermediate.y)>0&&Math.abs(intermediate.y)<Math.abs(levelY));
    controls.update(10,4.8,false,[]);assert.deepEqual(controls.state.position,intermediate);
    assert.equal(controls.navigateTo({x:500,z:500}),false);key('KeyT');assert.equal(controls.orb.state.aiming,false);
    for(let i=0;i<160;i++)controls.update(1/60,4.8,true,[]);
    assert.equal(controls.state.transit,null);assert.equal(controls.state.position.y,levelY);assert.equal(controls.state.distance,distance);
    assert.ok(Math.abs(camera.position.y-levelY)<10,'camera follows the destination layer');
    key('KeyT');mouse('pointerdown');mouse('pointerup');assert.equal(controls.orb.state.active,true);
    assert.ok(controls.orb.state.path.points.every(point=>point.y===levelY));
    controls.update(.3,4.8,true,[]);key('KeyR');assert.equal(controls.state.position.y,levelY);
  });
});

test('checkpoint transfer shares orb camera movement, consumes active orb, stops steering and preserves sailed distance', () => {
  withControls(({ controls, key, mouse, camera }) => {
    const lotuses=seededLotuses(),content=buildWorldContent({lotuses}),origin=content[0],destination=content[1];
    const progress={...emptyWorldProgress(),checkpoints:[origin.id,destination.id]};
    controls.state.position.set(origin.x+20,0,origin.z);controls.focus();
    key('KeyT');mouse('pointerdown');mouse('pointerup');
    assert.equal(controls.orb.state.active,true);
    controls.state.distance=42;controls.state.destination=new THREE.Vector3(400,0,400);
    controls.state.velocity.set(2,0,2);key('KeyW');
    const travel=planCheckpointTravel(progress,content,controls.state.position,destination.id,lotuses);
    assert.equal(travel.allowed,true);
    const pose=camera.position.clone();
    controls.transferTo(travel.landing);
    assert.deepEqual(camera.position,pose,'travel does not snap the camera');
    assert.deepEqual(controls.state.position,travel.landing);
    assert.equal(controls.state.destination,null);assert.equal(controls.state.velocity.length(),0);
    assert.equal(controls.state.distance,42);assert.equal(controls.orb.state.active,false);
    assert.equal(controls.orb.state.cooldown,1);
    controls.update(.1,4.8,true,lotuses);
    assert.ok(camera.position.distanceTo(pose)>0);assert.equal(controls.state.distance,42);
    assert.deepEqual(controls.state.position,travel.landing,'held keys were released by the transfer');
  });
});

test('ability UI responds immediately and jaunt bursts stay anchored, pause and expire', () => {
  withControls(({ controls, key, mouse, notifications }) => {
    const departure = controls.state.position.clone();
    key('KeyT'); assert.equal(notifications.at(-1).aiming, true);
    mouse('pointerdown'); mouse('pointerup'); assert.equal(notifications.at(-1).active, true);
    assert.ok(Math.abs(notifications.at(-1).flightRemaining - 15) < 1e-8);
    controls.update(2, 4.8, true, []);
    key('KeyR');
    assert.equal(notifications.at(-1).active, false);
    assert.equal(notifications.at(-1).cooldown, ORB_COOLDOWN);
    assert.equal(notifications.at(-1).jaunting, true);
    const state = controls.orb.state, arrival = controls.state.position.clone();
    assert.deepEqual(state.jaunt.from, departure);
    assert.deepEqual(state.jaunt.to, arrival);
    const visual = createOrbVisual();
    try {
      visual.update(state, 2, true, controls.state.position);
      const exit = visual.group.getObjectByName('Disolución etérea');
      const entry = visual.group.getObjectByName('Llegada etérea');
      assert.ok(exit.visible && entry.visible);
      const scale = entry.children[0].scale.clone();
      controls.update(5, 4.8, false, []);
      visual.update(state, 2, true, controls.state.position);
      assert.deepEqual(entry.children[0].scale, scale, 'pause freezes the burst');
      key('KeyW'); controls.update(.5, 4.8, true, []);
      assert.deepEqual(state.jaunt.to, arrival, 'effect stays at the landing after the boat moves');
      visual.update(state, 2.5, true, controls.state.position);
      visual.group.traverse(object => {
        assert.equal(!!object.isLight, false);
        if (object.geometry) assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
      });
      controls.update(.8, 4.8, true, []);
      visual.update(state, 3.3, true, controls.state.position);
      assert.equal(state.jaunt, null);
      assert.equal(exit.visible, false); assert.equal(entry.visible, false);
    } finally { disposeMeshes(visual.group); }
  });
});
