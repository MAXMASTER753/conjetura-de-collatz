# Visualizador de la conjetura de Collatz

Aplicación web independiente para generar y explorar visualmente secuencias de Collatz. No requiere instalar paquetes, iniciar un servidor ni tener conexión a Internet.

## Cómo abrir

Abre `index.html` directamente en un navegador moderno. También puedes servir la carpeta con cualquier servidor web estático.

## Uso

1. Escribe un entero positivo y pulsa **Graficar secuencia**.
2. Explora la gráfica arrastrando el lienzo. Usa la rueda o los botones de zoom para acercar, alejar y restablecer la vista.
3. Abre **Configuración** para cambiar la orientación, los colores, el relleno, la visibilidad de los números y el tema.
4. Pasa el puntero sobre un semicírculo para consultar el paso, los valores de la transición y su delta.
5. Consulta los pasos, el máximo y los términos en el resumen. Expande **Ver secuencia** para cargar la secuencia completa.

La entrada solo admite dígitos y requiere un valor mayor que cero. Los números únicos alcanzados se indican en la recta; el valor inicial se resalta. Ocultar los números desde la configuración mantiene los marcadores.

## Visualización

La secuencia aplica estas reglas:

- Si el valor actual es par, el siguiente es la mitad y el semicírculo regresa sobre la recta.
- Si es impar, el siguiente es `3n + 1` y el semicírculo avanza.
- El diámetro representa el delta absoluto entre los valores actual y siguiente, usando una escala proporcional común.
- En orientación horizontal, los semicírculos pares e impares se dibujan en lados opuestos del eje. La orientación vertical mantiene esa convención hacia los lados.

Los colores pueden representar la paridad o el orden de los pasos. Cambiar opciones visuales no vuelve a calcular la secuencia.

## Estructura

- `index.html`: interfaz y carga ordenada de los scripts clásicos.
- `styles.css`: diseño adaptable, temas y controles.
- `app.js`: coordinación de la interfaz, validación y resumen.
- `collatz-sequence.js`: cálculo con `BigInt` y datos compactos de la secuencia.
- `collatz-canvas.js`: dibujo, etiquetas, tooltip, orientación, pan y zoom.
- `input-widget.js`: arrastre y redimensionamiento del panel de entrada.

La secuencia se calcula una sola vez por generación; sus datos geométricos se conservan en arreglos tipados. El texto completo se formatea únicamente al expandir **Ver secuencia**.
