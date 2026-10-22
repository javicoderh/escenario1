import * as THREE from 'three';
import { createLivingLotus } from './lotus.js';
import { LOTUS_SCALE, LOTUS_DIAMETER } from './lotus-scale.js';

export const DECK_LOTUS_RATIO = .7;
export const DECK_LOTUS_DIAMETER = LOTUS_DIAMETER * DECK_LOTUS_RATIO;

// A receiver entity attached to a vehicle socket. It owns its mesh, animation
// and light, while the separate resonance controller owns its energy state.
export function createBoatLotus(renderer, palette) {
  const scale = LOTUS_SCALE * DECK_LOTUS_RATIO;
  const group = new THREE.Group();
  group.name = 'Loto de cubierta — receptor';
  group.userData = { entityId: 'deck-lotus', entityType: 'lotus', role: 'receiver', diameter: DECK_LOTUS_DIAMETER };
  const flower = createLivingLotus(palette, renderer, scale, { powerControlled: true });
  flower.group.scale.setScalar(scale); group.add(flower.group);
  return {
    group,
    update(time, charge) { flower.setSaturation(charge); flower.update(time, .78, charge); group.userData.charge = charge; },
    getLinkPosition(target) {
      return flower.group.localToWorld(target.set(0, .72, 0));
    },
    dispose: flower.dispose,
  };
}
