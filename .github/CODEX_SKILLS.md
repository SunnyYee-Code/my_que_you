# Copilot CLI - Imported Codex Skills

This project is now configured with skills migrated from Codex to Copilot CLI.

## Available Skills in Copilot CLI

### Documentation & Planning
- **/skill context7** - Look up technical documentation with Context7 CLI
- **/skill planning-with-files** - Create task_plan.md, findings.md, progress.md for structured work
- **/skill ui-ux-pro-max** - UI/UX design intelligence (67 styles, 96 color palettes, 57 font pairings)

### Development Workflows
- **/skill test-driven-development** - TDD methodology, testing patterns, anti-patterns
- **/skill systematic-debugging** - Advanced debugging techniques and defense-in-depth
- **/skill using-git-worktrees** - Multi-branch development with git worktrees
- **/skill subagent-driven-development** - Coordinate multiple specialized agents
- **/skill requesting-code-review** - Structured code review workflows
- **/skill writing-plans** - Create detailed project plans
- **/skill executing-plans** - Execute and track plan progress
- **/skill dispatching-parallel-agents** - Run multiple tasks in parallel

### Built-in Skills (Auto-available)
- **/skill find-docs** - Documentation lookup (built-in)
- **/list-skills** - List all available skills (built-in)

## MCP Servers

Four MCP servers are configured:

| Server | Type | Purpose |
|--------|------|---------|
| **supabase** | HTTP | Database schema & queries |
| **playwright** | NPX | Browser automation & e2e testing |
| **pencil** | Local | VS Code IDE integration |
| **feishu-mcp** | HTTP | Feishu/Lark team communication |

## How to Use

### Quick Start
```
/skill planning-with-files
# Creates task_plan.md, findings.md, progress.md
# Use for complex, multi-step tasks
```

### Documentation Lookup
```
/skill context7
# Resolves library IDs and retrieves current documentation
# Two-step: library → docs
```

### Design Recommendations
```
/skill ui-ux-pro-max
# Get comprehensive design system recommendations
# Uses Python and searchable design database
```

### Code Review
```
/skill requesting-code-review
# Use before opening a PR
# Ensures quality and completeness
```

### Debugging Issues
```
/skill systematic-debugging
# Advanced troubleshooting techniques
# Defense-in-depth strategies
```

## Configuration

**Location**: `~/.copilot/mcp-settings.json`

All 4 MCP servers are configured. To add more servers, edit this JSON file and restart Copilot CLI.

## See Also

- **Copilot Instructions**: `.github/copilot-instructions.md`
- **Setup Guide**: `.github/COPILOT_SETUP.md`
- **Migration Details**: `~/.copilot/CODEX_MIGRATION_COMPLETE.md`
