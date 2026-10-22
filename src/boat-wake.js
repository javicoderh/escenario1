import * as THREE from 'three';

import { OCEAN_GLSL } from './ocean-waves.js';

export function createBoatWake() {
  const count = 256, lifetime = 6.5, spacing = .72;
  const geometry = new THREE.PlaneGeometry(1, 1, 2, 6);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const seeds = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  geometry.setAttribute('aLife', life); geometry.setAttribute('aSeed', seeds);
  const uniforms = { uTime: { value: 0 }, uSky: { value: new THREE.Color('#bad9ed') } };
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms,
    vertexShader: `attribute float aLife; attribute float aSeed; uniform float uTime;
      varying vec2 vUv; varying float vLife; varying float vSeed;
      ${OCEAN_GLSL}
      void main() { vUv = uv; vLife = aLife; vSeed = aSeed;
        vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
        worldPosition.y += oceanSurface(worldPosition.xz, uTime).x;
        gl_Position = projectionMatrix * viewMatrix * worldPosition; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSky;
      varying vec2 vUv; varying float vLife; varying float vSeed;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        if (vLife < 0.001) discard;
        vec2 p = vUv * 2.0 - 1.0;
        // Two sweeping calligraphic strokes: pointed ends, a dry brush belly,
        // and a fine dark ink edge. Grain is fixed to each deposited mark.
        float taper = pow(max(0.0, sin(vUv.y * 3.14159265)), 0.65);
        float sweep = 0.53 - p.y * 0.20 + sin(p.y * 3.2 + vSeed) * 0.045;
        float grain = hash(floor(vUv * vec2(43.0, 75.0)) + vSeed);
        float bristle = sin(p.y * 34.0 + vSeed * 7.0) * 0.009
          + sin(p.y * 79.0 + vSeed) * 0.005;
        float distanceToStroke = abs(abs(p.x) - sweep + bristle);
        float width = (0.045 + 0.040 * sin(vUv.y * 3.14159265)) * taper;
        float aa = max(fwidth(distanceToStroke), 0.003);
        float ink = 1.0 - smoothstep(width + 0.025, width + 0.025 + aa, distanceToStroke);
        float paint = 1.0 - smoothstep(width, width + aa, distanceToStroke);
        float dry = smoothstep(0.07, 0.28, grain + taper * 0.16);
        float fiber = 0.78 + 0.22 * sin((abs(p.x) - sweep) * 280.0 + vSeed);
        float endFade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.90, 1.0, vUv.y));
        float echoDistance = abs(abs(p.x) - sweep - 0.16);
        float echo = (1.0 - smoothstep(0.006 * taper, 0.006 * taper + aa, echoDistance))
          * smoothstep(0.2, 0.45, vUv.y) * (1.0 - smoothstep(0.7, 0.9, vUv.y));
        float fleck = step(0.965, grain) * (1.0 - smoothstep(0.08, 0.18, distanceToStroke)) * taper;
        vec3 pearl = mix(vec3(0.82, 0.88, 0.79), uSky, 0.55);
        vec3 inkColor = mix(vec3(0.035, 0.10, 0.15), uSky * 0.17, 0.3);
        vec3 color = mix(inkColor, pearl, paint * dry);
        color = mix(color, pearl, clamp(echo + fleck, 0.0, 1.0));
        float alpha = max(ink * mix(0.45, 0.82 * dry * fiber, paint), echo * 0.48 + fleck * 0.30);
        gl_FragColor = vec4(color, alpha * endFade * vLife);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'Estela de tinta — pinceladas sobre el agua'; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const samples = Array.from({ length: count }, () => ({ age: lifetime + 1, x: 0, z: 0, heading: 0, strength: 0, length: 1.6 }));
  const dummy = new THREE.Object3D(), moon = new THREE.Color('#b8d8f3'), sunset = new THREE.Color('#efc8a2');
  const previous = new THREE.Vector3(); let hasPrevious = false, previousHeading = 0, distanceSinceStamp = 0, cursor = 0;
  function deposit(x, z, heading, speed) {
    const index = cursor++ % count, sample = samples[index];
    Object.assign(sample, { age: 0, x, z, heading, strength: Math.min(1, speed / 2), length: 1.65 + Math.min(speed, 24) * .025 });
    seeds.setX(index, ((cursor * .61803398875) % 1) * 6.28); seeds.needsUpdate = true;
  }
  for (let i = 0; i < count; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
  return {
    mesh,
    update(dt, time, state, night, emitting = true) {
      uniforms.uSky.value.copy(night ? moon : sunset);
      if (!(dt > 0)) return;
      uniforms.uTime.value = time;
      const speed = state.velocity.length();
      const x = state.position.x + Math.sin(state.heading) * 1.85;
      const z = state.position.z + Math.cos(state.heading) * 1.85;
      for (const sample of samples) sample.age += dt;
      const traveled = hasPrevious ? Math.hypot(x - previous.x, z - previous.z) : 0;
      if (emitting && speed > .15) {
        // Resample by distance, including fast frames. Teleports start a new
        // stroke instead of painting a line across the map.
        if (!hasPrevious || traveled > Math.max(4, speed * dt * 3)) {
          deposit(x, z, state.heading, speed); distanceSinceStamp = 0;
        } else if (traveled > 0) {
          const turn = Math.atan2(Math.sin(state.heading - previousHeading), Math.cos(state.heading - previousHeading));
          for (let d = spacing - distanceSinceStamp; d <= traveled; d += spacing) {
            const fraction = d / traveled;
            deposit(THREE.MathUtils.lerp(previous.x, x, fraction), THREE.MathUtils.lerp(previous.z, z, fraction),
              previousHeading + turn * fraction, speed);
          }
          distanceSinceStamp = (distanceSinceStamp + traveled) % spacing;
        }
        hasPrevious = true;
      } else { hasPrevious = false; distanceSinceStamp = 0; }
      previous.set(x, 0, z); previousHeading = state.heading;
      for (let i = 0; i < count; i++) {
        const sample = samples[i], alive = sample.age < lifetime;
        life.setX(i, alive ? Math.pow(1 - sample.age / lifetime, 1.4) * sample.strength : 0);
        dummy.position.set(sample.x, .04 + i * .000015, sample.z);
        dummy.rotation.set(-Math.PI / 2, 0, sample.heading);
        dummy.scale.set(alive ? 1.65 + sample.age * .58 : 0, alive ? sample.length + sample.age * .12 : 0, 1);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      life.needsUpdate = true; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
