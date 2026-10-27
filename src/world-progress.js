import { ZONES } from './world-zones.js';
import { validContentId } from './world-content.js';
import { discoverChart } from './world-discovery.js';
import { validLevel } from './world-levels.js';

export const EXPLORATION_KEY = 'flamming-lottus-exploration-v1';
export const CHECKPOINT_RADIUS = 30;
const ranks = { revealed: 1, visited: 2, completed: 3 };
const validCheckpoint = id => /^zone-[1-8]-taker-1$/.test(id);
export function emptyWorldProgress() {
  return { version: 1, revealedZones: [], checkpoints: [], places: {}, charted: {}, lastCheckpoint: null };
}
export function parseWorldProgress(value) {
  const result = emptyWorldProgress();
  if (!value || value.version !== 1) return result;
  result.revealedZones = [...new Set((Array.isArray(value.revealedZones) ? value.revealedZones : [])
    .filter(id => ZONES.some(zone => zone.id === id)))].sort((a, b) => a - b);
  result.checkpoints = [...new Set((Array.isArray(value.checkpoints) ? value.checkpoints : [])
    .filter(id => typeof id === 'string' && validCheckpoint(id)))].sort();
  // A saved checkpoint always implies the corresponding zone was revealed.
  result.revealedZones = [...new Set([...result.revealedZones, ...result.checkpoints.map(id => Number(id.split('-')[1]))])].sort((a,b) => a-b);
  if (value.places && typeof value.places === 'object' && !Array.isArray(value.places))
    for (const [id, status] of Object.entries(value.places).slice(0, 1000))
      if (validContentId(id) && Object.hasOwn(ranks, status)) result.places[id] = status;
  if (result.checkpoints.includes(value.lastCheckpoint)) result.lastCheckpoint = value.lastCheckpoint;
  if(value.charted && typeof value.charted==='object')for(const y of [-30,-15,0,15,30]){
    if(Array.isArray(value.charted[y]))result.charted[y]=[...new Set(value.charted[y].filter(cell=>Number.isInteger(cell)&&cell>=0&&cell<400))].sort((a,b)=>a-b);
  }
  return result;
}
export function readWorldProgress(storage) {
  try { return parseWorldProgress(JSON.parse((storage || globalThis.localStorage)?.getItem(EXPLORATION_KEY))); }
  catch { return emptyWorldProgress(); }
}
export function saveWorldProgress(progress, storage) {
  try { (storage || globalThis.localStorage).setItem(EXPLORATION_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}
export function placeStatus(progress, point) {
  if (!point.available) return 'hidden';
  const explicit = progress.places[point.id];
  if (Object.hasOwn(ranks, explicit)) return explicit;
  return point.reveal === 'initial' || (point.reveal === 'zone' && progress.revealedZones.includes(point.zoneId)) ? 'revealed' : 'hidden';
}
export const visibleWorldContent = (progress, content) => content.filter(point => placeStatus(progress, point) !== 'hidden');
export function markPlace(progress, id, status) {
  if (!validContentId(id) || !Object.hasOwn(ranks, status) || (ranks[progress.places[id]] || 0) >= ranks[status]) return progress;
  return { ...progress, places: { ...progress.places, [id]: status } };
}
export function updateWorldProgress(progress, content, lotuses, position, discover = true) {
  let next = discover && position ? discoverChart(progress,position) : progress;
  const unlocked = [];
  for (const point of content) {
    if (!point.available) continue;
    if (point.type === 'great-lotus' && !next.checkpoints.includes(point.id)) {
      const lotus = lotuses.find(item => item.id === point.id);
      if (lotus?.energyRole === 'taker' && lotus.visible !== false && lotus.y === 0
        && Number.isFinite(lotus.capacity) && lotus.capacity > 0 && lotus.energy >= lotus.capacity - 1e-8) {
        next = { ...next, revealedZones: [...new Set([...next.revealedZones, point.zoneId])].sort((a,b) => a-b),
          checkpoints: [...next.checkpoints, point.id].sort() };
        unlocked.push(point.zoneId);
      }
    }
    if (discover && position && validLevel(position.y ?? 0) && point.y === (position.y ?? 0) && ['x', 'z'].every(axis => Number.isFinite(position[axis]))) {
      const distance = Math.hypot(position.x - point.x, (position.y || 0) - point.y, position.z - point.z);
      if (distance <= point.visitRadius) next = markPlace(next, point.id, 'visited');
      else if (distance <= point.discoveryRadius) next = markPlace(next, point.id, 'revealed');
    }
  }
  return { progress: next, unlocked };
}
export function nearbyCheckpoint(progress, content, position) {
  if (!position) return null;
  return content.filter(point => point.available && point.type === 'great-lotus' && point.y === (position.y ?? 0) && progress.checkpoints.includes(point.id))
    .map(point => ({ point, distance: Math.hypot(point.x-position.x, point.z-position.z) }))
    .filter(item => item.distance <= CHECKPOINT_RADIUS).sort((a,b) => a.distance-b.distance)[0]?.point || null;
}
export function checkpointTravelStatus(progress, content, position, destinationId, { paused = false, inCombat = false } = {}) {
  if (paused) return { allowed: false, reason: 'Reanuda la navegación para viajar.' };
  if (inCombat) return { allowed: false, reason: 'No puedes viajar durante un combate.' };
  const destination = content.find(point => point.id === destinationId && point.type === 'great-lotus' && point.available);
  if (!destination || !progress.checkpoints.includes(destination.id)) return { allowed: false, reason: 'Restaura este gran loto para activar su checkpoint.' };
  const origin = nearbyCheckpoint(progress, content, position);
  if (!origin) return { allowed: false, reason: 'Acércate a menos de 30 m de un checkpoint activado.' };
  if (origin.id === destination.id) return { allowed: false, reason: 'Ya estás junto a este checkpoint.' };
  return { allowed: true, reason: 'Viaje gratuito · llegada junto al gran loto', origin, destination };
}
