#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: run-agent.sh <task-slug> <codex|claude> <prompt-file>

Examples:
  bash .clawdbot/run-agent.sh billing-fix codex .clawdbot/prompts/billing-fix.md
  DRY_RUN=1 bash .clawdbot/run-agent.sh ui-refresh claude .clawdbot/prompts/ui-refresh.md
EOF
}

if [ "$#" -lt 3 ]; then
  usage
  exit 1
fi

task_slug="$1"
agent="$2"
prompt_file="$3"

case "$agent" in
  codex|claude) ;;
  *)
    fail "Agent must be either 'codex' or 'claude'."
    ;;
esac

require_cmd git
require_cmd node
load_env
ensure_registry

repo="$(repo_root)"
base_branch="${BASE_BRANCH:-${DEFAULT_BASE_BRANCH:-main}}"
remote_name="${REMOTE_NAME:-${DEFAULT_REMOTE:-origin}}"
worktree_dir_rel="${WORKTREE_DIR:-${DEFAULT_WORKTREE_DIR:-.worktrees}}"
worktree_root_abs="$(resolve_repo_path "$worktree_dir_rel")"
worktree_rel="$worktree_dir_rel/$task_slug"
worktree_abs="$worktree_root_abs/$task_slug"
branch="agent/$task_slug"
session_name="claw-$(sanitize_session_name "$agent-$task_slug")"

prompt_abs="$(resolve_repo_path "$prompt_file")"
[ -f "$prompt_abs" ] || fail "Prompt file not found: $prompt_file"

mkdir -p "$worktree_root_abs"

if [ ! -d "$worktree_abs" ]; then
  if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$repo" worktree add "$worktree_abs" "$branch"
  else
    git -C "$repo" worktree add "$worktree_abs" -b "$branch" "$remote_name/$base_branch"
  fi
fi

if [ -f "$worktree_abs/package-lock.json" ] && [ ! -d "$worktree_abs/node_modules" ]; then
  (cd "$worktree_abs" && npm ci --no-audit --no-fund >/dev/null)
fi

mkdir -p "$worktree_abs/.clawdbot/prompts"
worktree_prompt_rel=".clawdbot/prompts/$task_slug.md"
cp "$prompt_abs" "$worktree_abs/$worktree_prompt_rel"

if [ -f "$worktree_abs/.clawdbot/.env.local" ]; then
  :
else
  cp "$(clawdbot_dir)/.env.local" "$worktree_abs/.clawdbot/.env.local" 2>/dev/null || true
fi

if [ "$agent" = "codex" ]; then
  launch_command="codex --model ${CODEX_MODEL:-gpt-5.3-codex} -c model_reasoning_effort=${CODEX_REASONING_EFFORT:-high} --dangerously-bypass-approvals-and-sandbox \"\$(cat $worktree_prompt_rel)\""
else
  launch_command="claude --model ${CLAUDE_MODEL:-claude-opus-4.5} --dangerously-skip-permissions -p \"\$(cat $worktree_prompt_rel)\""
fi

status="running"
started_at="$(now_ts)"

if [ "${DRY_RUN:-0}" = "1" ]; then
  status="prepared"
  log "DRY RUN: would launch session $session_name in $worktree_rel"
  log "DRY RUN: $launch_command"
else
  require_cmd tmux
  require_cmd "$agent"
  if tmux has-session -t "$session_name" 2>/dev/null; then
    fail "tmux session already exists: $session_name"
  fi
  tmux new-session -d -s "$session_name" -c "$worktree_abs"
  tmux send-keys -t "$session_name" -l "$launch_command"
  tmux send-keys -t "$session_name" Enter
fi

task_json="$(node -e '
  const [id, agent, branch, worktree, promptFile, sessionName, startedAt, status] = process.argv.slice(1);
  process.stdout.write(JSON.stringify({
    id,
    agent,
    branch,
    worktree,
    promptFile,
    sessionName,
    startedAt: Number(startedAt),
    status,
    prNumber: null,
    prState: null,
    prUrl: null,
    lastCheck: null,
    lastSummary: null,
    notifiedAt: null,
    checks: {
      lint: false,
      build: false,
      test: false
    }
  }));
' "$task_slug" "$agent" "$branch" "$worktree_rel" "$worktree_prompt_rel" "$session_name" "$started_at" "$status")"

registry_upsert_task "$task_json"

log "Task $task_slug recorded."
log "Worktree: $worktree_rel"
log "Branch: $branch"
log "Session: $session_name"
