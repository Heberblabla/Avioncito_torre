# Verificación de AVIONCITO

## Núcleo automatizado

15 pruebas ejecutadas con Node.js, todas aprobadas:

- Caída natural y choque con el suelo.
- Impulso repartido en el tiempo, sin cambio instantáneo de posición.
- Diferencia entre pulsación mantenida y toques rápidos.
- Límites de velocidad y visibilidad con entradas extremas.
- Colisiones ajustadas a nariz, alas y suelo; esquinas vacías sin colisiones falsas.
- Puntuación solo cuando termina de pasar la cola, una vez por edificio.
- Ausencia de puntos nuevos después de chocar.
- Generación reproducible por semilla y variable entre semillas; límites de altura y 15 edificios normales entre desafíos.
- Recorrido hasta la etapa 11 en 24 ciudades distintas con pulsaciones de 85 ms, separadas al menos 215 ms. Se verificó retorno de cámara, dificultad limitada y número de objetos acotado.
- Margen de reacción y recuperación antes de las torres en 12 ciudades adicionales.
- La cámara no modifica la posición del avión.
- Espera, llegada y segundo impacto único en el accidente cómico; ambos aviones quedan visibles.
- Reinicio sin puntos, cámara elevada ni obstáculos ya contados.
- Límite de 200 partículas y eliminación al caducar.
- Igual resultado de simulación a 30, 60 y 144 FPS con pasos fijos.

Estas comprobaciones demuestran trayectorias viables en las muestras probadas; no son una prueba formal de toda combinación aleatoria o de cualquier maniobra del jugador.

## Navegador

Se ejecutó el sitio en un servidor estático y se inspeccionaron visualmente menú, opciones, pausa, ciudad, ascenso a las torres, vuelta de cámara, accidente doble y aviso de orientación vertical.

Se revisaron marcos de 844 × 390 y 390 × 844, además del navegador de escritorio. Las pruebas DOM con el controlador real verificaron 8 toques consecutivos, ascenso efectivo, pulsación mantenida, edificios superados, pausa, reinicio, Game Over, reinicio con espacio y ausencia de desbordamiento horizontal en el marco móvil.

Se comprobó el interruptor de sonido. Los recursos del juego son locales y sus rutas relativas; no se necesitan APIs, CDN, módulos remotos ni backend. El paquete incluye `.nojekyll` y se puede publicar como sitio estático bajo una subruta.

## Límites de la verificación

El navegador remoto utilizado limita las animaciones a aproximadamente 1 FPS. Por eso la secuencia y las entradas se validaron también con un reloj de pruebas determinista. Esto **no permite certificar 60 FPS reales en un teléfono**. No se utilizó un Android físico, y el bloqueo de orientación/pantalla completa depende del navegador.

No se publicó en una cuenta de GitHub del usuario. La compatibilidad con Pages se fundamenta en la entrega estática, las rutas relativas y la prueba en servidor. No se verificó auditivamente la calidad de los sonidos en un dispositivo físico.
