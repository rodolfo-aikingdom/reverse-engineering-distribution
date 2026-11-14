# RED: migración y recuperación

Preparación del 2026-11-14. Este repositorio es público: no guardar aquí credenciales, cookies, sesiones ni reportes privados. El push del código no equivale a restauración comprobada en una VPS.

## Qué incluye

- CLI y servidor MCP: `src/`, `harness/`, `web/`, ejemplos y pruebas. Se reconstruye `dist/`; no está en Git.
- Skills propias en `skills/`: `reverse-engineering-distribution`, `competitor-set-discovery`, `meta-ad-library`, `apple-search-ads`, `tiktok-ad-access`, `tiktok-video-research` y `distribution-teardown`. La skill de videos incluye `scripts/probe.py` y `scripts/contact_sheet.py`; la de teardown incluye `references/red-harness.md`. Los dos procedimientos se incorporaron desde las versiones vivas del host. Algunas skills citan otras skills generales del reino que no son parte de RED: revisar el entorno de agentes por separado.
- No se incluyen videos descargados, perfiles de navegador ni cookies. Los permisos para descargar, reproducir o redistribuir material de terceros se evalúan por separado.

## Lo que no viaja por Git

- `node_modules/`, `dist/`, `.env`, `red-reports/`, logs y `promo/` están ignorados. Reconstruir dependencias y revisar si hay reportes que deban preservarse.
- Las corridas pueden vivir en `~/.cache/reverse-engineering-distribution/runs/` o donde indique `RED_CACHE_DIR`; el 2026-11-14 se observaron 8 archivos JSON de corridas en el host. No asumir que son prescindibles por llamarse caché: revisar si contienen evidencia única y respaldarlas de forma privada y cifrada. Las salidas `--out` pueden estar en otras carpetas.
- MCP y skills se configuran por perfil de Hermes. La configuración del host, la ubicación de `red` y los perfiles no se restauran por clonar este repo. Inventariarlos y adaptarlos sin exponer datos sensibles.
- Credenciales opcionales por nombre: `SCRAPECREATORS_API_KEY` o `SCRAPE_CREATORS_API_KEY`, `ANTHROPIC_API_KEY` o `ANTHROPIC_AUTH_TOKEN` y, según la integración, `OPENAI_API_KEY`. No registrar valores; el operador decide cómo volver a autorizarlas o transferirlas cifradas. No asumir que estén configuradas.

## Reinstalación aislada sin activar integraciones

Requisitos: Node >=22, npm, Python 3 y rsync; para observar videos, ffmpeg, ffprobe y uvx/yt-dlp. El host de origen usó Node 24.14.0 y npm 11.9.0. En un checkout recién clonado:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run eval
npm run build
python3 -m unittest discover -s tests -p test_tiktok_skill.py -v
```

Instalar skills solo después de revisar el destino. El instalador usa `rsync --delete` dentro del directorio de cada skill y puede borrar personalizaciones de ese destino. En un destino temporal aislado:

```sh
SKILLS_DIR="$TMPDIR/red-skills-check" ./scripts/install-skills.sh
SKILLS_DIR="$TMPDIR/red-skills-check" ./scripts/install-skills.sh --check
```

En un perfil real, instalar en su carpeta de skills y verificar qué rutas utiliza; por defecto el instalador escribe en `~/.hermes/skills/distribution`. La skill de video documenta esa ruta predeterminada, por lo que un `SKILLS_DIR` personalizado requiere usar la ruta efectiva. Evitar tener copias duplicadas de la misma skill en distintas categorías. No modificar la instalación del host viejo para probar una migración.

Las pruebas offline usan fixtures sintéticos y no demuestran acceso a TikTok, Meta o Apple. Las llamadas reales dependen de la plataforma, la red y la IP del destino. TikTok puede bloquear una VPS; no interpretarlo como ausencia de videos o anuncios.

## Criterio de migración

1. Verificar en el remoto el commit con las siete skills y sus archivos auxiliares.
2. Preservar por separado las corridas e informes que se quieran mantener, después de revisar su contenido y privacidad.
3. Restaurar en la VPS, ejecutar las pruebas, instalar skills en el perfil elegido y comprobar un handshake MCP sin habilitar jobs automáticos ni publicar.
4. Solo si el operador autoriza acceso externo, verificar un video público y las fuentes publicitarias desde la VPS; registrar bloqueos y costos antes de gastar créditos.

Hasta entonces: preparación y respaldo de código, no migración VPS verificada.
