# Flamming Lottus

## Actualización del 26 de octubre de 2026

Cambios incorporados desde la versión publicada en GitHub con el commit `ed97dc5`:

- **Orbe ilusorio:** habilidad de exploración y movilidad con 300 m de alcance, velocidad de 20 m/s y teletransporte al orbe. Se selecciona con T o su icono y se lanza mediante clic o toque, en línea recta, sin guía de apuntado ni cola. Recarga de 1 segundo desde que desaparece, icono cian/violeta, anillo de vuelo y cobertura de recarga.
- **Detección de energía:** señales de proximidad independientes para el velero y el orbe, con intensidades por distancia y tamaño de la fuente. El salto busca una llegada segura y desplaza la cámara con aceleración y frenado suaves.
- **Navegación móvil:** timón de pulgar, destinos mediante toque en escena o mapa, arrastre de cámara y botones para detener, centrar y ajustar el zoom.
- **Colisiones del velero:** comprobación de todo el desplazamiento para impedir atravesar lotos, deslizamiento con control manual y detención de rutas automáticas bloqueadas.
- **Mapa del mundo:** vista ampliada con M, ocho zonas con IDs estables, filtros y catálogo ampliable de islas, dungeons, hunting zones, tesoros, quests, grandes lotos y accesos entre niveles. Los lugares distinguen revelado, visita y finalización; los secretos y el contenido aún no disponible permanecen ocultos según sus reglas.
- **Premios de grandes lotos:** revelar la zona y activar un checkpoint permanente, con aviso de recompensa y anillo en la escena. Viaje gratuito entre checkpoints activos, desde 30 m del origen, con llegada segura y sin sumar distancia navegada ni generar una estela entre destinos.
- **Cinco cotas jugables:** mar, dos niveles de cielo y dos submarinos. Ciclones y remolinos conectan las cotas adyacentes mediante 64 extremos de acceso repartidos entre las ocho zonas. E o un botón cercano inicia el transporte; hay conexiones de regreso y navegación, cámara y orbe conservan la cota actual.
- **Exploración progresiva:** la niebla del mapa se despeja al navegar y se guarda por nivel. Restaurar el gran loto revela su zona y accesos en las cinco cotas. El mapa pausa la simulación y los traslados sin perder el rumbo previo.
- **Persistencia y preparación de contenido:** progreso de exploración separado del escenario y la energía, recuperación de checkpoints de partidas anteriores, inicio de partidas nuevas en Cuna del Alba y catálogo `pointsOfInterest` validado. Se incluyen el plan del primer sprint, el historial del orbe y el backlog priorizado.

Validación de esta entrega: **84 pruebas automáticas aprobadas**, compilación de producción correcta y revisión en navegador de escritorio, móvil de 390/320 px y pantalla completa horizontal. La isla tutorial, el personaje fuera del velero y el combate con daño del orbe siguen pendientes; los accesos transportan actualmente al velero.

| Control | Acción |
| --- | --- |
| WASD / timón táctil | Navegar en la cota actual |
| Clic derecho / toque en la escena | Marcar un destino de navegación |
| T / icono del orbe | Seleccionar o cancelar el orbe |
| Clic izquierdo / toque con el orbe seleccionado | Lanzar hacia el punto elegido |
| R / icono durante el vuelo | Teletransportarse al orbe |
| H / Cancelar | Cancelar el apuntado del orbe |
| M / Mapa | Abrir o cerrar el mapa del mundo |
| E / botón del acceso | Usar un ciclón o remolino a menos de 20 m |
| Escape | Cerrar el mapa o detener el velero en la escena |

## Navegar con el velero

La aplicación comienza en **Navegar**, con el velero **Espíritu de seda** junto al loto. Es el personaje controlable: un casco curvo de madera lacada azul grafito, pequeñas placas, bordes cobrizos, mástil con aparejos, asientos, timón y farol cian. Su estilo ciberpunk conserva las texturas procedurales, el tramado de 16 bits, la seda y los contornos de tinta del loto. Cambiar la paleta en **Contemplar loto** actualiza también la vela. El casco flota, la vela se hincha y su borde ondea.

