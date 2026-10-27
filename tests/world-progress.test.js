import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, seededLotuses, zoneAt } from '../src/world-zones.js';
import { buildWorldContent, CONTENT_TYPES, parseWorldContent } from '../src/world-content.js';
import { emptyLayout, parseLayout } from '../src/world-layout.js';
import { BOAT_RADIUS, createBoatState } from '../src/boat-motion.js';
import { emptyWorldProgress, parseWorldProgress, updateWorldProgress, placeStatus, visibleWorldContent,
  markPlace, readWorldProgress, saveWorldProgress, checkpointTravelStatus } from '../src/world-progress.js';
import { planCheckpointTravel } from '../src/checkpoint-travel.js';
import { createCheckpointVisual } from '../src/checkpoint-visual.js';
import { disposeMeshes } from '../src/world-guides.js';

const place = (values={}) => ({ id:'zone-1-dungeon-01', zoneId:1, type:'dungeon', name:'Cueva de prueba',
  x:140,y:0,z:-200, reveal:'zone',available:true,discoveryRadius:35,visitRadius:12,radius:20,...values });
function world(points=[]) {
  const lotuses=seededLotuses();
  return {lotuses,content:buildWorldContent({...emptyLayout(),lotuses,pointsOfInterest:points})};
}

test('zone identities and onboarding are stable while existing world coordinates survive',()=>{
  assert.deepEqual(ZONES.map(zone=>zone.id),[1,2,3,4,5,6,7,8]);
  assert.equal(zoneAt(createBoatState(emptyLayout().lotus).position).id,1);
  const old={...emptyLayout(),lotus:{x:0,y:0,z:0,visible:true}};
  assert.deepEqual(parseLayout(old).lotus,old.lotus);
});

