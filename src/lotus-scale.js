import { WORLD_RADIUS } from './world-layout.js';

// Diameter of the circle centered on the flower that encloses its petals at
// time = 0 and full bloom. Animation subsequently varies the silhouette.
export const LOTUS_REFERENCE_DIAMETER = 6.720038634966844;
export const LOTUS_DIAMETER = WORLD_RADIUS * 2 / 1000;
export const LOTUS_SCALE = LOTUS_DIAMETER / LOTUS_REFERENCE_DIAMETER;
