# OCTANT 01 — Estudio de caso 3D interactivo

Estudio de caso construido como demo del método **The Interactive 3D Website Guide**
(@designedby.russ): un reloj renderizado en three.js en tiempo real, con canvas
transparente, texto HTML por encima y una secuencia de cámara dirigida por scroll. La
web no vende el producto: explica cómo está hecha la propia escena, capa por capa.

Producto inventado: **OCTANT 01**, Calibre 8. No existe y no se vende. Todo el texto
visible está en español.

## Stack

- Vite 8 + React 19
- three.js 0.187 (geometría y materiales 100 % procedurales, sin GLB ni texturas en disco)
- Lenis para scroll suave
- Archivo variable (eje `wdth`) + IBM Plex Mono, self-hosted

## Comandos

```bash
npm install
npm run dev      # http://127.0.0.1:5178
npm run build    # dist/
npm run preview  # sirve dist/
```

## Cómo está montado

```
src/
  App.jsx            estructura editorial, beats, callouts, cierre, nav y ficha técnica (dialog)
  styles.css         tokens, layout, tipografía, responsive, reduced motion
  main.jsx           fuentes y restauración de scroll
  three/
    stage.js         renderer, entorno de estudio, tabla de cues, damping, drag
    watch.js         reloj procedural completo + posiciones de explosión
```

### Secuencia

Una sección sticky de 620vh (540vh en móvil) con seis cues de cámara:

| progreso | plano |
| --- | --- |
| 0.00 | hero, tres cuartos |
| 0.21 | macro de esfera |
| 0.44 | despiece en Z, vista lateral |
| 0.63 | perfil de caja, tres callouts |
| 0.82 | tres cuartos opuesto, detalle |
| 1.00 | vuelta al hero |

La cámara interpola posición, target, rotación, FOV y grado de explosión con
smoothstep + amortiguación exponencial. En móvil hay tiers por aspect ratio
(`distMul`, `slimMul`, `mobileMul`) para no recortar la pieza.

### Decisiones de rendimiento

- Canvas `alpha: true`, fondo pintado con CSS.
- Entorno de estudio generado con PMREM a partir de paneles, sin HDR externo.
- Textura de esfera dibujada en canvas 2D (una sola vez).
- Renderer pausado con `IntersectionObserver` y `visibilitychange`; al reentrar se
  cancela el frame anterior y se reinicia el bucle, para que la animación vuelva a
  responder al subir después de llegar al final.
- DPR limitado a 1,75 (1,5 en pantallas táctiles); `prefers-reduced-motion` salta la
  animación y fija el estado.

### Ficha técnica

El botón «Ficha técnica» de la nav abre un `<dialog>` nativo con `showModal()`: no es
una sección de la página, sino una ventana sobre ella. Recoge las cifras reales del
montaje (stack, geometría, texturas, cámara, peso). Mientras está abierta, Lenis se
detiene y el scroll de fondo queda bloqueado; se cierra con el botón, con `Esc` o
pulsando fuera del panel.

### Método descargable

Al final de «El montaje», el bloque «Llévate el método» ofrece dos acciones:

- **Descargar PDF** sirve `public/constructor-3d.pdf` (13 páginas) con el nombre
  `CONSTRUCTOR-3D.pdf`.
- **Copiar prompt** carga `public/constructor-3d.md` y copia el documento completo;
  si la API de portapapeles no está disponible, usa un `textarea` temporal y
  `execCommand('copy')` como respaldo. El texto se precarga al montar la página.

Ambos archivos se copian desde `../prompts/` a `public/`. Si se regenera el documento
con `prompts/build-doc.ps1`, hay que volver a copiarlos para que la web sirva la
última versión.

### Accesibilidad

- Skip link, landmarks, `aria-label` en el canvas y en el despiece.
- Ficha técnica en un diálogo nativo: foco atrapado, `Esc` para cerrar y retorno del
  foco al botón que lo abrió.
- Fallback estático si WebGL falla.
- Con reduced motion: scroll nativo, sin animaciones de entrada, estado final legible.
- Toda la información vive en HTML; el 3D no contiene texto.

## Créditos

Método y estructura: *The Interactive 3D Website Guide* — @designedby.russ.
Tipografías: Archivo (Omnibus-Type) e IBM Plex Mono (IBM), vía Fontsource.
El resto —modelo, materiales, copy y diseño— es original y ficticio.