La carga del loto enciende circuitos cian y magenta sobre el casco, la cubierta, el mástil y la vela. Los pulsos recorren los circuitos y aparecen descargas cortas alrededor de la flor y los bordes; su intensidad aumenta con la carga y se apagan al agotarse. El enlace entre lotos usa filamentos de tinta luminosa con ramificaciones ancladas al trazo principal y pulsos que viajan del emisor al receptor. La forma se interpola entre descargas para evitar saltos bruscos. Estos efectos comparten geometrías y no añaden luces a la escena.

La cámara sigue al velero en tercera persona, desde atrás y ligeramente elevada. Se puede arrastrar para mirar alrededor; al navegar vuelve suavemente detrás del rumbo. La rueda acerca o aleja la cámara entre 7 y 32 metros.

- Haz clic en la escena para tomar el timón. **WASD** mueve el velero respecto a la cámara, con giro suave, aceleración y frenado.
- **Clic derecho sobre el agua** marca un destino con anillos luminosos. El velero navega hasta él y frena al llegar. WASD cancela ese destino y devuelve el control manual.
- **Esc** o **Detener velero** detiene la navegación. **Centrar cámara** recupera la vista desde atrás.
- El velero colisiona con los lotos visibles al nivel del mar, incluso si están sin energía. La colisión usa el diámetro configurado de la flor y un radio de seguridad de 2,5 m para el bote; comprueba todo el trayecto para evitar atravesarlos a alta velocidad. Con WASD permite deslizarse por los bordes. Si un loto bloquea un destino automático, el bote se detiene y pide un nuevo rumbo; no calcula rutas para rodearlo.
- **Volver junto al loto** devuelve al personaje al punto de partida. Las posiciones de los objetos del escenario se conservan; el velero comienza junto al loto al recargar.
- Velocidad inicial: **4,8 m/s**, ajustable de 0,5 a 12 m/s en pasos de 0,1 m/s. El personaje permanece en su cota actual y dentro del radio del mapa.
- La carga multiplica la velocidad base por `1 + carga/capacidad`: con la base de 4,8 m/s, el bote navega a 4,8 m/s vacío, 7,2 m/s al 50 % y 9,6 m/s lleno. Conserva movimiento sin energía y acelera/frena suavemente.
- La pausa detiene el desplazamiento, la vela, la flotación y la estela; la cámara sigue disponible.

La estela deposita pinceladas inspiradas en Ōkami sobre el recorrido real. Cada marca tiene puntas afiladas, bordes de tinta oscura, fibras y cortes de pincel seco, con pigmento azul plateado bajo la luna y cálido al ocaso. Las muestras se distribuyen por distancia, siguen también los rumbos diagonales, se ensanchan y desaparecen en 6,5 segundos. Permanecen sobre el agua al alejarse el barco; volver al origen inicia un trazo nuevo. La pausa congela las marcas y su desvanecimiento. La estela, el velero y el farol comparten los reflejos del mar. El mapa de coordenadas sigue disponible en **Construir escenario**, con su cámara de vuelo libre.

### Navegación táctil

En móvil, **toca el agua para marcar un destino** o arrastra la escena para girar la cámara. El gesto necesita superar un pequeño umbral antes de convertirse en arrastre, evitando que una pulsación haga girar la vista. El **timón de pulgar** mueve el velero respecto a la cámara, con velocidad proporcional a su desplazamiento; al soltar, el bote frena. El control manual cancela el destino automático. Los botones Detener, Centrar, + y − permiten controlar la navegación y el zoom sin teclado. Pausar, ocultar la pestaña o perder el foco libera el timón.

El **mapa de zonas también admite toques y clics** para navegar: transforma la posición del dedo al espacio del mapa, marca el destino y dibuja el rumbo desde el bote. Tocar fuera del círculo no cambia el destino. Deslizar la página sobre el mapa conserva el desplazamiento normal.

## Orbe ilusorio

En Navegar, enfoca la escena y pulsa **T** o el icono inferior para seleccionar el orbe. **Haz clic izquierdo o toca la escena para lanzarlo directamente en esa dirección**, en línea recta desde la posición actual del velero y dentro de su cota. No se muestra flecha, línea de apuntado ni punto de destino. Arrastrar no dispara ni curva el recorrido; la rueda sigue controlando el zoom de la cámara. El clic debe intersectar el plano de navegación de la cota actual, debajo del horizonte. **H**, T, clic derecho, una segunda pulsación del icono o el botón Cancelar descartan la selección. Pausa, pérdida de foco o de captura del puntero interrumpen una pulsación pendiente sin disparar.

