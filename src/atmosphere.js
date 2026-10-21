import * as THREE from 'three';

// Shared by the visible sun, the petal lighting and the water highlights.
export const SUN_DIRECTION = new THREE.Vector3(-.68, .045, -.73).normalize();
export const MOON_DIRECTION = new THREE.Vector3(-.30, .105, -.948).normalize();

export function createAtmosphere(scene, initialNight = true) {
  const group = new THREE.Group();
  group.name = 'Clear full-moon sky';
  const night = { value: initialNight ? 1 : 0 };
  const time = { value: 0 };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uNight: night,
      uTime: time,
      uSunDirection: { value: SUN_DIRECTION },
      uMoonDirection: { value: MOON_DIRECTION },
      uMoon: { value: new THREE.Color('#e5eafa') },
      uHorizon: { value: new THREE.Color('#edb38d') },
      uMiddle: { value: new THREE.Color('#9c7c91') },
      uZenith: { value: new THREE.Color('#454361') },
      uSun: { value: new THREE.Color('#ffdcaa') },
      uNightHorizon: { value: new THREE.Color('#172a45') },
      uNightZenith: { value: new THREE.Color('#060c1c') },
    },
    vertexShader: /* glsl */`
      varying vec3 vSkyDirection;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vSkyDirection = world.xyz - cameraPosition;
        vec4 clip = projectionMatrix * viewMatrix * world;
        // Keep the sky behind the scene, including the water's mirror camera.
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uNight;
      uniform float uTime;
      uniform vec3 uSunDirection;
      uniform vec3 uMoonDirection;
      uniform vec3 uMoon;
      uniform vec3 uHorizon;
      uniform vec3 uMiddle;
      uniform vec3 uZenith;
      uniform vec3 uSun;
      uniform vec3 uNightHorizon;
      uniform vec3 uNightZenith;
      varying vec3 vSkyDirection;

      float skyHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      vec3 starField(vec2 skyUv, vec2 density, float seed) {
        vec2 grid = skyUv * density;
        vec2 cell = floor(grid);
        float chance = skyHash(cell + seed);
        vec2 center = vec2(skyHash(cell + 17.3 + seed), skyHash(cell + 49.1 + seed)) * 0.7 + 0.15;
        float distanceToStar = length(fract(grid) - center);
        float aa = max(fwidth(distanceToStar), 0.035);
        float point = 1.0 - smoothstep(0.012, 0.022 + aa * 0.7, distanceToStar);
        float glow = exp(-distanceToStar * distanceToStar * 70.0) * 0.12;
        float presence = step(0.963, chance);
        float twinkle = 0.88 + 0.12 * sin(uTime * (0.65 + chance) + chance * 90.0);
        vec3 tint = mix(vec3(0.60, 0.76, 1.0), vec3(1.0, 0.88, 0.73), skyHash(cell + 8.0));
        return tint * (point + glow) * presence * twinkle * (0.35 + skyHash(cell + 29.0) * 0.9);
      }

      void main() {
        vec3 direction = normalize(vSkyDirection);
        float height = max(direction.y, 0.0);
        vec3 dusk = mix(uHorizon, uMiddle, smoothstep(0.0, 0.36, height));
        dusk = mix(dusk, uZenith, smoothstep(0.22, 0.85, height));
        float sunFacing = dot(direction, uSunDirection);
        float glow = exp((sunFacing - 1.0) * 85.0);
        float halo = exp((sunFacing - 1.0) * 650.0);
        float disc = smoothstep(0.99957, 0.99982, sunFacing);
        dusk += uSun * (glow * 0.22 + halo * 0.35 + disc * 2.2);
        // Long, quiet wisps soften the sky without concealing the sunset.
        float streak = sin(direction.x * 27.0 + direction.z * 19.0 + sin(height * 40.0));
        float cloud = smoothstep(0.40, 0.88, streak) * smoothstep(0.06, 0.16, height)
          * (1.0 - smoothstep(0.22, 0.38, height));
        dusk = mix(dusk, uMiddle * 0.82, cloud * 0.12);
        vec3 midnight = mix(uNightHorizon, uNightZenith, smoothstep(0.0, 0.5, height));
        vec2 skyUv = vec2(atan(direction.z, direction.x) / 6.2831853 + 0.5,
          asin(clamp(direction.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        float moonFacing = dot(direction, uMoonDirection);
        float moonGlow = exp((moonFacing - 1.0) * 260.0);
        vec3 stars = starField(skyUv, vec2(420.0, 210.0), 0.0)
          + starField(skyUv, vec2(185.0, 93.0), 53.0) * 0.65;
        midnight += stars * smoothstep(0.005, 0.09, direction.y) * (1.0 - moonGlow * 0.85);

        vec3 moonRight = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDirection));
        vec3 moonUp = normalize(cross(uMoonDirection, moonRight));
        vec2 moonUv = vec2(dot(direction, moonRight), dot(direction, moonUp)) / 0.024;
        float moonRadius = length(moonUv);
        float moonAA = max(fwidth(moonRadius), 0.008);
        float moonDisc = (1.0 - smoothstep(1.0 - moonAA, 1.0 + moonAA, moonRadius)) * step(0.0, moonFacing);
        vec2 craterA = moonUv - vec2(-0.28, 0.22);
        vec2 craterB = moonUv - vec2(0.30, 0.04);
        vec2 craterC = moonUv - vec2(-0.10, -0.43);
        float maria = exp(-dot(craterA, craterA) * 13.0) * 0.23
          + exp(-dot(craterB, craterB) * 23.0) * 0.19
          + exp(-dot(craterC, craterC) * 34.0) * 0.14;
        float grain = sin(moonUv.x * 29.0 + sin(moonUv.y * 21.0)) * sin(moonUv.y * 37.0) * 0.018;
        float lunarShade = (0.82 + 0.18 * sqrt(max(0.0, 1.0 - moonRadius * moonRadius))) - maria + grain;
        midnight += uMoon * (moonGlow * 0.075 + exp((moonFacing - 1.0) * 1500.0) * 0.06);
        midnight = mix(midnight, uMoon * lunarShade * 1.35, moonDisc);
        gl_FragColor = vec4(mix(dusk, midnight, uNight), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.name = 'Full moon and stars';
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  group.add(sky);

  // Warm grazing light plus a soft neutral fill keeps each petal's own hue.
  const sunlight = new THREE.DirectionalLight('#ffbf8b', 3.2);
  sunlight.position.copy(SUN_DIRECTION).multiplyScalar(30);
  const moonlight = new THREE.DirectionalLight('#c5d8ff', 1.65);
  moonlight.position.copy(MOON_DIRECTION).multiplyScalar(30);
  const fill = new THREE.DirectionalLight('#e5dce6', .95);
  fill.position.set(4, 5, 8);
  const hemisphere = new THREE.HemisphereLight('#c5bbd8', '#294343', 1.05);
  group.add(sunlight, moonlight, fill, hemisphere);
  scene.add(group);

  const duskFog = new THREE.Color('#cb9a84');
  const nightFog = new THREE.Color('#172940');
  const duskSkyLight = new THREE.Color('#c5bbd8');
  const nightSkyLight = new THREE.Color('#a9c2ec');
  scene.fog = new THREE.FogExp2(initialNight ? nightFog : duskFog, initialNight ? .014 : .018);
  function update(isNight, dt, elapsed = 0) {
    night.value = THREE.MathUtils.damp(night.value, isNight ? 1 : 0, 4, dt);
    time.value = elapsed;
    sunlight.intensity = THREE.MathUtils.lerp(3.2, 0, night.value);
    moonlight.intensity = night.value * 1.65;
    fill.intensity = THREE.MathUtils.lerp(.95, .48, night.value);
    hemisphere.intensity = THREE.MathUtils.lerp(1.05, .62, night.value);
    hemisphere.color.copy(duskSkyLight).lerp(nightSkyLight, night.value);
    scene.fog.color.copy(duskFog).lerp(nightFog, night.value);
    scene.fog.density = THREE.MathUtils.lerp(.018, .014, night.value);
  }
  update(initialNight, 0);
  return {
    group,
    update,
  };
}
