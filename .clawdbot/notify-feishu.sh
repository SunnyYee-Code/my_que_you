#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/lib.sh"

load_env

task_id="${1:-}"
pr_number="${2:-}"
branch="${3:-}"
summary="${4:-All local checks passed.}"

if [ -z "$task_id" ]; then
  fail "Usage: notify-feishu.sh <task-id> <pr-number> <branch> [summary]"
fi

if [ -z "${FEISHU_WEBHOOK_URL:-}" ]; then
  log "Skipping Feishu notification for $task_id because FEISHU_WEBHOOK_URL is not configured."
  exit 0
fi

payload="$(node -e '
  const [repoName, taskId, prNumber, branch, summary] = process.argv.slice(1);
  const title = prNumber ? `PR #${prNumber} Ready for Review` : `Task ${taskId} Update`;
  const body = [
    `**Repo**: ${repoName}`,
    `**Task**: ${taskId}`,
    branch ? `**Branch**: ${branch}` : "",
    prNumber ? `**PR**: #${prNumber}` : "",
    `**Summary**: ${summary}`
  ].filter(Boolean).join("\n");
  process.stdout.write(JSON.stringify({
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: title }
      },
      elements: [
        {
          tag: "div",
          text: { tag: "lark_md", content: body }
        }
      ]
    }
  }));
' "$(basename "$(repo_root)")" "$task_id" "$pr_number" "$branch" "$summary")"

curl -fsS \
  -X POST \
  -H 'Content-Type: application/json' \
  -d "$payload" \
  "$FEISHU_WEBHOOK_URL" >/dev/null

log "Feishu notification sent for $task_id."
