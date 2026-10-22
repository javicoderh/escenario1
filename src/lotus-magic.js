import * as THREE from 'three';

const TAU = Math.PI * 2;
const GEM_COLORS = [
  ['#e7af31', '#ffd35a', '#ffe693'], // Gold
  ['#235fd3', '#3d80ee', '#6da3ff'], // Sapphire
  ['#ba193d', '#e33352', '#f6657b'], // Ruby
  ['#139a62', '#24c583', '#62dfaa'], // Emerald
];
const hash = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export function createLotusMagic(palette) {
  const group = new THREE.Group();
  group.name = 'Nen aura and living spores';
  const colors = palette.map(color => new THREE.Color(color));
  const time = { value: 0 };
  const power = { value: 1 };
  const wind = { value: new THREE.Vector2() };
  const shared = {
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, toneMapped: false,
  };

  // Irregular tongues and a broken silhouette, still in one translucent draw.
  const auraMaterial = new THREE.ShaderMaterial({
    ...shared,
    uniforms: { uTime: time, uWind: wind, uPower: power, uColor: { value: colors[2] }, uLight: { value: colors[4] } },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform vec2 uWind;
      varying vec2 vAuraUv;
      varying vec3 vAuraNormal;
      varying vec3 vAuraView;
      void main() {
        vAuraUv = uv;
        float angle = uv.x * 6.2831853;
        float waviness = sin(angle * 7.0 + sin(uv.y * 9.0 - uTime * 1.8)) * 0.075
          + sin(angle * 13.0 - uv.y * 17.0 + uTime * 1.1) * 0.035;
        float tongue = pow(max(0.0, sin(angle * 9.0 + sin(angle * 3.0 + uTime * 0.65)
          - uTime * 0.9)), 3.0);
        float upper = smoothstep(0.30, 0.78, uv.y) * (1.0 - smoothstep(0.90, 1.0, uv.y));
        vec3 p = position + normal * waviness * sin(uv.y * 3.1415927);
        p.y += tongue * upper * 0.18;
        p.xz += (vec2(sin(angle * 3.0 - uTime * 1.1), cos(angle * 4.0 + uTime * 0.7)) * 0.035
          + uWind * 0.045) * upper;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        vAuraNormal = normalize(normalMatrix * normal);
        vAuraView = -view.xyz;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uPower;
      uniform vec3 uColor;
      uniform vec3 uLight;
      varying vec2 vAuraUv;
      varying vec3 vAuraNormal;
      varying vec3 vAuraView;
      void main() {
        float angle = vAuraUv.x * 6.2831853;
        float height = vAuraUv.y;
        float fresnel = pow(1.0 - abs(dot(normalize(vAuraNormal), normalize(vAuraView))), 2.5);
        float stream = sin(angle * 9.0 + sin(angle * 4.0 - height * 8.0 + uTime * 0.8) * 1.3
          + sin(height * 16.0 - uTime * 2.0) * 1.1 - height * 14.0 + uTime * 1.8);
        float wisps = pow(max(0.0, stream), 3.5);
        float veil = 0.5 + 0.5 * sin(angle * 5.0 - height * 12.0 + uTime * 0.8);
        float flameHeight = 0.82 + sin(angle * 6.0 + uTime * 0.75) * 0.07
          + sin(angle * 13.0 - uTime * 1.2) * 0.035;
        float fade = smoothstep(0.22, 0.40, height)
          * (1.0 - smoothstep(flameHeight - 0.10, flameHeight + 0.08, height));
        float breath = 0.84 + 0.10 * sin(uTime * 1.3) + 0.06 * sin(uTime * 2.6 + 0.8);
        float firePresence = 0.24 + 0.76 * smoothstep(-0.45, 0.8, stream);
        float alpha = (fresnel * (0.09 + wisps * 0.27) * firePresence + wisps * 0.055 + veil * 0.006) * fade * breath;
        vec3 glow = mix(uColor, uLight, 0.2 + wisps * 0.6 + height * 0.15);
        gl_FragColor = vec4(glow, alpha * uPower);
        #include <colorspace_fragment>
      }
    `,
  });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), auraMaterial);
  aura.position.y = 1.75;
  aura.renderOrder = 2;
  aura.frustumCulled = false;
  group.add(aura);

  // A faint pool of energy connects the aura to the flower's base.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    ...shared,
    uniforms: { uTime: time, uPower: power, uColor: { value: colors[3] } },
    vertexShader: /* glsl */`
      varying vec2 vHaloUv;
      void main() {
        vHaloUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uPower;
      uniform vec3 uColor;
      varying vec2 vHaloUv;
      void main() {
        float radius = length(vHaloUv * 2.0 - 1.0);
        float pool = exp(-radius * radius * 5.0) * 0.07;
        float ringDistance = (radius - 0.72 - sin(uTime * 1.3) * 0.025) * 30.0;
        float ring = exp(-ringDistance * ringDistance) * 0.10;
        float alpha = (pool + ring) * (1.0 - smoothstep(0.85, 1.0, radius));
        gl_FragColor = vec4(uColor, alpha * uPower);
        #include <colorspace_fragment>
      }
    `,
  }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -.06;
  halo.renderOrder = 1;
  group.add(halo);

  // Instanced camera-facing quads allow varied sizes without point-size limits.
  // Position, lifetime, drift, twinkle and fading are evaluated entirely on the GPU.
  const count = 128;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5,-.5,0, .5,-.5,0, .5,.5,0, -.5,.5,0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1], 2));
  geometry.setIndex([0,1,2, 0,2,3]);
  geometry.instanceCount = count;
  const seeds = [], sizes = [], sporeColors = [];
  const gems = GEM_COLORS.map(tones => tones.map(tone => new THREE.Color(tone)));
  for (let i = 0; i < count; i++) {
    seeds.push(hash(i + 1), 7 + hash(i + 21) * 7, hash(i + 47) * TAU, .7 + hash(i + 71) * 1.3);
    sizes.push(.12 + Math.pow(hash(i + 97), 2.2) * .46);
    const family = gems[i % gems.length];
    const shade = hash(i + 117) * 1.999;
    const low = Math.floor(shade);
    const color = family[low].clone().lerp(family[low + 1], shade - low);
    color.offsetHSL((hash(i + 151) - .5) * .012, 0, (hash(i + 173) - .5) * .025);
    sporeColors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 4));
  geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(sizes), 1));
  geometry.setAttribute('aSporeColor', new THREE.InstancedBufferAttribute(new Float32Array(sporeColors), 3));
  const spores = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    ...shared,
    uniforms: { uTime: time, uWind: wind, uPower: power },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform vec2 uWind;
      attribute vec4 aSeed;
      attribute float aSize;
      attribute vec3 aSporeColor;
      varying vec2 vSporeUv;
      varying vec3 vSporeColor;
      varying float vLife;
      void main() {
        float age = fract(uTime / aSeed.y + aSeed.x);
        float spread = 0.06 + pow(age, 1.25) * aSeed.w;
        float angle = aSeed.z + age * (2.1 + aSeed.x);
        vec3 center = vec3(cos(angle) * spread, 0.71 + age * (3.1 + aSeed.w * 0.65), sin(angle) * spread);
        center.xz += uWind * age * age * 0.9;
        center.xz += vec2(sin(age * 11.0 + aSeed.z), cos(age * 9.0 + aSeed.z)) * age * 0.12;
        vec4 view = modelViewMatrix * vec4(center, 1.0);
        float breathe = 0.92 + 0.08 * sin(uTime * 1.8 + aSeed.z);
        // Billboard offsets are applied in view space, so include the parent's scale.
        float worldScale = length(modelViewMatrix[0].xyz);
        view.xy += position.xy * aSize * (0.65 + 0.35 * sin(age * 3.1415927)) * breathe * worldScale;
        gl_Position = projectionMatrix * view;
        vSporeUv = uv;
        vSporeColor = aSporeColor * (0.96 + 0.04 * sin(uTime * 0.55 + aSeed.z));
        vLife = smoothstep(0.0, 0.07, age) * (1.0 - smoothstep(0.64, 1.0, age));
        vLife *= 0.83 + 0.17 * sin(uTime * (1.6 + aSeed.x) + aSeed.z);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uPower;
      varying vec2 vSporeUv;
      varying vec3 vSporeColor;
      varying float vLife;
      void main() {
        float radius = length(vSporeUv * 2.0 - 1.0);
        float squareRadius = radius * radius;
        float core = exp(-squareRadius * 72.0);
        float body = exp(-squareRadius * 22.0);
        float glow = exp(-squareRadius * 4.5);
        float alpha = (glow * 0.28 + body * 0.42 + core * 0.75) * vLife;
        alpha *= 1.0 - smoothstep(0.75, 1.0, radius);
        vec3 coreColor = mix(vSporeColor, vec3(1.0), 0.28) * 1.75;
        vec3 color = mix(vSporeColor * 1.3, coreColor, core);
        gl_FragColor = vec4(color, alpha * uPower);
        #include <colorspace_fragment>
      }
    `,
  }));
  spores.frustumCulled = false;
  spores.renderOrder = 3;
  group.add(spores);

  return {
    group,
    update(elapsed, bloom, breeze, energy = 1) {
      power.value = THREE.MathUtils.clamp(energy, 0, 1);
      group.visible = power.value > 0;
      time.value = elapsed;
      wind.value.set(Math.sin(breeze.direction) * breeze.strength, Math.cos(breeze.direction) * breeze.strength);
      const breath = 1 + Math.sin(elapsed * 1.3) * .025;
      const radius = (1.1 + bloom * 2.05) * breath;
      aura.scale.set(radius, (2.35 + (1 - bloom) * .25) * breath, radius);
      aura.rotation.y = elapsed * .035;
      halo.scale.setScalar(radius * 1.07);
    },
    // Geometry and material cleanup is handled by the owning scene traversal.
  };
}
