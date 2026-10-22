import React from 'react';
import { zoneAt } from './world-zones.js';

export function EnergyHUD({ boatState }) {
  const energy = boatState.energy || { charge:0, units:0, capacity:100, level:1 };
  const percent = Math.round(energy.charge*100), zone = zoneAt(boatState);
  return <div className={`energy-hud ${percent <= 20 ? 'low' : ''}`}>
    <span>Zona {zone.id} · {zone.name}</span>
    <div className="energy-hud-label"><strong>Loto · Nivel {energy.level}</strong><b>{percent}%</b></div>
    <div className="stamina-track" role="progressbar" aria-label="Energía del loto del bote" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${energy.units.toFixed(1)} de ${energy.capacity} unidades`}><span style={{width:`${percent}%`}}/></div>
    <small>{energy.units.toFixed(1)} / {energy.capacity} u · {energy.connected ? energy.role === 'giver' ? 'Recargando' : 'Entregando energía' : percent ? 'Consumiendo energía' : 'Sin energía'}</small>
  </div>;
}
