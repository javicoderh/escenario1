import * as THREE from 'three';
import { ORB_SPEED, ORB_HEIGHT } from './illusory-orb.js';
import { oceanHeight } from './ocean-waves.js';

export function createOrbVisual() {
  const group = new THREE.Group(); group.name = 'Orbe ilusorio';
  const orb = new THREE.Group(); orb.name = 'Esfera ilusoria'; group.add(orb);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#d3ffff', transparent: true, opacity: .9 }));
  orb.add(core);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(.85, 24, 16),
    new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSignal: { value: 0 }, uUrgent: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
        void main(){vUv=uv; vNormal=normalize(normalMatrix*normal);
          vec4 p=modelViewMatrix*vec4(position,1.0);vView=-p.xyz;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform float uTime;uniform float uSignal;uniform float uUrgent;
        varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
        void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),1.7);
          float flow=sin(vUv.y*16.0+sin(vUv.x*18.0-uTime*1.2)*2.5+uTime*1.8);
          float swirl=pow(.5+.5*sin(vUv.x*25.13+flow*3.0-uTime*2.0),4.0);
          float mist=.5+.5*sin(vUv.y*22.0-vUv.x*12.0+uTime*1.3);
          vec3 color=mix(vec3(.12,.65,1.),vec3(.65,.25,1.),mist);
          color=mix(color,vec3(.65,1.,1.),swirl*.6);
          color=mix(color,vec3(.4,1.,.8),uSignal*.5);
          color=mix(color,vec3(1.,.35,.55),uUrgent);
          gl_FragColor=vec4(color,.16+rim*.6+swirl*.3);
          #include <colorspace_fragment>
        }`,
    }));
  orb.add(aura);
  function jauntBurst(name) {
    const burst = new THREE.Group(); burst.name = name; group.add(burst);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ac9aff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .035, 6, 48),
      new THREE.MeshBasicMaterial({ color: '#b8faff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = Math.PI / 2; burst.add(shell, ring);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3));
    const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d7c4ff', size: .10,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    particles.frustumCulled = false;
    burst.add(particles);
    return { burst, shell, ring, particles };
  }
  const departure = jauntBurst('Disolución etérea'), arrival = jauntBurst('Llegada etérea');
  function updateBurst(effect, location, age, arriving, time) {
    const u = Math.min(1, age / (arriving ? 1.2 : .65));
    effect.burst.visible = u < 1;
    if (!effect.burst.visible) return;
    effect.burst.position.set(location.x, (location.y || 0) + ((location.y || 0) === 0 ? oceanHeight(location.x, location.z, time) : 0) + 1.4, location.z);
    const expansion = arriving ? 1 + Math.pow(u, .6) * 4.2 : 3.4 * (1 - u) + .2;
    effect.shell.scale.set(expansion, expansion * .65, expansion);
    effect.shell.material.opacity = Math.pow(1 - u, 3) * .22;
    effect.ring.scale.setScalar(arriving ? 1.5 + u * 5 : expansion);
    effect.ring.material.opacity = Math.pow(1 - u, 2) * .9;
    effect.particles.material.opacity = Math.pow(1 - u, 1.5);
    const positions = effect.particles.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const angle = i * 2.39996 + u * (arriving ? 2 : -2), spread = .3 + expansion * (.4 + (i % 7) / 10);
      positions.setXYZ(i, Math.cos(angle) * spread, Math.sin(i * 1.7) * expansion * .65, Math.sin(angle) * spread);
    }
    positions.needsUpdate = true;
  }
  const rings = Array.from({ length: 3 }, (_, index) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48),
      new THREE.MeshBasicMaterial({ color: '#82f7df', transparent: true,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.userData.phase = index / 3;
    group.add(ring); return ring;
  });
  const boatRings = Array.from({ length: 3 }, () => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 48),
      new THREE.MeshBasicMaterial({ color: '#a2ffd0', transparent: true,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.name = 'Sense del velero'; ring.rotation.x = -Math.PI / 2;
    group.add(ring); return ring;
  });
  return {
    group,
    update(state, time, visible, boatPosition) {
      group.visible = visible;
      orb.visible = state.active;
      departure.burst.visible = arrival.burst.visible = !!state.jaunt;
      if (state.jaunt) {
        const age = Math.max(0, state.time - state.jaunt.startedAt);
        updateBurst(departure, state.jaunt.from, age, false, time);
        updateBurst(arrival, state.jaunt.to, age, true, time);
      }
      const strength = state.signal?.intensity || 0;
      if (state.active) {
        const { x, y, z } = state.position, pulse = Math.sin(state.time * (5 + strength * 15));
        orb.position.set(x, y + (y === 0 ? oceanHeight(x, z, time) : 0) + ORB_HEIGHT, z);
        core.rotation.set(state.time, state.time * .6, state.time * .4);
        core.scale.setScalar(1 + strength * .5 + pulse * .1);
        aura.scale.setScalar(1.2 + strength + pulse * .15);
        aura.material.uniforms.uTime.value = state.time;
        aura.material.uniforms.uSignal.value = strength;
        const remaining = (state.path.length - state.travelled) / ORB_SPEED;
        aura.material.uniforms.uUrgent.value = remaining < 1.5 ? (.5 + .5 * Math.sin(state.time * 16)) * .8 : 0;
      }
      rings.forEach(ring => {
        ring.visible = state.active && strength > 0;
        if (!ring.visible) return;
        const phase = (state.time * (.5 + strength * 1.8) + ring.userData.phase) % 1;
        ring.position.set(state.position.x, state.position.y + (state.position.y === 0 ? oceanHeight(state.position.x, state.position.z, time) : 0) + .15, state.position.z);
        ring.scale.setScalar(1 + phase * (3 + strength * 6));
        ring.material.opacity = (1 - phase) * (.25 + strength * .6);
      });
      // Relay the remote signal at the hull; without a remote contact the boat
      // displays its own local sensor, including when the skill is on cooldown.
      const remote = state.active && state.signal;
      const boatStrength = (remote || state.boatSignal)?.intensity || 0;
      boatRings.forEach((ring, index) => {
        ring.visible = !!boatPosition && boatStrength > 0;
        if (!ring.visible) return;
        const phase = (state.time * (.5 + boatStrength * 1.8) + index / 3) % 1;
        ring.position.set(boatPosition.x, (boatPosition.y || 0) + ((boatPosition.y || 0) === 0 ? oceanHeight(boatPosition.x, boatPosition.z, time) : 0) + .18, boatPosition.z);
        ring.scale.setScalar(2.8 + phase * (3 + boatStrength * 6));
        ring.material.color.set(remote ? '#b7a2ff' : '#a2ffd0');
        ring.material.opacity = (1 - phase) * (.25 + boatStrength * .6);
      });
    },
  };
}
