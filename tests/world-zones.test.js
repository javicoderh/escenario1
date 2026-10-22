import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, seededLotuses, seedWorld, zoneAt } from '../src/world-zones.js';
import { emptyLayout, parseLayout, isValidPosition } from '../src/world-layout.js';
import { BOAT_LEVELS } from '../src/lotus-energy.js';

test('eight zones contain one huge objective each and 52 smaller varied givers', () => {
  const lotuses = seededLotuses();
  assert.equal(lotuses.length, 60);
  assert.equal(new Set(lotuses.map(item => item.id)).size, 60);
  let supply = 0, demand = 0;
  for (const zone of ZONES) {
    const group = lotuses.filter(item => item.id.startsWith(`zone-${zone.id}-`));
    const givers = group.filter(item => item.energyRole === 'giver');
    const takers = group.filter(item => item.energyRole === 'taker');
    assert.equal(givers.length, zone.givers); assert.equal(takers.length, zone.takers);
    assert.equal(takers.length,1); assert.equal(takers[0].size,'huge');
    assert.ok(givers.every(item=>item.diameter<takers[0].diameter && item.size!=='huge'));
    assert.ok(new Set(givers.map(item=>item.size)).size>=3);
    const nextSupply = givers.reduce((sum,item) => sum+item.capacity, 0);
    const nextDemand = takers.reduce((sum,item) => sum+item.capacity, 0);
    assert.ok(nextSupply > supply); assert.ok(nextDemand > demand);
    assert.ok(nextSupply >= nextDemand*1.5,'sources cover the objective plus travel losses');
    supply = nextSupply; demand = nextDemand;
    for (const item of group) {
      assert.ok(isValidPosition(item)); assert.equal(zoneAt(item).id, zone.id);
      assert.equal(item.energy, item.energyRole === 'giver' ? item.capacity : 0);
    }
  }
  assert.equal(BOAT_LEVELS.length, 8);
  assert.ok(demand > BOAT_LEVELS.at(-1).capacity,'later objectives require multiple deliveries');
});

test('world migration preserves custom objects and saved edits without reseeding deleted lotuses', () => {
  const custom = { ...seededLotuses()[0], id:'custom', name:'Mi fuente' };
  const original = { ...emptyLayout(), lotuses:[custom] };
  const seeded = seedWorld(original);
  assert.equal(original.lotuses.length, 1);
  assert.equal(seeded.lotuses.length, 61);
  assert.deepEqual(seeded.lotuses[0],custom);
  seeded.lotuses.splice(1,1);
  const recovered = parseLayout(JSON.parse(JSON.stringify(seeded)));
  assert.equal(seedWorld(recovered).lotuses.length, 60);
  assert.deepEqual(recovered,seeded);
});

test('version-one worlds replace the crowded seed and retain custom objects and boat-independent layout data', () => {
  const layout={...emptyLayout(),zonesVersion:1,lotuses:[
    {...seededLotuses()[0],id:'zone-1-taker-27',energyRole:'taker'},
    {...seededLotuses()[0],id:'custom',name:'Mi loto'},
  ]};
  const migrated=seedWorld(parseLayout(JSON.parse(JSON.stringify(layout))));
  assert.equal(migrated.zonesVersion,2);assert.equal(migrated.lotuses.length,61);
  assert.ok(migrated.lotuses.some(item=>item.id==='custom'));
  assert.ok(!migrated.lotuses.some(item=>item.id==='zone-1-taker-27'));
  assert.deepEqual(seedWorld(migrated),migrated);
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
