# Orbe ilusorio: estado actual e historial

## Actualización vigente · 26 de octubre de 2026

- T o el icono seleccionan el orbe; un clic izquierdo o toque en el agua lo lanza en línea recta hacia ese punto.
- Se eliminan la guía de apuntado, el arrastre de curvatura y la cola/estela del orbe. La rueda controla el zoom.
- El botón selecciona/cancela y, durante el vuelo, teletransporta. H, T, clic derecho y Cancelar también descartan el apuntado.
- La recarga dura **1 segundo** desde que desaparece el orbe, incluido el salto con R.
- El icono es una esfera cian/violeta con núcleo luminoso y bruma animada; conserva anillo de vuelo, cobertura roja de recarga y señales de proximidad.
- Se mantienen el alcance de 300 m, los aterrizajes seguros y la transición de cámara.

Lo siguiente conserva la solicitud y la implementación anteriores como historial. La actualización de arriba reemplaza sus controles, efectos y duración de recarga.

## Historial: controles anteriores

- Mouse: T selecciona, arrastrar un punto de la línea modifica la curva en pantalla y soltar lanza.
- H cancela el apuntado o el arrastre; el botón Cancelar ofrece la misma acción sin teclado.
- Botón único: apuntar → lanzar → teletransportarse. T y R siguen disponibles.
- Touch: tocar el agua orienta el orbe, arrastrar la línea curva el recorrido y soltar conserva la vista previa; el botón Lanzar confirma.
- Icono inferior con nombre al pasar el cursor, anillo de duración y cobertura roja de recarga que desciende.
- Navegación móvil: toque en el agua o mapa de zonas para marcar destino, timón de pulgar, botones para detener, centrar y acercar/alejar.
- La curva admite altura; el salto del velero conserva un aterrizaje seguro al nivel del mar.

## Curvatura mediante clic sostenido y arrastre

Referencia de experiencia: Illusory Orb de Puck en Dota 2, adaptado al velero.

- Con la habilidad seleccionada y su trayectoria visible, permitir hacer clic en un punto de la línea del orbe; el ejemplo solicitado es un punto a 10 metros del barco.
- Mantener el clic y mover el mouse hacia la derecha debe arquear la trayectoria hacia la derecha.
- Si, sin soltar el clic, también se mueve el mouse hacia arriba, la trayectoria debe arquearse hacia arriba y hacia la derecha, siguiendo el gesto en pantalla.
- Actualizar la trayectoria virtual durante el arrastre para mostrar la curva que recorrerá el orbe.
- Adaptar la interacción actual, que curva con la rueda y lanza inmediatamente con clic izquierdo, para que permita este gesto sostenido. El momento exacto de confirmación del lanzamiento no quedó especificado.

## Icono y duración restante

- Colocar un icono pequeño de la habilidad en la parte inferior de la pantalla.
- Mostrar el nombre de la habilidad al pasar el cursor sobre el icono (hover).
- Mientras el orbe esté activo, mostrar cuánto tiempo le queda antes de desaparecer; la presentación preferida es una barra circular alrededor del icono que se vaya consumiendo.
- Durante el cooldown, mostrar el progreso sobre la misma imagen del icono. La propuesta del usuario es una cobertura o barra roja que vaya desapareciendo hacia abajo.
- Diferenciar visualmente la vida restante del orbe y el cooldown: son estados distintos.

## Contexto que se debe conservar

- T selecciona la habilidad y R teletransporta el velero al orbe, consumiéndolo.
- El alcance actual es de 300 metros de recorrido.
- El cooldown dura 6 segundos y empieza cuando el orbe desaparece, también si se consume mediante R.
- Mantener las señales de proximidad a lotos tanto en el orbe como en el barco.
- Mantener la transición de cámara trabajada previamente: comienza al teletransportarse el velero y se desplaza rápidamente con entrada y llegada suaves.

## Archivos de referencia

- `src/orb-controls.js`: selección, apuntado, entrada del mouse y lanzamiento.
- `src/illusory-orb.js`: trayectoria, estado, duración y cooldown.
- `src/orb-visual.js`: trayectoria virtual y efectos del orbe.
- `src/OrbHUD.jsx`: iconos e indicadores de la habilidad.
- `src/editor.css`: ubicación y presentación del HUD.
- `tests/illusory-orb.test.js`: comprobaciones de la lógica del orbe.

La presentación anterior usaba un panel superior y una barra horizontal de vuelo. Fue reemplazada por el botón inferior y los indicadores descritos arriba.
