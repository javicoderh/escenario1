import * as THREE from 'three';
import { createBoatState, setBoatDestination, stepBoat, relocateBoat, BOAT_SPEED } from './boat-motion.js';
import { createOrbControls } from './orb-controls.js';

export const TELEPORT_CAMERA_SPEED = 130;

export function createSailingControls(camera, canvas, lotus, onStatus, onOrbChange) {
  const state = createBoatState(lotus), keys = new Set();
  const raycaster = new THREE.Raycaster(), sea = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3(), mouse = new THREE.Vector2(), cameraTarget = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  let enabled = false, dragging = false, lastX = 0, lastY = 0, idleLook = 10;
  let yaw = state.heading + .25, pitch = .32, distance = 12, desiredDistance = 12;
  let surfaceHeight = 0, cameraHeight = 0, cameraTransfer = null;
  const followTarget = new THREE.Vector3();
  const helm = new THREE.Vector2();
  let lookGesture = null, sailingActive = true, preservedMovement = false;
  function startCameraTransfer(displacement) {
    keys.clear(); helm.set(0, 0); dragging = false; lookGesture = null;
    const offset = displacement.clone().negate();
    if (cameraTransfer) offset.add(cameraTransfer.offset);
    const length = offset.length(), duration = Math.max(.45, length / TELEPORT_CAMERA_SPEED + .28);
    const ramp = Math.min(.28, duration / 2);
    cameraTransfer = { offset, initialOffset: offset.clone(), elapsed: 0,
      length, duration, ramp, speed: length / (duration - ramp) };
  }
  const orb = createOrbControls(camera, canvas, state, onStatus, startCameraTransfer, onOrbChange);
  const clear = () => { keys.clear(); helm.set(0, 0); dragging = false; lookGesture = null; orb.cancelAim(); };
  const keydown = event => {
    if (!enabled || document.activeElement !== canvas) return;
    if(state.transit){if(event.code==='Escape')stop();event.preventDefault();return;}
    if (orb.keydown(event)) { dragging = false; lookGesture = null; return; }
    if (['KeyW','KeyA','KeyS','KeyD'].includes(event.code)) {
      if (!keys.size || state.destination) onStatus('Al timón · clic derecho para marcar otro destino');
      event.preventDefault(); keys.add(event.code);
    }
    if (event.code === 'Escape') { stop(); canvas.blur(); }
  };
  const keyup = event => keys.delete(event.code);
  function stop() {
    clear(); state.destination = null; state.velocity.set(0, 0, 0);
    onStatus('Velero detenido · marca un destino o usa el timón');
  }
  function navigateTo(point) {
    if (!enabled || !sailingActive || state.transit) return false;
    clear(); setBoatDestination(state, point);
    onStatus('Navegando al destino · usa el timón para cambiar el rumbo');
    return true;
  }
  function navigateAtPointer(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); raycaster.setFromCamera(mouse, camera);
    sea.constant=-(state.position.y || 0);
    if (raycaster.ray.intersectPlane(sea, hit)) navigateTo(hit);
    else onStatus('Marca un destino en tu nivel, debajo del horizonte.');
  }
  const down = event => {
    if (!enabled) return;
    if(state.transit){event.preventDefault();return;}
    canvas.focus();
    if (lookGesture) { lookGesture.moved = true; return; }
    if (orb.pointerdown(event)) { dragging = false; return; }
    if (event.button === 2) {
      event.preventDefault();
      navigateAtPointer(event);
      return;
    }
    if (event.button === 0) {
      dragging = true; lastX = event.clientX; lastY = event.clientY;
      lookGesture = { id: event.pointerId, touch: event.pointerType === 'touch', x: lastX, y: lastY, moved: false };
      canvas.setPointerCapture(event.pointerId);
    }
  };
  const move = event => {
    if (enabled) orb.pointermove(event);
    if (!enabled || !dragging || event.pointerId !== lookGesture?.id) return;
    if (Math.hypot(event.clientX - lookGesture.x, event.clientY - lookGesture.y) > 8) lookGesture.moved = true;
    if (lookGesture.touch && !lookGesture.moved) return;
    yaw -= (event.clientX - lastX) * .006;
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * .004, .2, 1.2);
    lastX = event.clientX; lastY = event.clientY; idleLook = 0;
  };
  const up = event => {
    if (orb.pointerup(event)) return;
    if (event.pointerId !== lookGesture?.id) return;
    const tap = lookGesture.touch && !lookGesture.moved && Math.hypot(event.clientX - lookGesture.x, event.clientY - lookGesture.y) <= 8;
    dragging = false; lookGesture = null;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (tap) navigateAtPointer(event);
  };
  const cancelPointer = event => {
    if (event.pointerId === lookGesture?.id) { dragging = false; lookGesture = null; }
    orb.pointercancel(event);
  };
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
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('contextmenu', context);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('blur', clear);
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', stop);
  function updateCamera(dt, snap = false) {
    idleLook += dt;
    // Keep the camera-relative input basis stable while a key is held;
    // otherwise backward/sideways input and automatic yaw form a spiral.
    if (!dragging && !orb.state.aiming && !keys.size && !helm.lengthSq() && idleLook > 2.5 && state.velocity.lengthSq() > .02) {
      const difference = Math.atan2(Math.sin(state.heading - yaw), Math.cos(state.heading - yaw));
      yaw += difference * (1 - Math.exp(-1.8 * dt));
    }
    distance = THREE.MathUtils.damp(distance, desiredDistance, 10, dt);
    cameraHeight = snap ? surfaceHeight * .65 : THREE.MathUtils.damp(cameraHeight, surfaceHeight * .65, 3, dt);
    followTarget.set(state.position.x, state.position.y + 1.6 + cameraHeight, state.position.z);
    desiredCamera.set(state.position.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      state.position.y + 1.6 + cameraHeight + Math.sin(pitch) * distance, state.position.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    if (snap) {
      cameraTransfer = null; camera.position.copy(desiredCamera); cameraTarget.copy(followTarget);
    } else if (cameraTransfer) {
      // Continue ordinary follow in the destination frame, then apply the same
      // decaying translation to the camera and its look target. Independent
      // interpolation can let the target cross the camera and flip the view.
      camera.position.sub(cameraTransfer.offset);
      camera.position.lerp(desiredCamera, 1 - Math.exp(-7 * dt));
      cameraTarget.copy(followTarget);
      cameraTransfer.elapsed = Math.min(cameraTransfer.duration, cameraTransfer.elapsed + dt);
      const { elapsed, duration, ramp, speed, length } = cameraTransfer;
      // Integrating smoothstep velocity gives short, continuous ramps and a
      // steady cruise. Position, velocity and acceleration match at each join.
      const rampDistance = u => speed * ramp * (u * u * u - .5 * u * u * u * u);
      const travelled = elapsed < ramp ? rampDistance(elapsed / ramp)
        : elapsed > duration - ramp ? length - rampDistance((duration - elapsed) / ramp)
        : speed * (elapsed - ramp / 2);
      const progress = length > 1e-8 ? THREE.MathUtils.clamp(travelled / length, 0, 1) : 1;
      cameraTransfer.offset.copy(cameraTransfer.initialOffset).multiplyScalar(1 - progress);
      camera.position.add(cameraTransfer.offset); cameraTarget.add(cameraTransfer.offset);
      if (elapsed >= duration) cameraTransfer = null;
    } else {
      camera.position.lerp(desiredCamera, 1 - Math.exp(-7 * dt)); cameraTarget.copy(followTarget);
    }
    camera.lookAt(cameraTarget); camera.updateMatrixWorld();
  }
  return {
    state, stop, orb, navigateTo,
    transitionTo(landing) {
      if(state.transit)return false;
      stop();orb.dismiss();cameraTransfer=null;
      state.transit={from:state.position.clone(),to:landing.clone(),elapsed:0,duration:2.4};
      return true;
    },
    transferTo(landing) {
      clear(); orb.dismiss();
      orb.state.jaunt = { from: state.position.clone(), to: landing.clone(), startedAt: orb.state.time };
      startCameraTransfer(relocateBoat(state, landing));
    },
    setHelm(x, y) {
      if (!enabled || !sailingActive || state.transit || !Number.isFinite(x) || !Number.isFinite(y)) { helm.set(0, 0); return; }
      helm.set(x, y).clampLength(0, 1);
      if (helm.lengthSq()) { orb.cancelAim(); state.destination = null; keys.clear(); }
    },
    zoom(factor) { desiredDistance = THREE.MathUtils.clamp(desiredDistance * factor, 7, 32); },
    getCameraState() { return { position: camera.position.toArray(), target: cameraTarget.toArray(),
      rotation: camera.quaternion.toArray(), transferring: !!cameraTransfer }; },
    selectOrb() { if(state.transit)return;canvas.focus(); dragging = false; lookGesture = null; orb.select(); },
    activateOrb() { if(state.transit)return;canvas.focus(); helm.set(0, 0); dragging = false; lookGesture = null; orb.activate(); },
    cancelOrb() { orb.cancelAim(); onStatus('Apuntado cancelado'); },
    teleportToOrb() { if(state.transit)return false;canvas.focus(); return orb.teleport(); },
    setSurfaceHeight(height) { surfaceHeight = height - state.position.y; },
    focus() { yaw = state.heading + .25; pitch = .32; idleLook = 0; updateCamera(1, true); },
    returnToLotus(point) {
      orb.dismiss();
      const initial = createBoatState(point); Object.assign(state, initial); stop(); this.focus();
    },
    setEnabled(value, { preserveMovement = false } = {}) {
      if (value === enabled) return;
      enabled = value;
      if ((!value && preserveMovement) || (value && preservedMovement)) clear(); else stop();
      preservedMovement = !value && preserveMovement;
      orb.setEnabled(value);
    },
    update(dt, speed = BOAT_SPEED, playing = true, lotuses = [], activeSeconds = dt) {
      sailingActive = playing;
      if (!playing) { helm.set(0, 0); dragging = false; lookGesture = null; }
      orb.update(activeSeconds, playing, lotuses);
      if (!enabled) return;
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS')) - helm.y;
      const sideways = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + helm.x;
      const input = { x: -Math.sin(yaw) * forward + Math.cos(yaw) * sideways,
        z: -Math.cos(yaw) * forward - Math.sin(yaw) * sideways };
      const hadDestination = !!state.destination;
      const manualSpeed = helm.lengthSq() && !keys.size ? speed * helm.length() : speed;
      if (playing && state.transit) {
        const transit=state.transit;transit.elapsed=Math.min(transit.duration,transit.elapsed+dt);
        const u=transit.elapsed/transit.duration,s=u*u*(3-2*u);
        state.position.copy(transit.from).lerp(transit.to,s);
        if(u>=1){state.position.copy(transit.to);state.transit=null;}
      } else if (playing) stepBoat(state, input, dt, manualSpeed, lotuses);
      if (hadDestination && !state.destination && !forward && !sideways) onStatus(state.blocked
        ? 'Un loto bloquea el rumbo · marca otro destino o usa el timón para rodearlo'
        : 'Destino alcanzado · el mar espera tu siguiente rumbo');
      updateCamera(dt);
    },
    dispose() {
      stop();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('lostpointercapture', cancelPointer); canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('blur', clear);
      document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', stop);
    },
  };
}
