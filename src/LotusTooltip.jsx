import React from 'react';

export function LotusTooltip({ hover }) {
  if (!hover) return null;
  const { lotus, x, y, connected } = hover;
  const giver = lotus.energyRole === 'giver', percent = Math.round(lotus.energy / lotus.capacity * 100);
  const complete = lotus.energy >= lotus.capacity - 1e-8;
  return <div className="lotus-tooltip" role="tooltip" style={{left:x,top:y}}>
    <span>{giver ? 'GIVER · FUENTE' : 'TAKER · RECEPTOR'} · {lotus.size}</span>
    <strong>{lotus.name}</strong>
    <p>{giver ? 'Carga restante' : 'Carga recibida'} <b>{lotus.energy.toFixed(1)} / {lotus.capacity} u</b></p>
    <div className="energy-track"><span style={{width:`${percent}%`}}/></div>
    <small>{!giver && complete ? 'Loto restaurado · Objetivo completo' : connected ? `${giver ? 'Entregando' : 'Recibiendo'} ${lotus.rate} u/s` : `${percent}% · ${giver ? 'Entrega' : 'Recibe'} hasta ${lotus.rate} u/s`}</small>
  </div>;
}
