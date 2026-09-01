---
name: clima
description: >-
  Consulta el clima actual y el pronóstico desde la terminal usando wttr.in (sin
  API key). Detecta la ubicación local por IP o acepta una ciudad concreta.
  Úsala cuando el usuario pida "el clima", "el tiempo", "qué temperatura hace",
  "va a llover", el pronóstico de hoy/mañana, o el clima de una ciudad.
---

# Clima

Obtiene información meteorológica desde `wttr.in`, un servicio gratuito que no
requiere registro ni API key. Si no se indica ciudad, `wttr.in` deduce la
ubicación a partir de la IP saliente (el "clima local").

## Uso

Ejecuta `curl` contra `wttr.in`. Ajusta la petición según lo que pida el usuario.

> **Windows / PowerShell**: `curl` es un alias de `Invoke-WebRequest` y NO acepta
> estas opciones. Usa siempre `curl.exe` (o la herramienta Bash). En Linux/macOS
> vale `curl` a secas.

Parámetros que se combinan en la query string:

- `lang=es` y cabecera `-H "Accept-Language: es"` → salida en español.
- `format=3` → una línea: `Madrid: ⛅️ +18°C`.
- `format=4` → una línea con viento y humedad.
- `?0` → solo condiciones actuales (con dibujo ASCII).
- `?1` / `?2` → hoy / hoy + mañana.
- `?Q` → oculta la línea "Weather report".
- `?m` → unidades métricas (°C, km/h); `?u` → imperiales.
- `format=j1` → JSON completo (para parsear datos concretos).

### Recetas

Clima local, resumen de una línea:

```bash
curl.exe -s "wttr.in/?format=3&lang=es"
```

Clima local, vista compacta de hoy en español y métrico:

```bash
curl.exe -s -H "Accept-Language: es" "wttr.in/?0QT&m&lang=es"
```

Clima de una ciudad concreta (sustituye los espacios por `+` o `%20`):

```bash
curl.exe -s "wttr.in/Buenos+Aires?format=4&lang=es"
```

Pronóstico de hoy y mañana:

```bash
curl.exe -s -H "Accept-Language: es" "wttr.in/Madrid?1QT&m&lang=es"
```

Un dato puntual vía JSON (ej. temperatura actual y sensación térmica):

```bash
curl.exe -s "wttr.in/Madrid?format=j1"
```

De la respuesta JSON, los campos útiles suelen estar en
`current_condition[0]` (`temp_C`, `FeelsLikeC`, `humidity`, `weatherDesc[0].value`,
`windspeedKmph`) y el pronóstico por día en `weather[]` (`maxtempC`, `mintempC`,
`hourly[]`).

## Cómo responder

1. Lanza la receta más ajustada a la petición (resumen, pronóstico o dato
   concreto).
2. Resume el resultado en español: temperatura, sensación térmica, estado del
   cielo y, si es relevante, viento, humedad o probabilidad de lluvia.
3. Si `curl.exe` falla (sin red, servicio caído), díselo al usuario sin
   inventar datos. Como alternativa puede probarse `wttr.in` con la API JSON de
   Open-Meteo (`https://api.open-meteo.com/v1/forecast`), que tampoco necesita
   key pero requiere latitud/longitud.
