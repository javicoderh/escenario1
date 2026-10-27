import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Compass, Map, X, Navigation, Flower2, ArrowRight } from 'lucide-react';
import { ZONES, zoneAt } from './world-zones.js';
import { ZoneSectors } from './ZoneMap.jsx';
import { CONTENT_TYPES } from './world-content.js';
import { checkpointTravelStatus, nearbyCheckpoint, placeStatus, visibleWorldContent } from './world-progress.js';
import { WORLD_LEVELS, levelName } from './world-levels.js';
import { MapFog } from './MapFog.jsx';
import { isCharted } from './world-discovery.js';

const statusLabels = { revealed: 'Revelado', visited: 'Visitado', completed: 'Completado' };

export function WorldMap({ boatState, exploration, content, initialId, paused, storageError, onClose, onNavigate, onTravel }) {
  const dialog = useRef(), closeButton = useRef();
  const [selectedId, setSelectedId] = useState(initialId || null), [water, setWater] = useState(null);
  const [zoneId, setZoneId] = useState(() => content.find(point => point.id === initialId)?.zoneId || zoneAt(boatState).id);
  const [filter, setFilter] = useState('all'), [message, setMessage] = useState('');
  const playerLevel=boatState.levelY ?? boatState.y ?? 0;
  const [layerY,setLayerY]=useState(()=>content.find(point=>point.id===initialId)?.y ?? playerLevel);
  const known = visibleWorldContent(exploration, content).filter(point=>point.y===layerY);
  const selected = known.find(point => point.id === selectedId);
  const points = known.filter(point => filter === 'all' || point.type === filter);
  const list = points.filter(point => point.zoneId === zoneId);
  const zone = ZONES.find(zone => zone.id === zoneId);
  const origin = nearbyCheckpoint(exploration, content, boatState);
  const travel = checkpointTravelStatus(exploration, content, boatState, selectedId, { paused });
  const active = selected && exploration.checkpoints.includes(selected.id);
  const routeBlocked=paused || layerY!==playerLevel || !!boatState.transition;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const keydown = event => {
      if (event.code === 'Escape' || (event.code === 'KeyM' && !event.ctrlKey && !event.metaKey && !event.altKey)) {
        event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) onClose(); return;
      }
      if (event.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),[tabindex="0"]')];
        const current = controls.indexOf(document.activeElement);
        if (event.shiftKey && current <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && (current === controls.length - 1 || current < 0)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { document.removeEventListener('keydown', keydown, true); document.body.style.overflow = previousOverflow; };
  }, [onClose]);
  function select(point) { setSelectedId(point.id); setZoneId(point.zoneId); setWater(null); setMessage(''); }
  function selectWater(event) {
    const svg = event.currentTarget, matrix = svg.getScreenCTM(); if (!matrix) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse()), x = (local.x - 120) * 10, z = (local.y - 120) * 10;
    if (Math.hypot(x, z) > 997.5) return;
    setWater({ x, y:layerY, z }); setSelectedId(null); setMessage('');
  }
  function travelNow() {
    const result = onTravel(selectedId);
    if (!result?.allowed) setMessage(result?.reason || 'No se pudo completar el viaje.');
  }
  const target = selected || water;
  return createPortal(<div className="world-map-overlay" onPointerDown={event => event.stopPropagation()}>
    <section ref={dialog} className="atlas" role="dialog" aria-modal="true" aria-labelledby="atlas-title" onKeyDown={event => event.stopPropagation()}>
      <header className="atlas-header"><div className="atlas-heading"><Compass size={24}/><div><span>CARTOGRAFÍA DEL MUNDO</span><h2 id="atlas-title">Entre tinta y marea</h2></div></div>
        <button ref={closeButton} className="atlas-close" aria-label="Cerrar mapa" onClick={onClose}><X size={19}/><kbd>Esc</kbd></button></header>
      <div className="atlas-summary"><span><Map size={14}/>{exploration.revealedZones.length} / 8 zonas reveladas</span><span><Flower2 size={14}/>{exploration.checkpoints.length} checkpoints activos</span><span className="atlas-paused">{paused ? 'Navegación en pausa' : 'El mundo espera mientras miras el mapa'}</span></div>
      <div className="atlas-layers" aria-label="Niveles del mundo">{[...WORLD_LEVELS].reverse().map(level=><button key={level.y} aria-pressed={layerY===level.y} onClick={()=>{setLayerY(level.y);setSelectedId(null);setWater(null);setMessage('');}}><span>{level.label}</span><small>{level.y>0?'+':''}{level.y} m {playerLevel===level.y?'· Tú':''}</small></button>)}</div>
      <div className="atlas-body">
        <nav className="atlas-zones" aria-label="Zonas del mundo">{ZONES.map(item => <button key={item.id} aria-pressed={zoneId === item.id} onClick={() => { setZoneId(item.id); setSelectedId(null); setWater(null); setMessage(''); }} style={{ '--zone-color': item.color }}>
          <b>{String(item.id).padStart(2, '0')}</b><span>{item.name}<small>{exploration.revealedZones.includes(item.id) ? 'Cartografiada' : 'Por revelar'}</small></span><span className="atlas-zone-state" aria-hidden="true">{exploration.checkpoints.includes(`zone-${item.id}-taker-1`) ? '✿' : '·'}</span>
        </button>)}</nav>
        <div className="atlas-chart"><div className="atlas-chart-title"><span>{levelName(layerY).toUpperCase()}</span><small>Radio 1.000 m</small></div>
          <svg className="atlas-svg" viewBox="0 0 240 240" onClick={selectWater} aria-label="Mapa del mundo. Selecciona un lugar o un punto del mapa para marcar un rumbo.">
            <defs><radialGradient id="atlas-water"><stop stopColor="#173f48"/><stop offset="1" stopColor="#091e2b"/></radialGradient></defs>
            <circle cx="120" cy="120" r="108" fill="none" stroke="#94b5b43b" strokeWidth=".4"/>
            <circle cx="120" cy="120" r="100" fill="url(#atlas-water)"/>
            <ZoneSectors exploration={exploration} selectedZone={zoneId}/>
            <g fill="none" stroke="#b7dcd619" strokeWidth=".3" pointerEvents="none"><circle cx="120" cy="120" r="50"/><path d="M20 120H220M120 20V220"/></g>
            <MapFog exploration={exploration} levelY={layerY}/>
            <g className="atlas-cardinals" pointerEvents="none"><text x="120" y="8">N</text><text x="232" y="122">E</text><text x="120" y="237">S</text><text x="8" y="122">O</text></g>
            {(boatState.energy?.lotuses || []).filter(item => item.visible !== false && item.y === layerY && item.energyRole === 'giver' && isCharted(exploration,item,layerY)).map(item => <circle key={item.id} cx={120+item.x/10} cy={120+item.z/10} r=".9" fill="#efc78a" opacity=".65" pointerEvents="none"/>)}
            {points.map(point => {
              const unlocked = exploration.checkpoints.includes(point.id), chosen = selectedId === point.id;
              return <g key={point.id} data-point-id={point.id} role="button" tabIndex={0} aria-label={`${point.name} · ${CONTENT_TYPES[point.type].singular}${point.type === 'great-lotus' ? unlocked ? ' · checkpoint activado' : ' · pendiente de restaurar' : ''}`}
                className={`atlas-marker ${chosen ? 'selected' : ''} ${unlocked ? 'activated' : ''}`} transform={`translate(${120+point.x/10} ${120+point.z/10})`}
                onClick={event => { event.stopPropagation(); select(point); }} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); select(point); } }}>
                <title>{point.name}</title><circle r="5.3" className="atlas-hit"/><circle r="3.6" className="atlas-pin"/>
                {point.type === 'hunting-zone' && <circle r={point.radius/10} fill="#ffa08314" stroke="#ffa08366" strokeWidth=".4" pointerEvents="none"/>}
                <text textAnchor="middle" dominantBaseline="central">{CONTENT_TYPES[point.type].symbol}</text>
              </g>;
            })}
            {water && <circle cx={120+water.x/10} cy={120+water.z/10} r="2.8" fill="none" stroke="#d5fff0" strokeWidth=".7" pointerEvents="none"/>}
            {target && layerY===playerLevel && <path d={`M${120+boatState.x/10} ${120+boatState.z/10} L${120+target.x/10} ${120+target.z/10}`} fill="none" stroke="#d0e8df66" strokeWidth=".4" strokeDasharray="1.5 1.5" pointerEvents="none"/>}
            {layerY===playerLevel && <g transform={`translate(${120+boatState.x/10} ${120+boatState.z/10})`} pointerEvents="none"><circle r="4" fill="#d9f5ef14" stroke="#d9f5ef77" strokeWidth=".3"/><path d="M0 -2.5 1.6 1.8 0 1 -1.6 1.8Z" transform={`rotate(${boatState.heading*180/Math.PI+180})`} fill="#ecfff3"/></g>}
          </svg>
          <div className="atlas-chart-key"><span>✦ Fuentes de energía</span><span>✿ Grandes lotos</span><span>▴ Tu velero</span></div>
          <p className="atlas-chart-hint">Explora para despejar el mapa de este nivel. El gran loto revela toda su zona y sus accesos.</p>
        </div>
        <aside className="atlas-details"><div className="atlas-region-title"><span>ZONA {String(zone.id).padStart(2, '0')}</span><h3 style={{ color: zone.color }}>{zone.name}</h3><p>{exploration.revealedZones.includes(zone.id) ? 'Sus rutas ya forman parte de tu mapa.' : 'Su gran loto guarda los secretos de esta región.'}</p></div>
          <div className="atlas-place-list" aria-label="Lugares conocidos de la zona">{list.length ? list.map(point => <button key={point.id} aria-pressed={selectedId === point.id} onClick={() => select(point)}><span>{CONTENT_TYPES[point.type].symbol}</span><div>{point.name}<small>{point.type === 'great-lotus' ? exploration.checkpoints.includes(point.id) ? 'Checkpoint activado' : 'Pendiente de restaurar' : statusLabels[placeStatus(exploration, point)]}</small></div><ArrowRight size={13}/></button>) : <p className="atlas-empty">Aún no has descubierto lugares de este tipo en esta zona.</p>}</div>
          <div className="atlas-selection" aria-live="polite">{selected ? <><span>{CONTENT_TYPES[selected.type].singular.toUpperCase()}</span><h4>{selected.name}</h4><p>{selected.type === 'great-lotus' ? active ? 'Este loto conecta tu viaje con otros checkpoints activados.' : `Entrega energía al gran loto para revelar ${ZONES.find(item => item.id === selected.zoneId).name} y activar su checkpoint.` : `${statusLabels[placeStatus(exploration, selected)]} · ${Math.round(Math.hypot(selected.x-boatState.x, selected.z-boatState.z))} m de tu velero`}</p></> : water ? <><span>RUMBO SOBRE EL MAR</span><h4>Un nuevo destino</h4><p>X {water.x.toFixed(0)} · Z {water.z.toFixed(0)} m</p></> : <><Navigation size={21}/><h4>Elige tu próximo rumbo</h4><p>Selecciona un marcador o toca el agua para preparar el viaje.</p></>}
            {selected && ['cyclone','whirlpool'].includes(selected.type) && <p>Conecta con {levelName(selected.destinationY)}. Acércate a 20 m y pulsa E o el botón del acceso.</p>}
            {target && <button className="atlas-route" disabled={routeBlocked} onClick={() => { if (!onNavigate(target)) setMessage('No puedes marcar un rumbo durante un cambio de nivel.'); }}><Navigation size={14}/>Marcar rumbo</button>}
            {target && layerY!==playerLevel && <small>Estás en {levelName(playerLevel)}. Usa un ciclón o remolino para llegar a este nivel.</small>}
            {selected?.type === 'great-lotus' && <><button className="atlas-travel" disabled={!travel.allowed} onClick={travelNow}><Flower2 size={15}/>Viajar al checkpoint</button><small>{travel.reason}</small></>}
            {target && <small>El rumbo es directo; los obstáculos pueden detener el velero.</small>}
            {message && <p className="atlas-error" role="status">{message}</p>}
          </div>
        </aside>
      </div>
      <footer className="atlas-footer"><div className="atlas-filters" aria-label="Filtrar lugares"><button aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setSelectedId(null); setWater(null); }}>Todos</button>{Object.entries(CONTENT_TYPES).map(([type, info]) => <button key={type} aria-pressed={filter === type} onClick={() => { setFilter(type); setSelectedId(null); setWater(null); }}><span aria-hidden="true">{info.symbol}</span>{info.label}</button>)}</div><span>{origin ? `Conectado a ${ZONES.find(zone => zone.id === origin.zoneId).name}` : 'Acércate a un gran loto activado para viajar'}</span></footer>
      {storageError && <p className="atlas-save-error" role="status">No se pudo guardar el progreso en este navegador. Tus descubrimientos se conservan durante esta sesión.</p>}
    </section>
  </div>, document.fullscreenElement || document.body);
}
