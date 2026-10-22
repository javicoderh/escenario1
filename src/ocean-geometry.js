import * as THREE from 'three';

// Dense rings near the camera resolve the swell around the hull. Spacing grows
// toward the horizon, keeping an ocean-sized surface at a fixed vertex budget.
export function createOceanGeometry() {
  const sectors = 160, rings = 96, positions = [0, 0, 0], indices = [];
  for (let ring = 1; ring <= rings; ring++) {
    const radius = ring <= 64 ? ring * 1.5 : 96 * Math.pow(10000 / 96, (ring - 64) / 32);
    for (let sector = 0; sector < sectors; sector++) {
      const angle = sector / sectors * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      const current = 1 + (ring - 1) * sectors + sector, next = 1 + (ring - 1) * sectors + (sector + 1) % sectors;
      if (ring === 1) indices.push(0, current, next);
      else indices.push(current - sectors, current, next, current - sectors, next, next - sectors);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
