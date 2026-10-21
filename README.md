# Flamming Lottus

Jardín digital interactivo creado con React, Vite y Three.js. Flamming Lotus tiene nueve pétalos largos inspirados en colas de zorro y dos capas de pétalos cortos. Cada pétalo tiene grosor, bordes suaves y 19 articulaciones con ondas, torsiones y ritmos independientes.

Seis variantes de textura procedural de 192 × 384 píxeles por paleta aportan nervaduras en relieve, vetas de color, tramado SNES y puntas claras. Los materiales tienen un brillo suave de seda; el corazón pulsa y desprende partículas luminosas. La apertura se interpola para que el cambio entre brote y flor sea suave.

Los contornos de tinta, inspirados en Ōkami, se dibujan en el material de cada pétalo con un grosor irregular y bordes suavizados. Una brisa común genera ráfagas direccionales; las puntas reaccionan con ondas independientes, algo más amplias, y un aleteo fino. El renderizado sigue el refresco de la pantalla y adapta la densidad de píxeles cuando cae por debajo de 55 FPS para favorecer la fluidez. El rendimiento final depende de la GPU y la pantalla.

La paleta inicial Fuego combina rojos, naranjos y amarillos. El aura forma lenguas irregulares que ascienden, se estiran y responden al viento. Del centro nacen 128 esporas luminosas repartidas entre dorado, zafiro, rubí y esmeralda, con pequeñas variaciones de tono y brillo dentro de cada familia. Ascienden en espiral y se desvanecen. Aura, halo y esporas utilizan tres llamadas de dibujo, con animación de las partículas en GPU y sin posprocesado de pantalla completa. Respetan la pausa y la velocidad de la animación.

El loto descansa sobre un estanque verde jade con saturación moderada, ondas procedurales, pequeños brillos y sombra de contacto. El reflejo real de la escena se difumina y deforma con las ondas; se calcula a 384 × 384 y hasta 30 veces por segundo mientras la cámara está quieta, sin limitar el refresco de la escena principal. La base de la flor y las hojas flotan suavemente junto a la superficie, y el agua adapta su iluminación al modo nocturno.

La escena comienza en una noche despejada de luna llena, con textura lunar, halo tenue, estrellas de distintos brillos y centelleo suave. La luz lunar ilumina los pétalos y deja un reflejo plateado en el estanque. El cielo y las estrellas se dibujan en una sola pasada. Las texturas y paletas originales de los pétalos conservan sus colores. El selector de atmósfera permite alternar entre Luna llena y Ocaso; la pausa detiene también el centelleo.

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
node --test tests/lotus.test.js
```

Comprueba la continuidad de la malla, las normales, la deformación independiente, la pausa y la estabilidad del modelo en los extremos de apertura. La prueba numérica no sustituye la revisión visual en un navegador con WebGL.

Arrastra para girar y usa la rueda para acercar. Incluye tres paletas, apertura de pétalos, velocidad de animación, iluminación de amanecer o noche, pausa, ambiente sonoro sintetizado, pantalla completa y exportación PNG. Requiere WebGL. Las tipografías de Google Fonts tienen alternativas locales.

Al activar la pantalla completa, `Konoha peace ost.mp3` se reproduce automáticamente en bucle infinito. La música se pausa al salir (incluido Escape) y continúa al volver a entrar.
