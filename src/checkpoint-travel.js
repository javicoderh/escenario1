import { orbLanding } from './illusory-orb.js';
import { CHECKPOINT_RADIUS, checkpointTravelStatus } from './world-progress.js';

export function planCheckpointTravel(progress, content, position, destinationId, lotuses, options) {
  const status = checkpointTravelStatus(progress, content, position, destinationId, options);
  if (!status.allowed) return status;
  const landing = orbLanding(status.destination, lotuses);
  if (!landing || Math.hypot(landing.x-status.destination.x, landing.z-status.destination.z) > CHECKPOINT_RADIUS)
    return { allowed: false, reason: 'No hay espacio libre junto al destino. Prueba otro checkpoint.' };
  return { ...status, landing };
}
