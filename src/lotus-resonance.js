export const RESONANCE_RANGE = 12;
export const POWER_TRANSITION_SECONDS = 40;
export const LINK_FADE_IN_SECONDS = .65;
export const LINK_FADE_OUT_SECONDS = 1.5;

export function nearestWaterLotus(position, sources, range = RESONANCE_RANGE) {
  let nearest = null;
  for (const source of sources) {
    if (!source.visible || source.role !== 'water-lotus' || !source.position
      || !['x','y','z'].every(axis => Number.isFinite(source.position[axis])) || Math.abs(source.position.y) > .01) continue;
    const distance = Math.hypot(source.position.x - position.x, source.position.z - position.z);
    if (distance <= range && (!nearest || distance < nearest.distance)) nearest = { ...source, distance };
  }
  return nearest;
}

export function createResonanceState() {
  return { charge: 0, connected: false, sourceId: null, distance: null, sourcePosition: null,
    linkOpacity: 0, transitionFrom: 0, transitionElapsed: 0, transitionTarget: 0 };
}

export function stepResonance(state, seconds, source) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const connected = !!source;
  if (connected !== state.connected) {
    state.transitionFrom = state.charge;
    state.transitionElapsed = 0;
    state.transitionTarget = connected ? 1 : 0;
  }
  state.connected = connected;
  state.sourceId = source?.id ?? null;
  state.distance = source?.distance ?? null;
  if (source) state.sourcePosition = { ...source.position };
  state.transitionElapsed = Math.min(POWER_TRANSITION_SECONDS, state.transitionElapsed + seconds);
  const progress = state.transitionElapsed / POWER_TRANSITION_SECONDS;
  state.charge = state.transitionFrom + (state.transitionTarget - state.transitionFrom) * progress;
  state.linkOpacity = connected ? Math.min(1, state.linkOpacity + seconds / LINK_FADE_IN_SECONDS)
    : Math.max(0, state.linkOpacity - seconds / LINK_FADE_OUT_SECONDS);
}
