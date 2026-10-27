import React from 'react';
import { ZONES, zoneAt } from './world-zones.js';
import { MapFog } from './MapFog.jsx';
import { levelName } from './world-levels.js';
import { isCharted } from './world-discovery.js';
import { visibleWorldContent } from './world-progress.js';
import { CONTENT_TYPES } from './world-content.js';

export function ZoneSectors({ exploration, selectedZone } = {}) {
  return <g pointerEvents="none">{ZONES.map(zone => {
    const a = zone.angle, b = a + Math.PI/4, middle = (a+b)/2;
    const point = angle => `${120+100*Math.sin(angle)},${120-100*Math.cos(angle)}`;
    return <g key={zone.id}>
      <path d={`M120,120 L${point(a)} A100,100 0 0,1 ${point(b)} Z`} fill={zone.color} fillOpacity={selectedZone === zone.id ? .19 : exploration?.revealedZones.includes(zone.id) ? .12 : .04} stroke={zone.color} strokeOpacity=".3" strokeWidth=".6"/>
      <text x={120+87*Math.sin(middle)} y={123-87*Math.cos(middle)} textAnchor="middle" fill={zone.color}>{zone.id}</text>
    </g>;
  })}</g>;
}

export function ZoneMap({ boatState, sceneRef, exploration, onOpenMap, content=[] }) {
  const levelY=boatState.levelY ?? boatState.y ?? 0;
  const current = zoneAt(boatState), lotuses = boatState.energy?.lotuses || [];
  const target = lotuses.find(item => item.id === `zone-${current.id}-taker-1`);
  const complete = exploration?.checkpoints.includes(`zone-${current.id}-taker-1`) || (target && target.energy >= target.capacity - 1e-8);
  function navigate(event) {
    const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return;
    const point = event.currentTarget.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const x = (local.x - 120) * 10, z = (local.y - 120) * 10;
    if (Math.hypot(x, z) <= 1000) sceneRef.current?.navigateTo({ x,y:levelY,z });
  }
  return <section className="zone-map-panel">
    <div className="editor-section-title">Zona {current.id} · {current.name}</div>
    <p className="editor-hint">{levelName(levelY)} · Y {levelY} m</p>
    <button className="open-world-map" onClick={() => onOpenMap?.()}>Abrir mapa del mundo <kbd>M</kbd></button>
    {target && <div className={`zone-mission ${complete ? 'complete' : ''}`}>
      <span>{complete ? 'ZONA RESTAURADA' : 'MISIÓN · GRAN LOTO'}</span>
      <strong>{complete ? 'Mapa revelado · checkpoint activado' : 'Ilumina el gran loto de esta zona'}</strong>
      <div className="energy-track" role="progressbar" aria-label="Progreso del gran loto" aria-valuenow={Math.round(target.energy/target.capacity*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${target.energy/target.capacity*100}%`}}/></div>
      <small>{target.energy.toFixed(1)} / {target.capacity} u · {complete ? 'Objetivo completo' : 'Recoge energía de los givers'}</small>
    </div>}
    <div className="world-map"><svg viewBox="0 0 240 240" onClick={navigate} aria-label="Mapa de las ocho zonas. Toca un punto para navegar hasta él.">
      <circle cx="120" cy="120" r="100" fill="#132d32"/>
      <ZoneSectors exploration={exploration}/>
      <MapFog exploration={exploration} levelY={levelY}/>
      <text x="120" y="12" textAnchor="middle">N</text>
      {lotuses.filter(item => item.visible !== false && item.y === levelY && (item.energyRole==='taker'||!exploration||isCharted(exploration,item,levelY))).map(item => <circle key={item.id} cx={120+item.x/10} cy={120+item.z/10}
        r={item.energyRole === 'giver' ? 2 : 3.5} fill={item.energyRole === 'giver' ? '#ffc86e' : exploration?.checkpoints.includes(item.id) ? '#a1ffe1' : '#a4b9dd'}
        onClick={event => { if (item.energyRole === 'taker' && /^zone-[1-8]-taker-1$/.test(item.id)) { event.stopPropagation(); onOpenMap?.(item.id); } }}
        opacity={.3+.7*item.energy/item.capacity}><title>{item.name} · {Math.round(item.energy)}/{item.capacity} u</title></circle>)}
      <circle cx={120+boatState.x/10} cy={120+boatState.z/10} r="3" fill="white" stroke="#172b31"/>
      {exploration && visibleWorldContent(exploration,content).filter(point=>point.y===levelY&&['cyclone','whirlpool'].includes(point.type)).map(point=><text key={point.id} x={120+point.x/10} y={122+point.z/10} textAnchor="middle" fill="#b0e3ec" onClick={event=>{event.stopPropagation();onOpenMap?.(point.id);}}><title>{point.name}</title>{CONTENT_TYPES[point.type].symbol}</text>)}
      {boatState.destination && <g pointerEvents="none" stroke="#c0fff1" fill="none"><path d={`M${120+boatState.x/10} ${120+boatState.z/10} L${120+boatState.destination.x/10} ${120+boatState.destination.z/10}`} strokeDasharray="2 3"/><circle cx={120+boatState.destination.x/10} cy={120+boatState.destination.z/10} r="5"/></g>}
    </svg><span>Toca un punto para navegar · Detener cancela el rumbo</span><span>Dorado: fuentes · Azul: receptores · Blanco: bote</span></div>
    <ol className="zone-legend">{ZONES.map(zone => <li key={zone.id} aria-current={zone.id === current.id ? 'location' : undefined}>
      <span style={{color:zone.color}}>{zone.id}. {zone.name}</span><small>{zone.givers} fuentes · 1 objetivo</small>
    </li>)}</ol>
  </section>;
}
