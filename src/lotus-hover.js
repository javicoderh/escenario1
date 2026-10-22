import * as THREE from 'three';

// Pick the flower's envelope, never its animated triangles. This also works
// when a flower is represented by an instance instead of a detailed model.
export function pickWaterLotus(ray, lotuses) {
  const sphere = new THREE.Sphere(), hit = new THREE.Vector3();
  let nearest = null, distance = Infinity;
  for (const lotus of lotuses) {
    if (!lotus.visible) continue;
    sphere.center.set(lotus.x, lotus.y + lotus.diameter * .12, lotus.z);
    sphere.radius = lotus.diameter * .5;
    if (!ray.intersectSphere(sphere, hit)) continue;
    const next = hit.distanceToSquared(ray.origin);
    if (next < distance) { distance = next; nearest = lotus; }
  }
  return nearest;
}
