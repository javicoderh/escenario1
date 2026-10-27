import * as THREE from 'three';
import { ORB_COOLDOWN, buildOrbPath, createOrbState, dismissOrb, launchOrb, orbLanding, orbSnapshot, senseLotuses, stepOrb } from './illusory-orb.js';
import { relocateBoat } from './boat-motion.js';

export function createOrbControls(camera, canvas, boat, onStatus, onTeleport, onChange = () => {}) {
  const state = createOrbState(), ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointer = new THREE.Vector2(), target = new THREE.Vector3();
  let enabled = false, playing = true, lotuses = [], gesture = null;
  const notify = () => onChange(orbSnapshot(state));
  function finishGesture() {
    const previous = gesture; gesture = null;
    if (previous && canvas.hasPointerCapture?.(previous.id)) canvas.releasePointerCapture(previous.id);
  }
  function cancelAim() {
    const changed = state.aiming;
    state.aiming = false; finishGesture();
    if (canvas.style) canvas.style.cursor = '';
    if (changed) notify();
  }
  function select() {
    if (!enabled || !playing) return;
    if (state.active) { onStatus('Orbe en vuelo · R para transportarte hasta él'); return; }
    if (state.cooldown > 0) { onStatus(`Orbe recargando · ${state.cooldown.toFixed(1)} s`); return; }
    if (state.aiming) { cancelAim(); onStatus('Apuntado cancelado'); return; }
    state.aiming = true;
    if (canvas.style) canvas.style.cursor = 'crosshair';
    notify(); onStatus('Haz clic o toca el escenario para lanzar el orbe · H cancela');
  }
  function teleport() {
    if (!enabled || !playing || !state.active) return false;
    const landing = orbLanding(state.position, lotuses,boat.position.y);
    if (!landing) { onStatus('Sin espacio para el velero junto al orbe · espera a que avance'); return false; }
    state.jaunt = { from: boat.position.clone(), to: landing.clone(), startedAt: state.time };
    const displacement = relocateBoat(boat, landing);
    state.boatSignal = senseLotuses(boat.position, lotuses);
    dismissOrb(state); onTeleport(displacement);
    notify(); onStatus(`Salto etéreo · recarga de ${ORB_COOLDOWN} s`);
    return true;
  }
  // Resolve the direction from the actual click, using the current camera and
  // boat position. Hovering and the skill button never choose a flight path.
  function launchAt(event) {
    if (!enabled || !playing || !state.aiming) return false;
    const rect = canvas.getBoundingClientRect();
    plane.constant = -(boat.position.y || 0);
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); ray.setFromCamera(pointer, camera);
    if (!ray.ray.intersectPlane(plane, target)) {
      onStatus('Apunta hacia tu nivel, debajo del horizonte'); return false;
    }
    if (Math.hypot(target.x - boat.position.x, target.z - boat.position.z) < .01) return false;
    if (!launchOrb(state, buildOrbPath(boat.position, target))) return false;
    if (canvas.style) canvas.style.cursor = '';
    notify(); onStatus('Orbe ilusorio en vuelo · pulsa el icono o R para transportarte');
    return true;
  }
  return {
    state, select, teleport, snapshot: () => orbSnapshot(state),
    activate() { if (state.active) return teleport(); select(); },
    dismiss() { const changed = state.aiming || state.active; cancelAim(); dismissOrb(state); if (changed) notify(); },
    setEnabled(value) { enabled = value; if (!value) cancelAim(); },
    cancelAim,
    keydown(event) {
      if (event.code === 'KeyH') {
        if (!state.aiming) return false;
        event.preventDefault(); cancelAim(); onStatus('Apuntado cancelado'); return true;
      }
      if (!['KeyT', 'KeyR'].includes(event.code)) return false;
      event.preventDefault();
      if (!event.repeat) { if (event.code === 'KeyT') select(); else teleport(); }
      return true;
    },
    pointermove(event) {
      if (gesture && event.pointerId === gesture.id && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) gesture.moved = true;
    },
    pointerdown(event) {
      if (!state.aiming) return false;
      event.preventDefault();
      if (event.button === 2) { cancelAim(); onStatus('Apuntado cancelado'); return true; }
      if (event.button !== 0 || !enabled || !playing || gesture) return true;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      canvas.setPointerCapture?.(event.pointerId);
      return true;
    },
    pointerup(event) {
      if (!gesture || event.pointerId !== gesture.id || event.button !== 0) return false;
      event.preventDefault();
      const click = !gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8;
      finishGesture();
      if (click) launchAt(event);
      return true;
    },
    pointercancel(event) {
      if (gesture && (!event || event.pointerId === gesture.id)) finishGesture();
    },
    update(seconds, active, flowers) {
      playing = active; lotuses = flowers;
      if (!active) finishGesture();
      if (active) {
        const wasFlying = state.active, wasCooling = state.cooldown > 0;
        stepOrb(state, seconds, flowers);
        state.boatSignal = senseLotuses(boat.position, flowers);
        if (state.active !== wasFlying || (state.cooldown > 0) !== wasCooling) notify();
      }
    },
  };
}
