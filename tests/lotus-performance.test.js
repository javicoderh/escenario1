import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLivingLotus, createLotusTextureCache } from '../src/lotus.js';
import { createLotusField, selectDetailedLotuses, MAX_DETAILED_LOTUSES } from '../src/lotus-field.js';
import { seededLotuses } from '../src/world-zones.js';
import { disposeMeshes } from '../src/world-guides.js';

const renderer = { capabilities:{getMaxAnisotropy:()=>1} };
function canvasDocument() {
  const context={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},createRadialGradient:()=>({addColorStop(){}})};
  return {createElement:()=>({getContext:()=>context})};
}
function countTriangles(group) {
  let count=0;
  group.traverse(object=>{if(object.isMesh) count+=(object.geometry.index?.count || object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);});
  return count;
}

test('world detail reduces triangles by at least 70% and shares textures safely', () => {
  const previous=globalThis.document; globalThis.document=canvasDocument();
  const cache=createLotusTextureCache(), flowers=[];
  try {
    const high=createLivingLotus('ember',renderer,1,{textureCache:cache});flowers.push(high);
    const medium=createLivingLotus('ember',renderer,1,{textureCache:cache,detail:'medium',pointLight:false});flowers.push(medium);
    assert.ok(countTriangles(medium.group)<countTriangles(high.group)*.3);
    assert.equal(cache.size,6);
    const maps=[];flowers.forEach(flower=>flower.group.traverse(object=>{if(object.isSkinnedMesh)maps.push(object.material.map);}));
    assert.equal(new Set(maps).size,6);
    let textureDisposals=0;
    maps[0].addEventListener('dispose',()=>textureDisposals++);
    high.dispose();disposeMeshes(high.group);flowers.shift();
    assert.equal(textureDisposals,0,'disposing one flower must not invalidate shared textures');
    medium.update(1,.85,.5);
    const lights=[];medium.group.traverse(object=>{if(object.isLight)lights.push(object);});
    assert.equal(lights.length,0,'world flowers must never increase dynamic light count');
    cache.dispose();assert.equal(textureDisposals,1);assert.equal(cache.size,0);
  } finally {
    flowers.forEach(flower=>{flower.dispose();disposeMeshes(flower.group);});cache.dispose();
    if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
  }
});

test('map rendering stays bounded while traveling and empty flowers remain visible without aura', () => {
  const previous=globalThis.document;globalThis.document=canvasDocument();
  const cache=createLotusTextureCache(),field=createLotusField(renderer,cache),lotuses=seededLotuses();
  const camera=new THREE.PerspectiveCamera(55,1,.1,24000);
  let now=0;
  try {
    const first=lotuses[0];
    camera.position.set(first.x,5,first.z+8);camera.lookAt(first.x,0,first.z);camera.updateMatrixWorld();
    for(let frame=0;frame<10;frame++){field.update(lotuses,camera,now/1000,now);now+=250;}
    assert.ok(field.detailedCount>0,'nearby flowers gain detail after incremental texture preparation');
    for(const item of lotuses.filter((_,i)=>i%13===0)) {
      camera.position.set(item.x,5,item.z+8);camera.lookAt(item.x,0,item.z);camera.updateMatrixWorld();
      for(let frame=0;frame<3;frame++){
        field.update(lotuses,camera,now/1000,now);now+=250;
        assert.ok(field.detailedCount<=MAX_DETAILED_LOTUSES);
      }
      assert.ok(cache.size<=18,'texture entries bounded by three palettes and six variants');
    }
    camera.position.set(0,3400,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();
    field.update(lotuses,camera,now/1000,now+1000);
    assert.equal(field.detailedCount,0);
    const batches=field.group.children.filter(object=>object.isInstancedMesh);
    assert.equal(batches.length,2);assert.ok(batches.every(batch=>batch.count===160));
    const receiverIndex=lotuses.findIndex(item=>item.energyRole==='taker');
    const matrix=new THREE.Matrix4();batches[0].getMatrixAt(receiverIndex,matrix);
    assert.ok(new THREE.Vector3().setFromMatrixScale(matrix).length()>0);
    assert.equal(batches[1].geometry.attributes.aPower.getX(receiverIndex),0);
    lotuses[receiverIndex].energy=lotuses[receiverIndex].capacity/2;
    field.update(lotuses,camera,now/1000,now+2000);
    assert.equal(batches[1].geometry.attributes.aPower.getX(receiverIndex),.5);
    const lights=[];field.group.traverse(object=>{if(object.isLight)lights.push(object);});assert.equal(lights.length,0);
  } finally {
    field.dispose();cache.dispose();
    if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
  }
});

test('detail selection respects budgets, visibility and distance', () => {
  const lotuses=seededLotuses();
  assert.deepEqual(selectDetailedLotuses(lotuses,{x:0,y:3400,z:0}),[]);
  const item=lotuses[0],position={x:item.x,y:4,z:item.z+5};
  assert.ok(selectDetailedLotuses(lotuses,position).length<=3);
  assert.equal(selectDetailedLotuses(lotuses,position,[],1).length,1);
  assert.deepEqual(selectDetailedLotuses(lotuses,position,[],0),[]);
  assert.deepEqual(selectDetailedLotuses(lotuses,position,[],3,()=>false),[]);
  assert.deepEqual(selectDetailedLotuses([{...item,visible:false}],position),[]);
});