El orbe recorre hasta **300 m**, a **20 m/s** (hasta 15 segundos de vuelo), y desaparece al terminar el trayecto o alcanzar el borde navegable. Solo puede existir uno. No consume la carga del bote y atraviesa los lotos para explorar sus emisiones. La dirección queda fijada al lanzar.

El **botón inferior** selecciona o cancela el apuntado y, durante el vuelo, permite **teletransportarse**; R también ejecuta el salto. El icono representa una esfera de energía cian y violeta, con un núcleo luminoso, bruma interior animada y reflejos. El nombre, el estado y las señales de proximidad aparecen junto al botón; la ayuda se muestra al pasar el cursor o recibir foco de teclado.

Durante el vuelo, un **anillo alrededor del icono se consume** y aparecen los segundos restantes; el último segundo y medio se destaca en rosa. Al desaparecer el orbe, el anillo se reemplaza por una **cobertura roja que desciende durante 1 segundo de recarga**. El orbe en la escena es una esfera luminosa sin cola ni estela. Conserva las señales de proximidad y los destellos de disolución y llegada del salto etéreo. Los efectos respetan la pausa y no añaden luces a la escena; la animación del icono también respeta la preferencia de movimiento reducido.

Los givers visibles, al nivel del mar y con energía disponible emiten una esfera de detección: small **50 m**, small-mid **60 m**, mid **70 m**, big **80 m**, giant **90 m** y huge **100 m** de radio. No depende del detalle gráfico ni de que el loto esté en pantalla. Cada tramo de **10 m** hacia el centro aumenta la intensidad. El orbe muestra pulsos verdes más intensos y frecuentes; el indicador muestra barras y la franja aproximada de distancia de la señal más fuerte. Los takers y las fuentes agotadas no emiten una señal de recarga.

El velero también detecta las emisiones con las mismas franjas de proximidad, incluso sin lanzar el orbe o durante la recarga. El indicador distingue la señal local del barco de la señal del orbe. Alrededor del casco aparecen pulsos verdes para la detección local y violetas para repetir una señal remota recibida por el orbe; su intensidad y frecuencia aumentan con la cercanía de la fuente al sensor correspondiente.

Pulsa **R** durante el vuelo para transportar el velero a la posición actual del orbe y consumirlo. El velero llega a las coordenadas X/Z del orbe dentro de su cota actual. Si coincide con un loto, se busca agua libre cercana con espacio para el casco, dentro del mapa. Si no existe una posición segura, el traslado se rechaza y el orbe sigue volando. El traslado detiene el bote y cancela su destino sin sumar distancia navegada ni dibujar una estela entre ambos puntos. La cámara parte de su posición y orientación actuales y empieza a viajar inmediatamente hacia la nueva posición de seguimiento, con un máximo de 130 m/s. Las rampas cortas y suaves de aceleración y frenado dejan un tramo de velocidad constante: un salto de 300 m tarda aproximadamente 2,6 segundos en recuperar el encuadre. La cámara y su punto de mirada se trasladan juntos, y el seguimiento normal continúa durante todo el recorrido. Centrar cámara permite recuperar la vista inmediatamente.

La **recarga de 1 segundo comienza al desaparecer**, por fin del vuelo o por traslado; durante el vuelo no avanza. Pausa, modal y pestaña oculta suspenden el vuelo y la recarga. Cambiar de modo o volver al origen disipa el orbe e inicia su recarga. La habilidad es temporal y no se guarda al recargar la página.

La simulación está en `src/illusory-orb.js`, los controles en `src/orb-controls.js`, los efectos en `src/orb-visual.js` y el indicador en `src/OrbHUD.jsx`. Las pruebas cubren alcance, dirección del clic, emisiones por distancia, recarga de un segundo, pausa, cancelación, controles táctiles y aterrizajes seguros.

## Ciclones, remolinos y niveles jugables

El velero puede explorar las cinco cotas del mundo: **Submarino 2 (−30 m), Submarino 1 (−15 m), mar (0 m), Cielo 1 (+15 m) y Cielo 2 (+30 m)**. La navegación horizontal, los destinos, la cámara y el orbe conservan la cota actual. En esta etapa el velero es el personaje controlado también en cielo y subsuelo; el personaje fuera del barco se añadirá después.

