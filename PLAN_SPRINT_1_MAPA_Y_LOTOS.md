# Plan del sprint 1: mapa del mundo y grandes lotos

Estado: implementado. Se conserva el plan como referencia de alcance y criterios.
Fecha: 26 de octubre de 2026.

## Entrega

- Mapa ampliado con M/botón, ocho zonas, filtros, selección, navegación y controles de teclado/touch.
- Catálogo extensible `pointsOfInterest`, validado y persistido en el escenario; isla tutorial reservada y oculta hasta su implementación física.
- Restauración de grandes lotos con revelado, checkpoint permanente, anillo en la escena y aviso de recompensa.
- Viaje gratuito entre checkpoints cercanos y activados, aterrizaje seguro y transición de cámara compartida con el orbe.
- Progreso versionado separado, migración silenciosa de objetivos ya completados e inicio de partidas nuevas en zona 1.
- Descubrimientos individuales y secretos; pausa del mapa con conservación del rumbo y de la pausa previa.

Las islas, quests, tesoros, dungeons y zonas de caza físicas se añadirán en los siguientes sprints. El mapa ya admite sus datos y estados; no se publican destinos ficticios como si fueran contenido jugable.

Verificación de la entrega: 75 pruebas automáticas aprobadas y compilación de producción correcta. Revisión en navegador de partida nueva en zona 1, migración, recompensa, secretos ocultos, pausa, selección con teclado, viaje entre checkpoints, rumbo desde el mapa y persistencia al recargar; también touch, 320 px y pantalla completa horizontal. Los lugares de prueba de esas comprobaciones se cargaron únicamente en un perfil de navegador de prueba.

## Objetivo

Construir el ciclo: explorar → recoger energía → iluminar el gran loto → revelar los destinos de la zona → activar un checkpoint → viajar entre checkpoints activados.

Este sprint establece la estructura para incorporar después la isla tutorial de la zona 1, islas adicionales, dungeons, hunting zones, tesoros y quests.

## Orden permanente de las zonas

Se conserva la distribución actual: ocho sectores de 45°, numerados desde el norte en sentido horario. Los ángulos se miden desde el norte; X crece al este y Z al sur. El orden expresa la progresión recomendada y no impone barreras para navegar.

| Orden / zoneId | Nombre | Sector | Fuentes actuales | Carga del gran loto | Función propuesta en la progresión |
| --- | --- | --- | ---: | ---: | --- |
| 1 | Cuna del Alba | 0°–45° | 3 | 160 u | Inicio e isla tutorial; primera revelación y primer checkpoint. |
| 2 | Jardín de Bruma | 45°–90° | 4 | 280 u | Primera exploración autónoma y primera conexión entre checkpoints. |
| 3 | Bahía de Seda | 90°–135° | 5 | 450 u | Ampliación de rutas y primeras decisiones entre destinos. |
| 4 | Mareas de Ámbar | 135°–180° | 6 | 650 u | Desarrollo de la aventura y contenido de dificultad intermedia. |
| 5 | Santuario Esmeralda | 180°–225° | 7 | 900 u | Mayor especialización del personaje y del velero. |
| 6 | Mar de los Colosos | 225°–270° | 8 | 1200 u | Encuentros y expediciones avanzados. |
| 7 | Abismo Estelar | 270°–315° | 9 | 1600 u | Desafíos de preparación para el tramo final. |
| 8 | Corona del Loto | 315°–360° | 10 | 2100 u | Culminación de la progresión inicial del mundo. |

Las funciones narrativas son una propuesta para contenido posterior; no fijan todavía niveles, enemigos ni recompensas. Los nombres, posiciones y requisitos de carga ya existen en `src/world-zones.js`.

Los IDs de zona deben ser explícitos y estables, independientes de la posición del elemento en el array. Mantener los IDs existentes de los grandes lotos: `zone-1-taker-1` hasta `zone-8-taker-1`, para conservar las partidas.

### Organización del contenido por zona

Cada zona tendrá un catálogo de puntos de interés con estos tipos:

- `island`: isla; la primera será la isla tutorial de Cuna del Alba.
- `dungeon`: entrada a una dungeon.
- `hunting-zone`: área de caza, con centro y radio o límites.
- `treasure`: tesoro persistente o descubrimiento único.
- `quest`: punto de inicio o entrega de una misión; la misión puede referenciar varios destinos.
- `great-lotus`: gran loto y checkpoint asociado.

Cada registro tendrá un ID permanente, `zoneId`, tipo, nombre, posición, regla de revelado y disponibilidad. Los futuros sistemas podrán asociar una entidad 3D, una misión o una recompensa mediante referencias a ese ID.

Ejemplos de IDs: `zone-1-island-tutorial`, `zone-2-dungeon-01`, `zone-3-hunting-01`. No derivar IDs del nombre visible. Validar que la posición pertenezca al sector declarado y al área navegable; definir expresamente las excepciones si más adelante una isla cruza sectores.

