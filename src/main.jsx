import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Garden } from './Garden.jsx';
import { WorldEditor } from './WorldEditor.jsx';
import { SailingPanel } from './SailingPanel.jsx';
import { BOAT_SPEED, createBoatState } from './boat-motion.js';
import { readLayout, STORAGE_KEY } from './world-layout.js';
import { LOTUS_SCALE } from './lotus-scale.js';
import fullscreenMusicUrl from '../Konoha peace ost.mp3';
import { ArrowUpRight, Flower2, MoveUpRight, Pause, Play, RotateCcw, Volume2, VolumeX, Maximize2, Sparkles, Sunset, Moon, Waves, SlidersHorizontal, ChevronRight, X } from 'lucide-react';
import './style.css';
import './editor.css';

const palettes = { sakura: ['#f9c4ce','#df708f','#983c67'], ember: ['#ef3d2d','#cb1426','#720b1b'], moon: ['#e3defb','#a39edb','#6963ac'] };

function App(){
  const [palette,setPalette]=useState('ember'),[bloom,setBloom]=useState(.85),[speed,setSpeed]=useState(1),[playing,setPlaying]=useState(true),[night,setNight]=useState(true),[ready,setReady]=useState(null),[info,setInfo]=useState(false),[sound,setSound]=useState(false);const sceneRef=useRef(),audioRef=useRef();
  const viewerRef=useRef(),fullscreenMusicRef=useRef();
  const [editing,setEditing]=useState(false),[navigating,setNavigating]=useState(true),[layout,setLayout]=useState(()=>{
    const saved=readLayout();
    return {...saved,lotus:{...saved.lotus,visible:true}};
  });
  const [selection,setSelection]=useState(()=>({x:layout.lotus.x,y:layout.lotus.y,z:layout.lotus.z})),[flightSpeed,setFlightSpeed]=useState(2);
  const [cameraPosition,setCameraPosition]=useState(()=>({x:layout.lotus.x+5.8*LOTUS_SCALE,y:layout.lotus.y+3.3*LOTUS_SCALE,z:layout.lotus.z+10.6*LOTUS_SCALE}));
  const [flightStatus,setFlightStatus]=useState('Arrastra para mirar · clic en la escena para usar WASD');
  const [boatSpeed,setBoatSpeed]=useState(BOAT_SPEED),[sailingStatus,setSailingStatus]=useState('Haz clic en la escena para tomar el timón.');
  const [boatState,setBoatState]=useState(()=>{const state=createBoatState(layout.lotus);return {x:state.position.x,z:state.position.z,heading:state.heading,speed:0,distance:0,destination:null};});
  const [storageStatus,setStorageStatus]=useState('');
  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(layout)); setStorageStatus('Diagrama guardado en este navegador'); }
    catch { setStorageStatus('No se pudo guardar localmente. Exporta el diagrama para conservarlo.'); }
  },[layout]);

  useEffect(()=>{
    const music=new Audio(fullscreenMusicUrl);
    music.loop=true;
    music.preload='none';
    fullscreenMusicRef.current=music;
    const syncFullscreenMusic=()=>{
      if(document.fullscreenElement===viewerRef.current && !editing){
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
  },[editing]);
  useEffect(()=>()=>audioRef.current?.close(),[]);
  async function toggleFullscreen(){
    const viewer=viewerRef.current;
    if(!viewer?.requestFullscreen)return;
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      // Start from the click before fullscreen consumes the user activation.
      if(!editing) fullscreenMusicRef.current?.play().catch(()=>{});
      await viewer.requestFullscreen();
    }catch(error){
      fullscreenMusicRef.current?.pause();
      console.warn('No se pudo cambiar el modo de pantalla completa.',error);
    }
  }
  async function toggleSound(){if(sound){await audioRef.current?.suspend();setSound(false);return;}if(!audioRef.current){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();audioRef.current=ctx;const gain=ctx.createGain();gain.gain.value=.018;gain.connect(ctx.destination);[130.81,196,261.63].forEach(freq=>{const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=freq;osc.connect(gain);osc.start();});}await audioRef.current.resume();setSound(true);}
  function reset(){sceneRef.current?.resetView();}
  function setMode(mode){setEditing(mode==='build');setNavigating(mode==='sail');}
  function save(){if(!sceneRef.current)return;const link=document.createElement('a');link.download='flamming-lottus.png';link.href=sceneRef.current.capture();link.click();}
  return <div className={`app ${night?'night':''} ${editing?'editor-mode':''} ${navigating?'navigation-mode':''}`}>
    <header><a className="brand" href="./"><Flower2 size={29}/><span>flamming lottus<span className="brand-dot">®</span></span></a><nav><span className="nav-active">El jardín</span><button onClick={()=>setInfo(true)}>El concepto <ArrowUpRight size={13}/></button></nav><div className="header-note"><span className="status-dot"/> UN PEQUEÑO RESPIRO DIGITAL</div></header>
    <main><section className="intro"><div className="eyebrow"><span/> {editing?'UN OCÉANO DE POSIBILIDADES':navigating?'UN VIAJE ENTRE TINTA Y MAREA':'NATURALEZA EN OTRA DIMENSIÓN'}</div>
      <h1>{editing?<>El mar como <em>punto de partida.</em></>:navigating?<>Donde la calma <em>encuentra su rumbo.</em></>:<>Un instante.<br/>Infinitas <em>formas de florecer.</em></>}</h1>
      <p>{editing?'Un kilómetro a la redonda. Cinco cotas para imaginar lo que viene.':navigating?'Toma el timón. Traza tu camino entre reflejos, espuma y luz.':'Un loto que vive entre lo orgánico y lo imaginario.'}</p>
    </section>
    <div className="workspace-toolbar"><div className="mode-switch" aria-label="Modo de la escena"><button aria-pressed={navigating} onClick={()=>setMode('sail')}>Navegar</button><button aria-pressed={editing} onClick={()=>setMode('build')}>Construir escenario</button><button aria-pressed={!editing&&!navigating} onClick={()=>setMode('lotus')}>Contemplar loto</button></div><span>MAR · X / Y / Z · METROS</span></div>
    <section className="workspace"><div ref={viewerRef} className="viewer">
      <div className="viewer-top"><span><span className="status-dot"/> {editing?'ESCENARIO EN CONSTRUCCIÓN':navigating?'AL TIMÓN · ESPÍRITU DE SEDA':'JARDÍN EN VIVO'}</span><span className="edition">{editing?'R 1.000 m / Ø 2.000 m':navigating?'UN MAR / MIL CAMINOS':'SPECIMEN 001 / FLAMMING'}</span></div>
      <Garden {...{palette,bloom,speed,playing,night,sceneRef,editing,navigating,layout,selection,flightSpeed,boatSpeed}} suspended={info} onReady={setReady} onCameraPosition={setCameraPosition} onFlightStatus={setFlightStatus} onBoatState={setBoatState} onSailingStatus={setSailingStatus}/>
      {ready===false&&<div className="webgl-error">Tu navegador no pudo iniciar WebGL. Activa la aceleración gráfica para explorar el escenario.</div>}
      {editing?<>
        <div className="camera-readout"><span>CÁMARA · METROS</span><b>X {cameraPosition.x.toFixed(1)} <i/> Y {cameraPosition.y.toFixed(1)} <i/> Z {cameraPosition.z.toFixed(1)}</b><small>{cameraPosition.y<0?'Bajo el nivel del mar':'Sobre el nivel del mar'}</small></div>
        <div className="flight-toolbar"><button onClick={()=>sceneRef.current?.startFlight()}>Volar · capturar cursor</button><button onClick={()=>sceneRef.current?.overview()}>Vista superior</button></div>
        <div className="flight-help"><span>{flightStatus}</span><small>WASD mover · Rueda zoom · E / Q subir y bajar · Shift acelerar · Esc liberar</small></div>
      </>:navigating?<><div className="sailing-hud"><span>ESPÍRITU DE SEDA</span><b>{boatState.speed.toFixed(1)} <small>m/s</small></b><p>{boatState.destination?'Siguiendo tu rumbo':'WASD para tomar el timón'}</p></div><div className="flight-help"><span>{playing?sailingStatus:'Navegación en pausa'}</span><small>WASD navegar · Clic derecho destino · Arrastrar cámara · Rueda zoom</small></div></>:<div className="flower-caption"><span>{layout.lotus.visible?'01 — ESPÍRITU DE NUEVE COLAS':'ESCENARIO MARINO'}</span><h2>{layout.lotus.visible?'Flamming Lotus':'El mar en calma'}</h2><p>{layout.lotus.visible?'Nueve llamas. Un mismo latido.':'Sitúa el loto desde Construir escenario.'}</p></div>}
      <div className="viewer-tools"><button title="Restablecer vista" onClick={reset}><RotateCcw size={17}/></button><button title="Pantalla completa" onClick={toggleFullscreen}><Maximize2 size={17}/></button></div>
      {!editing&&!navigating&&<div className="interaction"><span className="mouse-icon"/> ARRASTRA PARA EXPLORAR <i/> SCROLL PARA ACERCAR</div>}
    </div>
    {editing?<WorldEditor {...{layout,setLayout,selection,setSelection,flightSpeed,setFlightSpeed,sceneRef,cameraPosition,storageStatus}}/>:navigating?<SailingPanel {...{boatState,boatSpeed,setBoatSpeed,sceneRef,night,setNight}} onSave={save} status={sailingStatus}/>:
    <aside className="controls"><div className="panel-title"><span>Hazlo tuyo</span><SlidersHorizontal size={17}/></div><p className="panel-subtitle">Cada flor tiene su propia energía.</p><div className="control-section"><div className="field-label">01 <span>PALETA DE PÉTALOS</span></div><div className="swatches">{[['ember','Fuego'],['sakura','Sakura'],['moon','Luna']].map(([id,label])=><button key={id} className={palette===id?'swatch selected':'swatch'} onClick={()=>setPalette(id)} aria-pressed={palette===id}><span style={{background:`linear-gradient(135deg, ${palettes[id][0]}, ${palettes[id][2]})`}}/>{label}</button>)}</div></div>
    <div className="control-section"><div className="field-label">02 <span>APERTURA</span><b>{Math.round(bloom*100)}%</b></div><input aria-label="Apertura de los pétalos" type="range" min="0" max="1" step="0.01" value={bloom} onChange={e=>setBloom(+e.target.value)} style={{'--fill':`${bloom*100}%`}}/><div className="range-labels"><span>Brote</span><Flower2 size={14}/><span>Floración</span></div></div>
    <div className="control-section"><div className="field-label">03 <span>RITMO DE VIDA</span><b>{speed.toFixed(1)}×</b></div><input aria-label="Velocidad de animación" type="range" min="0.2" max="2" step="0.1" value={speed} onChange={e=>setSpeed(+e.target.value)} style={{'--fill':`${(speed-.2)/1.8*100}%`}}/><div className="range-labels"><span>Sereno</span><Waves size={14}/><span>Enérgico</span></div></div>
    <div className="control-section light-section"><div className="field-label">04 <span>ATMÓSFERA</span></div><div className="segmented"><button className={!night?'active':''} onClick={()=>setNight(false)}><Sunset size={14}/> Ocaso</button><button className={night?'active':''} onClick={()=>setNight(true)}><Moon size={14}/> Luna llena</button></div></div><button className="capture" onClick={save}>Guardar este instante <MoveUpRight size={17}/></button><span className="capture-note">UN PEQUEÑO RECUERDO DE TU JARDÍN</span></aside>}</section>
    <div className="underbar"><div className="live-controls"><button onClick={()=>setPlaying(!playing)}>{playing?<Pause size={13}/>:<Play size={13}/>} {playing?'Pausar animación':'Reanudar animación'}</button><span/><button onClick={toggleSound}>{sound?<Volume2 size={15}/>:<VolumeX size={15}/>} Sonido {sound?'activado':'desactivado'}</button></div><div className="render-note"><span/> RENDERIZADO EN TIEMPO REAL <b>THREE.JS</b></div></div>
    <section className="story"><div className="story-icon"><Sparkles size={22}/></div><div><h3>Nueve colas. Una flor con vida propia.</h3><p>Pétalos de seda, vetas de color y curvas que danzan a su propio ritmo. Un espíritu de fuego con alma de 16 bits.</p></div><span className="story-tag">16-BIT SOUL. 3D HEART.</span></section>
    </main><footer><span>© 2026 Flamming Lottus</span><span>Hecho para florecer, sin prisa. <Flower2 size={13}/></span><button onClick={()=>setInfo(true)}>Acerca del proyecto <ArrowUpRight size={13}/></button></footer>
    {info&&<div className="modal-backdrop" onClick={()=>setInfo(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="concept-title" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Cerrar" onClick={()=>setInfo(false)}><X/></button><Flower2 size={36}/><div className="eyebrow">EL CONCEPTO</div><h2 id="concept-title">Naturaleza con alma de píxel.</h2><p>Flamming Lottus es un jardín digital interactivo. Sus nueve pétalos principales se curvan como colas de un espíritu de zorro. Cada uno ondula y se retuerce a su propio ritmo, con nervaduras, vetas de color y un delicado tramado inspirado en la era SNES.</p><p>La forma de un loto real se encuentra con los colores suaves del anime. Explora la flor, cambia su apertura y guarda una imagen de tu instante.</p><button className="capture" onClick={()=>setInfo(false)}>Volver al jardín <ChevronRight size={16}/></button></section></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
