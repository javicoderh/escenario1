import * as THREE from 'three';
import { addInkOutline, petalMaps } from './lotus.js';
import { createBoatEnergy } from './boat-energy.js';
import { createBoatBuoyancy } from './boat-buoyancy.js';

function hullGeometry() {
  const positions = [], uvs = [], indices = [];
  const rows = 64, sides = 24;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, envelope = Math.pow(Math.sin(Math.PI * t), .68);
    const width = .015 + .84 * envelope;
    const rail = .38 + Math.pow(Math.abs(t * 2 - 1), 3) * .4;
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * Math.PI;
      positions.push(Math.cos(angle) * width, rail - Math.sin(angle) * (.15 + .68 * envelope), -2.4 + t * 4.6);
      uvs.push(side / sides, t);
      if (row < rows && side < sides) {
        const a = row * (sides + 1) + side, b = a + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function deckTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(128, 256);
  const dark = new THREE.Color('#141d31'), light = new THREE.Color('#596175'), color = new THREE.Color();
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) {
    const grain = Math.sin(x * .9 + Math.sin(y * .07) * 2) * .1;
    const seam = x % 16 < 1 ? -.36 : 0;
    const shade = THREE.MathUtils.clamp(.55 + grain + seam + (bayer[x % 4 + y % 4 * 4] / 16 - .5) * .08, 0, 1);
    color.copy(dark).lerp(light, Math.round(shade * 16) / 16).convertLinearToSRGB();
    const index = (y * 128 + x) * 4;
    image.data[index] = color.r * 255; image.data[index + 1] = color.g * 255; image.data[index + 2] = color.b * 255; image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; return texture;
}

export function createSailboat(renderer, palette = 'ember', { textureCache } = {}) {
  const group = new THREE.Group(); group.name = 'Velero — Espíritu de seda';
  group.rotation.order = 'YXZ';
  const buoyancy = createBoatBuoyancy(); let previousTime = null;
  group.userData = { entityId: 'sailboat', entityType: 'vehicle', role: 'transport' };
  const textures = [];
  const wood = deckTexture(); textures.push(wood);
  const hullMaterial = addInkOutline(new THREE.MeshPhysicalMaterial({
    map: wood, color: '#aea5c9', side: THREE.DoubleSide, roughness: .48, sheen: .4, sheenColor: '#826ac3', metalness: .18,
  }), palette, 2);
  const hull = new THREE.Mesh(hullGeometry(), hullMaterial); group.add(hull);
  const deckShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, width = .015 + .84 * Math.pow(Math.sin(Math.PI * t), .68);
    const x = width, z = -2.4 + t * 4.6;
    if (i === 0) deckShape.moveTo(x, -z); else deckShape.lineTo(x, -z);
  }
  for (let i = 64; i >= 0; i--) { const t = i / 64; deckShape.lineTo(-(.015 + .84 * Math.pow(Math.sin(Math.PI * t), .68)), 2.4 - t * 4.6); }
  deckShape.closePath();
  const deckGeometry = new THREE.ShapeGeometry(deckShape);
  const deckUV = deckGeometry.attributes.uv, deckPosition = deckGeometry.attributes.position;
  for (let i = 0; i < deckUV.count; i++) deckUV.setXY(i, (deckPosition.getX(i) + .86) / 1.72, (deckPosition.getY(i) + 2.2) / 4.6);
  const deck = new THREE.Mesh(deckGeometry, new THREE.MeshStandardMaterial({ map: wood, color: '#a3b7bd', roughness: .65 }));
  deck.rotation.x = -Math.PI / 2; deck.position.y = .37; group.add(deck);
  const gold = new THREE.MeshStandardMaterial({ color: '#c39b9c', metalness: .35, roughness: .4, emissive: '#4dd7df', emissiveIntensity: .04 });
  const timber = new THREE.MeshStandardMaterial({ map: wood, color: '#85989e', roughness: .55 });
  for (const z of [-1.05, .95]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, .09, .24), timber);
    seat.position.set(0, .49, z); group.add(seat);
  }
  const tiller = new THREE.Mesh(new THREE.BoxGeometry(.055, .055, .65), gold);
  tiller.position.set(0, .66, 1.55); tiller.rotation.x = -.15; group.add(tiller);
  const lotusMount = new THREE.Group(); lotusMount.name = 'Anclaje de loto de cubierta';
  lotusMount.position.set(0, .63, .8); group.add(lotusMount);
  const cradle = new THREE.Mesh(new THREE.CylinderGeometry(.22, .27, .08, 32), gold);
  cradle.position.set(0, .57, .8); group.add(cradle);
  const electricity = createBoatEnergy(); group.add(electricity.group);
  const chargeUniform = { value: 0 }, timeUniform = { value: 0 };
  function tube(points, radius, material = gold) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 7, false), material); group.add(mesh); return mesh;
  }
  for (const sign of [-1, 1]) {
    tube(Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      return new THREE.Vector3(sign * (.02 + .84 * Math.pow(Math.sin(Math.PI * t), .68)), .4 + Math.pow(Math.abs(t * 2 - 1), 3) * .4, -2.4 + t * 4.6);
    }), .035);
    tube([new THREE.Vector3(sign * .015, .77, -2.4), new THREE.Vector3(sign * .28, 1.05, -2.65), new THREE.Vector3(sign * .18, 1.3, -2.55)], .05, gold);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.045, .075, 4.65, 12), timber);
  mast.position.set(0, 2.65, -.25); group.add(mast);
  const mastFinial = new THREE.Mesh(new THREE.SphereGeometry(.085, 16, 12), gold); mastFinial.position.set(0, 5, -.25); group.add(mastFinial);
  const rope = new THREE.MeshStandardMaterial({ color: '#71658c', roughness: .85 });
  // Small lacquered armor scales retain the low-poly, hand-inked silhouette.
  const armorMaterial = new THREE.MeshStandardMaterial({ color: '#34364f', roughness: .58, metalness: .18 });
  const armor = new THREE.InstancedMesh(new THREE.BoxGeometry(.085, .18, .43), armorMaterial, 8);
  const armorPose = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const sign = i < 4 ? -1 : 1, z = -.95 + (i % 4) * .65, t = (z + 2.4) / 4.6;
    armorPose.position.set(sign * (.025 + .84 * Math.pow(Math.sin(Math.PI * t), .68)), .25, z);
    armorPose.rotation.set(0, sign * (t - .5) * -.65, sign * -.16); armorPose.updateMatrix(); armor.setMatrixAt(i, armorPose.matrix);
  }
  group.add(armor);
  tube([new THREE.Vector3(0, .75, -2.35), new THREE.Vector3(0, 2.8, -1.4), new THREE.Vector3(0, 4.8, -.25)], .009, rope);
  tube([new THREE.Vector3(0, 4.8, -.25), new THREE.Vector3(0, 2.6, 1), new THREE.Vector3(0, .7, 2.1)], .009, rope);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(.032, .045, 2.9, 10), timber);
  boom.rotation.z = Math.PI / 2; boom.position.set(1.25, 1.1, -.25); group.add(boom);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const { map, bumpMap } = textureCache ? textureCache.get(palette, 1, anisotropy) : petalMaps(palette, 1, anisotropy);
  if (!textureCache) textures.push(map, bumpMap);
  const sailMaterial = addInkOutline(new THREE.MeshPhysicalMaterial({
    map, bumpMap, bumpScale: .016, side: THREE.DoubleSide,
    roughness: .53, sheen: .65, sheenRoughness: .7, sheenColor: '#ffe1b4',
    emissive: '#b9282d', emissiveMap: map, emissiveIntensity: .12,
  }), palette, 1);
  // Inlaid traces share the original silk texture, dither and ink shader.
  const silkCompile = sailMaterial.onBeforeCompile;
  sailMaterial.onBeforeCompile = shader => {
    silkCompile(shader);
    shader.uniforms.boatCharge = chargeUniform; shader.uniforms.boatTime = timeUniform;
    shader.fragmentShader = 'uniform float boatCharge; uniform float boatTime;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 circuitUV = vMapUv;
      float circuitAA = max(fwidth(circuitUV.x), 0.001);
      float circuitEdge = min(abs(circuitUV.x - 0.045), abs(circuitUV.x - 0.955));
      float circuitSeam = 1.0 - smoothstep(0.003, 0.006 + circuitAA, circuitEdge);
      float circuitSpine = abs(circuitUV.x - 0.25 - floor(circuitUV.y * 5.0) * 0.025);
      float circuitTrace = (1.0 - smoothstep(0.002, 0.004 + circuitAA, circuitSpine))
        * smoothstep(0.12, 0.18, circuitUV.y) * (1.0 - smoothstep(0.7, 0.8, circuitUV.y));
      float circuitHem = 1.0 - smoothstep(0.004, 0.008 + fwidth(circuitUV.y), abs(circuitUV.y - 0.035));
      float circuitPulse = pow(max(0.0, sin(circuitUV.y * 18.0 - boatTime * 3.0)), 8.0);
      vec3 circuitColor = mix(vec3(0.12, 0.8, 0.95), vec3(0.85, 0.15, 0.48), circuitUV.x);
      outgoingLight += circuitColor * (circuitSeam + circuitTrace * 0.65 + circuitHem * 0.6)
        * boatCharge * (0.6 + circuitPulse * 0.7);
      #include <opaque_fragment>
    `);
  };
  sailMaterial.customProgramCacheKey = () => 'lotus-silk-cyber-circuits-v1';
  const rows = 40, columns = 28, vertices = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns;
      vertices.push(.08 + u * (2.7 * (1 - v) + .025), 1.12 + v * 3.65, -.25);
      uvs.push(u, v);
      if (row < rows && col < columns) { const a = row * (columns + 1) + col, b = a + columns + 1; indices.push(a, a + 1, b, b, a + 1, b + 1); }
    }
  }
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  sailGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); sailGeometry.setIndex(indices); sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeometry, sailMaterial); sail.frustumCulled = false; group.add(sail);
  // The same raised golden veins as the lotus become a small petal crest.
  const crestMaterial = new THREE.MeshStandardMaterial({ color: '#ffe1a1', emissive: '#ffbe5b', emissiveIntensity: .35, roughness: .4 });
  const crest = new THREE.Group(); crest.position.set(.9, 2.55, .17); group.add(crest);
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), crestMaterial);
    petal.scale.set(.08, .28, .025); petal.rotation.z = (i - 2) * .38;
    petal.position.set(Math.sin((i - 2) * .38) * .1, Math.cos((i - 2) * .38) * .09, 0); crest.add(petal);
  }
  const lanternMaterial = new THREE.MeshStandardMaterial({ color: '#b0e4db', emissive: '#5bd9df', emissiveIntensity: .3, roughness: .3 });
  const lantern = new THREE.Mesh(new THREE.IcosahedronGeometry(.11, 1), lanternMaterial); lantern.position.set(0, .85, -1.75); group.add(lantern);
  const lanternLight = new THREE.PointLight('#77e8ed', .25, 4); lanternLight.position.copy(lantern.position); group.add(lanternLight);
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(.8, .22, 12, 2), sailMaterial); pennant.position.set(.4, 4.8, -.25); group.add(pennant);
  return {
    group,
    lotusMount,
    setEnergy(charge) {
      const power = Number.isFinite(charge) ? THREE.MathUtils.clamp(charge, 0, 1) : 0;
      group.userData.power = power;
      chargeUniform.value = power; electricity.setPower(power);
      gold.emissiveIntensity = .04 + power * .35;
      crestMaterial.emissive.set(power > 0 ? '#8feaff' : '#ffbe5b');
      crestMaterial.emissiveIntensity = .2 + power * .65;
      lanternLight.intensity = .25 + power * .55;
    },
    update(time, speed, dt = previousTime === null ? 0 : Math.max(0, time - previousTime)) {
      timeUniform.value = time; electricity.update(time);
      const pose = buoyancy.update(group.position, group.rotation.y, time, dt, speed);
      group.position.y = pose.height; group.rotation.x = pose.pitch; group.rotation.z = pose.roll;
      previousTime = time;
      const positions = sailGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const u = sailGeometry.attributes.uv.getX(i), v = sailGeometry.attributes.uv.getY(i);
        const billow = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (.4 + speed * .025);
        const flutter = Math.sin(time * 2.5 + v * 9 - u * 6) * .055 * u;
        positions.setZ(i, -.25 + billow + flutter);
      }
      positions.needsUpdate = true; sailGeometry.computeVertexNormals();
      pennant.rotation.y = Math.sin(time * 2) * .25;
      lanternMaterial.emissiveIntensity = .3 + chargeUniform.value * (.8 + Math.sin(time * 2) * .12);
    },
    dispose() { textures.forEach(texture => texture.dispose()); },
  };
}
