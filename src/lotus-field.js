import * as THREE from 'three';
import { createLivingLotus } from './lotus.js';
import { LOTUS_REFERENCE_DIAMETER } from './lotus-scale.js';
import { MAX_WATER_LOTUSES } from './world-zones.js';
import { disposeMeshes } from './world-guides.js';

export const MAX_DETAILED_LOTUSES = 3;

export function selectDetailedLotuses(lotuses, position, previous = [], budget = MAX_DETAILED_LOTUSES, inView = () => true) {
  const retained = new Set(previous);
  return lotuses.filter(item => item.visible && inView(item)).map(item => {
    const distance = Math.hypot(item.x-position.x, item.y-position.y, item.z-position.z);
    const range = Math.min(90, Math.max(24, item.diameter*5));
    return { item, distance, range, score: distance / Math.sqrt(item.diameter) * (retained.has(item.id) ? .8 : 1) };
  }).filter(entry => entry.distance < entry.range + (retained.has(entry.item.id) ? 10 : 0))
    .sort((a,b) => a.score-b.score).slice(0, Math.max(0, Math.min(MAX_DETAILED_LOTUSES,budget))).map(entry => entry.item);
}

// One flower draw + one halo draw for the entire map. A fixed pool supplies
// nearby animated models; sailing never accumulates skeletons or point lights.
export function createLotusField(renderer, textureCache) {
  const group = new THREE.Group(); group.name = 'Instanced water lotuses';
  const shape = new THREE.Shape();
  for (let i=0; i<=36; i++) {
    const angle=i/36*Math.PI*2, radius=i%2 ? .22 : .5;
    if (!i) shape.moveTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
    else shape.lineTo(Math.cos(angle)*radius, Math.sin(angle)*radius);
  }
  const flowers = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }), MAX_WATER_LOTUSES);
  flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); flowers.frustumCulled=false; flowers.count=0; group.add(flowers);
  const haloGeometry = new THREE.PlaneGeometry(1,1);
  const powers = new THREE.InstancedBufferAttribute(new Float32Array(MAX_WATER_LOTUSES),1).setUsage(THREE.DynamicDrawUsage);
  haloGeometry.setAttribute('aPower',powers);
  const halos = new THREE.InstancedMesh(haloGeometry,new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, toneMapped:false,
    vertexShader:`attribute float aPower; varying vec2 vUv; varying float vPower; varying vec3 vColor;
      void main(){vUv=uv; vPower=aPower; vColor=instanceColor; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv; varying float vPower; varying vec3 vColor;
      void main(){float r=length(vUv*2.0-1.0); float alpha=exp(-r*r*5.0)*(1.0-smoothstep(.7,1.0,r));
        gl_FragColor=vec4(vColor,alpha*vPower*.3);
        #include <colorspace_fragment>
      }`,
  }),MAX_WATER_LOTUSES);
  halos.instanceMatrix.setUsage(THREE.DynamicDrawUsage); halos.frustumCulled=false; halos.count=0; group.add(halos);
  const pool=Array.from({length:MAX_DETAILED_LOTUSES},()=>({ flower:null, palette:null, group:new THREE.Group(), id:null }));
  pool.forEach(slot=>group.add(slot.group));
  const colors={ember:new THREE.Color('#ef633e'),sakura:new THREE.Color('#eca3bd'),moon:new THREE.Color('#b7b1ee')};
  const gray=new THREE.Color('#b0b0b0'), color=new THREE.Color(), dummy=new THREE.Object3D();
  const frustum=new THREE.Frustum(), matrix=new THREE.Matrix4(), sphere=new THREE.Sphere();
  let lastModels=-Infinity,lastInstances=-Infinity,lastBuild=-Infinity,lastPose=-Infinity,layout=null,selected=[],assignments=[];
  function disposeSlot(slot) {
    if (!slot.flower) return;
    slot.flower.dispose(); disposeMeshes(slot.flower.group); slot.group.remove(slot.flower.group); slot.flower=null; slot.id=null;
  }
  return {
    group,
    get detailedCount(){return pool.filter(slot=>slot.group.visible && slot.flower).length;},
    update(lotuses,camera,time,now,budget=MAX_DETAILED_LOTUSES,heroId=null) {
      const changed=layout!==lotuses; layout=lotuses;
      if (changed || now-lastModels>=200) {
        camera.updateMatrixWorld(); matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse); frustum.setFromProjectionMatrix(matrix);
        selected=selectDetailedLotuses(lotuses,camera.position,assignments.map(slot=>slot.id),budget,item=>{
          sphere.center.set(item.x,item.y,item.z); sphere.radius=item.diameter; return item.id !== 'water-lotus' && frustum.intersectsSphere(sphere);
        });
        lastModels=now;
      }
      const used=new Set(); assignments=[];
      for(const item of selected) {
        let slot=pool.find(entry=>!used.has(entry) && entry.flower && entry.palette===item.palette);
        if(!slot) {
          if(now-lastBuild<200) continue;
          const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
          if(!textureCache.ready(item.palette,anisotropy)) {
            textureCache.warmOne(item.palette,anisotropy); lastBuild=now; continue;
          }
          slot=pool.find(entry=>!used.has(entry)); if(!slot) continue;
          disposeSlot(slot);
          slot.flower=createLivingLotus(item.palette,renderer,1,{powerControlled:true,detail:'medium',pointLight:false,textureCache});
          slot.palette=item.palette; slot.group.add(slot.flower.group); lastBuild=now;
        }
        used.add(slot); slot.id=item.id; slot.item=item; assignments.push(slot);
      }
      pool.forEach(slot=>{slot.group.visible=used.has(slot);});
      if(changed || now-lastPose>=1000/30) {
        for(const slot of assignments) {
          const item=slot.item,power=item.energy/item.capacity;
          const restored=item.energyRole==='taker' && power>=1-1e-8;
          slot.group.position.set(item.x,item.y,item.z); slot.group.scale.setScalar(item.diameter/LOTUS_REFERENCE_DIAMETER);
          slot.flower.setSaturation(restored ? 1.15 : power); slot.flower.update(time,.85,power,restored);
        }
        lastPose=now;
      }
      if(changed || now-lastInstances>=100) {
        const detailed=new Set(assignments.map(slot=>slot.id));
        flowers.count=halos.count=Math.min(lotuses.length,MAX_WATER_LOTUSES);
        for(let i=0;i<flowers.count;i++) {
          const item=lotuses[i],power=item.energy/item.capacity, visible=item.visible && item.id !== heroId && !detailed.has(item.id);
          const restored=item.energyRole==='taker' && power>=1-1e-8;
          dummy.position.set(item.x,item.y+.04,item.z); dummy.rotation.set(-Math.PI/2,0,0); dummy.scale.setScalar(visible?item.diameter:0);
          dummy.updateMatrix(); flowers.setMatrixAt(i,dummy.matrix);
          color.copy(gray).lerp(colors[item.palette],power); flowers.setColorAt(i,color);
          if(restored) { color.offsetHSL(0,.15,.05); flowers.setColorAt(i,color); }
          dummy.position.y=item.y+.06; dummy.scale.setScalar(visible?item.diameter*1.5:0); dummy.updateMatrix(); halos.setMatrixAt(i,dummy.matrix);
          halos.setColorAt(i,colors[item.palette]); powers.setX(i,visible?power*(restored?2.4:1):0);
        }
        flowers.instanceMatrix.needsUpdate=true; halos.instanceMatrix.needsUpdate=true;
        if(flowers.instanceColor) flowers.instanceColor.needsUpdate=true;
        if(halos.instanceColor) halos.instanceColor.needsUpdate=true;
        powers.needsUpdate=true; lastInstances=now;
      }
    },
    dispose(){pool.forEach(disposeSlot); disposeMeshes(group); group.clear();},
  };
}
