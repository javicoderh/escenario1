# Flamming Lottus

## Navegar con el velero

La aplicación comienza en **Navegar**, con el velero **Espíritu de seda** junto al loto. Es el personaje controlable: un casco curvo de madera lacada, bordes dorados, mástil con aparejos, asientos, timón y farol. La vela reutiliza las texturas procedurales, el tramado de 16 bits, el material de seda y los contornos de tinta del loto. Cambiar la paleta en **Contemplar loto** actualiza también la vela. El casco flota, la vela se hincha y su borde ondea.

La cámara sigue al velero en tercera persona, desde atrás y ligeramente elevada. Se puede arrastrar para mirar alrededor; al navegar vuelve suavemente detrás del rumbo. La rueda acerca o aleja la cámara entre 7 y 32 metros.

- Haz clic en la escena para tomar el timón. **WASD** mueve el velero respecto a la cámara, con giro suave, aceleración y frenado.
- **Clic derecho sobre el agua** marca un destino con anillos luminosos. El velero navega hasta él y frena al llegar. WASD cancela ese destino y devuelve el control manual.
- **Esc** o **Detener velero** detiene la navegación. **Centrar cámara** recupera la vista desde atrás.
- **Volver junto al loto** devuelve al personaje al punto de partida. Las posiciones de los objetos del escenario se conservan; el velero comienza junto al loto al recargar.
- Velocidad inicial: **4 m/s**, ajustable de 0,5 a 12 m/s. El personaje permanece en la superficie y dentro del radio del mapa.
- La carga multiplica la velocidad base por `1 + carga/capacidad`: con la base de 4 m/s, el bote navega a 4 m/s vacío, 6 m/s al 50 % y 8 m/s lleno. Conserva movimiento sin energía y acelera/frena suavemente.
- La pausa detiene el desplazamiento, la vela, la flotación y la estela; la cámara sigue disponible.

La estela deposita muestras de espuma en el recorrido real, en lugar de moverlas junto al casco. Cada muestra se expande y se desvanece en 6,5 segundos. Sus pequeños destellos toman tonos azul plateado con luna llena y tonos cálidos al ocaso. La espuma, el velero y el farol comparten los reflejos del mar. El mapa de coordenadas sigue disponible en **Construir escenario**, con su cámara de vuelo libre.

## Lotos de energ?a y progresi?n

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
