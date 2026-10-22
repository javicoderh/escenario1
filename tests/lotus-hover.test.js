import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { pickWaterLotus } from '../src/lotus-hover.js';
import { chargedBoatSpeed } from '../src/boat-motion.js';

test('charge boosts navigation continuously without stranding an empty boat',()=>{
  assert.equal(chargedBoatSpeed(4,0),4);
  assert.equal(chargedBoatSpeed(4,.5),6);
  assert.equal(chargedBoatSpeed(4,1),8);
  assert.equal(chargedBoatSpeed(4,-1),4);
  assert.equal(chargedBoatSpeed(4,2),8);
  assert.equal(chargedBoatSpeed(4,NaN),4);
});

test('hover picks the nearest visible water lotus independently of render detail',()=>{
  const ray=new THREE.Ray(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0));
  const lotus={id:'one',x:0,y:0,z:0,diameter:4,visible:true};
  assert.equal(pickWaterLotus(ray,[lotus]),lotus);
  assert.equal(pickWaterLotus(ray,[{...lotus,visible:false}]),null);
  assert.equal(pickWaterLotus(ray,[{...lotus,x:10}]),null);
  const raised={...lotus,id:'raised',y:4};
  assert.equal(pickWaterLotus(ray,[lotus,raised]),raised);
  assert.equal(pickWaterLotus(new THREE.Ray(new THREE.Vector3(0,10,0),new THREE.Vector3(0,1,0)),[lotus]),null);
});
