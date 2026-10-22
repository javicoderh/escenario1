import * as THREE from 'three';
import { createElectricRibbon, electricNoise } from './electric-ribbon.js';

export function createElectricLink() {
  const segments = 64, paths = 5;
  const ribbon = createElectricRibbon(paths, segments);
  const group = ribbon.group; group.name = 'Resonancia eléctrica entre lotos';
  group.userData = { entityType: 'effect', role: 'energy-link' };
  const points = Array.from({ length: paths }, () => Array.from({ length: segments + 1 }, () => new THREE.Vector3()));
  const delta = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0), fallback = new THREE.Vector3(1, 0, 0);
  return {
    group,
    update(time, source, target, alpha) {
      const visible = !!source && !!target && alpha > 0;
      group.visible = visible;
      if (!visible) return;
      delta.subVectors(target, source); const length = delta.length();
      if (length < .001) { group.visible = false; return; }
      delta.divideScalar(length);
      side.crossVectors(delta, Math.abs(delta.y) > .95 ? fallback : axis).normalize();
      up.crossVectors(side, delta).normalize();
      const amplitude = Math.min(.26, length * .022);
      for (let path = 0; path < 3; path++) {
        for (let i = 0; i <= segments; i++) {
          const u = i / segments, envelope = Math.sin(Math.PI * u);
          const point = points[path][i].lerpVectors(source, target, u);
          // A low arcing brush stroke leaves the sail silhouette readable.
          point.addScaledVector(side, Math.pow(envelope, .8) * Math.min(2.2, length * .18));
          point.addScaledVector(up, envelope * Math.min(1.5, length * .10));
          const wave = Math.sin(u * 17 - time * 2.1 + path * 2.1);
          point.addScaledVector(side, envelope * (wave * amplitude * .45
            + electricNoise(i, time * 9, path * 71) * amplitude * .55 + (path - 1) * amplitude * .7));
          point.addScaledVector(up, envelope * electricNoise(i, time * 9, 33 + path * 71) * amplitude * .6);
        }
        ribbon.setPath(path, points[path], path === 0 ? 1 : .42);
      }
      // Branches start on the main stroke and rejoin it downstream.
      for (let path = 3; path < paths; path++) {
        const start = path === 3 ? 15 : 36, end = start + 14, sign = path === 3 ? 1 : -1;
        for (let i = 0; i <= segments; i++) {
          const u = i / segments, index = start + u * (end - start), base = Math.floor(index);
          const point = points[path][i].lerpVectors(points[0][base], points[0][Math.min(segments, base + 1)], index - base);
          const envelope = Math.sin(Math.PI * u);
          point.addScaledVector(side, envelope * sign * amplitude * (1.6 + electricNoise(i, time * 7, path * 43) * .5));
          point.addScaledVector(up, envelope * amplitude * .5);
        }
        ribbon.setPath(path, points[path], .25 + .25 * Math.pow(Math.sin(time * 2.3 + path), 2));
      }
      ribbon.update(time, THREE.MathUtils.clamp(alpha, 0, 1), Math.min(2.2, 22 / Math.max(length, 1)));
    },
  };
}
