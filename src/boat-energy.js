import * as THREE from 'three';
import { createElectricRibbon, electricNoise } from './electric-ribbon.js';

export function createBoatEnergy() {
  const group = new THREE.Group(); group.name = 'Circuitos y descargas del velero';
  const routes = [], arcRoutes = [];
  const vector = p => new THREE.Vector3(...p);
  const route = points => routes.push(new THREE.CatmullRomCurve3(points.map(vector)).getPoints(48));
  for (const sign of [-1, 1]) {
    const rail = Array.from({ length: 25 }, (_, i) => {
      const t = .04 + i / 24 * .92;
      return [sign * (.025 + .84 * Math.pow(Math.sin(Math.PI * t), .68)),
        .435 + Math.pow(Math.abs(t * 2 - 1), 3) * .4, -2.4 + t * 4.6];
    });
    route(rail);
    route(rail.map(([x, , z]) => [x * .94, .18 + Math.pow(Math.abs((z + 2.4) / 4.6 * 2 - 1), 3) * .4, z]));
    route([[0, .65, .8], [sign * .28, .53, .8], [sign * .48, .40, .55],
      [sign * .48, .40, -.75], [sign * .22, .40, -1.2], [sign * .22, .43, -1.7]]);
    route([[sign * .055, .58, -.25], [sign * .055, 2.2, -.25], [sign * .055, 3.8, -.25], [0, 4.99, -.25]]);
    arcRoutes.push({ from: vector([0, .70, .8]), to: vector([sign * .81, .49, .4]), lift: .32 },
      { from: vector([sign * .68, .5, -.95]), to: vector([sign * .48, .57, -1.8]), lift: .28 },
      { from: vector([sign * .72, .5, .95]), to: vector([sign * .38, .67, 1.85]), lift: .24 },
      { from: vector([0, 3.45, -.25]), to: vector([0, 4.98, -.25]), lift: .18 });
  }
  for (const radius of [.32, .43]) route(Array.from({ length: 33 }, (_, i) => {
    const angle = i / 32 * Math.PI * 2;
    return [Math.sin(angle) * radius, .61, .8 + Math.cos(angle) * radius];
  }));
  const circuits = createElectricRibbon(routes.length, 48, { width: .014, halo: .065, tips: false });
  routes.forEach((points, i) => circuits.setPath(i, points)); group.add(circuits.group);
  const arcs = createElectricRibbon(arcRoutes.length, 16, { width: .011, halo: .07 }); group.add(arcs.group);
  const points = Array.from({ length: 17 }, () => new THREE.Vector3());
  let power = 0, time = 0;
  function animate() {
    group.visible = power > 0;
    circuits.update(time, Math.pow(power, .65), .7 + power * .6, false);
    if (!group.visible) return;
    arcRoutes.forEach(({ from, to, lift }, path) => {
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, envelope = Math.sin(Math.PI * u), point = points[i].lerpVectors(from, to, u);
        const spread = .045 + power * .095;
        point.x += envelope * electricNoise(i, time * 11, path * 47) * spread;
        point.y += envelope * (lift * (.35 + power * .65) + electricNoise(i, time * 11, path * 47 + 13) * spread);
        point.z += envelope * electricNoise(i, time * 11, path * 47 + 29) * spread;
      }
      const flicker = .4 + .6 * Math.pow(Math.sin(time * 3.2 + path * 1.9), 4);
      arcs.setPath(path, points, flicker);
    });
    arcs.update(time, power * power, 2);
  }
  animate();
  return { group,
    setPower(value) {
      power = value; group.visible = power > 0;
      circuits.update(time, Math.pow(power, .65), .7 + power * .6, false);
      arcs.update(time, power * power, 2, false);
    },
    update(value) { time = value; animate(); },
  };
}
