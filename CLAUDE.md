# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Tetris en JavaScript vanilla (HTML5 Canvas + CSS). Sin dependencias, sin `package.json`, sin bundler ni transpilador. Tres archivos: `index.html`, `style.css`, `game.js`.

## Ejecutar

No hay build, tests ni linter. Para probar el juego, servir estáticamente y abrir en el navegador:

```bash
python3 -m http.server 8000   # luego abrir http://localhost:8000
```

## Convenciones

- **Todo en español**: texto visible en la UI, comentarios de código, README y mensajes de commit.
- `game.js` es un único archivo bajo `'use strict'` con todo el estado en variables a nivel de módulo (`board`, `current`, `next`, `score`, ...). No hay módulos ES ni clases.

## Gotcha

El tamaño del tablero está definido por partida doble: si cambias `COLS`, `ROWS` o `BLOCK` en `game.js`, ajusta también `width` y `height` del `<canvas id="board">` en `index.html` para que coincidan (`COLS × BLOCK` y `ROWS × BLOCK`).
