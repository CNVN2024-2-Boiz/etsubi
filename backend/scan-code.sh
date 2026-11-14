set -euo pipefail

ROOT="$(realpath "${1:-.}")"
OUTPUT="${2:-codebase-dump.txt}"

mkdir -p "$(dirname "$OUTPUT")"
OUTPUT="$(realpath -m "$OUTPUT")"

EXCLUDED_DIRS=(
  .git node_modules target dist build book
  .next .nuxt .output .astro
  coverage .venv venv __pycache__
  .direnv result vendor
  .idea .vscode
)

EXCLUDED_FILES=(
  .env .env.local .env.production
  id_rsa id_ed25519
  "*.pem" "*.key" "*.p12" "*.pfx"
  "*.lock" "*.min.js" "*.min.css"
  "*.map" "*.wasm"
)

FIND_ARGS=("$ROOT")

for dir in "${EXCLUDED_DIRS[@]}"; do
  FIND_ARGS+=(-type d -name "$dir" -prune -o)
done

{
  printf '# Codebase Dump\n'
  printf '# Root: %s\n' "$ROOT"
  printf '# Generated: %s\n\n' "$(date -Is)"

  while IFS= read -r -d '' file; do
    [[ "$file" == "$OUTPUT" ]] && continue

    rel="${file#"$ROOT"/}"
    name="$(basename "$file")"

    excluded=false
    for pattern in "${EXCLUDED_FILES[@]}"; do
      if [[ "$name" == $pattern ]]; then
        excluded=true
        break
      fi
    done
    "$excluded" && continue

    # Skip files that appear to be binary.
    if ! grep -Iq . "$file" 2>/dev/null; then
      continue
    fi

    {
      printf '\n\n'
      printf '%s\n' "===== FILE: $rel ====="
      cat -- "$file"
    }
  done < <(
    find "${FIND_ARGS[@]}" -type f -print0 | sort -z
  )
} > "$OUTPUT"

printf 'Dump created: %s\n' "$OUTPUT"
printf 'Size: '
du -h "$OUTPUT" | cut -f1
printf 'Files included: '
grep -c '^===== FILE:' "$OUTPUT" || true
