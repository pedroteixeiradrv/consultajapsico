#!/usr/bin/env bash
# Set LIVEPIX_CLIENT_ID / LIVEPIX_CLIENT_SECRET on consultajapsico + consultajaadv
# (Production + Preview) for team pedroteixeira-ofc.
# Reads values from environment at runtime — never hardcodes secrets.
set -euo pipefail

SCOPE_TEAM="pedroteixeira-ofc"
PROJECTS=(consultajapsico consultajaadv)
ENVS=(production preview)

need() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: missing env $name (export it before running). Aborting." >&2
    exit 1
  fi
}

need LIVEPIX_CLIENT_ID_CONSULTAJA
need LIVEPIX_CLIENT_SECRET_CONSULTAJA

if ! command -v vercel >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: vercel CLI / npx not available" >&2
  exit 1
fi

VERCEL=(vercel)
if ! command -v vercel >/dev/null 2>&1; then
  VERCEL=(npx vercel)
fi

if ! "${VERCEL[@]}" whoami >/dev/null 2>&1; then
  echo "NEED_VERCEL_LOGIN: run vercel login first" >&2
  exit 2
fi

echo "Authenticated as: $("${VERCEL[@]}" whoami 2>/dev/null || true)"
echo "Setting LIVEPIX envs for team ${SCOPE_TEAM} (values not echoed)..."

add_var() {
  local project="$1"
  local key="$2"
  local env_name="$3"
  local source_var="$4"
  # Pipe value into vercel env add without printing it
  printf %s "${!source_var}" | "${VERCEL[@]}" env add "$key" "$env_name" \
    --force \
    --scope "$SCOPE_TEAM" \
    --yes \
    2>&1 | sed "s/${!source_var}/<redacted>/g" || true
}

# Prefer linking via project name with --cwd if local dirs exist
resolve_cwd() {
  local project="$1"
  case "$project" in
    consultajapsico)
      for d in /workspace/consultaja /workspace/_push_psico /workspace/consultajapsico-upload; do
        [[ -d "$d" ]] && { echo "$d"; return; }
      done
      ;;
    consultajaadv)
      for d in /workspace/consultajaadv /workspace/_push_adv; do
        [[ -d "$d" ]] && { echo "$d"; return; }
      done
      ;;
  esac
  echo ""
}

for project in "${PROJECTS[@]}"; do
  cwd="$(resolve_cwd "$project")"
  echo "=== project: $project (cwd=${cwd:-none}) ==="
  pushd "${cwd:-.}" >/dev/null
  # Ensure link (non-interactive best-effort)
  if [[ ! -f .vercel/project.json ]]; then
    "${VERCEL[@]}" link --yes --scope "$SCOPE_TEAM" --project "$project" 2>&1 || \
      echo "WARN: link failed for $project — env add may still work with --scope"
  fi
  for env_name in "${ENVS[@]}"; do
    echo "  add LIVEPIX_CLIENT_ID ($env_name)"
    printf %s "$LIVEPIX_CLIENT_ID_CONSULTAJA" | "${VERCEL[@]}" env add LIVEPIX_CLIENT_ID "$env_name" --force --yes 2>&1 | awk {print} || true
    echo "  add LIVEPIX_CLIENT_SECRET ($env_name)"
    printf %s "$LIVEPIX_CLIENT_SECRET_CONSULTAJA" | "${VERCEL[@]}" env add LIVEPIX_CLIENT_SECRET "$env_name" --force --yes 2>&1 | awk {print} || true
  done
  popd >/dev/null
done

echo "Done. Re-deploy separately if needed (vercel --prod --yes)."
