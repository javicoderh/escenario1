import React from 'react';
import { RESONANCE_RANGE } from './lotus-resonance.js';
import { DECK_LOTUS_DIAMETER } from './boat-lotus.js';

export function SailingPanel({ boatState, boatSpeed, setBoatSpeed, sceneRef, night, setNight, onSave, status }) {
  const compass = ['N','NE','E','SE','S','SO','O','NO'];
  const heading = ((boatState.heading * 180 / Math.PI) % 360 + 360) % 360;
  const energy = boatState.energy || { charge: 0, connected: false, secondsRemaining: 0, distance: null };
  return <aside className="sailing-panel">
    <div className="eyebrow">TU PERSONAJE</div><h2>Espíritu de seda</h2>
    <p className="sailing-description">Un velero de madera, tinta y luz.<br/>El mismo latido que mueve al loto.</p>
    <div className="sailing-compass"><span>N</span><div style={{ transform: `rotate(${-heading}deg)` }}>✧</div><b>{compass[Math.round(heading / 45) % 8]}</b><small>{Math.round(heading)}°</small></div>
    <div className="boat-coordinates"><div><span>POSICIÓN X</span><b>{boatState.x.toFixed(1)} <small>m</small></b></div><div><span>POSICIÓN Z</span><b>{boatState.z.toFixed(1)} <small>m</small></b></div><div><span>VELOCIDAD</span><b>{boatState.speed.toFixed(1)} <small>m/s</small></b></div><div><span>RECORRIDO</span><b>{boatState.distance.toFixed(0)} <small>m</small></b></div></div>
    <section className={`resonance-readout ${energy.connected?'connected':''}`} data-connected={energy.connected} data-charge={energy.charge} aria-label="Energía del loto de cubierta">
      <div><span>LOTO DE CUBIERTA</span><b>{Math.round(energy.charge*100)}%</b></div>
      <p>{energy.connected?'Enlace de resonancia activo':energy.charge>0?'Energía residual':'Loto apagado'}</p>
      <div className="energy-track" role="progressbar" aria-label="Carga del loto de cubierta" aria-valuenow={Math.round(energy.charge*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${energy.charge*100}%`}}/></div>
      <small>{energy.connected?(energy.charge===1?'Carga completa':`Encendiendo · ${Math.ceil(energy.secondsRemaining)} s`):energy.charge>0?`Apagado completo en ${Math.ceil(energy.secondsRemaining)} s`:`Acércate a un loto del mar · alcance ${RESONANCE_RANGE} m`}</small>
      <small>{DECK_LOTUS_DIAMETER.toFixed(1)} m de diámetro · encendido / apagado lineal de 40 s</small>
    </section>
    <div className="sailing-destination" role="status">{boatState.destination?<><span>RUMBO AL DESTINO</span><strong>{boatState.destination.x.toFixed(1)}, {boatState.destination.z.toFixed(1)} m</strong><small>{Math.hypot(boatState.x-boatState.destination.x,boatState.z-boatState.destination.z).toFixed(1)} m por recorrer</small></>:<><span>EL MAR ES TU CAMINO</span><strong>{boatState.speed > .1 ? 'Al timón' : 'A la espera'}</strong><small>Clic derecho sobre el mar para navegar.</small></>}</div>
    <label className="editor-field">Velocidad de navegación <span>{boatSpeed} m/s</span><input type="range" aria-label="Velocidad del velero" min="0.5" max="12" step="0.5" value={boatSpeed} onChange={event=>setBoatSpeed(Number(event.target.value))}/></label>
    <div className="sailing-instructions"><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><p>Mover respecto a la cámara<br/>Clic derecho: marcar destino<br/>Arrastrar: girar la vista · Rueda: zoom<br/>Esc: detener el velero</p></div>
    <div className="editor-actions"><button onClick={()=>sceneRef.current?.stopBoat()}>Detener velero</button><button onClick={()=>sceneRef.current?.focusBoat()}>Centrar cámara</button></div>
    <button className="text-action" onClick={()=>sceneRef.current?.returnBoat()}>Volver junto al loto ↗</button>
    <div className="editor-section"><div className="editor-section-title">Atmósfera</div><div className="segmented"><button className={!night?'active':''} onClick={()=>setNight(false)}>Ocaso</button><button className={night?'active':''} onClick={()=>setNight(true)}>Luna llena</button></div></div>
    <p className="editor-hint" role="status">{status}</p>
    <button className="capture" onClick={onSave}>Guardar este instante <span>↗</span></button>
  </aside>;
}
