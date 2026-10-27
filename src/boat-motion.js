import * as THREE from 'three';
import { WORLD_RADIUS } from './world-layout.js';

export const BOAT_SPEED = 4.8;
export const BOAT_RADIUS = 2.5;
export const NAVIGATION_RADIUS = WORLD_RADIUS - BOAT_RADIUS;

export function chargedBoatSpeed(baseSpeed, charge) {
  const fraction = Number.isFinite(charge) ? Math.max(0, Math.min(1, charge)) : 0;
  return baseSpeed * (1 + fraction);
}

export function clampSeaPosition(position) {
  return clampNavigationPosition(position,0);
}
export function clampNavigationPosition(position,y=position.y ?? 0) {
  const result = new THREE.Vector3(position.x, y, position.z);
  const length=Math.hypot(result.x,result.z);
  if(length>NAVIGATION_RADIUS){result.x*=NAVIGATION_RADIUS/length;result.z*=NAVIGATION_RADIUS/length;}
  return result;
}

export function createBoatState(lotus) {
  const position = clampSeaPosition({ x: lotus.x + 5, z: lotus.z + 9 });
  const heading = Math.atan2(position.x - lotus.x, position.z - lotus.z);
  return { position, heading, velocity: new THREE.Vector3(), destination: null, distance: 0, transit: null };
}

// Shared by the orb and checkpoints; instantaneous moves never count as sailing.
export function relocateBoat(state, landing) {
  const displacement = landing.clone().sub(state.position);
  state.position.copy(landing); state.transit = null;
  state.velocity.set(0, 0, 0); state.destination = null; state.blocked = false;
  return displacement;
}

export function setBoatDestination(state, point) {
  if (![point.x, point.z].every(Number.isFinite)) return;
  state.destination = clampNavigationPosition(point,state.position.y);
}

// Sweep the hull's bounding circle against the real flower diameters. This
// detects contact along the entire displacement, including low frame rates.
export function moveBoatWithCollisions(state, delta, lotuses = []) {
  const obstacles = lotuses.filter(lotus => lotus.visible !== false && lotus.y === state.position.y
    && Number.isFinite(lotus.x) && Number.isFinite(lotus.z) && lotus.diameter > 0);
  let collided = false;
  const removeInward = normal => {
    const inward = state.velocity.dot(normal);
    if (inward < 0) state.velocity.addScaledVector(normal, -inward);
  };
  // Recover safely if an edited flower or a reset places the hull inside it.
  for (let pass = 0; pass < 32; pass++) {
    let corrected = false;
    for (const lotus of obstacles) {
      const normal = new THREE.Vector3(state.position.x - lotus.x, 0, state.position.z - lotus.z);
      const radius = BOAT_RADIUS + lotus.diameter / 2 + .001;
      const distance = normal.length();
      if (distance >= radius - 1e-8) continue;
      if (distance < 1e-8) normal.set(1, 0, 0); else normal.divideScalar(distance);
      state.position.addScaledVector(normal, radius - distance);
      removeInward(normal); corrected = collided = true;
    }
    if (Math.hypot(state.position.x,state.position.z) > NAVIGATION_RADIUS) {
      state.position.copy(clampNavigationPosition(state.position)); corrected = true;
    }
    if (!corrected) break;
  }
  const remaining = delta.clone();
  for (let pass = 0; pass < 8 && remaining.lengthSq() > 1e-14; pass++) {
    let first = 1, hitNormal = null;
    const a = remaining.lengthSq();
    if ((state.position.x+remaining.x)**2+(state.position.z+remaining.z)**2 > NAVIGATION_RADIUS ** 2) {
      const b = state.position.dot(remaining);
      const c = state.position.x**2+state.position.z**2 - NAVIGATION_RADIUS ** 2;
      first = Math.max(0, (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a);
      hitNormal = new THREE.Vector3(state.position.x+remaining.x*first,0,state.position.z+remaining.z*first).normalize().negate();
    }
    for (const lotus of obstacles) {
      const offset = new THREE.Vector3(state.position.x - lotus.x, 0, state.position.z - lotus.z);
      const radius = BOAT_RADIUS + lotus.diameter / 2 + .001;
      const b = offset.dot(remaining), c = offset.lengthSq() - radius * radius;
      const discriminant = b * b - a * c;
      if (b >= 0 || discriminant < 0) continue;
      const time = (-b - Math.sqrt(discriminant)) / a;
      if (time < -1e-8 || time > first) continue;
      first = Math.max(0, time);
      hitNormal = offset.addScaledVector(remaining, first).normalize();
    }
    state.position.addScaledVector(remaining, first);
    if (!hitNormal) break;
    collided = true;
    remaining.multiplyScalar(1 - first);
    const inward = remaining.dot(hitNormal);
    if (inward < 0) remaining.addScaledVector(hitNormal, -inward);
    removeInward(hitNormal);
  }
  return collided;
}

export function stepBoat(state, input, dt, speed = BOAT_SPEED, lotuses = []) {
  if (!(dt > 0)) return;
  state.blocked = false;
  const direction = new THREE.Vector3(input.x, 0, input.z);
  const manual = direction.lengthSq() > 0;
  if (manual) { direction.normalize(); state.destination = null; }
  else if (state.destination) {
    direction.subVectors(state.destination, state.position);
    direction.normalize();
  }
  let desiredSpeed = speed;
  if (state.destination) desiredSpeed = Math.min(speed, state.position.distanceTo(state.destination) * 2.5);
  const targetVelocity = direction.multiplyScalar(desiredSpeed);
  state.velocity.lerp(targetVelocity, 1 - Math.exp(-6 * dt));
  const previous = state.position.clone();
  const delta = state.velocity.clone().multiplyScalar(dt);
  const arriving = state.destination && (delta.length() > state.position.distanceTo(state.destination)
    || state.position.distanceTo(state.destination) < .18);
  if (arriving) delta.subVectors(state.destination, state.position);
  const collided = moveBoatWithCollisions(state, delta, lotuses);
  if (collided && state.destination) {
    state.destination = null; state.velocity.set(0, 0, 0); state.blocked = true;
  } else if (arriving) { state.destination = null; state.velocity.set(0, 0, 0); }
  if (Math.hypot(state.position.x,state.position.z) > NAVIGATION_RADIUS) {
    state.position.copy(clampNavigationPosition(state.position));
    const normal=new THREE.Vector3(state.position.x,0,state.position.z).normalize(),outward=state.velocity.dot(normal);
    if (outward > 0) state.velocity.addScaledVector(normal, -outward);
  }
  if (state.velocity.lengthSq() > .001) {
    const desired = Math.atan2(-state.velocity.x, -state.velocity.z);
    const turn = Math.atan2(Math.sin(desired - state.heading), Math.cos(desired - state.heading));
    state.heading += turn * (1 - Math.exp(-5 * dt));
  }
  state.distance += previous.distanceTo(state.position);
}