El catálogo se podrá ordenar por zona y tipo. No es necesario inventar ahora todas las islas o quests de las ocho zonas: se prepara la estructura y se añade contenido conforme se diseña.

## Reglas de mapa y descubrimiento

1. El mapa muestra desde el comienzo las ocho zonas numeradas, sus nombres, límites y la posición del velero.
2. Cada gran loto funciona como referencia visible, con estado pendiente o activado. Las fuentes de energía existentes mantienen su representación actual.
3. Los puntos de interés principales de una zona se revelan al restaurar su gran loto. También pueden descubrirse individualmente al acercarse; el radio se configura por punto.
4. El jugador descubre lugares con su personaje controlado, inicialmente el velero. En este sprint el sensor del orbe continúa detectando fuentes; no revela automáticamente tesoros o dungeons.
5. Separar revelado, visitado y completado. Ver un destino en el mapa no cuenta como visita ni concede su recompensa.
6. Los secretos pueden excluirse del revelado general y requerir exploración o, en el futuro, una quest.
7. La isla tutorial tendrá visibilidad inicial cuando se implemente. Su ubicación quedará reservada en el catálogo, sin presentar una isla inexistente como destino jugable.
8. No mostrar información de puntos ocultos en listas, tooltips o filtros. Los filtros no deben permitir saltarse el descubrimiento.

## Reglas de los grandes lotos

- Completar la carga de un gran loto activa una recompensa única: zona revelada y checkpoint permanente.
- Presentar una secuencia breve: iluminación de la flor → aviso de zona revelada → checkpoint activado → acceso al mapa.
- La recompensa se identifica por el ID del gran loto y no se repite por permanecer cerca, recargar o volver a transferir energía.
- Una vez desbloqueada, la zona y su checkpoint permanecen activos aunque después se edite la energía del loto. No vincular el desbloqueo permanente únicamente a su porcentaje de carga actual.
- Cargar parcialmente un gran loto conserva su progreso, pero no activa la recompensa.
- Los lotos normales mantienen su función actual. Los lotos que otorguen habilidades se incorporarán en otro sprint, mediante recompensas asociadas a sus IDs.
- Checkpoint significa en este sprint nodo persistente de viaje rápido. Reaparición tras morir se definirá junto con el sistema de muerte.

## Viaje rápido

- Gratuito entre grandes lotos activados; el jugador debe estar cerca del checkpoint de origen.
- Propuesta inicial: radio de interacción de 30 m desde el centro del gran loto. Validarlo con el diámetro y las colisiones de los ocho lotos, y ajustarlo si fuera necesario.
- Seleccionar otro checkpoint activado en el mapa muestra su nombre y habilita «Viajar». No se puede viajar a un checkpoint pendiente ni al mismo nodo de origen.
- Mostrar el motivo cuando el viaje no esté disponible: acercarse a un checkpoint, destino sin activar, pausa o aterrizaje bloqueado.
- Llegar al nivel del mar en una posición segura junto al loto, considerando el tamaño del velero, el diámetro de los lotos y los límites del mapa. Si no hay espacio, rechazar el viaje sin alterar posición ni progreso.
- Detener el velero, cancelar el destino y el apuntado, y disipar un orbe activo aplicando su recarga de 1 s. No sumar distancia navegada ni dibujar una estela entre checkpoints.
- Reutilizar la transición de cámara del teletransporte; conservar controles de recentrado y pausa.
- Preparar una condición que permita impedir el viaje durante combate. Mientras no exista combate, esa condición permanece inactiva.
- Activar solo el primer checkpoint ya revela la zona; para probar un viaje completo hacen falta al menos dos activados.

## Implementación en orden

### 1. Catálogo del mundo y datos de progreso

- Hacer explícitos los IDs 1–8 del catálogo de zonas sin cambiar sus sectores ni los IDs de lotos existentes.
- Crear el catálogo de puntos de interés y validadores de IDs, tipos, zonas y posiciones.
- Separar los datos del mundo de los datos del jugador. El catálogo describe los lugares; el progreso guarda zonas reveladas, checkpoints activados y estados de descubrimiento, visita y finalización por ID.
- Usar una única operación de progresión para registrar conjuntamente la revelación y la activación del checkpoint.
- Para nuevas partidas, preparar un inicio seguro dentro de Cuna del Alba. El inicio actual junto a `(5, 9)` cae en la zona 4; corregirlo expresamente al implementar el onboarding. No trasladar partidas existentes por esta adaptación.

### 2. Mapa ampliado

- Mantener el mapa lateral y añadir una vista ampliada accesible mediante botón y tecla M, con cierre por Escape y botón táctil.
- Añadir leyenda y filtros para islas, dungeons, hunting zones, tesoros, quests y checkpoints.
- Mostrar el detalle de un punto seleccionado: nombre, tipo, zona y estado conocido. Si es un checkpoint, mostrar las condiciones de viaje.
- Distinguir «Marcar rumbo» de «Viajar». Pulsar un marcador selecciona ese punto sin activar también la navegación al agua de fondo.
- Mantener navegación por clic/toque sobre el agua, indicando que marca un rumbo directo y no calcula rutas alrededor de obstáculos.
- Pausar la simulación mientras el mapa ampliado esté abierto y bloquear los controles de escena. En un viaje confirmado, cerrar el mapa y continuar la transición, respetando la pausa previa del usuario.
- Verificar teclado, touch, pantallas estrechas y pantalla completa.

