import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaterLotus, createEnergyState, stepEnergy, boatStats, LOTUS_SIZES } from '../src/lotus-energy.js';
import { emptyLayout, parseLayout } from '../src/world-layout.js';
const position = { x:0, z:0 };
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-7, `${a} ≈ ${b}`);
test('giver conserves energy, respects range and pauses without time', () => {
  const giver = createWaterLotus({ capacity:200, regeneration:0, rate:10 });
  const state = createEnergyState();
  stepEnergy(state,[giver],{x:31,z:0},2); near(state.energy,0);
  stepEnergy(state,[giver],position,4); near(state.energy,40); near(giver.energy,160);
  const snapshot = structuredClone(state); stepEnergy(state,[giver],position,0); assert.deepEqual(state,snapshot);
  stepEnergy(state,[giver],position,20); near(state.energy,100); near(giver.energy,100); near(state.delivered,0);
});
test('takers retain partial energy, complete once and level up from deliveries', () => {
  const state = createEnergyState(); state.energy=100;
  const taker = createWaterLotus({energyRole:'taker',capacity:100,rate:10});
  stepEnergy(state,[taker],position,3); near(taker.energy,30); near(state.energy,70);
  stepEnergy(state,[taker],{x:40,z:0},1); near(taker.energy,30);
  state.energy=70; stepEnergy(state,[taker],position,7);
  near(taker.energy,100); near(state.delivered,100); assert.equal(state.level,2); assert.equal(state.restored,1);
  assert.equal(boatStats(state).autonomy,90);
  state.energy=140; stepEnergy(state,[taker],position,1); assert.equal(state.restored,1); near(state.delivered,100);
  stepEnergy(state,[],position,89); near(state.energy,0); assert.equal(state.level,2);
});
test('selection keeps current link, skips completed/hidden/submerged and regenerates idle givers', () => {
  const state=createEnergyState();state.energy=50;
  const first=createWaterLotus({id:'first',x:10,energyRole:'taker',capacity:100});
  stepEnergy(state,[first],position,1);
  const closer=createWaterLotus({id:'closer',energyRole:'taker',capacity:100});
  stepEnergy(state,[first,closer],position,1); assert.equal(state.linkId,'first'); near(closer.energy,0);
  first.visible=false; stepEnergy(state,[first,closer],position,1); assert.equal(state.linkId,'closer');
  const giver=createWaterLotus({energy:0,regeneration:2});
  stepEnergy(state,[giver],{x:100,z:0},2); near(giver.energy,4);
  giver.y=15; stepEnergy(state,[giver],position,1); assert.equal(state.linkId,null);
});
test('transfer is stable across frame rates and validates persisted prototypes', () => {
  for(const fps of [15,60,144]) {
    const state=createEnergyState();state.energy=100;
    const taker=createWaterLotus({energyRole:'taker',capacity:160,rate:5});
    for(let i=0;i<fps*10;i++) stepEnergy(state,[taker],position,1/fps);
    near(state.energy,50);near(taker.energy,50);
  }
  const layout=emptyLayout();layout.lotuses=Object.keys(LOTUS_SIZES).map((size,index)=>createWaterLotus({id:`l${index}`,size,energyRole:'taker'}));
  assert.deepEqual(parseLayout(JSON.parse(JSON.stringify(layout))),layout);
  layout.lotuses.push({...layout.lotuses[0]},null,{id:'bad',x:2000,y:0,z:0});
  assert.equal(parseLayout(layout).lotuses.length,6);
  const invalid=createWaterLotus({rate:-2,range:NaN,energy:Infinity,palette:'bad'});
  assert.ok(invalid.rate>0);assert.equal(invalid.range,30);assert.equal(invalid.palette,'ember');
});
