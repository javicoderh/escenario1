import { ZONES } from './world-zones.js';
import { validLevel, levelName } from './world-levels.js';

export const PASSAGE_RADIUS = 20;
export function seededPassages() {
  return ZONES.flatMap(zone => [
    { type: 'cyclone', low: 0, high: 15, tag: 'sea-sky1', radius: 200 + (zone.id-1)*40, offset: -.14 },
    { type: 'cyclone', low: 15, high: 30, tag: 'sky1-sky2', radius: 290 + (zone.id-1)*40, offset: -.09 },
    { type: 'whirlpool', low: -15, high: 0, tag: 'depth1-sea', radius: 205 + (zone.id-1)*40, offset: .14 },
    { type: 'whirlpool', low: -30, high: -15, tag: 'depth2-depth1', radius: 295 + (zone.id-1)*40, offset: .09 },
  ].flatMap(edge => {
    const angle = zone.angle + Math.PI/8 + edge.offset;
    const x = Math.round(Math.sin(angle)*edge.radius), z = Math.round(-Math.cos(angle)*edge.radius);
    return [[edge.low,edge.high,'up'],[edge.high,edge.low,'down']].map(([y,destinationY,direction]) => ({
      id: `zone-${zone.id}-${edge.type}-${edge.tag}-${direction}`, zoneId: zone.id, type: edge.type,
      name: `${edge.type === 'cyclone' ? 'Ciclón' : 'Remolino'} · ${levelName(destinationY)}`,
      x,y,z,destinationY,reveal:'zone',available:true,discoveryRadius:75,visitRadius:20,radius:9,
    }));
  }));
}
export function nearbyPassages(content, position) {
  if (!position || !validLevel(position.y ?? 0)) return [];
  return content.filter(point => point.available && ['cyclone','whirlpool'].includes(point.type)
    && point.y === (position.y ?? 0) && Math.hypot(point.x-position.x,point.z-position.z) <= PASSAGE_RADIUS)
    .sort((a,b) => Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
}
