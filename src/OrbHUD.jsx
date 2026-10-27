import React, { useId } from 'react';
import { ORB_RANGE, ORB_COOLDOWN } from './illusory-orb.js';

function SkillIcon({ jaunt = false }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 64 64" aria-hidden="true" className="orb-skill-icon">
    <defs>
      <radialGradient id={`${id}-body`} cx="37%" cy="30%" r="72%">
        <stop stopColor="#ddffff"/><stop offset=".18" stopColor="#7af2ff"/>
        <stop offset=".42" stopColor={jaunt ? '#ab8bff' : '#398fdf'}/>
        <stop offset=".72" stopColor="#6333a9"/><stop offset="1" stopColor="#0d123c"/>
      </radialGradient>
      <radialGradient id={`${id}-core`}>
        <stop stopColor="#fff"/><stop offset=".2" stopColor="#dcffff"/>
        <stop offset=".5" stopColor="#8befff" stopOpacity=".8"/><stop offset="1" stopColor="#64adff" stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-halo`}>
        <stop offset=".55" stopColor="#9484ff" stopOpacity="0"/>
        <stop offset=".75" stopColor="#8d9fff" stopOpacity=".4"/>
        <stop offset="1" stopColor="#7adfff" stopOpacity="0"/>
      </radialGradient>
      <clipPath id={`${id}-sphere`}><circle cx="32" cy="32" r="23"/></clipPath>
    </defs>
    <circle cx="32" cy="32" r="32" fill={`url(#${id}-halo)`}/>
    <circle cx="32" cy="32" r="23" fill={`url(#${id}-body)`} stroke="#a5edff" strokeOpacity=".65" strokeWidth=".8"/>
    <g clipPath={`url(#${id}-sphere)`}>
      <g className="orb-icon-mist" fill="none" strokeLinecap="round">
        <path d="M8 41C10 22 48 54 55 24M13 48C32 62 50 35 38 20C29 9 18 23 28 30" stroke="#a887ff" strokeWidth="5" opacity=".55"/>
        <path d="M9 39C19 24 46 45 54 24M17 49C33 52 46 34 36 22" stroke="#b8faff" strokeWidth="1.3" opacity=".8"/>
        <path d="M10 25C22 2 52 16 48 38" stroke="#70dbff" strokeWidth="3" opacity=".45"/>
      </g>
      <circle className="orb-icon-core" cx="30" cy="30" r="17" fill={`url(#${id}-core)`}/>
      <ellipse cx="24" cy="16" rx="8" ry="2.5" transform="rotate(-25 24 16)" fill="#e4ffff" opacity=".65"/>
      <path d="m41 40 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#e6dbff" opacity=".85"/>
      <circle cx="20" cy="36" r=".9" fill="#fff"/><circle cx="43" cy="22" r=".8" fill="#d4ffff"/>
    </g>
  </svg>;
}

export function OrbHUD({ boatState, sceneRef, playing, suspended }) {
  const orb = boatState.orb || { aiming: false, active: false, cooldown: 0, signal: null };
  const unavailable = !playing || suspended;
  const urgent = orb.active && orb.flightRemaining <= 1.5;
  const status = unavailable ? 'En pausa' : orb.active ? 'Pulsa el orbe para saltar' : orb.aiming ? 'Clic o toque en el escenario para lanzar' : orb.cooldown > 0 ? 'Recuperando energía' : 'Selecciona y haz clic para lanzar';
  const castDisabled = unavailable || orb.cooldown > 0;
  const action = orb.active ? 'Saltar' : orb.aiming ? 'Listo' : orb.cooldown > 0 ? 'Recarga' : 'Orbe';
  const actionLabel = orb.active ? 'Teletransportarse al orbe' : orb.aiming ? 'Cancelar apuntado del orbe' : 'Apuntar orbe ilusorio';
  return <section className={`orb-hud ${orb.active ? 'orb-in-flight' : ''} ${orb.aiming ? 'orb-aiming' : ''} ${orb.cooldown > 0 ? 'orb-cooling' : ''} ${unavailable ? 'orb-paused' : ''} ${urgent ? 'orb-urgent' : ''}`} aria-label="Habilidades y detección de energía">
    <div className="orb-actions" onPointerDown={event=>event.preventDefault()}>
      <div className="orb-slot">
        <button className={`orb-skill orb-cast ${orb.active ? 'orb-jaunt' : ''}`} aria-pressed={orb.aiming} aria-disabled={castDisabled} aria-label={actionLabel} aria-describedby="orb-cast-help" onClick={()=>{if(!castDisabled)sceneRef.current?.activateOrb();}}>
          <span className="orb-skill-art"><SkillIcon jaunt={orb.active}/>{orb.cooldown > 0 && <span className="orb-cooldown-fill" style={{height:`${orb.cooldown / ORB_COOLDOWN * 100}%`}}/>}</span>
          <kbd>{orb.active ? 'R' : 'T'}</kbd>
          <span className="orb-action-name">{action}</span>
        </button>
        {orb.active && <svg className="orb-life-ring" viewBox="0 0 60 60" role="progressbar" aria-label="Tiempo de vuelo restante" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(orb.flightFraction * 100)} aria-valuetext={`${orb.flightRemaining.toFixed(1)} segundos para saltar`}>
          <circle className="orb-life-track" cx="30" cy="30" r="27"/>
          <circle className="orb-life-value" cx="30" cy="30" r="27" pathLength="100" strokeDasharray={`${orb.flightFraction * 100} 100`} transform="rotate(-90 30 30)"/>
        </svg>}
        {orb.cooldown > 0 && <span className="orb-cooldown-meter" role="progressbar" aria-label="Recarga del orbe" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - orb.cooldown / ORB_COOLDOWN) * 100)} aria-valuetext={`${orb.cooldown.toFixed(1)} segundos para estar disponible`}/>}
        {(orb.active || orb.cooldown > 0) && <span className={`orb-timer ${orb.cooldown > 0 ? 'cooling' : ''}`} aria-hidden="true">{(orb.active ? orb.flightRemaining : orb.cooldown).toFixed(1)} s</span>}
        <span className="orb-tooltip" id="orb-cast-help" role="tooltip"><strong>{orb.active ? 'Salto etéreo' : 'Orbe ilusorio'}</strong><span>{orb.active ? 'Pulsa para transportarte al orbe. También puedes usar R.' : 'Selecciona con T o este icono y haz clic o toca el escenario: el orbe viaja en esa dirección. H o una segunda pulsación del icono cancela.'}</span><span>{ORB_RANGE} m · recarga de {ORB_COOLDOWN} s</span></span>
      </div>
      {orb.aiming && <button className="orb-cancel" aria-label="Cancelar acción del orbe" title="H · cancelar acción" onClick={()=>sceneRef.current?.cancelOrb()}><span aria-hidden="true">×</span><small>Cancelar</small></button>}
    </div>
    <div className="orb-readout">
      <strong className="orb-title">{orb.active ? 'Salto etéreo' : 'Orbe ilusorio'}</strong>
      <span className="orb-status" role="status">{status}</span>
      {[['Orbe', orb.signal], ['Velero', orb.boatSignal]].map(([name, signal])=><div className="orb-sensor" key={name}>
        <span>{name}</span>
        <div className="orb-sense" role="progressbar" aria-label={`Detección de fuentes: ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((signal?.intensity || 0) * 100)} aria-valuetext={signal ? `Fuente entre ${signal.near} y ${signal.far} metros. Intensidad ${signal.band} de ${signal.bands}` : 'Sin señal'}>
          {Array.from({ length: signal?.bands || 5 }, (_, index)=><i key={index} className={index < (signal?.band || 0) ? 'lit' : ''}/>)}
        </div>
        <small>{signal ? `${signal.near}–${signal.far} m` : 'Sin señal'}</small>
      </div>)}
    </div>
  </section>;
}
