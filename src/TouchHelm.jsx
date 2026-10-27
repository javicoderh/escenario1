import React, { useEffect, useRef, useState } from 'react';

export function TouchHelm({ sceneRef, disabled }) {
  const active = useRef(null), pad = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  function release() {
    const id = active.current; active.current = null;
    sceneRef.current?.setHelm(0, 0); setStick({ x: 0, y: 0 });
    if (id !== null && pad.current?.hasPointerCapture(id)) pad.current.releasePointerCapture(id);
  }
  useEffect(() => {
    const clear = () => release();
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => { window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); sceneRef.current?.setHelm(0, 0); };
  }, [sceneRef]);
  useEffect(() => { if (disabled) release(); }, [disabled]);
  function move(event) {
    if (active.current !== event.pointerId || disabled) return;
    const rect = pad.current.getBoundingClientRect(), radius = rect.width * .32;
    let x = (event.clientX - rect.left - rect.width / 2) / radius;
    let y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    setStick({ x: x * radius, y: y * radius });
    sceneRef.current?.setHelm(length < .14 ? 0 : x, length < .14 ? 0 : y);
  }
  return <div className="touch-navigation" aria-label="Controles táctiles de navegación">
    <div className="touch-helm-wrap">
      <div ref={pad} className="touch-helm" aria-label="Timón táctil: arrastra para navegar" aria-disabled={disabled}
        onPointerDown={event => { if (disabled || active.current !== null) return; event.preventDefault(); active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
        onPointerMove={move} onPointerUp={event => { if (event.pointerId === active.current) release(); }}
        onPointerCancel={event => { if (event.pointerId === active.current) release(); }}
        onLostPointerCapture={event => { if (event.pointerId === active.current) release(); }}>
        <span className="touch-helm-cross" aria-hidden="true">✣</span>
        <span className="touch-helm-stick" style={{ transform: `translate(${stick.x}px,${stick.y}px)` }}/>
      </div><span>Arrastra para navegar</span>
    </div>
    <div className="touch-boat-actions" onPointerDown={event => event.preventDefault()}>
      <button aria-label="Detener velero" onClick={() => { release(); sceneRef.current?.stopBoat(); }}>■<span>Detener</span></button>
      <button aria-label="Centrar cámara en el velero" onClick={() => sceneRef.current?.focusBoat()}>◎<span>Centrar</span></button>
      <button aria-label="Acercar cámara" onClick={() => sceneRef.current?.zoomBoat(.8)}>＋</button>
      <button aria-label="Alejar cámara" onClick={() => sceneRef.current?.zoomBoat(1.25)}>−</button>
    </div>
  </div>;
}
