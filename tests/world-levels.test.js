import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD_LEVELS } from '../src/world-levels.js';
import { seededPassages, nearbyPassages } from '../src/world-passages.js';
import { planPassage } from '../src/passage-travel.js';
import { seededLotuses,zoneAt } from '../src/world-zones.js';
import { buildWorldContent,parseWorldContent } from '../src/world-content.js';
import { emptyWorldProgress,parseWorldProgress,updateWorldProgress,placeStatus,nearbyCheckpoint } from '../src/world-progress.js';
import { discoverChart,isCharted } from '../src/world-discovery.js';
import { createBoatState,stepBoat,setBoatDestination,NAVIGATION_RADIUS } from '../src/boat-motion.js';
import { buildOrbPath,orbLanding } from '../src/illusory-orb.js';
import { createEnergyState,stepEnergy } from '../src/lotus-energy.js';
import { createPassageVisual,createLayerAtmosphere } from '../src/passage-visual.js';
import { disposeMeshes } from '../src/world-guides.js';

test('each zone has a connected, bidirectional chain between all five layers',()=>{
  const gates=seededPassages();assert.equal(gates.length,64);assert.equal(new Set(gates.map(point=>point.id)).size,64);
  for(let zoneId=1;zoneId<=8;zoneId++){
    const group=gates.filter(point=>point.zoneId===zoneId);assert.equal(group.length,8);
    for(const gate of group){
      assert.equal(zoneAt(gate).id,zoneId);assert.equal(Math.abs(gate.y-gate.destinationY),15);
      assert.ok(group.some(reverse=>reverse.x===gate.x&&reverse.z===gate.z&&reverse.y===gate.destinationY&&reverse.destinationY===gate.y));
    }
  }
  assert.equal(parseWorldContent(gates).length,64);
  assert.equal(parseWorldContent([{...gates[0],destinationY:30}]).length,0);
});

test('all passages have safe exits and can be discovered before their zone is revealed',()=>{
  const lotuses=seededLotuses(),content=buildWorldContent({lotuses});
  for(const gate of content.filter(point=>['cyclone','whirlpool'].includes(point.type))){
    const plan=planPassage(content,gate,gate.id,lotuses);
    assert.equal(plan.allowed,true);assert.equal(plan.landing.y,gate.destinationY);
    assert.ok(nearbyPassages(content,gate).some(point=>point.id===gate.id));
    const progress=updateWorldProgress(emptyWorldProgress(),content,lotuses,gate).progress;
    assert.equal(placeStatus(progress,gate),'visited');assert.deepEqual(progress.revealedZones,[]);
    assert.equal(nearbyPassages(content,{...gate,y:gate.y+1}).length,0);
  }
});

test('passages reject remote activation, pause, duplicate transitions and blocked exits without changing position',()=>{
  const gate=seededPassages()[0],position={...gate},content=[gate];
  for(const [p,options] of [[{...position,x:position.x+21},{}],[position,{paused:true}],[position,{transitioning:true}]])
    assert.equal(planPassage(content,p,gate.id,[],options).allowed,false);
  const blocker={x:gate.x,y:gate.destinationY,z:gate.z,visible:true,diameter:1000};
  assert.equal(planPassage(content,position,gate.id,[blocker]).allowed,false);
  assert.deepEqual(position,gate);
});

test('great lotus reveals access points on every layer while exploration stays on the current layer',()=>{
  const lotuses=seededLotuses(),content=buildWorldContent({lotuses});
  const gate=content.find(point=>point.type==='cyclone'&&point.y===15&&point.zoneId===1);
  let progress=updateWorldProgress(emptyWorldProgress(),content,lotuses,{...gate,y:0}).progress;
  assert.equal(placeStatus(progress,gate),'hidden','being below a gate does not discover it');
  const lotus=lotuses.find(point=>point.id==='zone-1-taker-1');lotus.energy=lotus.capacity;
  progress=updateWorldProgress(progress,content,lotuses,null,false).progress;
  assert.ok(content.filter(point=>point.zoneId===1&&point.available).every(point=>placeStatus(progress,point)!=='hidden'));
  assert.equal(placeStatus(progress,content.find(point=>point.zoneId===2&&point.type==='cyclone')),'hidden');
  assert.equal(nearbyCheckpoint(progress,content,{...lotus,y:15}),null,'sky players cannot use sea checkpoints through their level');
});

