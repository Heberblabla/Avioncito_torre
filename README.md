# AVIONCITO

Juego de vuelo 2D en Canvas: ciudad monocromática, etapas procedurales, torres gigantes y aterrizajes poco dignos. El Modo Normal está completo. No necesita backend, paquetes de ejecución ni servicios externos.

## Jugar

En el ZIP, abre `index.html` con un navegador. También puedes servir esa carpeta con cualquier servidor estático. Por ejemplo, si tienes Python:

```sh
python -m http.server 8000
```

Después abre `http://localhost:8000`. Para probar desde un teléfono conectado a la misma red, utiliza la dirección local de tu computadora y el puerto 8000. La pantalla completa y el bloqueo de orientación dependen de las APIs y permisos del navegador; el juego ofrece un aviso de giro cuando no están disponibles.

En el repositorio de desarrollo, los archivos del juego se encuentran dentro de `dist/`. El ZIP exportado los coloca directamente en su raíz para subirlos fácilmente a GitHub Pages.

## Controles

| Acción | Control |
| --- | --- |
| Pequeño impulso | Toque, clic izquierdo o espacio |
| Ascenso suave | Mantener pulsado |
| Ascenso rápido a las torres | Varios toques breves seguidos |
| Pausar / continuar | P, Escape o botón de pausa |
| Reintentar | Botón, espacio o toque en el fondo tras el accidente |

El botón **Reintentar** permite saltar el accidente desde los 0,45 segundos. En vertical se suspende el vuelo; al girar, pulsa Continuar.

## Cómo funciona

- El impulso se aplica progresivamente durante 75 ms, conservando velocidad e inercia.
- Mantener pulsado permite un ascenso suave. Las pulsaciones repetidas permiten subir bastante más rápido.
- A baja altura la cámara permanece fija. Cada 15 edificios normales aparecen siempre dos torres de igual altura, casi juntas. Un aviso da tiempo para subir.
- La cámara acompaña el ascenso y vuelve al nivel de la ciudad después del desafío. Nunca eleva al avión.
- Un techo aerodinámico suave mantiene el avión dentro de la vista normal; se amplía al acercarse a las torres. No produce choque ni teletransporte.
- Las etapas contienen entre 18 y 23 edificios normales, además de las torres que correspondan. La dificultad tiene un límite.
- `08/23` significa 8 edificios de los 23 de la etapa. Solo se cuentan al despejar la cola del avión.
- Cada edificio normal vale 10 puntos; cada torre, 35. Completar una etapa añade 100.
- Récord y opciones se guardan en `localStorage`, por navegador y dirección web. Si el navegador bloquea el almacenamiento, se puede seguir jugando, pero el récord no persistirá.
- Los accidentes contra gigantes muestran un segundo avión que choca contra la torre de al lado. Ambos permanecen visibles. Sin sangre ni imágenes externas.

## Publicar en GitHub Pages

Descomprime el ZIP y sube **el contenido de la carpeta AVIONCITO**, con `index.html`, `style.css`, `js/`, `assets/` y `.nojekyll`, a la carpeta que publiques con GitHub Pages. No hace falta ejecutar una compilación ni instalar npm. Todas las rutas son relativas, por lo que también funciona bajo la subruta de un repositorio.

Si trabajas con el repositorio de desarrollo original, publica el contenido de `dist/`.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Menú, HUD, pausa, resultados, opciones y orientación |
| `style.css` | Interfaz adaptable y animaciones |
| `js/config.js` | Parámetros de física, generación, cámara y dificultad |
| `js/engine.js` | Física, colisiones por polígonos, etapas, cámara y accidente |
| `js/renderer.js` | Ciudad, avión, parallax, nubes y partículas |
| `js/audio.js` | Sonidos originales mediante Web Audio |
| `js/game.js` | Bucle, entradas táctiles/teclado, pantallas y guardado |
| `assets/av-pixel.woff` | Fuente bitmap original, incluida localmente |
| `assets/favicon.svg` | Icono original |
| `qa.html`, `qa.js` | Banco de pruebas visuales opcional |
| `tests/engine.test.js` | Pruebas del núcleo, sin dependencias |
| `tools/create-font.py` | Fuente editable del tipo de letra; solo para desarrollo |

## Ajustar el vuelo

Modifica `AV.CONFIG` en **`js/config.js`**; no necesitas recompilar. Las distancias se expresan en unidades de un mundo lógico de 600 unidades de alto. Los tiempos son segundos.

| Grupo | Parámetros principales |
| --- | --- |
| `physics` | `gravity`, `tapImpulse`, `tapResponse`, `holdThrust`, `drag`, `maxRise`, `maxFall`, techo suave e inclinación |
| `difficulty` | Velocidad inicial, aumento por etapa, velocidad máxima y altura progresiva |
| `obstacles` | Alturas, anchuras, huecos, longitud de etapas, frecuencia y altura de torres |
| `camera` | Respuesta, velocidad de seguimiento, anticipación y retorno |
| `crash` | Duración del accidente, espera y vuelo del segundo avión |
| `effects` | Límite de partículas, humo y transiciones |
| `score` | Valores de puntos y bonificación de etapa |

Si cambias gravedad, impulso, velocidad o torres, vuelve a ejecutar las pruebas: el espacio de aproximación se calcula con la velocidad máxima y una fracción conservadora de la capacidad de ascenso. El generador también limita los cambios de altura entre edificios normales.

## Verificación

Con Node.js disponible:

```sh
npm test
```

No hay paquetes que instalar. Para inspección visual abre `qa.html` a través del mismo servidor estático. Permite ver el ascenso, el regreso de cámara, los dos aviones accidentados y marcos de escritorio/móvil. El botón de pruebas táctiles usa eventos DOM y un reloj manual explícito para que un navegador remoto con FPS limitados no altere el resultado.

`index.html?diagnostics` muestra mediciones. `?diagnostics&manual-clock` se reserva al banco de pruebas; la partida normal usa `requestAnimationFrame` con pasos fijos de 1/120 s. No actives el reloj manual al jugar.

Consulta `PRUEBAS.md` para el alcance y las limitaciones de las comprobaciones realizadas.

## Ampliar modos

`Flight` recibe un identificador de modo y mantiene la simulación separada del DOM, el sonido y el renderizador. Actualmente solo acepta `normal`. Se pueden añadir políticas de generación, puntuación o fuerzas para otros modos sin reescribir las entradas ni los gráficos.


Modificadores: al pulsar Jugar puedes combinar edificios de techo, velocidad por edificio, combustible y puertas de precision. Los depositos F recargan combustible. Sin combustible el avion planea sin empuje. Desmarca todo para el modo normal.


Velocidad progresiva: comienza en 165 unidades por segundo y suma 2 por edificio, sin límite. La velocidad actual aparece destacada en la esquina inferior derecha. A velocidades extremas los obstáculos pueden resultar imposibles de superar con la física de vuelo existente.


Más tipos de obstáculos añade globos, drones y barreras suspendidas. Su casilla secundaria permite incluirlos también al ascender y descender junto a los rascacielos; al desactivar la principal se desactiva la secundaria.
