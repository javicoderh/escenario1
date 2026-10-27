export const WORLD_LEVELS = [
  { id: -2, y: -30, label: 'Submarino 2', color: '#648fe3' },
  { id: -1, y: -15, label: 'Submarino 1', color: '#65bfd8' },
  { id: 0, y: 0, label: 'Nivel del mar', color: '#a8d7b0' },
  { id: 1, y: 15, label: 'Cielo 1', color: '#ebcf8a' },
  { id: 2, y: 30, label: 'Cielo 2', color: '#e9a88d' },
];
export const validLevel = y => WORLD_LEVELS.some(level => level.y === y);
export const levelName = y => WORLD_LEVELS.find(level => level.y === y)?.label || 'Entre niveles';
