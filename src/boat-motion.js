import * as THREE from 'three';
import { WORLD_RADIUS } from './world-layout.js';

export const BOAT_SPEED = 4;
export const BOAT_RADIUS = 2.5;
export const NAVIGATION_RADIUS = WORLD_RADIUS - BOAT_RADIUS;

export function clampSeaPosition(position) {
  const result = new THREE.Vector3(position.x, 0, position.z);
  if (result.length() > NAVIGATION_RADIUS) result.setLength(NAVIGATION_RADIUS);
  return result;
}

export function createBoatState(lotus) {
  const position = clampSeaPosition({ x: lotus.x + 5, z: lotus.z + 9 });
  const heading = Math.atan2(position.x - lotus.x, position.z - lotus.z);
  return { position, heading, velocity: new THREE.Vector3(), destination: null, distance: 0 };
}

export function setBoatDestination(state, point) {
  if (![point.x, point.z].every(Number.isFinite)) return;
  state.destination = clampSeaPosition(point);
}

export function stepBoat(state, input, dt, speed = BOAT_SPEED) {
  if (!(dt > 0)) return;
  const direction = new THREE.Vector3(input.x, 0, input.z);
  const manual = direction.lengthSq() > 0;
  if (manual) { direction.normalize(); state.destination = null; }
  else if (state.destination) {
    direction.subVectors(state.destination, state.position);
    if (direction.length() < .18) {
      state.position.copy(state.destination); state.destination = null; state.velocity.set(0, 0, 0); return;
    }
    direction.normalize();
  }
  let desiredSpeed = speed;
  if (state.destination) desiredSpeed = Math.min(speed, state.position.distanceTo(state.destination) * 2.5);
  const targetVelocity = direction.multiplyScalar(desiredSpeed);
  state.velocity.lerp(targetVelocity, 1 - Math.exp(-6 * dt));
  const previous = state.position.clone();
  const delta = state.velocity.clone().multiplyScalar(dt);
  if (state.destination && delta.length() > state.position.distanceTo(state.destination)) {
    state.position.copy(state.destination); state.destination = null; state.velocity.set(0, 0, 0);
  } else state.position.add(delta);
  if (state.position.length() > NAVIGATION_RADIUS) {
    state.position.setLength(NAVIGATION_RADIUS);
    const outward = state.velocity.dot(state.position) / state.position.lengthSq();
    if (outward > 0) state.velocity.addScaledVector(state.position, -outward);
  }
  if (state.velocity.lengthSq() > .001) {
    const desired = Math.atan2(-state.velocity.x, -state.velocity.z);
    const turn = Math.atan2(Math.sin(desired - state.heading), Math.cos(desired - state.heading));
    state.heading += turn * (1 - Math.exp(-5 * dt));
  }
  state.distance += previous.distanceTo(state.position);
}
