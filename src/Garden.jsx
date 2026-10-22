import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLivingLotus, createLotusTextureCache } from './lotus.js';
import { createPond, WATER_LEVEL } from './pond.js';
import { createAtmosphere } from './atmosphere.js';
import { createFreeCamera } from './free-camera.js';
import { createWorldGuides, disposeMeshes } from './world-guides.js';
import { LOTUS_SCALE } from './lotus-scale.js';
import { createSailboat } from './sailboat.js';
import { createBoatWake } from './boat-wake.js';
import { createSailingControls } from './sailing-controls.js';
import { createBoatLotus } from './boat-lotus.js';
import { createElectricLink } from './electric-link.js';
import { createWaterLotus, createEnergyState, stepEnergy, boatStats, BOAT_LEVELS } from './lotus-energy.js';
import { createLotusField } from './lotus-field.js';
import { LOTUS_REFERENCE_DIAMETER } from './lotus-scale.js';
import { chargedBoatSpeed } from './boat-motion.js';
import { pickWaterLotus } from './lotus-hover.js';
import { LotusTooltip } from './LotusTooltip.jsx';

export function Garden(props) {
  const host = useRef(), options = useRef(props); options.current = props;
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = host.current; let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { options.current.onReady(false); return; }
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    let pixelCeiling = maxPixelRatio, measuredFps = 60, contextLost = false;
    renderer.setPixelRatio(maxPixelRatio); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    el.appendChild(renderer.domElement);
    renderer.info.autoReset = false;
    const textureCache = createLotusTextureCache();
    const field = createLotusField(renderer, textureCache);
    const scene = new THREE.Scene(); scene.add(field.group);
    const camera = new THREE.PerspectiveCamera(options.current.editing ? 65 : options.current.navigating ? 55 : 38, 1, .1, 24000); camera.layers.enable(1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = LOTUS_SCALE; controls.maxDistance = 4000;
    controls.maxPolarAngle = Math.PI; controls.enablePan = true;
    const flight = createFreeCamera(camera, renderer.domElement, message => options.current.onFlightStatus(message));
    const sailing = createSailingControls(camera, renderer.domElement, options.current.layout.lotus, message => options.current.onSailingStatus(message));
    const atmosphere = createAtmosphere(scene, options.current.night);
    const pond = createPond(options.current.night); scene.add(pond.surface);
    const guides = createWorldGuides(); scene.add(guides.group);
    const lotusAnchor = new THREE.Group(); scene.add(lotusAnchor);
    lotusAnchor.userData = { entityId: 'water-lotus', entityType: 'lotus', role: 'water-lotus' };
    lotusAnchor.scale.setScalar(LOTUS_SCALE);
    // Keep the light count stable across LOD/mode changes. Toggling a model's
    // visibility must not recompile every lit material in the scene.
    const originLight = new THREE.PointLight('#ff692b', 0, 3 * LOTUS_SCALE, 2); scene.add(originLight);
    let currentPalette = options.current.palette;
    let originDetail = options.current.navigating || options.current.editing ? 'medium' : 'high';
    let lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE, { powerControlled: true, textureCache, detail: originDetail, pointLight: false }); lotusAnchor.add(lotus.group);
    let boat = createSailboat(renderer, currentPalette, { textureCache }); scene.add(boat.group);
    let deckLotus = createBoatLotus(renderer, currentPalette, { textureCache, detail: 'medium' }); boat.lotusMount.add(deckLotus.group);
    const resonance = createEnergyState(), electricLink = createElectricLink(); scene.add(electricLink.group);
    let energyLayout, waterLotuses = [], fieldLotuses = [], saveElapsed = 0, detailBudget = 3;
    const hoverRay = new THREE.Raycaster(), hoverMouse = new THREE.Vector2();
    const pointer = { x: 0, y: 0, inside: false };
    let lastHover = -Infinity, hoverKey = '';
    const clearHover = () => { pointer.inside = false; hoverKey = ''; setHover(null); };
    const moveHover = event => {
      if (event.buttons) { clearHover(); return; }
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.inside = true;
    };
    renderer.domElement.addEventListener('pointermove', moveHover);
    renderer.domElement.addEventListener('pointerleave', clearHover);
    function updateHover(now, o) {
      if (now - lastHover < 100) return;
      lastHover = now;
      if (!pointer.inside || o.suspended || document.pointerLockElement) {
        if (hoverKey) { hoverKey = ''; setHover(null); }
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      hoverMouse.set((pointer.x - rect.left) / rect.width * 2 - 1, -(pointer.y - rect.top) / rect.height * 2 + 1);
      hoverRay.setFromCamera(hoverMouse, camera);
      const item = pickWaterLotus(hoverRay.ray, waterLotuses);
      if (!item) { if (hoverKey) { hoverKey = ''; setHover(null); } return; }
      const x = Math.max(8, Math.min(rect.width - 248, pointer.x - rect.left + 16));
      const y = Math.max(8, Math.min(rect.height - 150, pointer.y - rect.top + 16));
      const connected = resonance.linkId === item.id;
      const key = `${item.id}:${item.energy.toFixed(1)}:${connected}:${Math.round(x)}:${Math.round(y)}`;
      if (key !== hoverKey) { hoverKey = key; setHover({ lotus: { ...item }, connected, x, y }); }
    }
    let savedProgress = {};
    try { savedProgress = JSON.parse(localStorage.getItem('flamming-lottus-energy-v1')) || {}; } catch {}
    if (Number.isFinite(savedProgress.delivered) && savedProgress.delivered >= 0) {
      resonance.delivered = Math.min(savedProgress.delivered, 1e9);
      resonance.level = BOAT_LEVELS.reduce((level, item, index) => resonance.delivered >= item.threshold ? index+1 : level, 1);
      resonance.energy = Math.max(0, Math.min(boatStats(resonance).capacity, Number(savedProgress.energy) || 0));
      resonance.restored = Math.max(0, Math.floor(Number(savedProgress.restored) || 0));
    }
    function saveEnergy() {
      try { localStorage.setItem('flamming-lottus-energy-v1', JSON.stringify({ energy: resonance.energy,
        delivered: resonance.delivered, restored: resonance.restored,
        lotuses: Object.fromEntries(waterLotuses.map(item => [item.id, { energy: item.energy, signature: item.signature }])) })); } catch {}
    }
    window.addEventListener('pagehide', saveEnergy);
    const linkSource = new THREE.Vector3(), linkTarget = new THREE.Vector3();
    const wake = createBoatWake(); scene.add(wake.mesh);
    const destinationMarker = new THREE.Group(); scene.add(destinationMarker);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#c5e6be', transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false });
    for (const radius of [.65, .95]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .035, 64), ringMaterial);
      ring.rotation.x = -Math.PI / 2; ring.position.y = .055; destinationMarker.add(ring);
    }
    const leaves = new THREE.Group(); lotusAnchor.add(leaves);
    const dustPositions = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      dustPositions[i * 3] = (Math.random() - .5) * 15;
      dustPositions[i * 3 + 1] = Math.random() * 6;
      dustPositions[i * 3 + 2] = (Math.random() - .5) * 12;
    }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf8deb2, size: .035 * LOTUS_SCALE, transparent: true, opacity: .65 }));
    lotusAnchor.add(dust);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x506d42, side: THREE.DoubleSide, roughness: .87 });
    [[-1.6,.4,1.45,.4],[1.7,.9,1.1,-.7],[-.6,-1.9,.85,1.7]].forEach(([x,z,size,rotation]) => {
      const shape = new THREE.Shape(); shape.moveTo(0, 0);
      for (let i = 0; i <= 48; i++) { const angle = .18 + i / 48 * (Math.PI * 2 - .36); shape.lineTo(Math.sin(angle) * size, Math.cos(angle) * size); }
      shape.lineTo(0, 0);
      const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape), leafMat);
      leaf.rotation.set(-Math.PI / 2, 0, rotation); leaf.position.set(x, WATER_LEVEL + .016, z); leaves.add(leaf);
    });
    function pose(position, target) {
      // Flush any pending orbital damping before handing the camera to flight.
      controls.enableDamping = false; controls.update(); controls.enableDamping = true;
      camera.position.copy(position); controls.target.copy(target); camera.lookAt(target); camera.updateMatrixWorld();
      pond.invalidate();
    }
    function focusLotus() {
      const p = options.current.layout.lotus;
      pose(new THREE.Vector3(p.x + 5.8 * LOTUS_SCALE, p.y + 3.3 * LOTUS_SCALE, p.z + 10.6 * LOTUS_SCALE), new THREE.Vector3(p.x, p.y + 1.15 * LOTUS_SCALE, p.z));
    }
    function overview() {
      const distance = 1100 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1);
      pose(new THREE.Vector3(0, Math.min(distance, 3400), .01), new THREE.Vector3());
    }
    function goTo(p) {
      if (!['x','y','z'].every(axis => Number.isFinite(p[axis]))) return;
      pose(new THREE.Vector3(p.x, p.y + 3, p.z + 12), new THREE.Vector3(p.x, p.y, p.z));
    }
    props.sceneRef.current = {
      startFlight: flight.start, focusLotus, overview, goTo,
      focusBoat: () => sailing.focus(), stopBoat: sailing.stop,
      returnBoat: () => { sailing.returnToLotus(options.current.layout.lotus); pond.invalidate(); },
      resetView: () => options.current.navigating ? sailing.focus() : focusLotus(),
      getPerformance: () => ({ fps: measuredFps, pixelRatio: renderer.getPixelRatio(), detailedLotuses: field.detailedCount,
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures, programs: renderer.info.programs.length, contextLost }),
      capture: () => { pond.invalidate(); renderer.info.reset(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    };
    const resize = () => {
      const { width, height } = el.getBoundingClientRect(); if (!width || !height) return;
      pixelCeiling = Math.min(maxPixelRatio, Math.sqrt(1600000 / (width * height)));
      renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), pixelCeiling));
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let editing = options.current.editing, navigating = options.current.navigating;
    if (navigating) sailing.focus(); else focusLotus();
    let frame, t = 0, last = performance.now(), opening = options.current.bloom, lastHud = 0;
    let sampleTime = 0, sampleFrames = 0, stableWindows = 0;
    const resetTiming = () => { last = performance.now(); sampleTime = 0; sampleFrames = 0; stableWindows = 0; };
    document.addEventListener('visibilitychange', resetTiming);
    const onContextLost = event => { event.preventDefault(); contextLost = true; options.current.onReady(false); saveEnergy(); };
    const onContextRestored = () => { contextLost = false; resetTiming(); pond.invalidate(); options.current.onReady(true); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    function animate(now) {
      frame = requestAnimationFrame(animate);
      const elapsed = (now - last) / 1000; last = now;
      if (document.hidden || contextLost) return;
      const dt = Math.min(elapsed, .05), o = options.current;
      if (o.editing !== editing || o.navigating !== navigating) {
        editing = o.editing; navigating = o.navigating;
        camera.fov = editing ? 65 : navigating ? 55 : 38; camera.updateProjectionMatrix();
        if (navigating) sailing.focus(); else if (!editing) focusLotus();
      }
      controls.enabled = !editing && !navigating && !o.suspended;
      flight.setEnabled(editing && !o.suspended);
      sailing.setEnabled(navigating && !o.suspended);
      const desiredDetail = navigating || editing ? 'medium' : 'high';
      if (desiredDetail !== originDetail) {
        lotus.dispose(); disposeMeshes(lotus.group); lotusAnchor.remove(lotus.group); originDetail = desiredDetail;
        lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE, { powerControlled: true, textureCache, detail: originDetail, pointLight: false }); lotusAnchor.add(lotus.group);
      }
      if (o.palette !== currentPalette) {
        lotus.dispose(); disposeMeshes(lotus.group); lotusAnchor.remove(lotus.group);
        energyLayout = null; currentPalette = o.palette; lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE, { powerControlled: true, textureCache, detail: originDetail, pointLight: false }); lotusAnchor.add(lotus.group); pond.invalidate();
        boat.lotusMount.remove(deckLotus.group); deckLotus.dispose(); disposeMeshes(deckLotus.group);
        boat.dispose(); disposeMeshes(boat.group); scene.remove(boat.group);
        boat = createSailboat(renderer, currentPalette, { textureCache }); scene.add(boat.group);
        deckLotus = createBoatLotus(renderer, currentPalette, { textureCache, detail: 'medium' }); boat.lotusMount.add(deckLotus.group);
      }
      if (o.playing) t += dt * o.speed;
      opening = THREE.MathUtils.damp(opening, o.bloom, 5, dt);
      lotusAnchor.position.set(o.layout.lotus.x, o.layout.lotus.y, o.layout.lotus.z);
      lotusAnchor.visible = o.layout.lotus.visible && camera.position.distanceToSquared(lotusAnchor.position) < 10000;
      if (energyLayout !== o.layout) {
        const definitions = [{ ...createWaterLotus({ ...o.layout.lotus, id: 'water-lotus', name: 'Loto de origen', palette: currentPalette }), y: o.layout.lotus.y }, ...(o.layout.lotuses || [])];
        const previous = new Map(waterLotuses.map(item => [item.id, item]));
        waterLotuses = definitions.map(definition => {
          const signature = JSON.stringify(definition);
          const old = previous.get(definition.id) || savedProgress.lotuses?.[definition.id];
          return { ...definition, signature, energy: old?.signature === signature && Number.isFinite(old.energy)
            ? Math.max(0, Math.min(definition.capacity, old.energy)) : definition.energy };
        });
        fieldLotuses = waterLotuses;
        energyLayout = o.layout;
      }
      const effectiveSpeed = chargedBoatSpeed(o.boatSpeed, resonance.energy / boatStats(resonance).capacity);
      sailing.update(dt, effectiveSpeed, o.playing && !o.suspended);
      const boatState = sailing.state;
      boat.group.position.x = boatState.position.x; boat.group.position.z = boatState.position.z;
      boat.group.rotation.y = boatState.heading;
      boat.update(t, boatState.velocity.length());
      const activeSeconds = o.playing && !o.suspended ? Math.max(0, elapsed) : 0;
      stepEnergy(resonance, waterLotuses, boatState.position, activeSeconds);
      const stats = boatStats(resonance), charge = resonance.energy / stats.capacity;
      const originPower = waterLotuses[0].energy / waterLotuses[0].capacity;
      originLight.position.copy(lotusAnchor.position); originLight.position.y += .9 * LOTUS_SCALE;
      originLight.color.set({ ember: '#ff692b', sakura: '#f6a0a4', moon: '#d1abe7' }[currentPalette]);
      originLight.intensity = o.layout.lotus.visible ? originPower * 18 * LOTUS_SCALE ** 2 : 0;
      lotus.setSaturation(originPower);
      if (lotusAnchor.visible) lotus.update(t, opening, originPower);
      dust.material.opacity = originPower * .65;
      field.update(fieldLotuses, camera, t, now, detailBudget, lotusAnchor.visible ? 'water-lotus' : null);
      const targetScale = stats.scale;
      deckLotus.group.scale.setScalar(THREE.MathUtils.damp(deckLotus.group.scale.x, targetScale, 3, dt));
      deckLotus.update(t, charge); boat.setEnergy(charge);
      deckLotus.getLinkPosition(linkTarget);
      const previousSource = resonance.linkPosition;
      if (previousSource) {
        const linked = waterLotuses.find(item => item.id === resonance.linkId);
        linkSource.set(previousSource.x, previousSource.y + .72 * (linked ? linked.diameter / LOTUS_REFERENCE_DIAMETER : LOTUS_SCALE), previousSource.z);
      }
      electricLink.update(t, previousSource ? (resonance.linkRole === 'taker' ? linkTarget : linkSource) : null,
        resonance.linkRole === 'taker' ? linkSource : linkTarget, resonance.linkOpacity);
      saveElapsed += activeSeconds;
      if (saveElapsed >= 5) { saveEnergy(); saveElapsed = 0; }
      wake.update(o.playing ? dt : 0, t, boatState, o.night, navigating && !o.suspended && o.playing);
      destinationMarker.visible = navigating && !!boatState.destination;
      if (boatState.destination) {
        destinationMarker.position.copy(boatState.destination);
        destinationMarker.scale.setScalar(1 + Math.sin(t * 3) * .08);
      }
      if (originPower > 1e-8) {
        dust.rotation.y = t * .012;
        leaves.children.forEach((leaf, index) => { leaf.position.y = WATER_LEVEL + .016 + Math.sin(t * .71 + index * .8) * .006; });
      }
      atmosphere.update(o.night, dt, t);
      // A readable underwater atmosphere for the two submerged construction levels.
      if (camera.position.y < WATER_LEVEL) { scene.fog.color.set('#092c3c'); scene.fog.density = .00065; }
      pond.update(t, o.night, dt, opening, o.layout.lotus);
      if (controls.enabled) controls.update(dt); else if (editing) flight.update(dt, o.flightSpeed);
      guides.update(o, camera);
      renderer.info.reset(); renderer.render(scene, camera);
      updateHover(now, o);
      if (now - lastHud > 250) {
        if (editing) o.onCameraPosition({ x: camera.position.x, y: camera.position.y, z: camera.position.z }); lastHud = now;
        if (navigating) o.onBoatState({ x: boatState.position.x, z: boatState.position.z, heading: boatState.heading,
          speed: o.playing && navigating ? boatState.velocity.length() : 0, distance: boatState.distance, maxSpeed: effectiveSpeed,
          energy: { charge, units: resonance.energy, capacity: stats.capacity, level: resonance.level,
            delivered: resonance.delivered, restored: resonance.restored, nextThreshold: BOAT_LEVELS[resonance.level]?.threshold,
            connected: !!resonance.linkId, role: resonance.linkRole, name: resonance.linkName,
            secondsRemaining: resonance.energy / (stats.capacity/stats.autonomy), autonomy: stats.autonomy,
            lotuses: waterLotuses.map(item => ({ id: item.id, name: item.name, energyRole: item.energyRole,
              energy: item.energy, capacity: item.capacity, x: item.x, z: item.z, size: item.size })) },
          destination: boatState.destination ? { x: boatState.destination.x, z: boatState.destination.z } : null });
      }
      if (elapsed > 0) { sampleTime += Math.min(elapsed, 1); sampleFrames++; }
      if (sampleTime >= 2) {
        const fps = sampleFrames / sampleTime; measuredFps = fps;
        const current = renderer.getPixelRatio(); let next = current;
        if (fps < 55) { next = Math.max(Math.min(.65, pixelCeiling), current - .15); if (fps < 35) detailBudget = 1; stableWindows = 0; }
        else if (fps > 58) { if (++stableWindows >= 3) { next = Math.min(pixelCeiling, current + .1); detailBudget = 3; stableWindows = 0; } }
        else stableWindows = 0;
        if (Math.abs(next - current) > .01) renderer.setPixelRatio(next);
        sampleTime = 0; sampleFrames = 0;
      }
    }
    frame = requestAnimationFrame(animate); options.current.onReady(true);
    return () => {
      saveEnergy();
      window.removeEventListener('pagehide', saveEnergy);
      field.dispose(); scene.remove(field.group);
      cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', resetTiming);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.domElement.removeEventListener('pointermove', moveHover);
      renderer.domElement.removeEventListener('pointerleave', clearHover);
      observer.disconnect(); sailing.dispose(); flight.dispose(); controls.dispose(); lotus.dispose(); deckLotus.dispose(); boat.dispose(); pond.dispose();
      disposeMeshes(scene); textureCache.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); props.sceneRef.current = null;
    };
  }, []);
  return <><div ref={host} className="garden-canvas"/><LotusTooltip hover={hover}/></>;
}
