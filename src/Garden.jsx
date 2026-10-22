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
import { createResonanceState, nearestWaterLotus, stepResonance, POWER_TRANSITION_SECONDS, RESONANCE_RANGE } from './lotus-resonance.js';

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
    let lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE); lotusAnchor.add(lotus.group);
    let boat = createSailboat(renderer, currentPalette); scene.add(boat.group);
    let deckLotus = createBoatLotus(renderer, currentPalette); boat.lotusMount.add(deckLotus.group);
    const resonance = createResonanceState(), electricLink = createElectricLink(); scene.add(electricLink.group);
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
        currentPalette = o.palette; lotus = createLivingLotus(currentPalette, renderer, LOTUS_SCALE); lotusAnchor.add(lotus.group); pond.invalidate();
        boat.lotusMount.remove(deckLotus.group); deckLotus.dispose(); disposeMeshes(deckLotus.group);
        boat.dispose(); disposeMeshes(boat.group); scene.remove(boat.group);
        boat = createSailboat(renderer, currentPalette); scene.add(boat.group);
        deckLotus = createBoatLotus(renderer, currentPalette); boat.lotusMount.add(deckLotus.group);
      }
      if (o.playing) t += dt * o.speed;
      opening = THREE.MathUtils.damp(opening, o.bloom, 5, dt);
      lotusAnchor.position.set(o.layout.lotus.x, o.layout.lotus.y, o.layout.lotus.z);
      lotusAnchor.visible = o.layout.lotus.visible;
      if (lotusAnchor.visible) lotus.update(t, opening);
      sailing.update(dt, o.boatSpeed, o.playing);
      const boatState = sailing.state;
      boat.group.position.x = boatState.position.x; boat.group.position.z = boatState.position.z;
      boat.group.rotation.y = boatState.heading;
      boat.update(t, boatState.velocity.length());
      const sources = [{ id: 'water-lotus', role: 'water-lotus', visible: o.layout.lotus.visible,
        position: { x: o.layout.lotus.x, y: o.layout.lotus.y, z: o.layout.lotus.z } }];
      const source = nearestWaterLotus(boatState.position, sources);
      // Power is measured in real active seconds, independently of animation
      // speed and the frame-delta cap used for physical motion.
      stepResonance(resonance, o.playing && !o.suspended ? Math.max(0, elapsed) : 0, source);
      deckLotus.update(t, resonance.charge); boat.setEnergy(resonance.charge);
      deckLotus.getLinkPosition(linkTarget);
      const previousSource = resonance.sourcePosition;
      if (previousSource) linkSource.set(previousSource.x, previousSource.y + .72 * LOTUS_SCALE, previousSource.z);
      electricLink.update(t, previousSource ? linkSource : null, linkTarget, resonance.linkOpacity);
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
          energy: { charge: resonance.charge, connected: resonance.connected, distance: resonance.distance, range: RESONANCE_RANGE,
            secondsRemaining: resonance.charge === resonance.transitionTarget ? 0 : Math.max(0, POWER_TRANSITION_SECONDS - resonance.transitionElapsed) },
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
      cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', resetTiming);
      observer.disconnect(); sailing.dispose(); flight.dispose(); controls.dispose(); lotus.dispose(); deckLotus.dispose(); boat.dispose(); pond.dispose();
      disposeMeshes(scene); renderer.dispose(); el.removeChild(renderer.domElement); props.sceneRef.current = null;
    };
  }, []);
  return <div ref={host} className="garden-canvas"/>;
}
