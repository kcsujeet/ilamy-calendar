#!/usr/bin/env bash
# SessionStart hook: install the plugins this repo's .claude/settings.json
# enables, so a fresh clone needs no manual setup.
#
# `extraKnownMarketplaces` registers the marketplace on its own once the folder
# is trusted, but since Claude Code v2.1.195 `enabledPlugins` alone does NOT
# install a plugin that comes from an external source such as a GitHub repo:
# Claude Code reports it as not installed and prints the `claude plugin install`
# command for the collaborator to run by hand.
# https://code.claude.com/docs/en/discover-plugins#configure-team-marketplaces
#
# This runs that command for them. It is silent when nothing is missing, so the
# cost on a configured machine is one `claude plugin list` per session start.
#
# bash 3.2 (macOS system bash) — no arrays under `set -u`.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SETTINGS="$PROJECT_DIR/.claude/settings.json"

command -v claude >/dev/null 2>&1 || exit 0
command -v jq >/dev/null 2>&1 || exit 0
[ -f "$SETTINGS" ] || exit 0

# Enabled plugins that come from a marketplace this repo itself declares.
# Anything else in enabledPlugins is the machine's own business.
WANTED=$(jq -r '
  (.extraKnownMarketplaces | keys) as $markets
  | .enabledPlugins
  | to_entries[]
  | select(.value == true)
  | .key as $id
  | select($markets | index($id | split("@") | last))
  | $id
' "$SETTINGS" 2>/dev/null)
[ -n "$WANTED" ] || exit 0

INSTALLED=$(claude plugin list --json 2>/dev/null | jq -r '.[].id' 2>/dev/null)

MISSING=""
while IFS= read -r plugin_id; do
  printf '%s\n' "$INSTALLED" | grep -qxF "$plugin_id" && continue
  MISSING="${MISSING}${plugin_id}
"
done <<EOF
$WANTED
EOF

[ -n "$MISSING" ] || exit 0

KNOWN_MARKETPLACES=$(claude plugin marketplace list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null)

INSTALLED_NOW=""
FAILED=""

while IFS= read -r plugin_id; do
  [ -n "$plugin_id" ] || continue
  marketplace=${plugin_id##*@}

  # The trust gate normally registers the marketplace before this hook runs;
  # register it here too so the very first session after a clone still works.
  if ! printf '%s\n' "$KNOWN_MARKETPLACES" | grep -qxF "$marketplace"; then
    marketplace_source=$(jq -r --arg name "$marketplace" '
      .extraKnownMarketplaces[$name].source.repo // empty
    ' "$SETTINGS" 2>/dev/null)

    if [ -z "$marketplace_source" ]; then
      FAILED="${FAILED}${plugin_id} "
      continue
    fi

    if ! claude plugin marketplace add "$marketplace_source" >/dev/null 2>&1; then
      FAILED="${FAILED}${plugin_id} "
      continue
    fi

    KNOWN_MARKETPLACES="${KNOWN_MARKETPLACES}
${marketplace}"
  fi

  # Local scope, not project: the team-wide enable record already lives in the
  # committed .claude/settings.json, and that path is a symlink into .agents/,
  # which `--scope project` refuses to write through (SymlinkWriteRefusedError).
  # .claude/settings.local.json is gitignored, so this leaves no repo churn.
  if claude plugin install "$plugin_id" --scope local --yes >/dev/null 2>&1; then
    INSTALLED_NOW="${INSTALLED_NOW}${plugin_id} "
  else
    FAILED="${FAILED}${plugin_id} "
  fi
done <<EOF
$MISSING
EOF

if [ -n "$INSTALLED_NOW" ]; then
  echo "Installed the project plugins this repo enables: ${INSTALLED_NOW}— run /reload-plugins to activate them in this session."
fi

if [ -n "$FAILED" ]; then
  echo "Could not install the project plugins: ${FAILED}— install them with \`claude plugin install <plugin>@<marketplace> --scope local\`."
fi

exit 0