Cada una de las ocho zonas tiene conexiones de ida y vuelta entre las cotas adyacentes. Los **ciclones** conectan mar ↔ Cielo 1 ↔ Cielo 2; los **remolinos** conectan mar ↔ Submarino 1 ↔ Submarino 2. En total hay 64 extremos de acceso. Sus espirales, embudos, anillos y flechas señalan las corrientes en la escena sin añadir luces.

Acércate a **20 m** de un acceso y pulsa **E** o su botón para ascender o descender. El cambio anima el traslado durante 2,4 segundos de simulación, detiene el rumbo y disipa un orbe activo. No requiere que hayas restaurado el gran loto: puedes encontrar los accesos explorando. Hay retorno desde los cuatro niveles exteriores y no se activan automáticamente al pasar cerca. Una salida bloqueada se rechaza sin mover el velero.

El mapa ampliado tiene un selector para las cinco cotas. La niebla se despeja alrededor del recorrido, y el territorio explorado se guarda por separado para cada nivel. Los saltos y viajes revelan la zona de llegada, sin descubrir artificialmente el trayecto intermedio. Los lugares se descubren al acercarse en su misma cota; el orbe mantiene su detección de energía, pero no cartografía el mundo por sí solo.

**Iluminar el gran loto revela su zona completa en las cinco cotas y muestra sus ciclones y remolinos.** Los secretos mantienen su regla de descubrimiento individual. Las fuentes de energía aparecen en el mapa al explorar su área o revelar la zona; los grandes lotos siguen visibles como referencias para orientarse. Las partidas anteriores conservan sus desbloqueos y comienzan a registrar el territorio navegado con esta actualización.

Abrir el mapa o pausar congela también un transporte entre niveles. El orbe se lanza y teletransporta dentro de la cota actual. La energía no se transfiere desde lotos de otra cota y los checkpoints marítimos requieren estar al nivel del mar. El cielo tiene bruma y corrientes; el subsuelo usa partículas y niebla submarina. Recargar sigue iniciando junto al loto de origen al nivel del mar, sin borrar la exploración guardada de las otras cotas.

La red está en `src/world-passages.js`, las reglas de uso en `src/passage-travel.js`, los efectos en `src/passage-visual.js` y la cartografía progresiva en `src/world-discovery.js` y `src/MapFog.jsx`. Los accesos personalizados admiten `type: "cyclone"` o `"whirlpool"` y `destinationY`, que debe ser una cota adyacente a su `y`.

Verificación de esta ampliación: 84 pruebas automáticas aprobadas, compilación correcta y recorrido en navegador por las cinco cotas con retorno al mar. También se verificaron pausa durante el traslado, persistencia de la cartografía, revelado de accesos en todos los niveles y controles táctiles a 390/320 px y en pantalla completa horizontal.

## Mapa del mundo y checkpoints

Pulsa **M** o el botón **Mapa** para abrir la cartografía de las ocho zonas, numeradas desde el norte en sentido horario. **Escape**, M o Cerrar vuelven a la escena. El mapa ampliado pausa el mundo, la transferencia de energía y el orbe; al cerrarlo se conserva la pausa previa y se retoma el rumbo que estuviera activo. También funciona con teclado, touch y pantalla completa.

Cada gran loto restaurado revela los destinos principales de su zona y activa un **checkpoint permanente**. La flor iluminada recibe un anillo verde sobre el agua y aparece un aviso con acceso al mapa. La recompensa se registra una sola vez. Los grandes lotos completos de partidas anteriores recuperan automáticamente sus desbloqueos sin repetir el aviso.

Para viajar, acércate a **30 m de un checkpoint activado**, abre el mapa, selecciona otro checkpoint activado y pulsa **Viajar al checkpoint**. El viaje es gratuito. El velero llega al nivel del mar en agua libre junto al destino; si no hay una llegada segura, se rechaza el traslado. El viaje detiene el barco, cancela su rumbo y disipa un orbe activo con su recarga de 1 s, sin sumar distancia navegada ni unir ambos puntos con una estela. La cámara conserva la transición del salto etéreo.

