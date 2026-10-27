import React, { useId } from 'react';
import { ZONES } from './world-zones.js';

export function MapFog({ exploration, levelY=0 }) {
  const id=useId().replace(/:/g,'');
  if(!exploration)return null;
  return <g pointerEvents="none" aria-hidden="true">
    <defs><filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter><mask id={`${id}-fog`} maskUnits="userSpaceOnUse" x="19" y="19" width="202" height="202">
      <circle cx="120" cy="120" r="100" fill="white"/>
      <g filter={`url(#${id}-soft)`}>{(exploration.charted?.[levelY] || []).map(cell=><circle key={cell} cx={25+cell%20*10} cy={25+Math.floor(cell/20)*10} r="7.4" fill="black"/>)}</g>
      {ZONES.filter(zone=>exploration.revealedZones.includes(zone.id)).map(zone=>{
        const a=zone.angle,b=a+Math.PI/4,point=angle=>`${120+100.5*Math.sin(angle)},${120-100.5*Math.cos(angle)}`;
        return <path key={zone.id} d={`M120 120L${point(a)}A100.5 100.5 0 0 1 ${point(b)}Z`} fill="black"/>;
      })}
    </mask></defs>
    <circle cx="120" cy="120" r="100" fill="#020b15" opacity=".86" mask={`url(#${id}-fog)`}/>
  </g>;
}
