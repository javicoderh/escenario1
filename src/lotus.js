import * as THREE from 'three';
import { createLotusMagic } from './lotus-magic.js';
import { WATER_LEVEL } from './pond.js';

// Color stays deliberately limited; the silhouette and light are smoothly 3D.
const COLORS = {
  sakura: ['#591c50', '#ac365f', '#df6688', '#f6a0a4', '#ffd3b5', '#fff1da'],
  ember: ['#650917', '#990e22', '#cc1828', '#ed2a22', '#ff692b', '#ffd15a'],
  moon: ['#30255e', '#6653a0', '#aa80c9', '#d1abe7', '#b5d9e8', '#f2e7ff'],
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;
const mix = THREE.MathUtils.lerp;

function noise(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function addInkOutline(material, palette, variant = 0) {
  const ink = new THREE.Color(palette === 'moon' ? '#231c35' : '#301c28');
  const glint = new THREE.Color(palette === 'moon' ? '#e1eaff' : '#ffe4bc');
  // Paint the border in the existing draw call, so it follows the skinned mesh
  // without a second shell, extra triangles or a full-screen outline pass.
  material.onBeforeCompile = shader => {
    shader.uniforms.lotusInk = { value: ink };
    shader.uniforms.lotusGlint = { value: glint };
    shader.uniforms.lotusStrokePhase = { value: variant * .73 };
    shader.fragmentShader = 'uniform vec3 lotusInk;\nuniform vec3 lotusGlint;\nuniform float lotusStrokePhase;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 lotusUV = vMapUv;
      float lotusStroke = 0.013 + 0.004 * sin(lotusUV.y * 24.0 + lotusUV.x * 7.0)
        + 0.002 * sin(lotusUV.y * 61.0);
      float lotusEdge = min(lotusUV.x, 1.0 - lotusUV.x);
      float lotusAA = max(fwidth(lotusEdge), 0.001);
      float lotusBorder = 1.0 - smoothstep(lotusStroke - lotusAA, lotusStroke + lotusAA, lotusEdge);
      float lotusTipAA = max(fwidth(lotusUV.y), 0.001);
      float lotusTip = smoothstep(0.981 - lotusTipAA, 0.981 + lotusTipAA, lotusUV.y);
      float lotusFacing = abs(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)));
      float lotusSilhouette = 1.0 - smoothstep(0.07, 0.22, lotusFacing);
      float lotusInkMask = max(max(lotusBorder, lotusTip), lotusSilhouette * 0.88);
      // Fine painted highlights follow the veins and sit just inside the ink.
      float lotusLineAA = max(fwidth(lotusUV.x), 0.0007);
      float lotusVeinDistance = abs(lotusUV.x - 0.5 - sin(lotusUV.y * 9.0 + lotusStrokePhase) * 0.011);
      float lotusVein = 1.0 - smoothstep(0.0015, 0.003 + lotusLineAA, lotusVeinDistance);
      float lotusSideDistance = abs(abs(lotusUV.x - 0.5)
        - (0.20 + sin(lotusUV.y * 4.7 + lotusStrokePhase) * 0.045));
      float lotusSideLine = 1.0 - smoothstep(0.001, 0.003 + lotusLineAA, lotusSideDistance);
      float lotusEdgeDistance = abs(lotusEdge - 0.034 - sin(lotusUV.y * 17.0 + lotusStrokePhase) * 0.005);
      float lotusEdgeLine = 1.0 - smoothstep(0.001, 0.003 + lotusLineAA, lotusEdgeDistance);
      float lotusLineFade = smoothstep(0.15, 0.32, lotusUV.y) * (1.0 - smoothstep(0.86, 0.97, lotusUV.y));
      float lotusBrokenStroke = smoothstep(0.05, 0.65, sin(lotusUV.y * 12.0 + lotusStrokePhase));
      float lotusHighlights = (lotusVein * 0.22 + lotusSideLine * lotusBrokenStroke * 0.40
        + lotusEdgeLine * smoothstep(0.25, 0.65, lotusUV.y) * 0.55) * lotusLineFade;
      outgoingLight += lotusGlint * lotusHighlights * (0.65 + 0.35 * lotusFacing);
      outgoingLight = mix(outgoingLight, lotusInk, lotusInkMask * 0.94);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'lotus-brush-outline-glints-v2';
  return material;
}

function petalMaps(palette, variant, anisotropy) {
  const width = 192, height = 384;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const relief = document.createElement('canvas');
  relief.width = width; relief.height = height;
  const reliefCtx = relief.getContext('2d');
  const colorData = ctx.createImageData(width, height);
  const bumpData = reliefCtx.createImageData(width, height);
  const colors = COLORS[palette].map(hex => new THREE.Color(hex));
  const color = new THREE.Color();

  for (let y = 0; y < height; y++) {
    const t = 1 - y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1), s = u * 2 - 1;
      const midrib = s - Math.sin(t * 9 + variant * .7) * .025;
      const grain = noise(Math.floor(x / 2), Math.floor(y / 2), variant);
      const clouds = Math.sin(s * 8 + t * 11 + variant) * Math.sin(t * 17 - s * 5 + variant * 1.9);
      const flames = Math.sin(s * 21 + Math.sin(t * 11 + variant) * 1.5 + t * 5);
      const centralVein = Math.exp(-midrib * midrib * 3500);
      const branch = Math.pow(Math.max(0, Math.cos((t - Math.abs(s) * .23 + Math.sin(t * 13) * .008) * 125)), 22);
      const filaments = Math.pow(Math.max(0, Math.sin(s * 130 + t * 20 + Math.sin(t * 17))), 12);
      const edge = smooth(.68, 1, Math.abs(s));
      // Wide color ribbons, a darker root, peach/lilac edges and ivory tips.
      let tone = .17 + t * .59 + clouds * .075 + flames * .035;
      tone += edge * .10 + smooth(.80, 1, t) * .10;
      tone += centralVein * .08 - branch * .045 + filaments * .014;
      tone += (variant - 2.5) * .023 + (grain - .5) * .018;
      const dither = (BAYER[(x % 4) + (y % 4) * 4] / 16 - .5) / 30;
      const stepped = Math.round(clamp(tone + dither, 0, .999) * 28) / 28;
      const index = clamp(stepped * (colors.length - 1), 0, colors.length - 1.001);
      const low = Math.floor(index);
      color.copy(colors[low]).lerp(colors[low + 1], index - low).convertLinearToSRGB();
      const offset = (y * width + x) * 4;
      colorData.data[offset] = Math.round(clamp(color.r, 0, 1) * 255);
      colorData.data[offset + 1] = Math.round(clamp(color.g, 0, 1) * 255);
      colorData.data[offset + 2] = Math.round(clamp(color.b, 0, 1) * 255);
      colorData.data[offset + 3] = 255;
      const bump = Math.round(130 + centralVein * 48 + branch * 21 + filaments * 11 + (grain - .5) * 6);
      bumpData.data[offset] = bumpData.data[offset + 1] = bumpData.data[offset + 2] = bump;
      bumpData.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(colorData, 0, 0); reliefCtx.putImageData(bumpData, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = anisotropy;
  const bumpMap = new THREE.CanvasTexture(relief);
  bumpMap.anisotropy = anisotropy;
  return { map, bumpMap };
}

/** A closed, cupped petal with rounded edges, a fine tip and smooth skinning. */
export function createPetalGeometry({ length, width, phase, segments = 18, rows = 96, columns = 24 }) {
  const positions = [], uvs = [], indices = [], skinIndices = [], weights = [], colors = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * t)), .78);
    const halfWidth = .004 + width * envelope * (1 - .22 * t);
    const thickness = .0015 + .046 * envelope * (1 - .64 * t);
    const cup = .18 * envelope * (1 - .35 * t);
    const bonePosition = t * segments;
    const bone = Math.min(Math.floor(bonePosition), segments - 1);
    const weight = bonePosition - bone;
    for (let col = 0; col <= columns; col++) {
      const angle = col / columns * TAU;
      const s = Math.cos(angle), side = Math.sin(angle);
      const unevenEdge = 1 + .045 * Math.sin(t * 19 + phase + s * 2) * envelope;
      positions.push(
        s * halfWidth * unevenEdge,
        side * thickness + s * s * cup + .012 * Math.sin(t * 25 + s * 5 + phase) * s * s * envelope,
        t * length,
      );
      uvs.push((s + 1) / 2, t);
      skinIndices.push(bone, bone + 1, 0, 0);
      weights.push(1 - weight, weight, 0, 0);
      const shade = side < 0 ? .80 : 1;
      colors.push(shade, shade * (side < 0 ? .96 : 1), shade);
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, b = a + columns + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const end = rows * (columns + 1);
  for (let col = 1; col < columns - 1; col++) {
    indices.push(0, col + 1, col, end, end + col, end + col + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Weld the normal of the duplicated seam, preventing a visible longitudinal line.
  const normal = geometry.attributes.normal, n = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const a = row * (columns + 1), b = a + columns;
    n.set(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z); normal.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry;
}

function makePetal(config, material) {
  const segments = 18;
  const geometry = createPetalGeometry({ ...config, segments });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  const bones = [];
  for (let i = 0; i <= segments; i++) {
    const bone = new THREE.Bone();
    bone.position.z = i === 0 ? 0 : config.length / segments;
    if (i) bones[i - 1].add(bone);
    bones.push(bone);
  }
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  // Posed bounds vary continuously; skip the small rest-pose bounding sphere.
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const pivot = new THREE.Group();
  pivot.rotation.y = config.angle;
  pivot.position.set(Math.sin(config.angle) * config.radius, config.height, Math.cos(config.angle) * config.radius);
  pivot.add(mesh);
  const joints = bones.map((bone, i) => {
    const t = i / segments;
    return {
      bone, t, tip: t * t,
      curve: -config.arch * Math.sin(t * Math.PI * .87) + config.curl * smooth(.44, 1, t),
      bend: Math.sin(t * 5.1 + config.phase) * t * .27,
      twist: Math.sin(t * 4 + config.phase) * config.twist * t,
    };
  });
  return { ...config, mesh, bones, pivot, joints };
}

function animatePetal(petal, time, bloom, wind) {
  const { joints, phase, lean, frequency, tail } = petal;
  let previousX = 0, previousY = 0, previousZ = 0;
  const openness = .08 + bloom * .92;
  const alongWind = Math.cos(wind.direction - petal.angle);
  const acrossWind = Math.sin(wind.direction - petal.angle);
  const sensitivity = tail ? 1 : .6;
  for (const joint of joints) {
    const { t, tip } = joint;
    const travelingWave = Math.sin(time * frequency - t * 4.7 + phase);
    const secondaryWave = Math.sin(time * frequency * .57 - t * 7.5 + phase * 1.6);
    const gust = wind.strength * (.7 + .3 * Math.sin(time * 1.15 - t * 3 + phase * .12));
    const flutter = Math.sin(time * (2.15 + frequency * .3) - t * 8 + phase) * tip * .035;
    let x = mix(-1.39, lean, bloom);
    x += joint.curve * openness;
    x += (travelingWave * (.04 + tip * .23) + secondaryWave * tip * .085 - gust * alongWind * tip * .13) * sensitivity;
    const y = joint.bend * openness + (travelingWave * tip * .17 + gust * acrossWind * tip * .19) * sensitivity;
    const z = joint.twist * openness + (secondaryWave * tip * .19 + flutter + gust * acrossWind * tip * .08) * sensitivity;
    joint.bone.rotation.set(x - previousX, y - previousY, z - previousZ);
    previousX = x; previousY = y; previousZ = z;
  }
  petal.pivot.rotation.y = petal.angle + Math.sin(time * frequency * .41 + phase) * .045 + wind.strength * acrossWind * .018;
}

export function createLivingLotus(palette, renderer) {
  const group = new THREE.Group();
  group.name = 'Flamming Lotus';
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = [], materials = [], petals = [];
  for (let variant = 0; variant < 6; variant++) {
    const { map, bumpMap } = petalMaps(palette, variant, anisotropy);
    textures.push(map, bumpMap);
    materials.push(addInkOutline(new THREE.MeshPhysicalMaterial({
      map, bumpMap, bumpScale: .022, vertexColors: true,
      roughness: .53, metalness: 0, clearcoat: 0,
      sheen: .65, sheenRoughness: .7, sheenColor: new THREE.Color(COLORS[palette][4]),
      emissive: new THREE.Color(COLORS[palette][2]), emissiveMap: map, emissiveIntensity: .055,
      side: THREE.FrontSide,
    }), palette, variant));
  }
  const curls = [-1.05, .65, -1.35, .3, -.85, -1.5, .50, -1.15, -.2];
  // Nine long, asymmetric tails form the creature's defining silhouette.
  for (let i = 0; i < 9; i++) {
    petals.push(makePetal({
      tail: true, length: 3.25 + noise(i, 0, 8) * .85,
      width: .43 + noise(i, 1, 2) * .16,
      angle: i / 9 * TAU + (noise(i, 2, 5) - .5) * .14,
      radius: .18, height: .17 + noise(i, 0, 4) * .14,
      phase: i * 2.39996, arch: .65 + noise(i, 1, 3) * .45,
      curl: curls[i], lean: -.13 - noise(i, 2, 8) * .18,
      twist: .35 + noise(i, 0, 1) * .65, frequency: .63 + noise(i, 0, 7) * .42,
    }, materials[i % 6]));
  }
  // Shorter layers preserve the lotus identity beneath the long flame petals.
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 9 : 7;
    for (let i = 0; i < count; i++) {
      petals.push(makePetal({
        tail: false, length: (layer ? 1.32 : 2.10) + noise(i, layer, 4) * .27,
        width: layer ? .37 : .59,
        angle: i / count * TAU + (layer ? .1 : .34), radius: .10,
        height: layer ? .37 : .05, phase: i * 1.71 + layer * 3.5,
        arch: layer ? .48 : .30, curl: layer ? -.24 : .35,
        lean: layer ? -.83 : .04, twist: .22, frequency: .72 + i * .037,
        rows: 72,
      }, materials[(i + layer + 2) % 6]));
    }
  }
  petals.forEach(petal => group.add(petal.pivot));

  // A small calyx meets the waterline so the blossom has a visible support.
  const calyx = new THREE.Mesh(
    new THREE.SphereGeometry(.34, 32, 20),
    new THREE.MeshStandardMaterial({ color: '#526e44', roughness: .72 }),
  );
  calyx.scale.y = .27;
  calyx.position.y = .004;
  group.add(calyx);

  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(.31, 40, 24),
    new THREE.MeshStandardMaterial({ color: '#df9d4b', roughness: .6, emissive: '#e9782c', emissiveIntensity: .19 }),
  );
  heart.scale.y = .52; heart.position.y = .61; group.add(heart);
  const pollenGeometry = new THREE.SphereGeometry(.028, 12, 8);
  const pollenMaterial = new THREE.MeshStandardMaterial({ color: '#ffe7a1', roughness: .35, emissive: '#ffae43', emissiveIntensity: .5 });
  const pollen = new THREE.InstancedMesh(pollenGeometry, pollenMaterial, 72);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const radius = Math.sqrt(i / 72) * .29, angle = i * 2.39996;
    dummy.position.set(Math.cos(angle) * radius, .65 + Math.sqrt(1 - radius / .32) * .11, Math.sin(angle) * radius);
    dummy.scale.set(1, 1.6 + noise(i, 0, 3), 1); dummy.updateMatrix();
    pollen.setMatrixAt(i, dummy.matrix);
  }
  group.add(pollen);
  const heartLight = new THREE.PointLight(COLORS[palette][3], .65, 3, 2);
  heartLight.position.y = .9; group.add(heartLight);

  const magic = createLotusMagic(COLORS[palette]);
  group.add(magic.group);
  const wind = { direction: 0, strength: 0 };

  return {
    group,
    update(time, bloom) {
      wind.direction = .8 + Math.sin(time * .19) * .40;
      wind.strength = .52 + Math.sin(time * .73) * .22 + Math.sin(time * 1.61 + .6) * .12;
      for (const petal of petals) animatePetal(petal, time, bloom, wind);
      group.position.y = WATER_LEVEL + .085 + Math.sin(time * .71) * .008;
      group.rotation.y = Math.sin(time * .13) * .045;
      heartLight.intensity = .9 + Math.sin(time * 1.3) * .20;
      heart.material.emissiveIntensity = .28 + Math.sin(time * 1.3) * .07;
      magic.update(time, bloom, wind);
    },
    dispose() {
      textures.forEach(texture => texture.dispose());
      petals.forEach(petal => petal.mesh.skeleton.dispose());
      // Mesh geometries and materials are disposed by the scene owner.
    },
  };
}
