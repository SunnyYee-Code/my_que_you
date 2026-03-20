#!/usr/bin/env bash
set -euo pipefail

claw_script_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd
}

repo_root() {
  cd "$(claw_script_dir)/.." >/dev/null 2>&1 && pwd
}

clawdbot_dir() {
  printf '%s\n' "$(repo_root)/.clawdbot"
}

registry_file() {
  printf '%s\n' "$(clawdbot_dir)/active-tasks.json"
}

now_ts() {
  node -e 'process.stdout.write(String(Date.now()))'
}

log() {
  printf '[clawdbot] %s\n' "$*"
}

warn() {
  printf '[clawdbot] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[clawdbot] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

load_env() {
  local env_file
  env_file="$(clawdbot_dir)/.env.local"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

ensure_registry() {
  mkdir -p "$(clawdbot_dir)"
  if [ ! -f "$(registry_file)" ]; then
    printf '[]\n' > "$(registry_file)"
  fi
}

resolve_repo_path() {
  node -e 'const path=require("node:path"); process.stdout.write(path.resolve(process.argv[1], process.argv[2]));' \
    "$(repo_root)" "$1"
}

to_repo_relative_path() {
  node -e 'const path=require("node:path"); process.stdout.write(path.relative(process.argv[1], process.argv[2]) || ".");' \
    "$(repo_root)" "$1"
}

json_field() {
  node -e 'const value = JSON.parse(process.argv[1])[process.argv[2]]; process.stdout.write(value == null ? "" : String(value));' \
    "$1" "$2"
}

registry_find_task() {
  ensure_registry
  node -e '
    const fs = require("node:fs");
    const [file, id] = process.argv.slice(1);
    const tasks = JSON.parse(fs.readFileSync(file, "utf8"));
    const task = tasks.find((item) => item.id === id);
    if (task) {
      process.stdout.write(JSON.stringify(task));
    }
  ' "$(registry_file)" "$1"
}

registry_each_task() {
  ensure_registry
  node -e '
    const fs = require("node:fs");
    const file = process.argv[1];
    const tasks = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const task of tasks) {
      process.stdout.write(`${JSON.stringify(task)}\n`);
    }
  ' "$(registry_file)"
}

registry_upsert_task() {
  ensure_registry
  node -e '
    const fs = require("node:fs");
    const [file, rawTask] = process.argv.slice(1);
    const task = JSON.parse(rawTask);
    const tasks = JSON.parse(fs.readFileSync(file, "utf8"));
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index === -1) {
      tasks.push(task);
    } else {
      tasks[index] = { ...tasks[index], ...task };
    }
    fs.writeFileSync(file, `${JSON.stringify(tasks, null, 2)}\n`);
  ' "$(registry_file)" "$1"
}

registry_patch_task() {
  ensure_registry
  node -e '
    const fs = require("node:fs");
    const [file, id, rawPatch] = process.argv.slice(1);
    const patch = JSON.parse(rawPatch);
    const tasks = JSON.parse(fs.readFileSync(file, "utf8"));
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Task not found: ${id}`);
    }
    tasks[index] = { ...tasks[index], ...patch };
    fs.writeFileSync(file, `${JSON.stringify(tasks, null, 2)}\n`);
  ' "$(registry_file)" "$1" "$2"
}

sanitize_session_name() {
  printf '%s' "$1" | tr '/:._' '-' | tr -cd '[:alnum:]-'
}

logs_dir() {
  printf '%s\n' "$(clawdbot_dir)/logs"
}

ensure_logs_dir() {
  mkdir -p "$(logs_dir)"
}
