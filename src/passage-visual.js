import * as THREE from 'three';
import { oceanHeight } from './ocean-waves.js';

export function createPassageVisual() {
  const group=new THREE.Group();group.name='Ciclones y remolinos';
  let definitions=null,entries=[];
  const windMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color('#b7dafb')}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime;uniform vec3 uColor;varying vec2 vUv;void main(){float band=pow(.5+.5*sin(vUv.x*37.7+vUv.y*18.-uTime*4.),8.);float alpha=(.025+band*.21)*sin(vUv.y*3.14159);gl_FragColor=vec4(uColor,alpha);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),
  });
  const waterMaterial=windMaterial.clone();waterMaterial.uniforms.uColor.value.set('#55dfcf');
  const windGeo=new THREE.CylinderGeometry(6.5,.65,12,32,8,true);windGeo.translate(0,6,0);
  const waterGeo=new THREE.CylinderGeometry(7,.6,5,32,8,true);waterGeo.translate(0,-2.5,0);
  function spiral(cyclone){
    const points=[];
    for(let i=0;i<=180;i++){const u=i/180,a=u*Math.PI*12,r=cyclone ? .8+u*5.7 : 1+u*6;
      points.push(new THREE.Vector3(Math.cos(a)*r,cyclone?u*12:.2-u*.18,Math.sin(a)*r));}
    return new THREE.BufferGeometry().setFromPoints(points);
  }
  const windLine=spiral(true),waterLine=spiral(false),ringGeo=new THREE.RingGeometry(7.5,7.8,64),arrowGeo=new THREE.ConeGeometry(.5,1.4,12);
  const windInk=new THREE.LineBasicMaterial({color:'#c0dcff',transparent:true,opacity:.45,depthWrite:false});
  const waterInk=new THREE.LineBasicMaterial({color:'#73f4d4',transparent:true,opacity:.65,depthWrite:false});
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#a1f6ec',transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false});
  const arrowMaterial=new THREE.MeshBasicMaterial({color:'#e0fcff',transparent:true,opacity:.7,depthWrite:false});
  return {group,update(content,position,time,visible,levelY=position.y){
    if(content!==definitions){
      const gates=content.filter(point=>['cyclone','whirlpool'].includes(point.type)&&point.available);
      group.clear();entries=[];definitions=content;
      for(const gate of gates){const root=new THREE.Group(),swirl=new THREE.Group(),cyclone=gate.type==='cyclone';root.name=gate.name;root.userData.id=gate.id;
        swirl.add(new THREE.Mesh(cyclone?windGeo:waterGeo,cyclone?windMaterial:waterMaterial));
        swirl.add(new THREE.Line(cyclone?windLine:waterLine,cyclone?windInk:waterInk));root.add(swirl);
        const ring=new THREE.Mesh(ringGeo,ringMaterial);ring.rotation.x=-Math.PI/2;root.add(ring);
        const arrow=new THREE.Mesh(arrowGeo,arrowMaterial);arrow.position.y=2.4;arrow.rotation.z=gate.destinationY>gate.y?0:Math.PI;root.add(arrow);
        group.add(root);entries.push({gate,root,swirl,arrow});
      }
    }
    group.visible=visible;windMaterial.uniforms.uTime.value=waterMaterial.uniforms.uTime.value=time;
    for(const {gate,root,swirl,arrow} of entries){root.visible=gate.y===levelY&&Math.hypot(gate.x-position.x,gate.z-position.z)<500;
      if(!root.visible)continue;root.position.set(gate.x,gate.y+(gate.y===0?oceanHeight(gate.x,gate.z,time):0),gate.z);
      swirl.rotation.y=time*(gate.type==='cyclone' ? .7 : -.9);arrow.position.y=2.4+Math.sin(time*2)*.3;
    }
  },dispose(){
    for(const resource of [windGeo,waterGeo,windLine,waterLine,ringGeo,arrowGeo,windMaterial,waterMaterial,windInk,waterInk,ringMaterial,arrowMaterial])resource.dispose();
    group.clear();entries=[];
  }};
}

export function createLayerAtmosphere(){
  const group=new THREE.Group();group.name='Corrientes de los cinco niveles';
  const cloud=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime;varying vec2 vUv;void main(){vec2 p=vUv-.5;float n=sin(p.x*24.+sin(p.y*15.+uTime*.12))*sin(p.y*20.-uTime*.1);float a=(1.-smoothstep(.1,.5,length(p)))*(.07+.07*n);gl_FragColor=vec4(.69,.8,.91,a);}`,
  }));cloud.rotation.x=-Math.PI/2;cloud.position.y=-1;group.add(cloud);
  const points=new Float32Array(240*3);for(let i=0;i<240;i++){points[i*3]=Math.sin(i*23.17)*85;points[i*3+1]=Math.sin(i*17.23)*12;points[i*3+2]=Math.cos(i*31.7)*85;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const motes=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#87d8e7',size:.1,transparent:true,opacity:.45,depthWrite:false}));group.add(motes);
  return {group,update(position,time,visible){group.visible=visible&&position.y!==0;group.position.copy(position);cloud.visible=position.y>0;
    cloud.material.uniforms.uTime.value=time;motes.rotation.y=time*.015;
  }};
}
