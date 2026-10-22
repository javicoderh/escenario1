import * as THREE from 'three';
import { flightInput } from './world-layout.js';

export function createFreeCamera(camera, canvas, onStatus) {
  const keys = new Set(), rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  const right = new THREE.Vector3(), forward = new THREE.Vector3();
  let enabled = false, dragging = false, lastX = 0, lastY = 0;
  let targetFov = camera.fov;
  const locked = () => document.pointerLockElement === canvas;
  const clear = () => { keys.clear(); dragging = false; };
  const keydown = event => {
    if (!enabled || (!locked() && document.activeElement !== canvas)) return;
    if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ControlLeft','ControlRight','ShiftLeft','ShiftRight'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
    }
    if (event.code === 'Escape') { clear(); canvas.blur(); }
  };
  const keyup = event => keys.delete(event.code);
  const down = event => {
    if (!enabled || event.button !== 0) return;
    canvas.focus(); dragging = true; lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  const move = event => {
    if (!enabled || (!locked() && !dragging)) return;
    const dx = locked() ? event.movementX : event.clientX - lastX;
    const dy = locked() ? event.movementY : event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
    rotation.setFromQuaternion(camera.quaternion);
    rotation.y -= dx * .002;
    rotation.x = THREE.MathUtils.clamp(rotation.x - dy * .002, -Math.PI / 2 + .001, Math.PI / 2 - .001);
    camera.quaternion.setFromEuler(rotation);
  };
  const up = () => { dragging = false; };
  const wheel = event => {
    if (!enabled || event.ctrlKey) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (canvas.clientHeight || 800) : 1;
    const delta = THREE.MathUtils.clamp(event.deltaY * unit, -150, 150);
    targetFov = THREE.MathUtils.clamp(targetFov * Math.exp(delta * .0015), 18, 85);
  };
  const lockchange = () => { clear(); onStatus(locked() ? 'Vuelo activo · Esc para liberar el cursor' : 'Arrastra para mirar · clic en la escena para usar WASD'); };
  const lockerror = () => onStatus('Usa arrastrar para mirar y WASD con la escena enfocada.');
  const visibility = () => { if (document.hidden) clear(); };
  const start = () => {
    if (!enabled) return;
    canvas.focus();
    try { canvas.requestPointerLock?.()?.catch(lockerror); }
    catch { lockerror(); }
  };
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Escena 3D. Arrastra para mirar. Rueda del mouse para acercar o alejar. WASD para desplazarte, E y Q para subir y bajar. Escape libera el cursor.');
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', clear);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('blur', clear);
  canvas.addEventListener('dblclick', start);
  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', keyup);
  document.addEventListener('pointerlockchange', lockchange);
  document.addEventListener('pointerlockerror', lockerror);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', clear);
  return {
    start,
    setEnabled(value) {
      if (enabled === value) return;
      enabled = value; targetFov = camera.fov; clear();
      if (!value && locked()) document.exitPointerLock();
    },
    update(dt, speed) {
      if (!enabled) return;
      const fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt);
      if (Math.abs(fov - camera.fov) > .0001) { camera.fov = fov; camera.updateProjectionMatrix(); }
      if (!locked() && document.activeElement !== canvas) return;
      const input = flightInput(keys);
      const distance = speed * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 1);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
      forward.crossVectors(camera.up, right).normalize();
      camera.position.addScaledVector(right, input.x * distance).addScaledVector(forward, input.z * distance);
      camera.position.y += input.y * distance;
      // The camera can inspect the disk from outside; object coordinates stay inside it.
      camera.position.clamp(new THREE.Vector3(-5000, -500, -5000), new THREE.Vector3(5000, 3500, 5000));
    },
    dispose() {
      if (locked()) document.exitPointerLock();
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', clear);
      canvas.removeEventListener('lostpointercapture', up);
      canvas.removeEventListener('blur', clear);
      canvas.removeEventListener('dblclick', start);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('keyup', keyup);
      document.removeEventListener('pointerlockchange', lockchange);
      document.removeEventListener('pointerlockerror', lockerror);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', clear);
    },
  };
}
