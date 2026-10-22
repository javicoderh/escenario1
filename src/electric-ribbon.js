import * as THREE from 'three';

const hash = value => { const n = Math.sin(value * 127.1 + 31.7) * 43758.5453; return n - Math.floor(n); };

// Deterministic discharges blend in time, preserving the angular ink strokes.
export function electricNoise(position, time, seed = 0) {
  const tick = Math.floor(time), f = time - tick, blend = f * f * (3 - 2 * f);
  return THREE.MathUtils.lerp(hash(position * 3.71 + tick * 19.13 + seed),
    hash(position * 3.71 + (tick + 1) * 19.13 + seed), blend) * 2 - 1;
}

// Two shared ribbons: a colored halo and a fine, bright brush stroke.
// View-space extrusion works on both the moving boat and world-space links.
export function createElectricRibbon(paths, segments, { width = .018, halo = .11, tips = true } = {}) {
  const group = new THREE.Group();
  const count = paths * (segments + 1) * 2;
  const positions = new Float32Array(count * 3), tangents = new Float32Array(count * 3);
  const strengths = new Float32Array(count), coordinates = [], sides = [], indices = [];
  for (let path = 0; path < paths; path++) for (let i = 0; i <= segments; i++) {
    const base = (path * (segments + 1) + i) * 2;
    sides.push(-1, 1); coordinates.push(i / segments, path, i / segments, path);
    if (i < segments) indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aTangent', new THREE.BufferAttribute(tangents, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aStrength', new THREE.BufferAttribute(strengths, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute('aCoordinate', new THREE.Float32BufferAttribute(coordinates, 2)); geometry.setIndex(indices);
  const uniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uRate: { value: 1 },
    uTips: { value: tips ? 1 : 0 } };
  const vertexShader = `attribute vec3 aTangent; attribute float aSide; attribute float aStrength;
    attribute vec2 aCoordinate; uniform float uWidth;
    varying float vSide; varying float vStrength; varying vec2 vCoordinate;
    void main() {
      vec4 center = modelViewMatrix * vec4(position, 1.0);
      vec3 tangent = mat3(modelViewMatrix) * aTangent;
      vec3 lateral = cross(normalize(-center.xyz), tangent);
      if (dot(lateral, lateral) < 0.000001) lateral = vec3(1.0, 0.0, 0.0);
      center.xyz += normalize(lateral) * aSide * uWidth * (0.55 + 0.45 * aStrength);
      vSide = aSide; vStrength = aStrength; vCoordinate = aCoordinate;
      gl_Position = projectionMatrix * center;
    }`;
  const fragmentShader = `uniform float uTime; uniform float uOpacity; uniform float uRate;
    uniform float uHalo; uniform float uTips;
    varying float vSide; varying float vStrength; varying vec2 vCoordinate;
    void main() {
      float edge = pow(max(0.0, 1.0 - vSide * vSide), mix(0.7, 2.5, uHalo));
      float phase = fract(vCoordinate.x * 2.5 - uTime * uRate + vCoordinate.y * 0.17);
      float packet = exp(-pow((phase - 0.5) * 11.0, 2.0));
      float taper = mix(1.0, smoothstep(0.0, 0.025, vCoordinate.x)
        * (1.0 - smoothstep(0.94, 1.0, vCoordinate.x)), uTips);
      float accent = mod(vCoordinate.y, 3.0) / 2.0;
      vec3 neon = mix(vec3(0.12, 0.82, 1.0), vec3(0.88, 0.19, 0.64), accent * 0.7);
      vec3 color = mix(mix(neon, vec3(0.8, 1.0, 1.0), 0.65 + packet * 0.3), neon, uHalo);
      float alpha = edge * taper * vStrength * uOpacity * (0.55 + packet * 0.45);
      gl_FragColor = vec4(color, alpha * mix(0.92, 0.18, uHalo));
      #include <colorspace_fragment>
    }`;
  for (const [size, isHalo] of [[halo, 1], [width, 0]]) {
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader, fragmentShader, uniforms: { ...uniforms, uWidth: { value: size }, uHalo: { value: isHalo } } });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = 4; group.add(mesh);
  }
  const tangent = new THREE.Vector3();
  return {
    group, geometry,
    setPath(path, points, strength = 1) {
      for (let i = 0; i <= segments; i++) {
        tangent.subVectors(points[Math.min(segments, i + 1)], points[Math.max(0, i - 1)]);
        for (let edge = 0; edge < 2; edge++) {
          const index = (path * (segments + 1) + i) * 2 + edge;
          points[i].toArray(positions, index * 3); tangent.toArray(tangents, index * 3); strengths[index] = strength;
        }
      }
    },
    update(time, opacity, rate = 1, dirty = true) {
      uniforms.uTime.value = time; uniforms.uOpacity.value = opacity; uniforms.uRate.value = rate;
      group.visible = opacity > 0;
      if (dirty) for (const name of ['position', 'aTangent', 'aStrength']) geometry.attributes[name].needsUpdate = true;
    },
  };
}