El mapa admite **islas, dungeons, zonas de caza, tesoros, quests y grandes lotos**, con filtros y estados independientes de revelado, visitado y completado. Acercarte a un lugar puede descubrirlo antes de revelar toda la zona. Los secretos se excluyen de la revelación general; el orbe mantiene su detección de fuentes y no descubre estos lugares automáticamente. El contenido reservado o todavía no disponible permanece oculto. La isla tutorial está reservada para el próximo sprint; todavía no existe como isla jugable.

Las partidas nuevas comienzan en **Cuna del Alba**, cerca de una fuente. Las partidas existentes conservan la ubicación de su loto de origen. Los desbloqueos se guardan por separado en `flamming-lottus-exploration-v1`: zonas reveladas, checkpoints, estado de los lugares y último checkpoint usado. El último checkpoint no modifica todavía la regla de aparición al recargar.

### Añadir lugares por zona

`src/world-content.js` define los tipos y las reservas de contenido. El escenario admite un array `pointsOfInterest`, que se valida, conserva al editar y se incluye en el JSON exportado. Cada punto necesita un ID estable, `zoneId` de 1 a 8, tipo, nombre y posición X/Y/Z dentro de su sector. Los puntos del editor con `kind: 'anchor'` siguen siendo referencias independientes.

```json
{
  "id": "zone-1-island-tutorial",
  "zoneId": 1,
  "type": "island",
  "name": "Isla del Alba",
  "x": 96,
  "y": 0,
  "z": -230,
  "reveal": "initial",
  "available": false,
  "discoveryRadius": 35,
  "visitRadius": 12
}
```

`reveal` admite `initial` (visible al comenzar), `zone` (revelado por el gran loto) o `secret` (solo descubrimiento individual). `available` se activa cuando el contenido existe en el mundo. Los tipos son `island`, `dungeon`, `hunting-zone`, `treasure`, `quest`, `cyclone` y `whirlpool`; los dos últimos requieren `destinationY` para conectar cotas adyacentes. Los `great-lotus` se obtienen de los ocho objetivos reales del escenario. Una zona revelada incorpora automáticamente los nuevos destinos disponibles con regla `zone`. Añadir un marcador no construye su isla, dungeon, misión o combate: esas entidades se incorporan en sus sprints correspondientes. Los ciclones y remolinos sí tienen representación e interacción en la escena.

La lógica comprobable está en `src/world-progress.js` y `src/checkpoint-travel.js`; el mapa en `src/WorldMap.jsx`. Las pruebas cubren migración, descubrimientos, secretos, persistencia, llegada segura a los ocho checkpoints y compatibilidad con el orbe.

## Lotos de energía y progresión

El loto de cubierta empieza con 100 unidades de capacidad y 40 segundos de autonomía completa. Recibe energía de los **givers** y restaura los **takers**. El progreso se gana por unidades entregadas. Llegar a cero apaga sus efectos sin perder nivel. La barra de energía permanece sobre la escena, también en pantalla completa.

| Nivel | Unidades entregadas acumuladas | Capacidad | Autonomía completa | Escala |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0 | 100 | 40 s | 1 |
| 2 | 100 | 140 | 90 s | 1,15 |
| 3 | 250 | 190 | 140 s | 1,30 |
| 4 | 500 | 250 | 200 s | 1,45 |
| 5 | 900 | 330 | 270 s | 1,60 |
| 6 | 1600 | 430 | 330 s | 1,60 |
| 7 | 2600 | 560 | 400 s | 1,60 |
| 8 | 4200 | 720 | 480 s | 1,60 |

En **Construir escenario → Lotos de energía** puedes crear, seleccionar, editar y eliminar hasta 320 lotos adicionales al nivel del mar. Configura nombre, rol, tamaño, diámetro real, paleta, capacidad, energía inicial, transferencia por segundo, rango y regeneración. El mapa de navegación muestra los ocho sectores de 45°, sus nombres, las reservas y la posición del bote.

El mundo se siembra automáticamente con 60 lotos (52 givers y 8 takers), además del loto de origen. Cada zona tiene una misión: recoger energía de sus fuentes pequeñas y cargar completamente su único taker huge. La migración a `zonesVersion: 2` reemplaza la antigua siembra de 160 lotos y conserva los objetos manuales, los puntos de referencia y el progreso del bote. La marca evita repetir la siembra o recrear lotos eliminados.

