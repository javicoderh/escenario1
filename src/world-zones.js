import { createWaterLotus, LOTUS_SIZES } from './lotus-energy.js';

export const MAX_WATER_LOTUSES = 320;
export const ZONES = [
  { id: 1, name: 'Cuna del Alba', givers: 3, target: 160, sizes: ['small', 'small-mid', 'mid'], color: '#ebc77c' },
  { id: 2, name: 'Jardín de Bruma', givers: 4, target: 280, sizes: ['small-mid', 'mid', 'small'], color: '#d4a7c5' },
  { id: 3, name: 'Bahía de Seda', givers: 5, target: 450, sizes: ['mid', 'small-mid', 'big'], color: '#a5bae6' },
  { id: 4, name: 'Mareas de Ámbar', givers: 6, target: 650, sizes: ['mid', 'big', 'small-mid'], color: '#e6a366' },
  { id: 5, name: 'Santuario Esmeralda', givers: 7, target: 900, sizes: ['big', 'mid', 'giant'], color: '#7fd2ac' },
  { id: 6, name: 'Mar de los Colosos', givers: 8, target: 1200, sizes: ['big', 'giant', 'mid'], color: '#93b9d2' },
  { id: 7, name: 'Abismo Estelar', givers: 9, target: 1600, sizes: ['giant', 'mid', 'big'], color: '#a69bdb' },
  { id: 8, name: 'Corona del Loto', givers: 10, target: 2100, sizes: ['giant', 'big', 'mid'], color: '#f0cf91' },
].map(zone => ({ ...zone, takers: 1, angle: (zone.id - 1) * Math.PI / 4 }));

// North is -Z; each sector occupies 45 degrees clockwise from north.
export function zoneAt({ x, z }) {
  const angle = (Math.atan2(x, -z) + Math.PI * 2) % (Math.PI * 2);
  return ZONES[Math.floor(angle / (Math.PI / 4)) % 8];
}
const polar = (radius, angle) => ({ x: Math.round(Math.sin(angle) * radius), y: 0, z: Math.round(-Math.cos(angle) * radius) });
export function seededLotuses() {
  return ZONES.flatMap((zone, index) => {
    const middle = zone.angle + Math.PI / 8;
    const palette = ['sakura', 'moon', 'moon', 'ember', 'sakura', 'ember', 'moon', 'ember'][index];
    const radius = 160 + index * 75;
    const givers = Array.from({ length: zone.givers }, (_, i) => createWaterLotus({
      id: `zone-${zone.id}-giver-${i + 1}`, name: `${zone.name} · Fuente ${i + 1}`,
      ...polar(radius - 70 + i % 3 * 65, middle + (i % 2 ? -1 : 1) * (.17 + Math.floor(i / 3) * .04)),
      energyRole: 'giver', size: zone.sizes[i % zone.sizes.length], palette,
      capacity: Math.ceil(zone.target * 1.8 / zone.givers * (.8 + i / (zone.givers - 1) * .4)),
      rate: 10 + index * 3, regeneration: 1 + index * .25, range: 30,
    }));
    const target = createWaterLotus({ id: `zone-${zone.id}-taker-1`, name: `${zone.name} · Gran loto`,
      ...polar(radius, middle), energyRole: 'taker', size: 'huge', diameter: LOTUS_SIZES.huge.diameter + index * 1.5,
      palette, capacity: zone.target, rate: 8 + index * 3, range: 24,
    });
    return [...givers, target];
  });
}

// Run once for existing saves as well as new games. Stable IDs prevent duplicates;
// the flag prevents deleted or edited seeded flowers from reappearing on reload.
export function seedWorld(layout) {
  if (layout.zonesVersion === 2) return layout;
  const custom = layout.lotuses.filter(item => !/^zone-[1-8]-(giver|taker)-\d+$/.test(item.id));
  return { ...layout, zonesVersion: 2,
    lotuses: [...custom, ...seededLotuses()].slice(0, MAX_WATER_LOTUSES) };
}
