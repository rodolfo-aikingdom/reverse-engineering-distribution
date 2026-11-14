---
name: tiktok-video-research
description: Use when researching TikTok formats from public videos.
version: 0.1.0
author: AI Kingdom operator, Hermes Agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [tiktok, research, ugc, shortform, video]
    related_skills: [tiktok-ad-access, short-form-studio]
---

# Research de formatos TikTok con video observado

Investigar videos públicos para identificar formato, apertura, montaje y mecanismo con evidencia visual. No deducir el formato del caption ni llamar «ganador» a un anuncio por su antigüedad o a un post por sus vistas. No publica ni automatiza interacciones.

## Cuándo usar

- El operador pide referencias de formatos TikTok, UGC, hooks o videos de una categoría.
- Hay URLs de TikTok que se quieren comparar con un producto.
- No usar para declarar CPA, instalaciones o performance publicitaria: las reproducciones orgánicas no son esas métricas. Para bibliotecas de anuncios bloqueadas, cargar `tiktok-ad-access`.

## Requisitos

`python3`, `ffmpeg`, `ffprobe`, `uvx` y conexión a videos públicos. `uvx yt-dlp` ejecuta yt-dlp sin modificar el entorno global. El scratch debe ser `$TMPDIR` (Hermes lo configura) o un directorio temporal del sistema; no guardar descargas en un repo ni subirlas al vault. Sin cookies, claves, proxies pagos ni login sin decisión explícita del operador.

## Procedimiento

1. **Definir la pregunta.** Categoría, mercado e intención: alcance, respuesta del comprador u objeción. Partir del dolor medido, no de «trends». Buscar candidatos con `web_search` o búsquedas indexadas `site:tiktok.com/@<handle>/video/ <frase>`. Guardar URL original y autor; un resultado indexado solo prueba caption/metadata, no montaje. *Listo cuando*: cada candidato tiene permalink y una razón para investigarlo.
2. **Leer metadatos del post primario.** Usar `terminal(command="python3 ~/.hermes/skills/distribution/tiktok-video-research/scripts/probe.py '<URL>'")`. El script hace GET público y extrae `__UNIVERSAL_DATA_FOR_REHYDRATION__` → `webapp.video-detail` → `itemInfo.itemStruct`; valida el ID y devuelve autor, caption, duración, reproducción, compartidos, guardados, comentarios y fecha de lectura. No imprimir el JSON entero. Si falta el estado o cambia el HTML, reportar «no verificado» en vez de inventar números. *Listo cuando*: la identidad y las cifras vienen del post exacto, con fecha de consulta.
3. **Bajar solo los candidatos útiles.** `terminal(command="uvx yt-dlp --no-playlist -o \"$TMPDIR/tiktok-%(id)s.%(ext)s\" '<URL>'", timeout=120)`. La descarga directa del `playAddr` puede dar 403 aunque el HTML sea público; yt-dlp funcionó en esta sesión, pero no es garantía futura. Si falla, probar navegador normal; no rodear una barrera de autenticación. *Listo cuando*: el archivo de video público existe en scratch y `ffprobe` reconoce duración y formato.
4. **Mirar el video, no su descripción.** `terminal(command="python3 ~/.hermes/skills/distribution/tiktok-video-research/scripts/contact_sheet.py '<archivo.mp4>' '<prefijo-en-TMPDIR>'")`; genera varias grillas consecutivas de 12 segundos a ~1 cuadro/s. Abrir TODAS con `vision_analyze` para observar primer cuadro, cambios, UI, payoff y último cuadro. Muestrear adicionalmente si hay cortes más rápidos; la grilla no prueba que un plano intermedio no exista. Audio y voz solo se describen si se escucharon o transcribieron; nunca inferirlos de imágenes. *Listo cuando*: cada afirmación visual se puede señalar en una grilla y no faltó el final por límite del tile.
5. **Separar alcance de conversión.** Comparar varios posts de la categoría, autor y fecha; registrar vistas/guardados como señales públicas de alcance, no instalaciones/ventas ni causalidad del formato. El «outlier vs cuenta» solo si se midió una línea base comparable. No mezclar reproducciones de TikTok con gastos de Meta. *Listo cuando*: la tabla tiene URL, autor, fecha de consulta, duración, hook observado, estructura, métricas públicas, límites y la hipótesis que explica el resultado.
6. **Adaptar sin copiar.** Mantener la mecánica que abrió la pregunta (dos teléfonos, barrera física, objeto culpable), cambiar escena y argumento para el producto. Grabación REAL de la app para UI, desbloqueo, saldo y claims; nunca pantallas generadas ni testimonio sintético. Reconocer qué ya hace la competencia. Proponer pocas opciones con prueba necesaria y condición de descarte antes de escribir guiones. *Listo cuando*: el operador puede abrir cada fuente y distinguir observado, inferido y propuesto.

## Pitfalls

- Creative Center puede dar 403 y la búsqueda TikTok estar vacía en datacenter: no equivale a que no existan anuncios o videos.
- Metadatos HTML pueden estar redondeados, retrasados o cambiar; conservar fecha de lectura y no prometer precisión que no existe.
- Una grilla de 1 fps puede perder un texto, transición o gesto; si decide el concepto, extraer más cuadros del tramo o ver el archivo completo.
- `yt-dlp` y la extracción HTML son frágiles ante cambios de TikTok; si fallan, no sustituir el video por su caption ni por un resumen de terceros sin rotular.
- Descargar solo para análisis privado; no republicar video, música, rostro ni voz ajenos, y no representar vistas como prueba de ventas.

## Verificación

Ejecutar `probe.py` sobre un permalink conocido, confirmar que el ID y el autor coinciden con la URL y que `play_count` es un valor del mismo post. Descargar uno público y ejecutar `contact_sheet.py`; confirmar el número de grillas y abrir primera y última con `vision_analyze`. En el informe, cada video citado debe tener permalink funcional, métricas con fecha y observación visual específica. Si falla cualquier paso, etiquetar el hueco explícitamente.
