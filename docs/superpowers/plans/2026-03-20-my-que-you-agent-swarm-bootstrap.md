# My Que You Agent Swarm Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a minimal agent-swarm workflow for `my_que_you` with isolated worktrees, local task registry, Feishu completion notifications, and deterministic status checks.

**Architecture:** Add a `.clawdbot/` control directory inside the repository. `run-agent.sh` will create isolated worktrees and task records, `check-agents.sh` will validate local status and PR metadata deterministically, and `notify-feishu.sh` will send alerts only when a task reaches the local Definition of Done.

**Tech Stack:** Bash, Git worktrees, tmux, GitHub CLI, Codex CLI, Claude CLI, Node/npm scripts, Feishu webhook

---

This plan is intentionally mirrored in the implementation worktree so the bootstrap branch is self-contained.
