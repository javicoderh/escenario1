import React from 'react';
import { ZONES, zoneAt } from './world-zones.js';

export function ZoneSectors() {
  return <g pointerEvents="none">{ZONES.map(zone => {
    const a = zone.angle, b = a + Math.PI/4, middle = (a+b)/2;
    const point = angle => `${120+100*Math.sin(angle)},${120-100*Math.cos(angle)}`;
    return <g key={zone.id}>
      <path d={`M120,120 L${point(a)} A100,100 0 0,1 ${point(b)} Z`} fill={zone.color} fillOpacity=".08" stroke={zone.color} strokeOpacity=".3" strokeWidth=".6"/>
      <text x={120+87*Math.sin(middle)} y={123-87*Math.cos(middle)} textAnchor="middle" fill={zone.color}>{zone.id}</text>
    </g>;
  })}</g>;
}

export function ZoneMap({ boatState }) {
  const current = zoneAt(boatState), lotuses = boatState.energy?.lotuses || [];
  const target = lotuses.find(item => item.id === `zone-${current.id}-taker-1`);
  const complete = target && target.energy >= target.capacity - 1e-8;
  return <section className="zone-map-panel">
    <div className="editor-section-title">Zona {current.id} · {current.name}</div>
    {target && <div className={`zone-mission ${complete ? 'complete' : ''}`}>
      <span>{complete ? 'ZONA RESTAURADA' : 'MISIÓN · GRAN LOTO'}</span>
      <strong>{complete ? 'El gran loto volvió a la vida' : 'Carga el taker huge de esta zona'}</strong>
      <div className="energy-track" role="progressbar" aria-label="Progreso del gran loto" aria-valuenow={Math.round(target.energy/target.capacity*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${target.energy/target.capacity*100}%`}}/></div>
      <small>{target.energy.toFixed(1)} / {target.capacity} u · {complete ? 'Objetivo completo' : 'Recoge energía de los givers'}</small>
    </div>}
    <div className="world-map"><svg viewBox="0 0 240 240" role="img" aria-label="Mapa de las ocho zonas y sus lotos">
      <circle cx="120" cy="120" r="100" fill="#132d32"/>
      <ZoneSectors/>
      <text x="120" y="12" textAnchor="middle">N</text>
      {lotuses.map(item => <circle key={item.id} cx={120+item.x/10} cy={120+item.z/10}
        r={item.energyRole === 'giver' ? 2 : 3.5} fill={item.energyRole === 'giver' ? '#ffc86e' : '#a4b9dd'}
        opacity={.3+.7*item.energy/item.capacity}><title>{item.name} · {Math.round(item.energy)}/{item.capacity} u</title></circle>)}
      <circle cx={120+boatState.x/10} cy={120+boatState.z/10} r="3" fill="white" stroke="#172b31"/>
    </svg><span>Dorado: fuentes · Azul: receptores · Blanco: bote</span></div>
    <ol className="zone-legend">{ZONES.map(zone => <li key={zone.id} aria-current={zone.id === current.id ? 'location' : undefined}>
      <span style={{color:zone.color}}>{zone.id}. {zone.name}</span><small>{zone.givers} fuentes · 1 objetivo</small>
    </li>)}</ol>
  </section>;
}
