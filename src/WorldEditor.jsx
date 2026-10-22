import React, { useState } from 'react';
import { WORLD_RADIUS, GRID_STEP, LEVELS, isValidPosition } from './world-layout.js';
import { LOTUS_DIAMETER } from './lotus-scale.js';

export function WorldEditor({ layout, setLayout, selection, setSelection, flightSpeed, setFlightSpeed,
  sceneRef, cameraPosition, storageStatus }) {
  const [name, setName] = useState(''), [selectedId, setSelectedId] = useState(null);
  const valid = isValidPosition(selection);
  const activeLevel = LEVELS.find(level => level.y === selection.y);
  function choose(position, id = null, label = '') {
    setSelection({ x: position.x, y: position.y, z: position.z }); setSelectedId(id); setName(label);
  }
  function addMarker() {
    if (!valid || layout.markers.length >= 200) return;
    const marker = { ...selection, id: crypto.randomUUID(), name: name.trim() || `Punto ${layout.markers.length + 1}`, kind: 'anchor' };
    setLayout(previous => ({ ...previous, markers: [...previous.markers, marker] }));
    setSelectedId(marker.id); setName(marker.name);
  }
  function saveMarker() {
    if (!valid) return;
    setLayout(previous => ({ ...previous, markers: previous.markers.map(marker => marker.id === selectedId
      ? { ...marker, ...selection, name: name.trim() || marker.name } : marker) }));
  }
  function exportLayout() {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'escenario-mar-1km.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const mapPoint = position => ({ x: 120 + position.x / 10, y: 120 + position.z / 10 });
  const cameraMap = mapPoint(cameraPosition), cursorMap = mapPoint(selection), lotusMap = mapPoint(layout.lotus);
  function selectMap(event) {
    const point = event.currentTarget.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    const position = { x: Math.round((local.x - 120) * 10 / GRID_STEP) * GRID_STEP,
      y: selection.y, z: Math.round((local.y - 120) * 10 / GRID_STEP) * GRID_STEP };
    if (isValidPosition(position)) choose(position);
  }
  return <aside className="world-editor" aria-label="Diagrama del escenario">
    <div className="editor-heading"><div><span className="eyebrow">DIAGRAMA DEL MAR</span><h2>Un mundo por construir</h2></div><span className="meter-tag">1 u = 1 m</span></div>
    <p className="editor-description">Radio de 1.000 m · diámetro de 2 km.<br/>Selecciona una cota y marca el lugar de cada objeto.</p>
    <div className="world-map">
      <svg viewBox="0 0 240 240" onClick={selectMap} aria-label="Mapa del área circular. X este, Z sur. Selecciona coordenadas con un clic o usa los campos de abajo.">
        <defs><pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#84b7bd" strokeOpacity=".15" strokeWidth=".5"/></pattern></defs>
        <circle cx="120" cy="120" r="100" fill="#132d32" stroke={activeLevel.color} strokeOpacity=".7"/>
        <circle cx="120" cy="120" r="100" fill="url(#map-grid)"/>
        <circle cx="120" cy="120" r="50" fill="none" stroke="#9bd8db" strokeOpacity=".18" strokeDasharray="2 3"/>
        <path d="M20 120H220M120 20V220" stroke="#a5d4cd" strokeOpacity=".4" strokeWidth=".7"/>
        <text x="120" y="12" textAnchor="middle">N / −Z</text><text x="120" y="235" textAnchor="middle">S / +Z</text>
        <text x="4" y="115">−X</text><text x="224" y="115">+X</text>
        {layout.markers.map(marker => { const point = mapPoint(marker); return <circle key={marker.id} cx={point.x} cy={point.y} r={marker.id === selectedId ? 4 : 3}
          fill={LEVELS.find(level => level.y === marker.y).color} opacity={marker.y === selection.y ? 1 : .25}
          onClick={event => { event.stopPropagation(); choose(marker, marker.id, marker.name); }}><title>{marker.name} · {marker.x}, {marker.y}, {marker.z}</title></circle>; })}
        {layout.lotus.visible && <text x={lotusMap.x} y={lotusMap.y + 3} textAnchor="middle" className="map-lotus">✿<title>Loto</title></text>}
        {valid && <path d={`M${cursorMap.x - 5} ${cursorMap.y}h10M${cursorMap.x} ${cursorMap.y - 5}v10`} stroke="white" strokeWidth="1.5" pointerEvents="none"/>}
        {Math.hypot(cameraPosition.x, cameraPosition.z) <= WORLD_RADIUS && <circle cx={cameraMap.x} cy={cameraMap.y} r="2.5" fill="#fff" stroke="#132d32" pointerEvents="none"><title>Cámara</title></circle>}
      </svg>
      <span>Clic para situar · ajuste de 25 m</span>
    </div>
    <fieldset className="level-selector"><legend>Cotas de trabajo · separación de 15 m</legend>
      {[...LEVELS].reverse().map(level => <button key={level.id} aria-pressed={selection.y === level.y}
        className={selection.y === level.y ? 'selected' : ''} style={{ '--level-color': level.color }}
        onClick={() => setSelection(previous => ({ ...previous, y: level.y }))}><span>{level.label}</span><b>{level.y > 0 ? '+' : ''}{level.y} m</b></button>)}
    </fieldset>
    <div className="coordinate-inputs">{['x','y','z'].map(axis => <label key={axis}>{axis.toUpperCase()} <span>m</span>
      <input aria-label={`Coordenada ${axis.toUpperCase()}`} type="number" step="1" min={axis === 'y' ? -30 : -1000} max={axis === 'y' ? 30 : 1000}
        readOnly={axis === 'y'} value={selection[axis]} onChange={event => setSelection(previous => ({ ...previous, [axis]: event.target.value === '' ? '' : Number(event.target.value) }))}/></label>)}</div>
    {!valid && <p className="editor-error" role="alert">Introduce X y Z dentro del círculo de 1.000 m de radio.</p>}
    <div className="editor-actions"><button disabled={!valid} onClick={() => sceneRef.current?.goTo(selection)}>Ir a esta coordenada</button><button onClick={() => sceneRef.current?.overview()}>Vista superior · 2 km</button></div>
    <p className="editor-hint">Las cotas son referencias; puedes volar entre ellas. Usa el mapa para situar los puntos sobre el mar.</p>
    <div className="editor-section"><label className="editor-field">Nombre del punto<input value={name} maxLength={60} placeholder="Portal, plataforma, zona de juego…" onChange={event => setName(event.target.value)}/></label>
      <div className="editor-actions"><button disabled={!valid || layout.markers.length >= 200} onClick={addMarker}>+ Crear punto</button>{selectedId && <button disabled={!valid} onClick={saveMarker}>Actualizar punto</button>}</div>
      <p className="editor-hint">Puntos de referencia para futuros objetos interactivos.</p>
      {layout.markers.length > 0 && <ul className="anchor-list">{layout.markers.map(marker => <li key={marker.id} className={selectedId === marker.id ? 'selected' : ''}>
        <button onClick={() => choose(marker, marker.id, marker.name)}><strong>{marker.name}</strong><span>{marker.x}, {marker.y}, {marker.z} m</span></button>
        <button aria-label={`Eliminar ${marker.name}`} onClick={() => { setLayout(previous => ({ ...previous, markers: previous.markers.filter(item => item.id !== marker.id) })); if (selectedId === marker.id) setSelectedId(null); }}>×</button>
      </li>)}</ul>}
    </div>
    <div className="editor-section"><div className="editor-section-title">Loto <span>{layout.lotus.visible ? `${layout.lotus.x}, ${layout.lotus.y}, ${layout.lotus.z} m` : 'En reserva'}</span></div>
      <p className="editor-hint">Diámetro de referencia: {LOTUS_DIAMETER} m · 1/1000 del ancho del mapa.</p>
      <div className="editor-actions"><button disabled={!valid} onClick={() => setLayout(previous => ({ ...previous, lotus: { ...selection, visible: true } }))}>Situar loto aquí</button>
        <button onClick={() => setLayout(previous => ({ ...previous, lotus: { ...previous.lotus, visible: !previous.lotus.visible } }))}>{layout.lotus.visible ? 'Ocultar loto' : 'Mostrar loto'}</button></div>
      {layout.lotus.visible && <button className="text-action" onClick={() => { choose(layout.lotus); sceneRef.current?.focusLotus(); }}>Acercar cámara al loto ↗</button>}
    </div>
    <div className="editor-section"><label className="editor-field">Velocidad de vuelo <span>{flightSpeed} m/s</span><input type="range" min="0.5" max="120" step="0.5" value={flightSpeed} onChange={event => setFlightSpeed(Number(event.target.value))}/></label>
      <p className="editor-hint">WASD · E / Espacio subir · Q / Ctrl bajar<br/>Rueda para zoom · Shift ×4 · arrastrar para mirar · Esc liberar</p>
    </div>
    <button className="capture" onClick={exportLayout}>Exportar diagrama JSON <span>↓</span></button>
    <p className="storage-status" role="status">{storageStatus}</p>
  </aside>;
}