test('catalog validates all content types, sector assignments, duplicate IDs, and preserves editor anchors',()=>{
  const points=Object.keys(CONTENT_TYPES).filter(type=>type!=='great-lotus').map((type,i)=>place({id:`zone-1-place-${i}`,type,...(['cyclone','whirlpool'].includes(type)?{destinationY:type==='cyclone'?15:-15}:{})}));
  assert.equal(parseWorldContent(points).length,7);
  assert.equal(parseWorldContent([points[0],points[0],place({id:'constructor'}),place({zoneId:8}),place({x:9999}),place({y:2}),null]).length,1);
  const layout={...emptyLayout(),pointsOfInterest:points,markers:[{id:'anchor',name:'Referencia',x:0,y:0,z:0,kind:'anchor'}]};
  const recovered=parseLayout(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(recovered.pointsOfInterest,points);
  assert.equal(buildWorldContent(recovered).some(point=>point.id==='anchor'),false);
});

test('only actual visible sea-level great lotuses become checkpoints; reserved islands are hidden',()=>{
  const {lotuses}=world();
  lotuses.find(item=>item.id==='zone-2-taker-1').visible=false;
  lotuses.find(item=>item.id==='zone-3-taker-1').y=15;
  const content=buildWorldContent({...emptyLayout(),lotuses});
  assert.equal(content.filter(point=>point.type==='great-lotus').length,6);
  assert.equal(visibleWorldContent(emptyWorldProgress(),content).some(point=>point.id==='zone-1-island-tutorial'),false);
});

test('restoring a great lotus reveals exactly its zone and checkpoint once without visiting/completing its destinations',()=>{
  const dungeon=place(),other=place({id:'zone-2-quest-01',zoneId:2,x:250,z:-100,type:'quest'});
  const {content,lotuses}=world([dungeon,other]);
  const initial=emptyWorldProgress(),lotus=lotuses.find(item=>item.id==='zone-1-taker-1');
  lotus.energy=lotus.capacity-.01;
  assert.equal(updateWorldProgress(initial,content,lotuses,null).progress,initial);
  lotus.energy=lotus.capacity;
  const result=updateWorldProgress(initial,content,lotuses,null);
  assert.deepEqual(result.unlocked,[1]);assert.deepEqual(result.progress.checkpoints,[lotus.id]);
  assert.equal(placeStatus(result.progress,dungeon),'revealed');assert.equal(placeStatus(result.progress,other),'hidden');
  assert.deepEqual(result.progress.places,{});
  assert.equal(updateWorldProgress(result.progress,content,lotuses,null).progress,result.progress);
  lotus.energy=0;
  assert.equal(updateWorldProgress(result.progress,content,lotuses,null).progress,result.progress);
  assert.deepEqual(initial,emptyWorldProgress(),'progress operations do not mutate their input');
});

test('exploration reveals and visits individual points while secrets ignore general zone reveal',()=>{
  const secret=place({id:'zone-1-treasure-secret',type:'treasure',reveal:'secret'});
  const {content,lotuses}=world([secret]);lotuses.find(item=>item.id==='zone-1-taker-1').energy=160;
  let progress=updateWorldProgress(emptyWorldProgress(),content,lotuses,null).progress;
  assert.equal(placeStatus(progress,secret),'hidden');
  assert.equal(updateWorldProgress(progress,content,lotuses,{x:secret.x,y:50,z:secret.z}).progress,progress);
  progress=updateWorldProgress(progress,content,lotuses,{x:secret.x+25,y:0,z:secret.z}).progress;
  assert.equal(placeStatus(progress,secret),'revealed');
  progress=updateWorldProgress(progress,content,lotuses,secret).progress;
  assert.equal(placeStatus(progress,secret),'visited');
  progress=markPlace(progress,secret.id,'completed');
  assert.equal(placeStatus(updateWorldProgress(progress,content,lotuses,secret).progress,secret),'completed');
  assert.equal(placeStatus(progress,{...secret,available:false}),'hidden');
});

test('old completed objectives migrate by ID, not the restored counter, and are idempotent after reload',()=>{
  const {content,lotuses}=world();
  for(const id of [2,7]){const lotus=lotuses.find(item=>item.id===`zone-${id}-taker-1`);lotus.energy=lotus.capacity;}
  const result=updateWorldProgress(emptyWorldProgress(),content,lotuses,null,false);
  assert.deepEqual(result.progress.revealedZones,[2,7]);
  const recovered=parseWorldProgress(JSON.parse(JSON.stringify(result.progress)));
  assert.deepEqual(updateWorldProgress(recovered,content,lotuses,null,false).unlocked,[]);
});

test('malformed storage is tolerated, valid unknown place IDs survive, and blocked storage reports failure',()=>{
  assert.deepEqual(parseWorldProgress({version:3}),emptyWorldProgress());
  assert.deepEqual(readWorldProgress({getItem:()=>'{broken'}),emptyWorldProgress());
  const value=JSON.parse('{"version":1,"revealedZones":[1,99,1],"checkpoints":["zone-2-taker-1","bad",3],"places":{"zone-8-future":"visited","constructor":"completed","__proto__":"completed","zone-1-bad":"bad"},"lastCheckpoint":"bad"}');
  const parsed=parseWorldProgress(value);
  assert.deepEqual(parsed.revealedZones,[1,2]);assert.deepEqual(parsed.places,{'zone-8-future':'visited'});
  assert.equal(parsed.lastCheckpoint,null);
  let saved;const storage={setItem:(key,value)=>{saved=value;},getItem:()=>saved};
  assert.equal(saveWorldProgress(parsed,storage),true);assert.deepEqual(readWorldProgress(storage),parsed);
  assert.equal(saveWorldProgress(parsed,{setItem:()=>{throw Error('blocked');}}),false);
});

test('travel requires an active origin and destination, proximity, unpaused state and no combat',()=>{
  const {content}=world(),origin=content[0],destination=content[1];
  const progress={...emptyWorldProgress(),checkpoints:[origin.id,destination.id]};
  assert.equal(checkpointTravelStatus(progress,content,origin,destination.id).allowed,true);
  for(const [position,id,options] of [[origin,origin.id,{}],[{x:0,z:900},destination.id,{}],[origin,content[2].id,{}],
    [origin,destination.id,{paused:true}],[origin,destination.id,{inCombat:true}]])
    assert.equal(checkpointTravelStatus(progress,content,position,id,options).allowed,false);
});

test('all eight checkpoint destinations have collision-free landings within interaction range',()=>{
  const {content,lotuses}=world();const checkpoints=content.filter(point=>point.type==='great-lotus');
  const progress={...emptyWorldProgress(),checkpoints:checkpoints.map(point=>point.id)};
  for(const destination of checkpoints){
    const origin=checkpoints.find(point=>point.id!==destination.id);
    const result=planCheckpointTravel(progress,content,origin,destination.id,lotuses);
    assert.equal(result.allowed,true);
    assert.ok(Math.hypot(result.landing.x-destination.x,result.landing.z-destination.z)<=30);
    assert.equal(result.landing.y,0);
    for(const lotus of lotuses) assert.ok(Math.hypot(result.landing.x-lotus.x,result.landing.z-lotus.z)>=BOAT_RADIUS+lotus.diameter/2);
  }
});

test('blocked checkpoint rejects travel without changing input state; deleted destinations are unavailable',()=>{
  const {content,lotuses}=world(),origin=content[0],destination=content[1];
  const progress={...emptyWorldProgress(),checkpoints:[origin.id,destination.id]};
  const before=JSON.stringify(progress);
  const blocker={...lotuses[0],id:'blocker',x:destination.x,z:destination.z,diameter:1000};
  assert.equal(planCheckpointTravel(progress,content,origin,destination.id,[...lotuses,blocker]).allowed,false);
  assert.equal(JSON.stringify(progress),before);
  assert.equal(planCheckpointTravel(progress,content.filter(point=>point.id!==destination.id),origin,destination.id,lotuses).allowed,false);
});

test('checkpoint visuals stay finite, follow the water, and only show permanently activated nodes',()=>{
  const visual=createCheckpointVisual(),{content}=world();
  try{
    visual.update(emptyWorldProgress(),content,0,true);assert.ok(visual.group.children.every(child=>!child.visible));
    visual.update({...emptyWorldProgress(),checkpoints:[content[0].id]},content,2,true);
    assert.equal(visual.group.children.filter(child=>child.visible).length,1);
    visual.group.traverse(child=>{assert.equal(!!child.isLight,false);if(child.geometry)assert.ok(child.geometry.attributes.position.array.every(Number.isFinite));});
  }finally{disposeMeshes(visual.group);}
});
