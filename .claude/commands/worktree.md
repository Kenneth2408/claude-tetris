---
description: Crea un worktree aislado en .trees/ y ejecuta ahí el requerimiento indicado
---

Vas a implementar un requerimiento dentro de un git worktree aislado, sin
tocar el checkout principal.

Requerimiento recibido: $ARGUMENTS

1. Si el requerimiento está vacío, avisa al usuario de que debe indicar qué
   implementar (`/worktree <descripción del requerimiento>`) y detente sin
   crear ningún worktree.

2. A partir del texto del requerimiento, elige un nombre corto en
   kebab-case (2-4 palabras, en español, sin acentos ni espacios) que lo
   resuma. Por ejemplo: "menú de pausa completo" → `menu-pausa`; "tabla de
   records local" → `tabla-records`.

3. Desde la raíz del repositorio, ejecuta:

   ```bash
   git worktree add .trees/<nombre>
   ```

   Sin `-b` explícito: si no existe ya una rama llamada `<nombre>`, git la
   crea automáticamente basada en HEAD (comportamiento por defecto de
   `git worktree add <path>`).

4. Usa la tool `EnterWorktree` con `path: ".trees/<nombre>"` para que el
   resto de la sesión opere de forma aislada dentro de ese worktree.

5. Implementa el requerimiento dentro de ese worktree, siguiendo las
   convenciones de `CLAUDE.md` del proyecto (todo en español: UI, comentarios,
   commits; único archivo `game.js` sin módulos ni clases; cuidado con el
   gotcha de mantener sincronizados `COLS`/`ROWS`/`BLOCK` con el `width`/
   `height` del `<canvas id="board">` si los tocas).

6. Al terminar, haz commit de los cambios en el worktree con un mensaje en
   español que describa el cambio, sin pedir confirmación adicional — el
   propósito de aislar el trabajo en un worktree es precisamente poder
   iterar y commitear sin afectar el checkout principal.

7. Informa al usuario dónde quedó el trabajo: ruta del worktree
   (`.trees/<nombre>`), nombre de la rama creada, y cómo revisarlo o
   fusionarlo desde el checkout principal si decide integrarlo (por ejemplo
   `git merge <nombre>` desde la rama principal, o abrir un PR).
