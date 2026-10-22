import * as THREE from 'three';

export function createBoatWake() {
  const count = 96, lifetime = 6.5;
  const geometry = new THREE.PlaneGeometry(1, 1);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  geometry.setAttribute('aLife', life);
  const uniforms = { uTime: { value: 0 }, uSky: { value: new THREE.Color('#bad9ed') } };
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms,
    vertexShader: `attribute float aLife; varying vec2 vUv; varying float vLife;
      void main() { vUv = uv; vLife = aLife;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSky; varying vec2 vUv; varying float vLife;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float edge = pow(max(0.0, 1.0 - p.x * p.x), 1.5) * (1.0 - smoothstep(0.55,1.0,abs(p.y)));
        float waves = sin(p.y * 24.0 + sin(p.x * 16.0) * 2.0 - uTime * 1.3);
        float lanes = exp(-pow((abs(p.x) - 0.62) * 7.0, 2.0));
        float flecks = smoothstep(0.38,0.9,waves) * (0.6 + 0.4 * hash(floor(vUv * vec2(36.0,24.0))));
        float foam = (lanes * 0.7 + flecks * 0.28) * edge;
        float glint = pow(max(0.0, sin(p.x * 41.0 + uTime * 2.0) * sin(p.y * 35.0 - uTime)), 18.0);
        vec3 white = mix(vec3(0.74,0.88,0.86), uSky, 0.48);
        vec3 color = white + uSky * glint * 0.65;
        float alpha = (foam * 0.52 + glint * edge * 0.20) * vLife;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'Persistent foam and sky-colored wake'; mesh.frustumCulled = false;
  const samples = Array.from({ length: count }, () => ({ age: lifetime + 1, x: 0, z: 0, heading: 0, strength: 0 }));
  const dummy = new THREE.Object3D(), moon = new THREE.Color('#b8d8f3'), sunset = new THREE.Color('#efbda2');
  let cursor = 0, accumulated = 0;
  for (let i = 0; i < count; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
  return {
    mesh,
    update(dt, time, state, night, emitting = true) {
      uniforms.uTime.value = time;
      uniforms.uSky.value.copy(night ? moon : sunset);
      const speed = state.velocity.length();
      accumulated += dt;
      if (emitting && speed > .15 && accumulated >= .085) {
        accumulated = 0;
        const sample = samples[cursor++ % count];
        Object.assign(sample, { age: 0, x: state.position.x + Math.sin(state.heading) * 1.85,
          z: state.position.z + Math.cos(state.heading) * 1.85, heading: state.heading, strength: Math.min(1, speed / 2) });
      }
      for (let i = 0; i < count; i++) {
        const sample = samples[i]; sample.age += dt;
        const alive = sample.age < lifetime;
        life.setX(i, alive ? Math.pow(1 - sample.age / lifetime, 1.5) * sample.strength : 0);
        dummy.position.set(sample.x, .035 + i * .00003, sample.z);
        dummy.rotation.set(-Math.PI / 2, 0, -sample.heading);
        dummy.scale.set(alive ? 1.3 + sample.age * .55 : 0, alive ? .8 + sample.age * .22 : 0, 1);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      life.needsUpdate = true; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
