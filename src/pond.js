import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { SUN_DIRECTION, MOON_DIRECTION } from './atmosphere.js';
import { LOTUS_SCALE } from './lotus-scale.js';

export const WATER_LEVEL = 0;

export function createPond(initialNight = false) {
  const resolution = 256;
  const surface = new Reflector(new THREE.CircleGeometry(10000, 256), {
    textureWidth: resolution, textureHeight: resolution,
    multisample: 0, clipBias: .003, color: '#397568',
    shader: {
      name: 'Soft jade water',
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
          uTime: { value: 0 }, uNight: { value: initialNight ? 1 : 0 },
          uLotusPosition: { value: new THREE.Vector2() }, uLotusVisible: { value: 0 },
          uLotusScale: { value: LOTUS_SCALE },
          uTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
          uDeep: { value: new THREE.Color('#173f3e') },
          uShallow: { value: new THREE.Color('#649b8b') },
          uSky: { value: new THREE.Color('#dbb09b') },
          uSun: { value: new THREE.Color('#ffd19a') },
          uSunDirection: { value: SUN_DIRECTION.clone() },
          uMoonDirection: { value: MOON_DIRECTION.clone() },
          uMoon: { value: new THREE.Color('#bed7f6') },
        },
      ]),
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        varying vec4 vReflection;
        varying vec3 vWaterPosition;
        #include <common>
        #include <fog_pars_vertex>
        void main() {
          vWaterPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vReflection = textureMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec3 color;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        uniform vec3 uSun;
        uniform vec3 uSunDirection;
        uniform vec3 uMoonDirection;
        uniform vec3 uMoon;
        uniform vec2 uTexel;
        uniform float uTime;
        uniform float uNight;
        uniform vec2 uLotusPosition;
        uniform float uLotusVisible;
        uniform float uLotusScale;
        varying vec4 vReflection;
        varying vec3 vWaterPosition;
        #include <common>
        #include <fog_pars_fragment>

        vec3 waterNormal(vec2 p) {
          vec2 a = vec2(0.85, 0.45);
          vec2 b = vec2(-0.4, 0.9);
          vec2 c = vec2(0.6, -0.8);
          vec2 slope = a * (0.07 * cos(dot(p, a) * 2.0 + uTime * 0.65));
          slope += b * (0.0612 * cos(dot(p, b) * 3.4 - uTime * 0.55));
          slope += c * (0.042 * cos(dot(p, c) * 7.0 + uTime * 0.8));
          vec2 local = (p - uLotusPosition) / uLotusScale;
          float radius = length(local);
          float phase = radius * 9.0 - uTime * 1.35;
          float rippleSlope = (9.0 * cos(phase) - 0.65 * sin(phase)) * 0.006 * exp(-radius * 0.65);
          slope += local / max(radius, 0.001) * rippleSlope * uLotusVisible;
          return normalize(vec3(-slope.x, 1.0, -slope.y));
        }

        vec4 softReflection(vec2 uv, vec2 spread) {
          // A small Gaussian kernel softens the real reflection, including magic.
          vec4 reflected = texture2D(tDiffuse, uv) * 0.36;
          reflected += texture2D(tDiffuse, uv + vec2(spread.x, 0.0)) * 0.16;
          reflected += texture2D(tDiffuse, uv - vec2(spread.x, 0.0)) * 0.16;
          reflected += texture2D(tDiffuse, uv + vec2(0.0, spread.y)) * 0.16;
          reflected += texture2D(tDiffuse, uv - vec2(0.0, spread.y)) * 0.16;
          return reflected;
        }

        void main() {
          vec2 p = vWaterPosition.xz;
          vec2 local = (p - uLotusPosition) / uLotusScale;
          float radius = length(local);
          vec3 normal = waterNormal(p);
          vec3 viewDirection = normalize(cameraPosition - vWaterPosition);
          float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
          float fresnel = 0.035 + 0.965 * pow(1.0 - facing, 5.0);
          float patches = sin(p.x * 0.63 + sin(p.y * 0.41)) * sin(p.y * 0.55 - uTime * 0.09);
          vec3 base = mix(uDeep, color, 0.55 + patches * 0.09);
          base = mix(base, uShallow, exp(-radius * 0.23) * 0.18);
          base *= mix(vec3(1.12, 0.94, 0.88), vec3(0.80, 0.88, 1.0), uNight);
          vec3 skyTint = mix(uSky, uMoon * 0.62, uNight);
          base += skyTint * fresnel * 0.13;
          base *= mix(1.0, 0.43, uNight);

          vec2 reflectionUV = vReflection.xy / max(vReflection.w, 0.0001);
          reflectionUV += normal.xz * (0.013 + fresnel * 0.008);
          reflectionUV = clamp(reflectionUV, uTexel * 5.0, vec2(1.0) - uTexel * 5.0);
          vec2 blur = uTexel * vec2(1.2, 1.8) * (1.3 + facing * 1.2);
          vec4 reflected = softReflection(reflectionUV, blur);
          float luminance = dot(reflected.rgb, vec3(0.2126, 0.7152, 0.0722));
          reflected.rgb = mix(reflected.rgb, vec3(luminance), 0.12);
          float reflectionStrength = 0.36 + fresnel * 0.34;
          // Composite over the pond so the transparent sky does not turn black.
          vec3 water = base * (1.0 - clamp(reflected.a, 0.0, 1.0) * reflectionStrength)
            + reflected.rgb * reflectionStrength;

          vec3 sunDirection = normalize(mix(uSunDirection, uMoonDirection, uNight));
          vec3 halfDirection = normalize(viewDirection + sunDirection);
          float sunFacing = max(dot(normal, halfDirection), 0.0);
          float sparkle = pow(sunFacing, 140.0) * 0.38 + pow(sunFacing, 22.0) * 0.035;
          water += mix(uSun, uMoon, uNight) * sparkle * (1.0 - uNight * 0.35);
          float ripples = pow(max(0.0, sin(radius * 9.0 - uTime * 1.35)), 18.0);
          water += skyTint * ripples * exp(-radius * 0.52) * 0.025 * uLotusVisible;
          float contact = exp(-dot(local, local) * 5.5) * 0.30 * uLotusVisible;
          water *= 1.0 - contact;
          gl_FragColor = vec4(water, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    },
  });
  surface.name = 'Reflective lotus pond';
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = WATER_LEVEL;
  surface.material.fog = true;
  surface.renderOrder = -1;
  // Looking upward from the submerged levels sees the underside of the sea.
  const underside = new THREE.Mesh(surface.geometry, new THREE.MeshBasicMaterial({
    color: '#153c49', side: THREE.BackSide, fog: true,
  }));
  surface.add(underside);

  // The main scene remains uncapped; the blurred reflection needs fewer updates.
  // Movement also respects the cap: a following camera otherwise doubles the
  // render workload on every frame, including all skeletons and transparent FX.
  const reflect = surface.onBeforeRender;
  const cameraWorld = new THREE.Matrix4(), cameraProjection = new THREE.Matrix4();
  let lastReflection = -Infinity, dirty = true, lastTime = -1, lastNight = -1;
  surface.onBeforeRender = function(renderer, scene, camera) {
    const now = performance.now();
    const moved = !cameraWorld.equals(camera.matrixWorld) || !cameraProjection.equals(camera.projectionMatrix);
    const uniforms = surface.material.uniforms;
    const lightingChanged = Math.abs(uniforms.uNight.value - lastNight) > .008;
    const animationChanged = uniforms.uTime.value !== lastTime;
    if (now - lastReflection < 1000 / 15) return;
    if (!dirty && !moved && !lightingChanged && !animationChanged) return;
    reflect.call(this, renderer, scene, camera);
    cameraWorld.copy(camera.matrixWorld); cameraProjection.copy(camera.projectionMatrix);
    lastReflection = now; lastTime = uniforms.uTime.value; lastNight = uniforms.uNight.value;
    dirty = false;
  };

  return {
    surface,
    update(time, night, dt, bloom, lotus) {
      const uniforms = surface.material.uniforms;
      uniforms.uTime.value = time;
      uniforms.uNight.value = THREE.MathUtils.damp(uniforms.uNight.value, night ? 1 : 0, 4, dt);
      if (lotus) {
        if (uniforms.uLotusPosition.value.x !== lotus.x || uniforms.uLotusPosition.value.y !== lotus.z
          || uniforms.uLotusVisible.value !== Number(lotus.visible && lotus.y === 0)) dirty = true;
        uniforms.uLotusPosition.value.set(lotus.x, lotus.z);
        uniforms.uLotusVisible.value = Number(lotus.visible && lotus.y === 0);
      }
      if (Math.abs((surface.userData.bloom ?? -1) - bloom) > .002) dirty = true;
      surface.userData.bloom = bloom;
    },
    invalidate() { dirty = true; },
    dispose() {
      surface.getRenderTarget().dispose();
      // The scene owner disposes the surface's geometry and material.
    },
  };
}