| Zona | Nombre | Givers | Objetivo huge |
| --- | --- | ---: | ---: |
| 1 | Cuna del Alba | 3 | 160 u |
| 2 | Jardín de Bruma | 4 | 280 u |
| 3 | Bahía de Seda | 5 | 450 u |
| 4 | Mareas de Ámbar | 6 | 650 u |
| 5 | Santuario Esmeralda | 7 | 900 u |
| 6 | Mar de los Colosos | 8 | 1200 u |
| 7 | Abismo Estelar | 9 | 1600 u |
| 8 | Corona del Loto | 10 | 2100 u |

Cada sector aumenta la reserva de sus fuentes y la demanda de su objetivo. Los givers mezclan al menos tres tamaños y siempre son más pequeños que el taker. Sus reservas suman aproximadamente 1,8 veces la demanda del objetivo, dejando margen para los viajes. Los objetivos posteriores requieren varias entregas y conservan su carga parcial. Las zonas están abiertas, sin barreras de acceso.

Al entrar o cruzar a una zona aparece su nombre en una etiqueta durante 3,4 segundos. La stamina está centrada en la parte inferior de la escena, también en pantalla completa y móvil. Al pasar el cursor sobre un loto se muestra su nombre, rol, tamaño, unidades actuales/capacidad y tasa: carga restante en givers y carga recibida en takers. La selección usa volúmenes simples a 10 Hz y funciona con modelos detallados e instancias.

| Tamaño | Diámetro inicial | Capacidad inicial del taker |
| --- | ---: | ---: |
| small | 2 m | 10 u |
| small-mid | 3 m | 20 u |
| mid | 5 m | 35 u |
| big | 8 m | 60 u |
| giant | 13 m | 100 u |
| huge | 20 m | 160 u |

Estos valores son editables. Los givers manuales empiezan llenos con 20 veces la capacidad de su tamaño, transfieren 10 u/s y regeneran 1 u/s mientras no son el enlace activo. Los takers manuales empiezan vacíos y reciben 5 u/s. El rango por defecto es 30 m. La siembra ajusta capacidades y tasas por zona, y usa un rango de 24 m en los objetivos huge.

Cada unidad transferida se descuenta del emisor. Solo existe un enlace activo: se mantiene mientras sea elegible; después se elige el más cercano. Un bote lleno puede pasar de una fuente a un taker cercano. Los lotos ocultos o fuera del nivel del mar no enlazan. Fuera de un enlace el bote consume capacidad/autonomía por segundo. La transferencia suspende ese consumo pasivo.

En todos los lotos, la saturación, la emisión y la opacidad del aura siguen la fracción energía/capacidad. A cero quedan en blanco y negro, sin aura, luz ni movimiento de pétalos o flotación propia. Recibir energía reactiva gradualmente sus efectos y movimiento. Los takers completos dejan de extraer, aumentan la saturación y multiplican por 2,4 su emisión y aura para destacar el objetivo restaurado. La carga parcial se conserva. El loto de cubierta crece hasta una escala máxima de 1,60.

Los temporizadores usan segundos activos independientes del ritmo de animación; pausa, modal y pestaña oculta suspenden la transferencia. El escenario se guarda en `flamming-lottus-world-v1` y el progreso en `flamming-lottus-energy-v1`, en localStorage. Recargar recupera ambos; editar atributos de un loto reinicia su reserva según la configuración. El JSON exportado contiene el escenario y las energías iniciales.

La lógica está en `src/lotus-energy.js` y la siembra en `src/world-zones.js`. Los antiguos helpers de `lotus-resonance.js` permanecen por compatibilidad; la escena utiliza el nuevo sistema.

## Escenario marino y modo de construcción

En **Construir escenario** está disponible la cámara de vuelo libre, y **Contemplar loto** centra la vista orbital en la flor. El loto conserva su coordenada guardada. El espacio de trabajo es un círculo de **1.000 metros de radio** (2 km de diámetro); el mar continúa más allá de ese límite. Una unidad del mundo equivale a un metro.

Coordenadas: **X** crece hacia el este, **Z** hacia el sur y **Y** hacia arriba. El origen `(0, 0, 0)` está en el centro del área al nivel del mar. Las cinco cotas están separadas por 15 metros:

