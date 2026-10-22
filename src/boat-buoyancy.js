import { oceanHeight } from './ocean-waves.js';

export const BOAT_WATERLINE = .08;
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

// Four hull support points measure pitch/roll relative to the boat's heading.
// The center carries extra weight so short ripples do not throw the hull around.
export function sampleHullSupport(position, heading, time, result = {}, heightAt = oceanHeight) {
  const sin = Math.sin(heading), cos = Math.cos(heading), { x, z } = position;
  const bow = heightAt(x - sin * 1.65, z - cos * 1.65, time);
  const stern = heightAt(x + sin * 1.65, z + cos * 1.65, time);
  const starboard = heightAt(x + cos * .62, z - sin * .62, time);
  const port = heightAt(x - cos * .62, z + sin * .62, time);
  result.height = BOAT_WATERLINE + heightAt(x, z, time) * .4 + (bow + stern + starboard + port) * .15;
  result.pitch = clamp(Math.atan2(bow - stern, 3.3), .20);
  result.roll = clamp(Math.atan2(starboard - port, 1.24), .24);
  return result;
}

export function createBoatBuoyancy() {
  const pose = { height: BOAT_WATERLINE, pitch: 0, roll: 0 }, target = {};
  let initialized = false, lastX = 0, lastZ = 0;
  return {
    pose,
    update(position, heading, time, dt, speed = 0) {
      const snap = !initialized || Math.hypot(position.x - lastX, position.z - lastZ) > 10;
      if (!snap && !(dt > 0)) return pose;
      sampleHullSupport(position, heading, time, target);
      target.roll -= Math.min(Math.max(speed, 0) / 4.8, 1) * .025;
      const heave = snap ? 1 : 1 - Math.exp(-7 * dt);
      const tilt = snap ? 1 : 1 - Math.exp(-5 * dt);
      pose.height += (target.height - pose.height) * heave;
      pose.pitch += (target.pitch - pose.pitch) * tilt;
      pose.roll += (target.roll - pose.roll) * tilt;
      initialized = true; lastX = position.x; lastZ = position.z;
      return pose;
    },
  };
}
