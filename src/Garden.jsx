import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLivingLotus } from './lotus.js';
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
import { LOTUS_REFERENCE_DIAMETER } from './lotus-scale.js';

export function Garden(props) {
  const host = useRef(), options = useRef(props); options.current = props;
  useEffect(() => {
    const el = host.current; let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { options.current.onReady(false); return; }
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(maxPixelRatio); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
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
    let currentPalette = options.current.palette;
    let lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE, { powerControlled: true }); lotusAnchor.add(lotus.group);
    let boat = createSailboat(renderer, currentPalette); scene.add(boat.group);
    let deckLotus = createBoatLotus(renderer, currentPalette); boat.lotusMount.add(deckLotus.group);
    const resonance = createEnergyState(), electricLink = createElectricLink(); scene.add(electricLink.group);
    const waterEntities = new Map();
    let energyLayout, waterLotuses = [], saveElapsed = 0;
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
      capture: () => { pond.invalidate(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    };
    const resize = () => {
      const { width, height } = el.getBoundingClientRect(); if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let editing = options.current.editing, navigating = options.current.navigating;
    if (navigating) sailing.focus(); else focusLotus();
    let frame, t = 0, last = performance.now(), opening = options.current.bloom, lastHud = 0;
    let sampleTime = 0, sampleFrames = 0, stableWindows = 0;
    const resetTiming = () => { last = performance.now(); sampleTime = 0; sampleFrames = 0; stableWindows = 0; };
    document.addEventListener('visibilitychange', resetTiming);
    function animate(now) {
      frame = requestAnimationFrame(animate);
      const elapsed = (now - last) / 1000; last = now;
      if (document.hidden) return;
      const dt = Math.min(elapsed, .05), o = options.current;
      if (o.editing !== editing || o.navigating !== navigating) {
        editing = o.editing; navigating = o.navigating;
        camera.fov = editing ? 65 : navigating ? 55 : 38; camera.updateProjectionMatrix();
        if (navigating) sailing.focus(); else if (!editing) focusLotus();
      }
      controls.enabled = !editing && !navigating && !o.suspended;
      flight.setEnabled(editing && !o.suspended);
      sailing.setEnabled(navigating && !o.suspended);
      if (o.palette !== currentPalette) {
        lotus.dispose(); disposeMeshes(lotus.group); lotusAnchor.remove(lotus.group);
        energyLayout = null; currentPalette = o.palette; lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE, { powerControlled: true }); lotusAnchor.add(lotus.group); pond.invalidate();
        boat.lotusMount.remove(deckLotus.group); deckLotus.dispose(); disposeMeshes(deckLotus.group);
        boat.dispose(); disposeMeshes(boat.group); scene.remove(boat.group);
        boat = createSailboat(renderer, currentPalette); scene.add(boat.group);
        deckLotus = createBoatLotus(renderer, currentPalette); boat.lotusMount.add(deckLotus.group);
      }
      if (o.playing) t += dt * o.speed;
      opening = THREE.MathUtils.damp(opening, o.bloom, 5, dt);
      lotusAnchor.position.set(o.layout.lotus.x, o.layout.lotus.y, o.layout.lotus.z);
      lotusAnchor.visible = o.layout.lotus.visible;
      if (energyLayout !== o.layout) {
        const definitions = [{ ...createWaterLotus({ ...o.layout.lotus, id: 'water-lotus', name: 'Loto de origen', palette: currentPalette }), y: o.layout.lotus.y }, ...(o.layout.lotuses || [])];
        const previous = new Map(waterLotuses.map(item => [item.id, item]));
        waterLotuses = definitions.map(definition => {
          const signature = JSON.stringify(definition);
          const old = previous.get(definition.id) || savedProgress.lotuses?.[definition.id];
          return { ...definition, signature, energy: old?.signature === signature && Number.isFinite(old.energy)
            ? Math.max(0, Math.min(definition.capacity, old.energy)) : definition.energy };
        });
        for (const [id, entity] of waterEntities) {
          if (!definitions.some(item => item.id === id && JSON.stringify(item) === entity.signature)) {
            entity.flower?.dispose(); disposeMeshes(entity.group); scene.remove(entity.group); waterEntities.delete(id);
          }
        }
        for (const definition of definitions.slice(1)) if (!waterEntities.has(definition.id)) {
          const scale = definition.diameter / LOTUS_REFERENCE_DIAMETER;
          const group = new THREE.Group(); group.scale.setScalar(scale); scene.add(group);
          const shape = new THREE.Shape();
          for (let i = 0; i <= 36; i++) {
            const angle = i / 36 * Math.PI * 2, radius = i % 2 ? 1.3 : 3.1;
            if (!i) shape.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
            else shape.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
          }
          const proxy = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({
            side: THREE.DoubleSide, roughness: .6, emissive: '#f9b65c', emissiveIntensity: 0,
          }));
          proxy.rotation.x = -Math.PI/2; proxy.position.y = .1; group.add(proxy);
          waterEntities.set(definition.id, { group, flower: null, proxy, scale, signature: JSON.stringify(definition) });
        }
        energyLayout = o.layout;
      }
      sailing.update(dt, o.boatSpeed, o.playing && !o.suspended);
      const boatState = sailing.state;
      boat.group.position.x = boatState.position.x; boat.group.position.z = boatState.position.z;
      boat.group.rotation.y = boatState.heading;
      boat.update(t, boatState.velocity.length());
      const activeSeconds = o.playing && !o.suspended ? Math.max(0, elapsed) : 0;
      stepEnergy(resonance, waterLotuses, boatState.position, activeSeconds);
      const stats = boatStats(resonance), charge = resonance.energy / stats.capacity;
      for (const item of waterLotuses) {
        const entity = item.id === 'water-lotus' ? { flower: lotus, group: lotusAnchor } : waterEntities.get(item.id);
        entity.group.position.set(item.x, item.y, item.z); entity.group.visible = item.visible;
        const fraction = item.energy / item.capacity;
        if (entity.proxy) {
          const distance = camera.position.distanceTo(entity.group.position);
          if (item.visible && distance < 110 && !entity.flower) {
            entity.flower = createLivingLotus(item.palette, renderer, entity.scale, { powerControlled: true });
            entity.group.add(entity.flower.group);
          } else if ((!item.visible || distance > 145) && entity.flower) {
            entity.flower.dispose(); disposeMeshes(entity.flower.group); entity.group.remove(entity.flower.group); entity.flower = null;
          }
          entity.proxy.visible = !entity.flower;
          entity.proxy.material.color.set('#b0b0b0').lerp(new THREE.Color({ ember: '#ef633e', sakura: '#eca3bd', moon: '#b7b1ee' }[item.palette]), fraction);
          entity.proxy.material.emissiveIntensity = fraction * .8;
        }
        if (entity.flower) {
          entity.flower.setSaturation(fraction);
          if (item.visible) entity.flower.update(t, item.id === 'water-lotus' ? opening : .85, fraction);
        }
        if (item.id === 'water-lotus') { dust.material.opacity = fraction * .65; }
      }
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
      if (saveElapsed >= 1) { saveEnergy(); saveElapsed = 0; }
      wake.update(o.playing ? dt : 0, t, boatState, o.night, navigating && !o.suspended && o.playing);
      destinationMarker.visible = navigating && !!boatState.destination;
      if (boatState.destination) {
        destinationMarker.position.copy(boatState.destination);
        destinationMarker.scale.setScalar(1 + Math.sin(t * 3) * .08);
      }
      dust.rotation.y = t * .012;
      leaves.children.forEach((leaf, index) => { leaf.position.y = WATER_LEVEL + .016 + Math.sin(t * .71 + index * .8) * .006; });
      atmosphere.update(o.night, dt, t);
      // A readable underwater atmosphere for the two submerged construction levels.
      if (camera.position.y < WATER_LEVEL) { scene.fog.color.set('#092c3c'); scene.fog.density = .00065; }
      pond.update(t, o.night, dt, opening, o.layout.lotus);
      if (controls.enabled) controls.update(dt); else if (editing) flight.update(dt, o.flightSpeed);
      guides.update(o, camera);
      renderer.render(scene, camera);
      if (now - lastHud > 150) {
        o.onCameraPosition({ x: camera.position.x, y: camera.position.y, z: camera.position.z }); lastHud = now;
        o.onBoatState({ x: boatState.position.x, z: boatState.position.z, heading: boatState.heading,
          speed: o.playing && navigating ? boatState.velocity.length() : 0, distance: boatState.distance,
          energy: { charge, units: resonance.energy, capacity: stats.capacity, level: resonance.level,
            delivered: resonance.delivered, restored: resonance.restored, nextThreshold: BOAT_LEVELS[resonance.level]?.threshold,
            connected: !!resonance.linkId, role: resonance.linkRole, name: resonance.linkName,
            secondsRemaining: resonance.energy / (stats.capacity/stats.autonomy), autonomy: stats.autonomy,
            lotuses: waterLotuses.map(item => ({ id: item.id, name: item.name, energyRole: item.energyRole,
              energy: item.energy, capacity: item.capacity, x: item.x, z: item.z, size: item.size })) },
          destination: boatState.destination ? { x: boatState.destination.x, z: boatState.destination.z } : null });
      }
      if (elapsed > 0 && elapsed < .25) { sampleTime += elapsed; sampleFrames++; }
      if (sampleTime >= 2) {
        const fps = sampleFrames / sampleTime, current = renderer.getPixelRatio(); let next = current;
        if (fps < 55) { next = Math.max(Math.min(1, maxPixelRatio), current - .15); stableWindows = 0; }
        else if (fps > 58) { if (++stableWindows >= 3) { next = Math.min(maxPixelRatio, current + .1); stableWindows = 0; } }
        else stableWindows = 0;
        if (Math.abs(next - current) > .01) renderer.setPixelRatio(next);
        sampleTime = 0; sampleFrames = 0;
      }
    }
    frame = requestAnimationFrame(animate); options.current.onReady(true);
    return () => {
      saveEnergy();
      window.removeEventListener('pagehide', saveEnergy);
      waterEntities.forEach(entity => entity.flower?.dispose());
      cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', resetTiming);
      observer.disconnect(); sailing.dispose(); flight.dispose(); controls.dispose(); lotus.dispose(); deckLotus.dispose(); boat.dispose(); pond.dispose();
      disposeMeshes(scene); renderer.dispose(); el.removeChild(renderer.domElement); props.sceneRef.current = null;
    };
  }, []);
  return <div ref={host} className="garden-canvas"/>;
}
