import * as THREE from 'three';
import { nearbyPassages, PASSAGE_RADIUS } from './world-passages.js';
import { validLevel } from './world-levels.js';
import { orbLanding } from './illusory-orb.js';

export function planPassage(content, position, id, lotuses, { paused = false, transitioning = false } = {}) {
  if (paused || transitioning) return { allowed:false, reason: paused ? 'Reanuda la navegación para usar el acceso.' : 'Ya estás cambiando de nivel.' };
  const gate = nearbyPassages(content,position).find(point => point.id === id);
  if (!gate || !validLevel(gate.destinationY) || Math.abs(gate.destinationY-gate.y) !== 15)
    return {allowed:false,reason:'Acércate al ciclón o remolino de tu nivel.'};
  const desired = new THREE.Vector3(gate.x,gate.destinationY,gate.z);
  const landing = orbLanding(desired,lotuses,gate.destinationY);
  if (!landing || Math.hypot(landing.x-gate.x,landing.z-gate.z)>PASSAGE_RADIUS)
    return {allowed:false,reason:'El acceso no tiene una salida libre en este momento.'};
  return {allowed:true,gate,landing};
}
