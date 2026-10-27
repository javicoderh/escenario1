import * as THREE from 'three';
import { ZONES } from './world-zones.js';
import { oceanHeight } from './ocean-waves.js';

export function createCheckpointVisual() {
  const group = new THREE.Group(); group.name = 'Checkpoints activados';
  const geometry = new THREE.RingGeometry(.97, 1, 64);
  const rings = ZONES.map(zone => {
    const material = new THREE.MeshBasicMaterial({ color: '#a1ffe1', transparent: true, opacity: .6,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI/2; ring.visible = false; ring.userData.id = `zone-${zone.id}-taker-1`;
    group.add(ring); return ring;
  });
  return { group, update(progress, content, time, visible) {
    group.visible = visible;
    for (const ring of rings) {
      const point = content.find(point => point.id === ring.userData.id);
      ring.visible = !!point && progress.checkpoints.includes(point.id);
      if (!ring.visible) continue;
      ring.position.set(point.x, oceanHeight(point.x, point.z, time) + .25, point.z);
      ring.scale.setScalar(point.diameter / 2 + 1.8 + Math.sin(time * 1.4) * .3);
      ring.material.opacity = .45 + Math.sin(time * 1.4) * .15;
    }
  } };
}
