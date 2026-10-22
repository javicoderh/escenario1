import * as THREE from 'three';
import { createBoatState, setBoatDestination, stepBoat, BOAT_SPEED } from './boat-motion.js';

export function createSailingControls(camera, canvas, lotus, onStatus) {
  const state = createBoatState(lotus), keys = new Set();
  const raycaster = new THREE.Raycaster(), sea = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3(), mouse = new THREE.Vector2(), cameraTarget = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  let enabled = false, dragging = false, lastX = 0, lastY = 0, idleLook = 10;
  let yaw = state.heading + .25, pitch = .32, distance = 12, desiredDistance = 12;
  let surfaceHeight = 0, cameraHeight = 0;
  const clear = () => { keys.clear(); dragging = false; };
  const keydown = event => {
    if (!enabled || document.activeElement !== canvas) return;
    if (['KeyW','KeyA','KeyS','KeyD'].includes(event.code)) {
      if (!keys.size || state.destination) onStatus('Al timón · clic derecho para marcar otro destino');
      event.preventDefault(); keys.add(event.code);
    }
    if (event.code === 'Escape') { stop(); canvas.blur(); }
  };
  const keyup = event => keys.delete(event.code);
  function stop() {
    clear(); state.destination = null; state.velocity.set(0, 0, 0);
    onStatus('Velero detenido · WASD o clic derecho para navegar');
  }
  const down = event => {
    if (!enabled) return;
    canvas.focus();
    if (event.button === 2) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      camera.updateMatrixWorld(); raycaster.setFromCamera(mouse, camera);
      if (raycaster.ray.intersectPlane(sea, hit)) { setBoatDestination(state, hit); onStatus('Navegando al destino · WASD para tomar el timón'); }
      else onStatus('Marca un destino sobre el agua, debajo del horizonte.');
      return;
    }
    if (event.button === 0) { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); }
  };
  const move = event => {
    if (!enabled || !dragging) return;
    yaw -= (event.clientX - lastX) * .006;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * .004, .2, 1.2);
    lastX = event.clientX; lastY = event.clientY; idleLook = 0;
  };
  const up = () => { dragging = false; };
  const context = event => { if (enabled) event.preventDefault(); };
  const wheel = event => {
    if (!enabled || event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (canvas.clientHeight || 800) : 1;
    desiredDistance = THREE.MathUtils.clamp(desiredDistance * Math.exp(THREE.MathUtils.clamp(event.deltaY * unit, -150, 150) * .0015), 7, 32);
  };
  const visibility = () => { if (document.hidden) stop(); };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('contextmenu', context);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('blur', clear);
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', stop);
  function updateCamera(dt, snap = false) {
    idleLook += dt;
    // Keep the camera-relative input basis stable while a key is held;
    // otherwise backward/sideways input and automatic yaw form a spiral.
    if (!dragging && !keys.size && idleLook > 2.5 && state.velocity.lengthSq() > .02) {
      const difference = Math.atan2(Math.sin(state.heading - yaw), Math.cos(state.heading - yaw));
      yaw += difference * (1 - Math.exp(-1.8 * dt));
    }
    distance = THREE.MathUtils.damp(distance, desiredDistance, 10, dt);
    cameraHeight = snap ? surfaceHeight * .65 : THREE.MathUtils.damp(cameraHeight, surfaceHeight * .65, 3, dt);
    cameraTarget.set(state.position.x, 1.6 + cameraHeight, state.position.z);
    desiredCamera.set(state.position.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      1.6 + cameraHeight + Math.sin(pitch) * distance, state.position.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    if (snap) camera.position.copy(desiredCamera); else camera.position.lerp(desiredCamera, 1 - Math.exp(-7 * dt));
    camera.lookAt(cameraTarget); camera.updateMatrixWorld();
  }
  return {
    state, stop,
    setSurfaceHeight(height) { surfaceHeight = height; },
    focus() { yaw = state.heading + .25; pitch = .32; idleLook = 0; updateCamera(1, true); },
    returnToLotus(point) {
      const initial = createBoatState(point); Object.assign(state, initial); stop(); this.focus();
    },
    setEnabled(value) { if (value === enabled) return; enabled = value; stop(); },
    update(dt, speed = BOAT_SPEED, playing = true) {
      if (!enabled) return;
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const sideways = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const input = { x: -Math.sin(yaw) * forward + Math.cos(yaw) * sideways,
        z: -Math.cos(yaw) * forward - Math.sin(yaw) * sideways };
      const hadDestination = !!state.destination;
      if (playing) stepBoat(state, input, dt, speed);
      if (hadDestination && !state.destination && !forward && !sideways) onStatus('Destino alcanzado · el mar espera tu siguiente rumbo');
      updateCamera(dt);
    },
    dispose() {
      stop();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up); canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('blur', clear);
      document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', stop);
    },
  };
}
