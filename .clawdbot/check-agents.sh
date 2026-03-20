#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib.sh"

load_env
ensure_registry
ensure_logs_dir

run_check() {
  local worktree_abs="$1"
  local task_id="$2"
  local label="$3"
  local command="$4"
  local log_file

  log_file="$(logs_dir)/${task_id}-${label}.log"
  if (cd "$worktree_abs" && bash -lc "$command") >"$log_file" 2>&1; then
    log "$task_id: $label passed."
    return 0
  fi

  warn "$task_id: $label failed. See $log_file"
  return 1
}

find_pr_json() {
  local branch="$1"
  if ! command -v gh >/dev/null 2>&1; then
    printf '{}'
    return 0
  fi

  if ! gh auth status >/dev/null 2>&1; then
    printf '{}'
    return 0
  fi

  gh pr list --head "$branch" --state all --json number,state,title,url 2>/dev/null | \
    node -e '
      const items = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
      process.stdout.write(JSON.stringify(items[0] || {}));
    '
}

task_count="$(node -e 'const fs=require("node:fs"); const tasks=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(String(tasks.length));' "$(registry_file)")"
if [ "$task_count" = "0" ]; then
  log "No active tasks found."
  exit 0
fi

while IFS= read -r task_json; do
  [ -n "$task_json" ] || continue

  task_id="$(json_field "$task_json" "id")"
  branch="$(json_field "$task_json" "branch")"
  worktree_rel="$(json_field "$task_json" "worktree")"
  worktree_abs="$(resolve_repo_path "$worktree_rel")"
  session_name="$(json_field "$task_json" "sessionName")"
  notified_at="$(json_field "$task_json" "notifiedAt")"
  status="running"
  summary=""
  lint_ok=false
  build_ok=false
  test_ok=false
  session_alive=false
  pr_json='{}'
  pr_number=""
  pr_state=""
  pr_url=""

  if [ ! -d "$worktree_abs" ]; then
    status="missing-worktree"
    summary="Worktree $worktree_rel is missing."
  elif ! git -C "$(repo_root)" show-ref --verify --quiet "refs/heads/$branch"; then
    status="missing-branch"
    summary="Branch $branch is missing."
  else
    if command -v tmux >/dev/null 2>&1 && [ -n "$session_name" ] && tmux has-session -t "$session_name" 2>/dev/null; then
      session_alive=true
    fi

    pr_json="$(find_pr_json "$branch")"
    pr_number="$(json_field "$pr_json" "number")"
    pr_state="$(json_field "$pr_json" "state")"
    pr_url="$(json_field "$pr_json" "url")"

    if run_check "$worktree_abs" "$task_id" "lint" "npm run lint"; then
      lint_ok=true
    fi
    if run_check "$worktree_abs" "$task_id" "build" "npm run build"; then
      build_ok=true
    fi
    if run_check "$worktree_abs" "$task_id" "test" "npm run test"; then
      test_ok=true
    fi

    if [ "$lint_ok" = true ] && [ "$build_ok" = true ] && [ "$test_ok" = true ] && [ -n "$pr_number" ]; then
      status="done"
      summary="PR #$pr_number has passed lint, build, and test."
    elif [ "$lint_ok" = true ] && [ "$build_ok" = true ] && [ "$test_ok" = true ]; then
      status="awaiting-pr"
      summary="Local checks passed. Waiting for PR."
    elif [ "$session_alive" = true ]; then
      status="running"
      summary="Agent session is still running."
    else
      status="failing-checks"
      summary="One or more local checks failed."
    fi
  fi

  patch_json="$(node -e '
    const [status, lastCheck, summary, sessionAlive, prNumber, prState, prUrl, lint, build, test] = process.argv.slice(1);
    process.stdout.write(JSON.stringify({
      status,
      lastCheck: Number(lastCheck),
      lastSummary: summary,
      sessionAlive: sessionAlive === "true",
      prNumber: prNumber ? Number(prNumber) : null,
      prState: prState || null,
      prUrl: prUrl || null,
      checks: {
        lint: lint === "true",
        build: build === "true",
        test: test === "true"
      }
    }));
  ' "$status" "$(now_ts)" "$summary" "$session_alive" "$pr_number" "$pr_state" "$pr_url" "$lint_ok" "$build_ok" "$test_ok")"

  registry_patch_task "$task_id" "$patch_json"

  if [ "$status" = "done" ] && [ -z "$notified_at" ]; then
    bash "$SCRIPT_DIR/notify-feishu.sh" "$task_id" "$pr_number" "$branch" "$summary"
    registry_patch_task "$task_id" "$(node -e 'process.stdout.write(JSON.stringify({ notifiedAt: Number(process.argv[1]) }));' "$(now_ts)")"
  fi
done < <(registry_each_task)
