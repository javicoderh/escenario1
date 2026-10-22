import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, seededLotuses, seedWorld, zoneAt } from '../src/world-zones.js';
import { emptyLayout, parseLayout, isValidPosition } from '../src/world-layout.js';
import { BOAT_LEVELS } from '../src/lotus-energy.js';

test('eight named sectors contain 160 unique valid lotuses with increasing supply and demand', () => {
  const lotuses = seededLotuses();
  assert.equal(lotuses.length, 160);
  assert.equal(new Set(lotuses.map(item => item.id)).size, 160);
  let supply = 0, demand = 0;
  for (const zone of ZONES) {
    const group = lotuses.filter(item => item.id.startsWith(`zone-${zone.id}-`));
    const givers = group.filter(item => item.energyRole === 'giver');
    const takers = group.filter(item => item.energyRole === 'taker');
    assert.equal(givers.length, zone.givers); assert.equal(takers.length, zone.takers);
    const nextSupply = givers.reduce((sum,item) => sum+item.capacity, 0);
    const nextDemand = takers.reduce((sum,item) => sum+item.capacity, 0);
    assert.ok(nextSupply > supply); assert.ok(nextDemand > demand);
    supply = nextSupply; demand = nextDemand;
    for (const item of group) {
      assert.ok(isValidPosition(item)); assert.equal(zoneAt(item).id, zone.id);
      assert.equal(item.energy, item.energyRole === 'giver' ? item.capacity : 0);
    }
  }
  assert.equal(BOAT_LEVELS.length, 8);
  assert.ok(BOAT_LEVELS.at(-1).capacity >= Math.max(...lotuses.filter(item => item.energyRole === 'taker').map(item => item.capacity)));
});

test('world migration preserves custom objects and saved edits without reseeding deleted lotuses', () => {
  const custom = { ...seededLotuses()[0], id:'custom', name:'Mi fuente' };
  const original = { ...emptyLayout(), lotuses:[custom] };
  const seeded = seedWorld(original);
  assert.equal(original.lotuses.length, 1);
  assert.equal(seeded.lotuses.length, 161);
  assert.deepEqual(seeded.lotuses[0],custom);
  seeded.lotuses.splice(1,1);
  const recovered = parseLayout(JSON.parse(JSON.stringify(seeded)));
  assert.equal(seedWorld(recovered).lotuses.length, 160);
  assert.deepEqual(recovered,seeded);
});

test('early routes have nearby sources and all sector angles map clockwise from north', () => {
  for(const zone of ZONES) {
    const angle=zone.angle+Math.PI/8;
    assert.equal(zoneAt({x:Math.sin(angle)*500,z:-Math.cos(angle)*500}).id,zone.id);
  }
  const lotuses=seededLotuses();
  const givers=lotuses.filter(item=>item.id.startsWith('zone-1-giver'));
  assert.ok(Math.hypot(givers[0].x,givers[0].z)-30 < 4*40);
  for(const taker of lotuses.filter(item=>item.id.startsWith('zone-1-taker'))) {
    assert.ok(givers.some(giver=>Math.hypot(giver.x-taker.x,giver.z-taker.z)<80));
  }
});
