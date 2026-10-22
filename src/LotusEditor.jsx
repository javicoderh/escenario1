import React, { useState } from 'react';
import { LOTUS_SIZES, createWaterLotus } from './lotus-energy.js';
import { MAX_WATER_LOTUSES } from './world-zones.js';

export function LotusEditor({ layout, setLayout, selection, valid, setSelection }) {
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(() => createWaterLotus({ energyRole: 'taker' }));
  const field = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  function save() {
    if (!valid || selection.y !== 0 || (!selected && layout.lotuses.length >= MAX_WATER_LOTUSES)) return;
    const item = createWaterLotus({ ...draft, ...selection, id: selected || crypto.randomUUID() });
    setLayout(previous => ({ ...previous, lotuses: selected ? previous.lotuses.map(lotus => lotus.id === selected ? item : lotus) : [...previous.lotuses, item] }));
    setSelected(item.id); setDraft(item);
  }
  return <div className="editor-section">
    <div className="editor-section-title">Lotos de energía <span>{layout.lotuses.length} / {MAX_WATER_LOTUSES}</span></div>
    <button className="text-action" disabled={layout.lotuses.length > MAX_WATER_LOTUSES - 7} onClick={() => {
      const demo = Object.keys(LOTUS_SIZES).map((size,index) => createWaterLotus({ id: crypto.randomUUID(),
        name: `Restaurar ${size}`, energyRole: 'taker', size, x: 50+index*35, z: 20, range: 15, palette: ['ember','sakura','moon'][index%3] }));
      demo.push(createWaterLotus({ id: crypto.randomUUID(), name: 'Fuente del recorrido', energyRole: 'giver', size: 'mid', x:140,z:-25 }));
      setLayout(previous => ({ ...previous, lotuses: [...previous.lotuses,...demo] }));
    }}>+ Crear recorrido de prueba (7 lotos)</button>
    <label className="editor-field">Nombre<input value={draft.name} maxLength={60} onChange={event => field('name', event.target.value)}/></label>
    <label className="editor-field">Rol<select value={draft.energyRole} onChange={event => setDraft(createWaterLotus({ ...draft, energyRole: event.target.value, capacity: undefined, energy: undefined, rate: undefined, regeneration: undefined }))}><option value="giver">Giver · entrega al bote</option><option value="taker">Taker · recibe del bote</option></select></label>
    <label className="editor-field">Tamaño<select value={draft.size} onChange={event => setDraft(createWaterLotus({ ...draft, size: event.target.value, diameter: undefined, capacity: undefined, energy: undefined }))}>{Object.keys(LOTUS_SIZES).map(size => <option key={size}>{size}</option>)}</select></label>
    <label className="editor-field">Paleta<select value={draft.palette} onChange={event => field('palette', event.target.value)}><option value="ember">Fuego</option><option value="sakura">Sakura</option><option value="moon">Luna</option></select></label>
    {[['diameter','Diámetro (m)',.5,60],['capacity','Capacidad (u)',1,100000],['energy','Energía inicial (u)',0,draft.capacity],['rate','Transferencia (u/s)',.1,1000],['range','Rango de enlace (m)',1,200], ...(draft.energyRole === 'giver' ? [['regeneration','Regeneración (u/s)',0,1000]] : [])].map(([key,label,min,max]) => <label key={key} className="editor-field">{label}<input type="number" min={min} max={max} step="0.1" value={draft[key]} onChange={event => field(key, Number(event.target.value))}/></label>)}
    <p className="editor-hint">Se coloca en las coordenadas seleccionadas, al nivel del mar. Editar atributos reinicia su reserva a la energía inicial.</p>
    <div className="editor-actions"><button disabled={!valid || selection.y !== 0 || (!selected && layout.lotuses.length >= MAX_WATER_LOTUSES)} onClick={save}>{selected ? 'Actualizar loto' : '+ Crear loto'}</button><button onClick={() => { setSelected(null); setDraft(createWaterLotus({ energyRole: 'taker' })); }}>Nuevo</button></div>
    <ul className="anchor-list">{layout.lotuses.map(item => <li key={item.id} className={selected === item.id ? 'selected' : ''}><button onClick={() => { setSelected(item.id); setDraft(item); setSelection({ x:item.x,y:0,z:item.z }); }}><strong>{item.energyRole === 'giver' ? '✦' : '✿'} {item.name}</strong><span>{item.size} · {item.x}, {item.z} m</span></button><button aria-label={`Eliminar loto ${item.name}`} onClick={() => { setLayout(previous => ({ ...previous, lotuses: previous.lotuses.filter(lotus => lotus.id !== item.id) })); if (selected === item.id) setSelected(null); }}>×</button></li>)}</ul>
  </div>;
}
