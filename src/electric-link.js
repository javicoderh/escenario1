import * as THREE from 'three';

export function createElectricLink() {
  const group = new THREE.Group(); group.name = 'Resonancia eléctrica entre lotos';
  group.userData = { entityType: 'effect', role: 'energy-link' };
  const segments = 64, paths = 5, count = paths * (segments + 1) * 2;
  const positions = new Float32Array(count * 3), tangents = new Float32Array(count * 3), sides = [], coordinates = [], indices = [];
  for (let path = 0; path < paths; path++) for (let i = 0; i <= segments; i++) {
    const base = (path * (segments + 1) + i) * 2;
    sides.push(-1, 1); coordinates.push(i / segments, path, i / segments, path);
    if (i < segments) indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aTangent', new THREE.BufferAttribute(tangents, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute('aCoordinate', new THREE.Float32BufferAttribute(coordinates, 2)); geometry.setIndex(indices);
  const opacity = { value: 0 }, time = { value: 0 };
  const vertexShader = `uniform float uWidth; attribute vec3 aTangent; attribute float aSide;
    attribute vec2 aCoordinate; varying float vSide; varying vec2 vCoordinate;
    void main() {
      vec3 normal = cross(normalize(cameraPosition - position), normalize(aTangent));
      normal /= max(length(normal), 0.0001);
      vec3 p = position + normal * aSide * uWidth;
      vSide = aSide; vCoordinate = aCoordinate;
      gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
    }`;
  const fragmentShader = `uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
    varying float vSide; varying vec2 vCoordinate;
    void main() {
      float edge = exp(-vSide * vSide * 3.8);
      float flow = 0.78 + 0.22 * sin(vCoordinate.x * 35.0 - uTime * 8.0 + vCoordinate.y);
      float tips = smoothstep(0.0,0.04,vCoordinate.x) * (1.0 - smoothstep(0.95,1.0,vCoordinate.x));
      gl_FragColor = vec4(uColor, edge * flow * uOpacity * tips);
      #include <colorspace_fragment>
    }`;
  for (const [width, color, strength] of [[.2, '#ff923e', .17], [.055, '#9cdeff', .55], [.013, '#fff0cb', 1]]) {
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false, vertexShader, fragmentShader,
      uniforms: { uWidth: { value: width }, uColor: { value: new THREE.Color(color).multiplyScalar(strength) }, uOpacity: opacity, uTime: time } });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = 4; group.add(mesh);
  }
  const points = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
  const delta = new THREE.Vector3(), side = new THREE.Vector3(), tangent = new THREE.Vector3(), branchEnd = new THREE.Vector3();
  const hash = seed => { const value = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return value - Math.floor(value); };
  return {
    group,
    update(elapsed, source, target, alpha) {
      opacity.value = alpha; time.value = elapsed;
      group.visible = alpha > 0 && !!source;
      if (!group.visible) return;
      delta.subVectors(target, source); const length = delta.length();
      side.crossVectors(delta, THREE.Object3D.DEFAULT_UP).normalize();
      const tick = Math.floor(elapsed * 14);
      for (let path = 0; path < paths; path++) {
        const fork = path >= 3;
        const start = fork ? .3 + (path - 3) * .3 : 0;
        branchEnd.copy(target);
        if (fork) branchEnd.lerpVectors(source, target, start + .24).addScaledVector(side, path === 3 ? .65 : -.65).add(new THREE.Vector3(0, .3, 0));
        for (let i = 0; i <= segments; i++) {
          const u = i / segments, t = fork ? start + u * .24 : u;
          const point = points[i];
          if (fork) point.lerpVectors(source, target, start).lerp(branchEnd, u);
          else point.lerpVectors(source, target, t);
          // Bow around the vessel's silhouette so the sail does not conceal
          // the entire connection when viewed from the follow camera.
          point.addScaledVector(side, Math.pow(Math.sin(Math.PI * t), .7) * Math.min(2.6, length * .22));
          const envelope = Math.sin(Math.PI * u);
          const seed = tick * 1.3 + i * 3.71 + path * 71;
          point.y += Math.sin(Math.PI * t) * Math.min(1.7, length * .12) + (hash(seed) - .5) * .32 * envelope;
          point.addScaledVector(side, ((hash(seed + 37) - .5) * .45 + (path - 1) * .08) * envelope);
        }
        for (let i = 0; i <= segments; i++) {
          tangent.subVectors(points[Math.min(segments, i + 1)], points[Math.max(0, i - 1)]);
          for (let edge = 0; edge < 2; edge++) {
            const index = ((path * (segments + 1) + i) * 2 + edge) * 3;
            points[i].toArray(positions, index); tangent.toArray(tangents, index);
          }
        }
      }
      geometry.attributes.position.needsUpdate = true; geometry.attributes.aTangent.needsUpdate = true;
    },
  };
}
