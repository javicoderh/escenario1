export const LOTUS_SIZES = {
  small: { diameter: 2, capacity: 10 }, 'small-mid': { diameter: 3, capacity: 20 },
  mid: { diameter: 5, capacity: 35 }, big: { diameter: 8, capacity: 60 },
  giant: { diameter: 13, capacity: 100 }, huge: { diameter: 20, capacity: 160 },
};
export const BOAT_LEVELS = [
  { threshold: 0, capacity: 100, autonomy: 40, scale: 1 },
  { threshold: 100, capacity: 140, autonomy: 90, scale: 1.15 },
  { threshold: 250, capacity: 190, autonomy: 140, scale: 1.3 },
  { threshold: 500, capacity: 250, autonomy: 200, scale: 1.45 },
  { threshold: 900, capacity: 330, autonomy: 270, scale: 1.6 },
  { threshold: 1600, capacity: 430, autonomy: 330, scale: 1.6 },
  { threshold: 2600, capacity: 560, autonomy: 400, scale: 1.6 },
  { threshold: 4200, capacity: 720, autonomy: 480, scale: 1.6 },
];
const finite = (value, fallback, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
export function createWaterLotus(value = {}) {
  const size = LOTUS_SIZES[value.size] ? value.size : 'small';
  const preset = LOTUS_SIZES[size], energyRole = value.energyRole === 'taker' ? 'taker' : 'giver';
  const capacity = finite(value.capacity, energyRole === 'giver' ? preset.capacity * 20 : preset.capacity, 1, 100000);
  return { id: String(value.id || 'water-lotus').slice(0, 80), name: String(value.name || 'Loto').slice(0, 60),
    x: finite(value.x, 0, -1000, 1000), y: 0, z: finite(value.z, 0, -1000, 1000), visible: value.visible !== false,
    energyRole, size, diameter: finite(value.diameter, preset.diameter, .5, 60),
    palette: ['ember','sakura','moon'].includes(value.palette) ? value.palette : 'ember', capacity,
    energy: finite(value.energy, energyRole === 'giver' ? capacity : 0, 0, capacity),
    rate: finite(value.rate, energyRole === 'giver' ? 10 : 5, .1, 1000),
    range: finite(value.range, 30, 1, 200), regeneration: finite(value.regeneration, energyRole === 'giver' ? 1 : 0, 0, 1000) };
}
export function createEnergyState() {
  return { energy: 0, delivered: 0, restored: 0, level: 1, linkId: null, linkOpacity: 0, linkPosition: null };
}
export function boatStats(state) { return BOAT_LEVELS[state.level - 1]; }
export function stepEnergy(state, lotuses, position, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  // Fixed upper bound per integration step handles capacity/level boundaries consistently.
  let remaining = seconds;
  while (remaining > 1e-9) {
    const dt = Math.min(remaining, .05); remaining -= dt;
    const eligible = lotus => lotus.visible && lotus.y === 0 && Math.hypot(lotus.x-position.x, lotus.z-position.z) <= lotus.range
      && (lotus.energyRole === 'giver' ? lotus.energy > 1e-8
        : lotus.energy < lotus.capacity - 1e-8 && state.energy > 1e-8);
    const candidates = lotuses.filter(eligible).sort((a,b) => Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
    const stats = boatStats(state);
    let active = candidates.find(lotus => lotus.id === state.linkId) || candidates[0];
    // A full boat can hand its link to a nearby receiver instead of being held
    // indefinitely by an overlapping source that cannot transfer any more.
    if (active?.energyRole === 'giver' && state.energy >= stats.capacity - 1e-8)
      active = candidates.find(lotus => lotus.energyRole === 'taker') || active;
    if (active) {
      const giver = active.energyRole === 'giver';
      const amount = Math.min(active.rate * dt, giver ? active.energy : state.energy,
        giver ? stats.capacity-state.energy : active.capacity-active.energy);
      active.energy += giver ? -amount : amount;
      state.energy += giver ? amount : -amount;
      if (!giver) {
        state.delivered += amount;
        if (active.energy >= active.capacity - 1e-8) { active.energy = active.capacity; state.restored++; }
        state.level = BOAT_LEVELS.reduce((level, item, index) => state.delivered + 1e-8 >= item.threshold ? index+1 : level, 1);
      }
      state.linkId = active.id; state.linkPosition = { x: active.x, y: active.y, z: active.z };
      state.linkRole = active.energyRole; state.linkName = active.name;
      state.linkOpacity = Math.min(1, state.linkOpacity + dt/.65);
    } else {
      state.linkId = null;
      state.linkOpacity = Math.max(0, state.linkOpacity-dt/1.5);
      state.energy = Math.max(0, state.energy-stats.capacity/stats.autonomy*dt);
    }
    for (const lotus of lotuses) if (lotus.energyRole === 'giver' && lotus !== active)
      lotus.energy = Math.min(lotus.capacity, lotus.energy+lotus.regeneration*dt);
  }
}