| Cota | Y |
| --- | ---: |
| Elevado 2 | +30 m |
| Elevado 1 | +15 m |
| Nivel del mar | 0 m |
| Submarino 1 | −15 m |
| Submarino 2 | −30 m |

El mapa permite elegir X/Z con ajuste de 25 m. Los campos numéricos permiten posiciones precisas; se rechazan puntos fuera del círculo. La vista 3D conserva la textura y los reflejos del mar, sin cuadrícula ni anillos de nivel. El mapa lateral mantiene las referencias de coordenadas.

Selecciona una cota y una posición para crear un punto con nombre, actualizarlo o eliminarlo. Estos puntos son referencias para futuros objetos interactivos. **Situar loto aquí** coloca la flor y sus hojas en esa coordenada. **Ir a esta coordenada** acerca la cámara al punto; **Vista superior** encuadra el área completa.

### Cámara de construcción

- Clic en la escena para enfocarla; arrastrar para mirar.
- **Rueda del mouse sobre la escena**: zoom suave; hacia adelante acerca y hacia atrás aleja. También funciona con el cursor capturado. El zoom ajusta el ángulo de visión entre 18° y 85° y conserva la posición de la cámara.
- **WASD**: desplazamiento horizontal.
- **E / Espacio**: subir. **Q / Ctrl**: bajar.
- **Shift**: velocidad ×4; la velocidad inicial es de 2 m/s para desplazamientos precisos cerca del loto. Una pulsación de 0,1 segundos recorre aproximadamente 20 cm. El panel ajusta la velocidad base de 0,5 a 120 m/s en pasos de 0,5 m/s.
- **Volar** o doble clic: capturar el cursor. **Esc**: liberarlo.
- La cámara vuela libremente entre las cotas y puede salir del área para observarla; el límite circular aplica a las posiciones de los objetos.

El mapa, los campos de coordenadas y los botones de navegación también funcionan con interacción táctil. El vuelo con WASD requiere teclado. En **Contemplar loto** se usan controles orbitales: arrastrar, rueda para acercar y arrastre secundario para desplazar el centro.

El diagrama se guarda automáticamente en `localStorage` del navegador y origen actual (host y puerto). Incluye los puntos y la ubicación/visibilidad del loto. **Exportar diagrama JSON** descarga una copia con unidades, radio y cotas; la importación desde la interfaz todavía no está implementada. El esquema y su validación están en `src/world-layout.js`.

## Modelo del loto

El loto tiene un **diámetro de referencia de 2 m**, equivalente a **1/1000 del diámetro del mapa**. Se mide sobre el círculo centrado en la flor que encierra sus pétalos al inicio y con apertura completa; la silueta varía de forma natural al animarse o cerrarse. La escala uniforme se aplica también a las hojas, el aura y las partículas. La luz, la sombra de contacto, las ondas locales y la cámara de acercamiento acompañan esa escala. La coordenada del loto conserva su posición y cota.

Jardín digital interactivo creado con React, Vite y Three.js. Flamming Lotus tiene nueve pétalos largos inspirados en colas de zorro y dos capas de pétalos cortos. Cada pétalo tiene grosor, bordes suaves y 19 articulaciones con ondas, torsiones y ritmos independientes.

Seis variantes de textura procedural de 192 × 384 píxeles por paleta aportan nervaduras en relieve, vetas de color, tramado SNES y puntas claras. Los materiales tienen un brillo suave de seda; el corazón pulsa y desprende partículas luminosas. La apertura se interpola para que el cambio entre brote y flor sea suave.

Los contornos de tinta, inspirados en Ōkami, se dibujan en el material de cada pétalo con un grosor irregular y bordes suavizados. Una brisa común genera ráfagas direccionales; las puntas reaccionan con ondas independientes, algo más amplias, y un aleteo fino. El renderizado sigue el refresco de la pantalla y adapta la densidad de píxeles cuando cae por debajo de 55 FPS para favorecer la fluidez. El rendimiento final depende de la GPU y la pantalla.

