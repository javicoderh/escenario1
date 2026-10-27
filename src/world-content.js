import { ZONES, zoneAt } from './world-zones.js';
import { seededPassages } from './world-passages.js';
import { validLevel } from './world-levels.js';

export const CONTENT_TYPES = {
  island: { label: 'Islas', singular: 'Isla', symbol: '▲' },
  dungeon: { label: 'Dungeons', singular: 'Dungeon', symbol: '▣' },
  'hunting-zone': { label: 'Zonas de caza', singular: 'Zona de caza', symbol: '⚔' },
  treasure: { label: 'Tesoros', singular: 'Tesoro', symbol: '◆' },
  quest: { label: 'Quests', singular: 'Quest', symbol: '!' },
  'great-lotus': { label: 'Grandes lotos', singular: 'Gran loto', symbol: '✿' },
  cyclone: { label: 'Ciclones', singular: 'Ciclón', symbol: '↟' },
  whirlpool: { label: 'Remolinos', singular: 'Remolino', symbol: '◎' },
};
export const validContentId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)
  && !['constructor', 'prototype'].includes(id);

// Reserved destinations stay out of the playable map until their world content exists.
export const RESERVED_CONTENT = [{ id: 'zone-1-island-tutorial', zoneId: 1, type: 'island',
  name: 'Isla del Alba', x: 96, y: 0, z: -230, reveal: 'initial', available: false }];

export function parseWorldContent(values) {
  const ids = new Set();
  return (Array.isArray(values) ? values : []).filter(item => {
    if (!item || !validContentId(item.id) || ids.has(item.id) || !Object.hasOwn(CONTENT_TYPES, item.type)
      || item.type === 'great-lotus' || !ZONES.some(zone => zone.id === item.zoneId)
      || !['x', 'y', 'z'].every(axis => Number.isFinite(item[axis]))
      || !validLevel(item.y) || Math.hypot(item.x, item.z) > 997.5
      || (['cyclone','whirlpool'].includes(item.type) && (!validLevel(item.destinationY) || Math.abs(item.destinationY-item.y)!==15))
      || zoneAt(item).id !== item.zoneId) return false;
    ids.add(item.id); return true;
  }).slice(0, 500).map(item => ({ id: item.id, zoneId: item.zoneId, type: item.type,
    name: String(item.name || CONTENT_TYPES[item.type].singular).slice(0, 80), x: item.x, y: item.y, z: item.z,
    reveal: ['initial', 'zone', 'secret'].includes(item.reveal) ? item.reveal : 'zone',
    available: item.available !== false,
    discoveryRadius: Number.isFinite(item.discoveryRadius) ? Math.max(1, Math.min(200, item.discoveryRadius)) : 35,
    visitRadius: Number.isFinite(item.visitRadius) ? Math.max(1, Math.min(100, item.visitRadius)) : 12,
    radius: Number.isFinite(item.radius) ? Math.max(1, Math.min(200, item.radius)) : 20,
    ...(['cyclone','whirlpool'].includes(item.type) ? {destinationY:item.destinationY} : {}) }));
}

export function buildWorldContent(layout) {
  const lotuses = (layout.lotuses || []).filter(item => item.visible !== false && item.y === 0);
  const checkpoints = ZONES.flatMap(zone => {
    const lotus = lotuses.find(item => item.id === `zone-${zone.id}-taker-1` && item.energyRole === 'taker');
    return lotus ? [{ id: lotus.id, zoneId: zone.id, type: 'great-lotus', name: `Gran loto · ${zone.name}`,
      x: lotus.x, y: 0, z: lotus.z, diameter: lotus.diameter, reveal: 'initial', available: true,
      discoveryRadius: 30, visitRadius: 30 }] : [];
  });
  return [...checkpoints, ...parseWorldContent([...(Array.isArray(layout.pointsOfInterest) ? layout.pointsOfInterest : []), ...seededPassages(), ...RESERVED_CONTENT])];
}