### 3. Recompensa y revelación por gran loto

- Detectar la transición a carga completa de los ocho objetivos de zona.
- Registrar la recompensa una sola vez y actualizar inmediatamente mapa, misión y aspecto del checkpoint.
- Permitir descubrimientos individuales y separar su estado del revelado general de zona.
- Preparar datos de prueba para comprobar todos los tipos de marcadores. Los puntos ficticios de prueba no se publican como contenido jugable.

### 4. Red de checkpoints

- Detectar cercanía al checkpoint de origen.
- Añadir selección de destino, validación y traslado seguro.
- Compartir la lógica de traslado con el orbe cuando resulte apropiado: colisiones, cancelación de movimiento, estela y cámara. Evitar dos implementaciones divergentes.

### 5. Persistencia y compatibilidad

- Guardar el progreso nuevo en un esquema versionado, por ejemplo `flamming-lottus-exploration-v1`, sin sobrescribir escenario o energía existentes.
- Migrar partidas que ya tengan grandes lotos completos: activar las zonas y checkpoints correspondientes una sola vez, sin repetir la celebración de una restauración nueva.
- No inferir los checkpoints desde el contador total de lotos restaurados; usar los IDs y las reservas guardadas de cada gran loto.
- Tolerar datos incompletos o inválidos y referencias a contenido que todavía no exista.
- Guardar inmediatamente los desbloqueos. Persistir el último checkpoint usado como dato de progreso; la posición de inicio al recargar se mantiene como regla independiente hasta diseñar el sistema de reaparición.
- Conservar los puntos de referencia del editor. No convertir todos los `markers` existentes en lugares de gameplay: actualmente se normalizan como `anchor`.

## Archivos previstos

| Área | Archivos actuales o propuestos |
| --- | --- |
| Zonas y catálogo | `src/world-zones.js`; nuevo `src/world-content.js` |
| Descubrimiento y persistencia | Nuevo `src/world-progress.js` |
| Mapa | `src/ZoneMap.jsx`; nuevo `src/WorldMap.jsx`; `src/editor.css` |
| Recompensas y escena | `src/lotus-energy.js`, `src/Garden.jsx`, `src/main.jsx` |
| Viaje rápido | `src/sailing-controls.js`, `src/boat-motion.js`; helper compartido de traslado si hace falta |
| Escenario y editor | `src/world-layout.js`, solo si el catálogo requiere integración con su esquema |

Esta distribución es orientativa; mantener las reglas de progreso y viaje comprobables fuera de la interfaz React.

## Criterios para cerrar el sprint

1. Las ocho zonas aparecen en orden y conservan sus identidades al ampliar el catálogo.
2. El mapa representa los tipos de contenido y sus estados sin revelar lugares ocultos.
3. Restaurar el gran loto de una zona revela sus destinos principales y activa únicamente su checkpoint.
4. Los secretos y los estados visitado/completado no cambian por el revelado general.
5. El desbloqueo se conserva al recargar y la recompensa no se duplica.
6. Las partidas anteriores con grandes lotos completos recuperan sus desbloqueos correctamente.
7. Con dos checkpoints activados, el jugador viaja de uno al otro y aterriza sin colisiones; un destino bloqueado se rechaza sin cambios parciales.
8. El viaje no añade distancia navegada, no crea estelas largas y no deja un orbe activo en la zona anterior.
9. El mapa funciona con teclado, mouse y touch; seleccionar un marcador no mueve accidentalmente el velero.
10. Abrir/cerrar el mapa y viajar respetan pausa, energía, cooldowns y foco de los controles.

Validar con pruebas de progreso, migración y aterrizaje; ejecutar las pruebas relacionadas de energía, zonas, velero y orbe, compilar y revisar visualmente escritorio/móvil.

## Siguiente sprint y decisiones de combate registradas

Después: construir la isla tutorial de la zona 1 y enseñar navegación, energía, restauración, mapa y viaje rápido mediante un recorrido guiado.

Combate acordado como dirección de diseño: estilo Dota en mundo abierto, selección por clic y habilidades por hotkeys. El orbe tendrá movilidad y daño a los enemigos que atraviese. Daño, recursos, límites por objetivo y equilibrio del cooldown se diseñarán al implementar combate.

Quedan para sprints posteriores: personaje fuera del velero, desembarco, STR/AGI/INT, ataques y habilidades, enemigos, remolinos y cielo, dungeons jugables, hunting zones funcionales, quests completas, inventario y rarezas. Este sprint prepara sus lugares y estados en el mapa.
