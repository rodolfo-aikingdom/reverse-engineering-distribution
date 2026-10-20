#!/usr/bin/env bash
# Instala las skills de este repo en un agente Hermes.
#
#   ./scripts/install-skills.sh            # copia a ~/.hermes/skills/distribution/
#   ./scripts/install-skills.sh --check    # solo dice que esta distinto, no escribe
#   SKILLS_DIR=/otro/path ./scripts/install-skills.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${SKILLS_DIR:-$HOME/.hermes/skills/distribution}"
MODE="${1:-install}"

if [ ! -d "$ROOT/skills" ]; then
  echo "no hay skills/ en $ROOT" >&2
  exit 1
fi

drift=0
for src in "$ROOT"/skills/*/; do
  name="$(basename "$src")"
  [ -f "$src/SKILL.md" ] || continue
  if [ ! -f "$DEST/$name/SKILL.md" ] || ! diff -rq "$src" "$DEST/$name" >/dev/null 2>&1; then
    drift=$((drift + 1))
    if [ "$MODE" = "--check" ]; then
      echo "DISTINTO $name"
    else
      mkdir -p "$DEST/$name"
      rsync -a --delete "$src" "$DEST/$name/"
      echo "instalada $name -> $DEST/$name"
    fi
  fi
done

if [ "$MODE" = "--check" ]; then
  [ "$drift" -eq 0 ] && echo "todas iguales en $DEST" || echo "$drift skill(s) distintas de $DEST"
else
  [ "$drift" -eq 0 ] && echo "nada que hacer: $DEST ya estaba al dia"
fi