test('charted areas accumulate per layer, survive reload, and do not reveal untravelled teleport corridors',()=>{
  let progress=emptyWorldProgress();
  const start={x:50,y:0,z:-100},end={x:700,y:0,z:-500};
  progress=discoverChart(progress,start);assert.ok(progress.charted[0].length>0);
  assert.equal(isCharted(progress,start),true);assert.equal(isCharted(progress,{...start,y:15}),false);
  progress=discoverChart(progress,end);assert.equal(isCharted(progress,end),true);
  assert.equal(isCharted(progress,{x:400,y:0,z:-300}),false);
  const same=discoverChart(progress,end);assert.equal(same,progress);
  progress=discoverChart(progress,{...start,y:15});assert.equal(isCharted(progress,{...start,y:15}),true);
  assert.deepEqual(parseWorldProgress(JSON.parse(JSON.stringify(progress))),progress);
  assert.deepEqual(parseWorldProgress({version:1,charted:{0:[-1,0,0,399,400,'2'],15:[22],99:[1]}}).charted,{'0':[0,399],'15':[22]});
  assert.equal(discoverChart(progress,{...start,y:4}),progress);
});

test('horizontal navigation and collisions respect each layer without squeezing the circular map boundary',()=>{
  for(const {y} of WORLD_LEVELS){
    const state=createBoatState({x:0,z:0});state.position.set(NAVIGATION_RADIUS-1,y,0);
    setBoatDestination(state,{x:2000,z:2000});assert.equal(state.destination.y,y);
    for(let i=0;i<100;i++)stepBoat(state,{x:1,z:1},.05,12,[]);
    assert.equal(state.position.y,y);assert.ok(Math.hypot(state.position.x,state.position.z)<=NAVIGATION_RADIUS+1e-7);
    state.position.set(0,y,0);state.velocity.set(0,0,0);state.destination=null;
    const obstacle={x:5,y:0,z:0,diameter:2,visible:true};
    for(let i=0;i<100;i++)stepBoat(state,{x:1,z:0},.02,5,[obstacle]);
    if(y===0)assert.ok(state.position.x<2);else assert.ok(state.position.x>7);
  }
});

test('orb paths and landings retain the selected layer, and sea energy cannot link across layers',()=>{
  const lotuses=seededLotuses();
  for(const {y} of WORLD_LEVELS){
    const path=buildOrbPath({x:0,y,z:0},{x:300,z:0});assert.ok(path.points.every(point=>point.y===y));
    assert.equal(orbLanding({x:0,y,z:0},lotuses,y).y,y);
  }
  const state=createEnergyState();state.energy=50;
  const giver={...lotuses[0],x:0,z:0,energy:100,capacity:100,regeneration:0};
  stepEnergy(state,[giver],{x:0,y:15,z:0},1);assert.equal(state.linkId,null);assert.ok(state.energy<50);assert.equal(giver.energy,100);
});

test('passage visuals use finite geometry without lights and only show the active layer',()=>{
  const visual=createPassageVisual(),ambiance=createLayerAtmosphere(),content=buildWorldContent({lotuses:seededLotuses()});
  try{
    for(const {y} of WORLD_LEVELS){
      visual.update(content,new THREE.Vector3(0,y,0),3,true,y);ambiance.update(new THREE.Vector3(0,y,0),3,true);
      for(const entry of visual.group.children.filter(child=>child.visible))assert.ok(content.some(point=>point.id===entry.userData.id&&point.y===y));
      for(const root of [visual.group,ambiance.group])root.traverse(object=>{
        assert.equal(!!object.isLight,false);if(object.geometry)assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
      });
    }
  }finally{visual.dispose();disposeMeshes(ambiance.group);}
});