La paleta inicial Fuego combina rojos, naranjos y amarillos. El aura forma lenguas irregulares que ascienden, se estiran y responden al viento. Del centro nacen 128 esporas luminosas repartidas entre dorado, zafiro, rubí y esmeralda, con pequeñas variaciones de tono y brillo dentro de cada familia. Ascienden en espiral y se desvanecen. Aura, halo y esporas utilizan tres llamadas de dibujo, con animación de las partículas en GPU y sin posprocesado de pantalla completa. Respetan la pausa y la velocidad de la animación.

El loto descansa sobre un estanque verde jade con saturación moderada, ondas procedurales, pequeños brillos y sombra de contacto. El reflejo real de la escena se difumina y deforma con las ondas; se calcula a 256 × 256 y hasta 15 veces por segundo, también al mover la cámara, sin limitar el refresco de la escena principal. La base de la flor y las hojas flotan suavemente junto a la superficie, y el agua adapta su iluminación al modo nocturno.

La escena comienza en una noche despejada de luna llena, con textura lunar, halo tenue, estrellas de distintos brillos y centelleo suave. La luz lunar ilumina los pétalos y deja un reflejo plateado en el estanque. El cielo y las estrellas se dibujan en una sola pasada. Las texturas y paletas originales de los pétalos conservan sus colores. El selector de atmósfera permite alternar entre Luna llena y Ocaso; la pausa detiene también el centelleo.

## Rendimiento y estabilidad

Los lotos lejanos comparten dos llamadas de dibujo por pasada: flores y halos mediante `InstancedMesh`. Un pool de hasta tres flores cercanas reutiliza modelos con menos geometría y articulaciones, animados a 30 Hz. Ninguna flor del pool añade luces; la cantidad de luces de la escena se mantiene estable para evitar recompilar materiales durante el recorrido. El loto de origen usa detalle medio al navegar/construir y conserva el modelo completo en Contemplar loto.

Las texturas procedurales se comparten por paleta y variante, con un máximo de 18 pares por escena. Preparar una paleta nueva se reparte entre cuadros. Al reemplazar modelos se liberan esqueletos, geometrías, materiales y buffers de instancias; las texturas compartidas se liberan al cerrar la escena. Cambiar el detalle de un loto no modifica su energía ni su estado de restauración.

La densidad de píxeles se adapta normalmente entre 0,65 y 1,25, con un techo de 1,6 millones de píxeles que puede reducirla más en pantallas grandes; equipos lentos reducen el pool cercano a una flor. La interfaz recibe actualizaciones a 4 Hz y el progreso se guarda cada cinco segundos y al salir. Una pérdida del contexto WebGL suspende la simulación y permite restaurar la escena sin contabilizar el tiempo perdido como consumo de energía.

`sceneRef.current.getPerformance()` expone FPS, densidad de píxeles, flores detalladas, llamadas de dibujo, triángulos, geometrías, texturas y programas para diagnóstico. Las pruebas cubren el límite del pool, la reducción de geometría, las texturas compartidas y la conservación de color/aura con el renderizado por instancias.

## Desarrollo

```sh
npm install
npm run dev
```

## Producción

```sh
npm run build
npm run preview
```

## Verificación del modelo

```sh
node --test tests/*.test.js
```

Comprueba la continuidad de la malla, las normales, la deformación independiente, la pausa y la estabilidad del modelo en los extremos de apertura. También verifica las cotas, el límite circular, la recuperación del diagrama, el zoom y la normalización del movimiento diagonal. Las pruebas del velero cubren llegada al destino, control manual, frenado, límites y persistencia/desvanecimiento de la espuma sobre el recorrido. La resonancia comprueba alcance y selección de fuentes, carga y descarga lineales de 40 segundos, reconexión, independencia de la tasa de cuadros, anclaje del receptor al barco, apagado de las luces y geometría del enlace. La prueba numérica no sustituye la revisión visual en un navegador con WebGL.

Arrastra para girar y usa la rueda para acercar. Incluye tres paletas, apertura de pétalos, velocidad de animación, iluminación de amanecer o noche, pausa, ambiente sonoro sintetizado, pantalla completa y exportación PNG. Requiere WebGL. Las tipografías de Google Fonts tienen alternativas locales.

Al activar la pantalla completa en **Navegar** o **Contemplar loto**, `Konoha peace ost.mp3` se reproduce automáticamente en bucle infinito. La música se pausa al salir (incluido Escape). El modo de construcción no inicia esa música al entrar en pantalla completa.
