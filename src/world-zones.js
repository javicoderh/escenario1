import { createWaterLotus, LOTUS_SIZES } from './lotus-energy.js';

export const MAX_WATER_LOTUSES = 320;
export const ZONES = [
  { name: 'Cuna del Alba', givers: 2, takers: 5, sizes: ['small'], color: '#ebc77c' },
  { name: 'Jardín de Bruma', givers: 3, takers: 7, sizes: ['small', 'small-mid'], color: '#d4a7c5' },
  { name: 'Bahía de Seda', givers: 4, takers: 9, sizes: ['small-mid', 'mid'], color: '#a5bae6' },
  { name: 'Mareas de Ámbar', givers: 5, takers: 12, sizes: ['mid', 'big'], color: '#e6a366' },
  { name: 'Santuario Esmeralda', givers: 6, takers: 15, sizes: ['big'], color: '#7fd2ac' },
  { name: 'Mar de los Colosos', givers: 7, takers: 18, sizes: ['big', 'giant'], color: '#93b9d2' },
  { name: 'Abismo Estelar', givers: 8, takers: 22, sizes: ['giant', 'huge'], color: '#a69bdb' },
  { name: 'Corona del Loto', givers: 10, takers: 27, sizes: ['huge'], color: '#f0cf91' },
].map((zone, index) => ({ ...zone, id: index + 1, angle: index * Math.PI / 4 }));

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
    const givers = Array.from({ length: zone.givers }, (_, i) => createWaterLotus({
      id: `zone-${zone.id}-giver-${i + 1}`, name: `${zone.name} · Fuente ${i + 1}`,
      ...polar(100 + i * 80, middle), energyRole: 'giver', size: zone.sizes.at(-1), palette,
      capacity: 240 + index * 180 + i * 30, rate: 10 + index * 3, regeneration: 1 + index * .25, range: 30,
    }));
    const takers = Array.from({ length: zone.takers }, (_, i) => {
      const size = zone.sizes[i % zone.sizes.length];
      const cluster = i % zone.givers, row = Math.floor(i / zone.givers);
      const radius = 100 + cluster * 80 + (row - 1) * 12;
      const angle = middle + (row % 2 ? -1 : 1) * (.30 + row * .025);
      return createWaterLotus({ id: `zone-${zone.id}-taker-${i + 1}`,
        name: `${zone.name} · Brote ${i + 1}`, ...polar(radius, angle), energyRole: 'taker', size, palette,
        capacity: Math.round(LOTUS_SIZES[size].capacity * (1 + index * .25)), rate: 5 + index * 2, range: 12,
      });
    });
    return [...givers, ...takers];
  });
}

// Run once for existing saves as well as new games. Stable IDs prevent duplicates;
// the flag prevents deleted or edited seeded flowers from reappearing on reload.
export function seedWorld(layout) {
  if (layout.zonesVersion === 1) return layout;
  const ids = new Set(layout.lotuses.map(item => item.id));
  return { ...layout, zonesVersion: 1,
    lotuses: [...layout.lotuses, ...seededLotuses().filter(item => !ids.has(item.id))].slice(0, MAX_WATER_LOTUSES) };
}
