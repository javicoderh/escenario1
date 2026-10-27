import { createWaterLotus } from './lotus-energy.js';
import { seedWorld, MAX_WATER_LOTUSES } from './world-zones.js';
import { parseWorldContent } from './world-content.js';
export const WORLD_RADIUS = 1000;
export const GRID_STEP = 25;
import { WORLD_LEVELS as LEVELS } from './world-levels.js';
export { LEVELS };
export const STORAGE_KEY = 'flamming-lottus-world-v1';

export function isValidPosition(position) {
  return position && ['x', 'y', 'z'].every(axis => Number.isFinite(position[axis]))
    && Math.hypot(position.x, position.z) <= WORLD_RADIUS
    && LEVELS.some(level => level.y === position.y);
}

export function emptyLayout() {
  return { version: 1, radius: WORLD_RADIUS, units: 'meters', levels: LEVELS.map(level => level.y),
    lotus: { x: 22, y: 0, z: -65, visible: false }, lotuses: [], markers: [], pointsOfInterest: [] };
}

export function parseLayout(value) {
  if (!value || value.version !== 1 || !isValidPosition(value.lotus) || !Array.isArray(value.markers)) return emptyLayout();
  const ids = new Set();
  const lotusIds = new Set(['water-lotus']);
  const lotuses = (Array.isArray(value.lotuses) ? value.lotuses : []).filter(item => {
    if (!item || !isValidPosition(item) || item.y !== 0 || typeof item.id !== 'string' || lotusIds.has(item.id)) return false;
    lotusIds.add(item.id); return true;
  }).slice(0, MAX_WATER_LOTUSES).map(createWaterLotus);
  return { ...emptyLayout(), ...([1,2].includes(value.zonesVersion) ? { zonesVersion: value.zonesVersion } : {}), lotuses, lotus: { ...value.lotus, visible: value.lotus.visible === true },
    pointsOfInterest: parseWorldContent(value.pointsOfInterest),
    markers: value.markers.filter(marker => {
      if (!isValidPosition(marker) || typeof marker.id !== 'string' || ids.has(marker.id)) return false;
      ids.add(marker.id);
      return true;
    }).slice(0, 200).map(marker => ({ id: marker.id, name: String(marker.name || 'Punto').slice(0, 60),
      x: marker.x, y: marker.y, z: marker.z, kind: 'anchor' })) };
}

export function readLayout() {
  try { return seedWorld(parseLayout(JSON.parse(localStorage.getItem(STORAGE_KEY)))) ; }
  catch { return seedWorld(emptyLayout()); }
}

// Normalized input prevents diagonal flight from being faster than straight flight.
export function flightInput(keys) {
  const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const y = Number(keys.has('Space') || keys.has('KeyE')) - Number(keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyQ'));
  const z = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}
