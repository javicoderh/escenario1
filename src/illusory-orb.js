import * as THREE from 'three';
import { BOAT_RADIUS, NAVIGATION_RADIUS, clampNavigationPosition } from './boat-motion.js';

export const ORB_RANGE = 300;
export const ORB_SPEED = 20;
export const ORB_COOLDOWN = 1;
export const ORB_HEIGHT = 1.5;
export const EMISSION_RADII = { small: 50, 'small-mid': 60, mid: 70, big: 80, giant: 90, huge: 100 };

export function lotusEmissionRadius(lotus) {
  return EMISSION_RADII[lotus.size] || 50;
}

export function senseLotuses(position, lotuses) {
  let strongest = null;
  for (const lotus of lotuses) {
    if (lotus.visible === false || lotus.y !== 0 || lotus.energyRole !== 'giver' || !(lotus.energy > 0)) continue;
    const distance = Math.hypot(position.x - lotus.x, position.y - lotus.y, position.z - lotus.z);
    const radius = lotusEmissionRadius(lotus);
    if (distance >= radius) continue;
    const bands = radius / 10;
    const band = Math.min(bands, Math.ceil((radius - distance) / 10));
    const intensity = band / bands;
    if (!strongest || intensity > strongest.intensity || (intensity === strongest.intensity && distance < strongest.distance)) {
      strongest = { id: lotus.id, name: lotus.name, distance, radius, band, bands, intensity,
        near: Math.floor(distance / 10) * 10, far: Math.floor(distance / 10) * 10 + 10 };
    }
  }
  return strongest;
}

// Sample a quadratic arc, then truncate by travelled distance rather than by
// distance from the boat: bending never grants extra range.
export function buildOrbPath(origin, target, curvature = 0, bend = new THREE.Vector3()) {
  const start = new THREE.Vector3(origin.x, origin.y ?? 0, origin.z);
  const direction = new THREE.Vector3(target.x - origin.x, 0, target.z - origin.z);
  if (direction.lengthSq() < 1e-8) direction.set(0, 0, -1);
  direction.normalize();
  const end = start.clone().addScaledVector(direction, ORB_RANGE);
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const control = start.clone().addScaledVector(direction, ORB_RANGE / 2)
    .addScaledVector(side, THREE.MathUtils.clamp(curvature, -1, 1) * ORB_RANGE * .8).add(bend);
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  const points = [start], lengths = [0], parameters = [0];
  let total = 0;
  for (let index = 1; index <= 200; index++) {
    const previous = points[points.length - 1], next = curve.getPoint(index / 200);
    if (bend.y === 0) next.y = start.y;
    const delta = next.clone().sub(previous), segment = delta.length();
    let fraction = segment > 0 ? Math.min(1, (ORB_RANGE - total) / segment) : 1;
    if (next.x ** 2 + next.z ** 2 > NAVIGATION_RADIUS ** 2) {
      const a = delta.x ** 2 + delta.z ** 2, b = previous.x * delta.x + previous.z * delta.z;
      const c = previous.x ** 2 + previous.z ** 2 - NAVIGATION_RADIUS ** 2;
      fraction = Math.min(fraction, Math.max(0, (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a));
    }
    next.copy(previous).addScaledVector(delta, fraction);
    total += previous.distanceTo(next);
    points.push(next); lengths.push(total); parameters.push((index - 1 + fraction) / 200);
    if (fraction < 1 || total >= ORB_RANGE - 1e-8) break;
  }
  return { points, lengths, parameters, length: total };
}

export function pointOnOrbPath(path, distance, result = new THREE.Vector3()) {
  const travelled = THREE.MathUtils.clamp(distance, 0, path.length);
  let index = 1;
  while (index < path.lengths.length - 1 && path.lengths[index] < travelled) index++;
  const length = path.lengths[index] - path.lengths[index - 1];
  return result.copy(path.points[index - 1]).lerp(path.points[index], length > 0 ? (travelled - path.lengths[index - 1]) / length : 0);
}

export function createOrbState() {
  return { aiming: false, path: null, active: false, travelled: 0,
    position: new THREE.Vector3(), cooldown: 0, signal: null, boatSignal: null, time: 0, jaunt: null };
}

export function launchOrb(state, path) {
  if (state.active || state.cooldown > 0 || !state.aiming || !(path?.length > .01)) return false;
  state.path = path; state.active = true; state.aiming = false;
  state.travelled = 0; state.position.copy(path.points[0]); state.signal = null;
  return true;
}

export function dismissOrb(state) {
  if (!state.active) return;
  state.active = false; state.signal = null; state.cooldown = ORB_COOLDOWN;
}

export function stepOrb(state, seconds, lotuses) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  state.time += seconds;
  if (state.jaunt && state.time - state.jaunt.startedAt > 1.2) state.jaunt = null;
  if (!state.active) { state.cooldown = Math.max(0, state.cooldown - seconds); return; }
  const flightSeconds = (state.path.length - state.travelled) / ORB_SPEED;
  state.travelled = Math.min(state.path.length, state.travelled + ORB_SPEED * seconds);
  pointOnOrbPath(state.path, state.travelled, state.position);
  state.signal = senseLotuses(state.position, lotuses);
  if (seconds >= flightSeconds - 1e-9) {
    dismissOrb(state);
    state.cooldown = Math.max(0, ORB_COOLDOWN - Math.max(0, seconds - flightSeconds));
  }
}

// Teleportation can cross flowers, but its landing must leave room for the hull.
// If the orb is inside a flower, use the closest sampled free water around it.
export function orbLanding(position, lotuses, levelY=0) {
  const center = clampNavigationPosition(position,levelY);
  const obstacles = lotuses.filter(lotus => lotus.visible !== false && lotus.y === levelY);
  const safe = point => point.x**2+point.z**2 <= NAVIGATION_RADIUS ** 2 + 1e-8
    && obstacles.every(lotus => Math.hypot(point.x - lotus.x, point.z - lotus.z) >= BOAT_RADIUS + lotus.diameter / 2 + .01);
  if (safe(center)) return center;
  for (let radius = 1; radius <= 64; radius++) {
    for (let index = 0; index < 64; index++) {
      const angle = index / 64 * Math.PI * 2;
      const point = center.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      if (safe(point)) return point;
    }
  }
  return null;
}

export function orbSnapshot(state) {
  return { aiming: state.aiming, active: state.active,
    cooldown: state.cooldown, remaining: state.active ? Math.max(0, state.path.length - state.travelled) : 0,
    flightRemaining: state.active ? Math.max(0, state.path.length - state.travelled) / ORB_SPEED : 0,
    flightFraction: state.active ? Math.max(0, 1 - state.travelled / state.path.length) : 0,
    jaunting: !!state.jaunt,
    signal: state.signal ? { ...state.signal } : null,
    boatSignal: state.boatSignal ? { ...state.boatSignal } : null };
}
