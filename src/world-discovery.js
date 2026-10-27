import { zoneAt } from './world-zones.js';
import { validLevel } from './world-levels.js';

export const CHART_SIZE = 20;
export const CHART_CELL = 100;
export const DISCOVERY_RADIUS = 130;
export function chartCell(x,z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x,z)>1000) return null;
  const col=Math.min(19,Math.max(0,Math.floor((x+1000)/CHART_CELL)));
  const row=Math.min(19,Math.max(0,Math.floor((z+1000)/CHART_CELL)));
  return row*CHART_SIZE+col;
}
export function discoverChart(progress,position) {
  const y=position?.y ?? 0;
  if (!position || !validLevel(y) || chartCell(position.x,position.z)===null) return progress;
  const cells=new Set(progress.charted?.[y] || []),before=cells.size;
  for(let row=0;row<CHART_SIZE;row++)for(let col=0;col<CHART_SIZE;col++){
    const x=-950+col*CHART_CELL,z=-950+row*CHART_CELL;
    if(Math.hypot(x-position.x,z-position.z)<=DISCOVERY_RADIUS+CHART_CELL*.5 && Math.hypot(x,z)<=1000+CHART_CELL*.5)
      cells.add(row*CHART_SIZE+col);
  }
  return cells.size===before?progress:{...progress,charted:{...progress.charted,[y]:[...cells].sort((a,b)=>a-b)}};
}
export function isCharted(progress,point,y=point.y ?? 0) {
  if (!validLevel(y) || (point.y ?? 0)!==y) return false;
  if(progress.revealedZones.includes(zoneAt(point).id))return true;
  return (progress.charted?.[y] || []).includes(chartCell(point.x,point.z));
}
