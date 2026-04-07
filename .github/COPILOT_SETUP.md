# Copilot CLI Setup for 雀友聚

This project is configured with Copilot CLI integration. Use the slash commands and built-in tools to accelerate development.

## Quick Reference

### Skills
```
/skill find-docs          # Look up technical documentation
/list-skills              # List all available skills
```

### Task Agents
The `task` tool provides specialized agents:
- **explore** - Fast code search and codebase understanding
- **task** - Command execution (builds, tests, lints)
- **general-purpose** - Complex multi-step work with full context
- **code-review** - High-signal code quality review

### Common Workflows

**Understand a feature**:
```
Use /explore to search code and understand how friends, groups, or messaging works
```

**Run tests/builds**:
```
Use /task to run: bun test, bun build, bun lint
```

**Review code changes**:
```
Use /code-review agent to analyze staged/unstaged changes
```

**Complex refactoring**:
```
Use /general-purpose agent for multi-file changes with full context
```

## MCP Servers

**Supabase** - Query your database schema and documentation
- Configured with your project reference
- Use with `/find-docs` for schema lookup

## Built-in Features

- **Path alias resolution**: `@/` resolves to `src/`
- **TypeScript support**: Full type checking with relaxed strictness
- **Component finder**: Quickly locate UI components, pages, hooks
- **Test runner**: Run specific tests via task agent

## Documentation

See `.github/copilot-instructions.md` for detailed architecture guide, conventions, and development practices.

Migration details: `~/.copilot/MCP_MIGRATION_GUIDE.md`
