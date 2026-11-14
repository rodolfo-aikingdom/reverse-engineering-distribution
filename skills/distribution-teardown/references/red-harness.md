# Harness RED: comandos y comportamiento verificado

`reverse-engineering-distribution` (RED) audita un producto y devuelve scorecard, evidencia,
veredictos por comunidad y un plan determinista. Vive en `~/apps/reverse-engineering-distribution`;
lo que corre es `dist/`, así que después de tocar `src/` hay que compilar.

## Dos puertas

MCP (servidor `red`):

- `mcp__red__reverse_engineer_distribution(url, communities)` devuelve `run_id`, scorecard y plan.
- `mcp__red__get_evidence(run_id)` para las citas, `mcp__red__get_playbook(name)` para el criterio
  (`communities-reddit` explica los veredictos), `mcp__red__get_distribution_plan(run_id)`.

CLI, cuando hay que pasar reglas o controlar el ritmo:

```bash
cd ~/apps/reverse-engineering-distribution
node dist/cli.js "<url>" \
  --communities r/uno,r/dos \
  --rules "$TMPDIR/red-rules.txt" \
  --delay 60000 --no-ai --out ~/apps/<proyecto>/red
```

Salidas en `--out`: `report.md` (tabla de veredictos y plan), `plan.md`, `evidence.json`
(estructurado, es lo que conviene importar). Cada corrida queda en
`~/.cache/reverse-engineering-distribution/runs/`.

## Archivo de reglas

Bloques con el texto de la regla tal cual, encabezados por el sub:

```
== r/nosurf ==
- NO APPS. No self promotion posts; no surveys; no research; no studies.

== r/digitalminimalism ==
- Self-promotion or promotional material of any kind is not allowed... zero tolerance.
```

Sin reglas, el sub sale `unknown`. Con reglas contradictorias gana la más restrictiva. Nunca
inventar ni parafrasear una regla: si no está leída, no está.

## Límites y diagnóstico

- Máximo 12 comunidades por corrida (`slice(0, 12)` en el colector): las demás se ignoran sin aviso.
- `--delay 60000` es el default y el mínimo sano para Reddit.
- **Auditoría vacía instantánea:** si el log dice `✓ 0 communities` en menos de un segundo, el
  filtro de áreas de `src/index.ts` descarta los jobs cuando el target no tiene `target.url`
  (ficha de App Store sin web propia). Las comunidades solo necesitan la lista de subs; el
  filtro tiene que dejarlas pasar igual. Arreglo de una línea, después `npm run build`.
- Un producto sin web propia hace que el harness informe `Engines observed: none strong enough to
  copy`: es lo esperado, no un fallo.

## Qué trae `evidence.json`

`communities[]` con `subreddit`, `verdict`, `score` (fit), `reasons` y `measured`:
`postsPerDay`, `pctLinks`, `pctSelfPromo`, `pctQuestion`, `pctStory`, `topDomains`, `samples`.
`pctLinks` es el número que decide si el formato aguanta un post de producto.

## Importar al grafo y al sitio

Un importador chico y determinista alcanza: lee `evidence.json` más `plan.md`, emite un JSON de
nodos y aristas con ids estables (`verdict:red-<sub>`, `policy:<sub>-sin-leer`) y un
`web/red.json` para la tabla del sitio. Ids estables = se puede re-correr sin duplicar, porque el
`akg add` ignora lo que ya existe.

Antes de commitear: `git log --oneline -4`. Si hay commits que no son tuyos, hay una segunda
mano en esa carpeta; stagear rutas explícitas y nunca `git add -A`.
