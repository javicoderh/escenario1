import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLivingLotus } from './lotus.js';
import { createPond, WATER_LEVEL } from './pond.js';
import { createAtmosphere } from './atmosphere.js';
import fullscreenMusicUrl from '../Konoha peace ost.mp3';
import { ArrowUpRight, Flower2, MoveUpRight, Pause, Play, RotateCcw, Volume2, VolumeX, Maximize2, Sparkles, Sunset, Moon, Waves, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import './style.css';

const palettes = { sakura: ['#f9c4ce','#df708f','#983c67'], ember: ['#ef3d2d','#cb1426','#720b1b'], moon: ['#e3defb','#a39edb','#6963ac'] };

function Garden({ palette, bloom, speed, playing, night, resetId, onReady, sceneRef }) {
  const host=useRef();const options=useRef({bloom,speed,playing,night});options.current={bloom,speed,playing,night};
  useEffect(()=>{
    const el=host.current;let renderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});} catch {onReady(false);return;}
    const maxPixelRatio=Math.min(window.devicePixelRatio||1,1.75);
    renderer.setPixelRatio(maxPixelRatio);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,.1,180);camera.position.set(5.8,3.3,10.6);
    // Render just before capture instead of preserving every frame's GPU buffer.
    sceneRef.current={capture:()=>{pond.invalidate();renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}};
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1.15,0);controls.minDistance=4;controls.maxDistance=16;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=false;
    const atmosphere=createAtmosphere(scene,night);
    const lotus=createLivingLotus(palette,renderer);scene.add(lotus.group);lotus.update(0,bloom);
    const pond=createPond(night);scene.add(pond.surface);
    const leafMat=new THREE.MeshStandardMaterial({color:0x506d42,side:THREE.DoubleSide,roughness:.87});
    const floatingLeaves=[];
    [[-1.6,-.12,.4,1.45,.4],[1.7,-.1,.9,1.1,-.7],[-.6,-.13,-1.9,.85,1.7]].forEach(([x,y,z,s,rot])=>{
      const shape=new THREE.Shape();shape.moveTo(0,0);for(let i=0;i<=48;i++){const a=.18+i/48*(Math.PI*2-.36);shape.lineTo(Math.sin(a)*s,Math.cos(a)*s);}shape.lineTo(0,0);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape),leafMat);leaf.rotation.set(-Math.PI/2,0,rot);leaf.position.set(x,WATER_LEVEL+.016,z);scene.add(leaf);floatingLeaves.push(leaf);
    });
    const particles=new THREE.BufferGeometry();const coords=new Float32Array(70*3);for(let i=0;i<70;i++){coords[i*3]=(Math.random()-.5)*15;coords[i*3+1]=Math.random()*6;coords[i*3+2]=(Math.random()-.5)*12;}particles.setAttribute('position',new THREE.BufferAttribute(coords,3));const dust=new THREE.Points(particles,new THREE.PointsMaterial({color:0xf8deb2,size:.035,transparent:true,opacity:.65}));scene.add(dust);
    const resize=()=>{const {width,height}=el.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let frame,t=0,last=performance.now(),opening=bloom;
    let sampleTime=0,sampleFrames=0,stableWindows=0;
    const resetTiming=()=>{last=performance.now();sampleTime=0;sampleFrames=0;stableWindows=0;};
    document.addEventListener('visibilitychange',resetTiming);
    function animate(now){
      // No fixed FPS cap: render at the display's refresh rate when hardware allows.
      frame=requestAnimationFrame(animate);
      const elapsed=(now-last)/1000;last=now;
      if(document.hidden)return;
      const dt=Math.min(elapsed,.05),o=options.current;
      if(o.playing)t+=dt*o.speed;
      opening=THREE.MathUtils.damp(opening,o.bloom,5,dt);
      lotus.update(t,opening);
      atmosphere.update(o.night,dt,t);
      pond.update(t,o.night,dt,opening);
      dust.rotation.y=t*.012;
      floatingLeaves.forEach((leaf,i)=>{leaf.position.y=WATER_LEVEL+.016+Math.sin(t*.71+i*.8)*.006;});
      controls.update(dt);
      renderer.render(scene,camera);
      // Trade a small amount of pixel density for stable motion on slower GPUs.
      // Long stalls (tab switches / initial shader compilation) are not samples.
      if(elapsed>0&&elapsed<.25){sampleTime+=elapsed;sampleFrames++;}
      if(sampleTime>=2){
        const fps=sampleFrames/sampleTime,current=renderer.getPixelRatio();
        let next=current;
        if(fps<55){next=Math.max(Math.min(1,maxPixelRatio),current-.15);stableWindows=0;}
        else if(fps>58){if(++stableWindows>=3){next=Math.min(maxPixelRatio,current+.10);stableWindows=0;}}
        else stableWindows=0;
        if(Math.abs(next-current)>.01)renderer.setPixelRatio(next);
        sampleTime=0;sampleFrames=0;
      }
    }
    frame=requestAnimationFrame(animate);onReady(true);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetTiming);observer.disconnect();controls.dispose();lotus.dispose();pond.dispose();const geometries=new Set(),materials=new Set();scene.traverse(obj=>{if(obj.geometry)geometries.add(obj.geometry);if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();el.removeChild(renderer.domElement);sceneRef.current=null;};
  },[palette,resetId]);
  return <div ref={host} className="garden-canvas" aria-label="Loto tridimensional interactivo. Arrastra para girar y usa la rueda para acercarte."/>;
}
function App(){
  const [palette,setPalette]=useState('ember'),[bloom,setBloom]=useState(.85),[speed,setSpeed]=useState(1),[playing,setPlaying]=useState(true),[night,setNight]=useState(true),[resetId,setResetId]=useState(0),[ready,setReady]=useState(null),[info,setInfo]=useState(false),[sound,setSound]=useState(false);const sceneRef=useRef(),audioRef=useRef();
  const viewerRef=useRef(),fullscreenMusicRef=useRef();
  useEffect(()=>{
    const music=new Audio(fullscreenMusicUrl);
    music.loop=true;
    music.preload='none';
    fullscreenMusicRef.current=music;
    const syncFullscreenMusic=()=>{
      if(document.fullscreenElement===viewerRef.current){
        music.play().catch(error=>{if(error.name!=='AbortError')console.warn('No se pudo reproducir la música.',error);});
      }else music.pause();
    };
    document.addEventListener('fullscreenchange',syncFullscreenMusic);
    return()=>{
      document.removeEventListener('fullscreenchange',syncFullscreenMusic);
      music.pause();
      music.removeAttribute('src');
      music.load();
      fullscreenMusicRef.current=null;
    };
  },[]);
  useEffect(()=>()=>audioRef.current?.close(),[]);
  async function toggleFullscreen(){
    const viewer=viewerRef.current;
    if(!viewer?.requestFullscreen)return;
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      // Start from the click before fullscreen consumes the user activation.
      fullscreenMusicRef.current?.play().catch(()=>{});
      await viewer.requestFullscreen();
    }catch(error){
      fullscreenMusicRef.current?.pause();
      console.warn('No se pudo cambiar el modo de pantalla completa.',error);
    }
  }
  async function toggleSound(){if(sound){await audioRef.current?.suspend();setSound(false);return;}if(!audioRef.current){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();audioRef.current=ctx;const gain=ctx.createGain();gain.gain.value=.018;gain.connect(ctx.destination);[130.81,196,261.63].forEach(freq=>{const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=freq;osc.connect(gain);osc.start();});}await audioRef.current.resume();setSound(true);}
  function reset(){setBloom(.85);setSpeed(1);setPlaying(true);setNight(true);setResetId(v=>v+1);}
  function save(){if(!sceneRef.current)return;const link=document.createElement('a');link.download='flamming-lottus.png';link.href=sceneRef.current.capture();link.click();}
  return <div className={night?'app night':'app'}>
    <header><a className="brand" href="./"><Flower2 size={29}/><span>flamming lottus<span className="brand-dot">®</span></span></a><nav><span className="nav-active">El jardín</span><button onClick={()=>setInfo(true)}>El concepto <ArrowUpRight size={13}/></button></nav><div className="header-note"><span className="status-dot"/> UN PEQUEÑO RESPIRO DIGITAL</div></header>
    <main><section className="intro"><div className="eyebrow"><span/> NATURALEZA EN OTRA DIMENSIÓN</div><h1>Un instante.<br/>Infinitas <em>formas de florecer.</em></h1><p>Un loto que vive entre lo orgánico y lo imaginario.<br/>Dale tu ritmo. Encuentra tu calma.</p><span className="intro-stamp">EST. 2026 <span>✳</span> CULTIVADO EN PÍXELES</span></section>
    <section className="workspace"><div ref={viewerRef} className="viewer"><div className="viewer-top"><span><span className="status-dot"/> JARDÍN EN VIVO</span><span className="edition">SPECIMEN 001 <span> / </span> FLAMMING</span></div><div className="vertical-label">UNA EXPLORACIÓN BOTÁNICA DIGITAL</div><Garden {...{palette,bloom,speed,playing,night,resetId,sceneRef}} onReady={setReady}/>{ready===false&&<div className="webgl-error">Tu navegador no pudo iniciar WebGL. Activa la aceleración gráfica para explorar el loto.</div>}<div className="flower-caption"><span>01 — ESPÍRITU DE NUEVE COLAS</span><h2>Flamming Lotus</h2><p>Nueve llamas. Un mismo latido.</p></div><div className="viewer-tools"><button title="Restablecer vista" onClick={reset}><RotateCcw size={17}/></button><button title="Pantalla completa" onClick={toggleFullscreen}><Maximize2 size={17}/></button></div><div className="interaction"><span className="mouse-icon"/> ARRASTRA PARA EXPLORAR <i/> SCROLL PARA ACERCAR</div></div>
    <aside className="controls"><div className="panel-title"><span>Hazlo tuyo</span><SlidersHorizontal size={17}/></div><p className="panel-subtitle">Cada flor tiene su propia energía.</p><div className="control-section"><div className="field-label">01 <span>PALETA DE PÉTALOS</span></div><div className="swatches">{[['ember','Fuego'],['sakura','Sakura'],['moon','Luna']].map(([id,label])=><button key={id} className={palette===id?'swatch selected':'swatch'} onClick={()=>setPalette(id)} aria-pressed={palette===id}><span style={{background:`linear-gradient(135deg, ${palettes[id][0]}, ${palettes[id][2]})`}}/>{label}</button>)}</div></div>
    <div className="control-section"><div className="field-label">02 <span>APERTURA</span><b>{Math.round(bloom*100)}%</b></div><input aria-label="Apertura de los pétalos" type="range" min="0" max="1" step="0.01" value={bloom} onChange={e=>setBloom(+e.target.value)} style={{'--fill':`${bloom*100}%`}}/><div className="range-labels"><span>Brote</span><Flower2 size={14}/><span>Floración</span></div></div>
    <div className="control-section"><div className="field-label">03 <span>RITMO DE VIDA</span><b>{speed.toFixed(1)}×</b></div><input aria-label="Velocidad de animación" type="range" min="0.2" max="2" step="0.1" value={speed} onChange={e=>setSpeed(+e.target.value)} style={{'--fill':`${(speed-.2)/1.8*100}%`}}/><div className="range-labels"><span>Sereno</span><Waves size={14}/><span>Enérgico</span></div></div>
    <div className="control-section light-section"><div className="field-label">04 <span>ATMÓSFERA</span></div><div className="segmented"><button className={!night?'active':''} onClick={()=>setNight(false)}><Sunset size={14}/> Ocaso</button><button className={night?'active':''} onClick={()=>setNight(true)}><Moon size={14}/> Luna llena</button></div></div><button className="capture" onClick={save}>Guardar este instante <MoveUpRight size={17}/></button><span className="capture-note">UN PEQUEÑO RECUERDO DE TU JARDÍN</span></aside></section>
    <div className="underbar"><div className="live-controls"><button onClick={()=>setPlaying(!playing)}>{playing?<Pause size={13}/>:<Play size={13}/>} {playing?'Pausar animación':'Reanudar animación'}</button><span/><button onClick={toggleSound}>{sound?<Volume2 size={15}/>:<VolumeX size={15}/>} Sonido {sound?'activado':'desactivado'}</button></div><div className="render-note"><span/> RENDERIZADO EN TIEMPO REAL <b>THREE.JS</b></div></div>
    <section className="story"><div className="story-icon"><Sparkles size={22}/></div><div><h3>Nueve colas. Una flor con vida propia.</h3><p>Pétalos de seda, vetas de color y curvas que danzan a su propio ritmo. Un espíritu de fuego con alma de 16 bits.</p></div><span className="story-tag">16-BIT SOUL. 3D HEART.</span></section>
    </main><footer><span>© 2026 Flamming Lottus</span><span>Hecho para florecer, sin prisa. <Flower2 size={13}/></span><button onClick={()=>setInfo(true)}>Acerca del proyecto <ArrowUpRight size={13}/></button></footer>
    {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="concept-title" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Cerrar" onClick={()=>setInfo(false)}><X/></button><Flower2 size={36}/><div className="eyebrow">EL CONCEPTO</div><h2 id="concept-title">Naturaleza con alma de píxel.</h2><p>Flamming Lottus es un jardín digital interactivo. Sus nueve pétalos principales se curvan como colas de un espíritu de zorro. Cada uno ondula y se retuerce a su propio ritmo, con nervaduras, vetas de color y un delicado tramado inspirado en la era SNES.</p><p>La forma de un loto real se encuentra con los colores suaves del anime. Explora la flor, cambia su apertura y guarda una imagen de tu instante.</p><button className="capture" onClick={()=>setInfo(false)}>Volver al jardín <ChevronRight size={16}/></button></section></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
