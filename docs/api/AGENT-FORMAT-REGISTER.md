# Agent configuration format register

Document version: 1.0
Status as of 2026-11-26. Owner: Pavan Charak.

Parmana analyses only the formats listed here with status **Supported**. Any other file is reported as unsupported and is never treated as safe (FR-03 item 10, FR-04 item 5).

Each format has a version. A parser change that alters how a format is read bumps the parser version recorded in evidence (FR-03 item 4).

## Status key

- **Supported:** a versioned parser exists, with fixtures and tests.
- **Planned:** agreed for a later release, no parser yet.
- **Candidate, to verify:** a tool we may support. Its file locations and format must be checked against the tool's current documentation before any parser is written. Nothing in this row is verified.

## Register

| Format | Agent or tool | Discovery path | Status | Release | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude Code settings | Claude Code | `.claude/settings.json` | Planned (pilot) | Pilot (ADR-0006) | Only format in the pilot |
| Claude Code settings, local | Claude Code | `.claude/settings.local.json` | Candidate, to verify | 1.0 | Local overrides; confirm whether committed to repos |
| Agent instructions | Any tool that reads `AGENTS.md` | `AGENTS.md` | Planned | 1.0 | Shared format; instructions text is analysed for declared capabilities only where structured |
| GitHub Copilot instructions | GitHub Copilot | `.github/copilot-instructions.md` | Planned | 1.0 | FR-03 target |
| MCP configuration | Any MCP client | Supported MCP JSON files | Planned | 1.0 | List of supported files to be fixed in the parser spec |
| GitHub Actions workflows | GitHub Actions | `.github/workflows/*.yml` | Planned | 1.0 | Covers workflow modification and secret access |
| Cursor rules | Cursor | `.cursor/rules/`, `.cursorrules` | Candidate, to verify | Later | Check current location and format |
| Codex configuration | OpenAI Codex CLI | `AGENTS.md` and its config file | Candidate, to verify | Later | Check whether its config is in scope |
| Gemini CLI settings | Gemini CLI | `GEMINI.md` and `.gemini/settings.json` | Candidate, to verify | Later | Check current location and format |

## Rules for adding a format

1. Record the source of the format's documentation and the version it was read from.
2. Write fixtures for valid, invalid and malformed files before the parser.
3. Map each capability to the canonical schema (`api/CAPABILITY-SCHEMA.md`). Unknown fields are reported as unknown, not ignored.
4. Add the row here with status **Supported** only after the tests pass.
5. Never add a format from a tool's marketing page alone. Use its own configuration reference.

## Related

- OD-01 in `product/OPEN-DECISIONS.md`: Release 1.0 formats.
- ADR-0006: the pilot covers `.claude/settings.json` only.
