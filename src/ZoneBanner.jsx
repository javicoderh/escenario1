import React, { useEffect, useState } from 'react';
import { zoneAt } from './world-zones.js';

export function ZoneBanner({ boatState }) {
  const zone = zoneAt(boatState), [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(timer);
  }, [zone.id]);
  if (!visible) return null;
  return <div key={zone.id} className="zone-entry" role="status" aria-live="polite">
    <span>ZONA {zone.id}</span><strong>{zone.name}</strong><small>Devuelve la vida al gran loto</small>
  </div>;
}
