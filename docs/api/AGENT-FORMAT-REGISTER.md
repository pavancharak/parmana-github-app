# Agent configuration format register

Document version: 1.0
Status as of 2026-11-26. Owner: Pavan Charak. Rows marked "verified" were checked against the tool's published documentation on that date; the tool's docs may change, so re-check before each parser is written.

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
| Cursor project rules | Cursor | `.cursor/rules/*.mdc`, nested directories allowed | Candidate, verified 2026-11-26 | Later | `.mdc` files scoped by path, manual, or relevance. Also reads root `AGENTS.md`. Legacy `.cursorrules` still supported but deprecated. Source: cursor.com/docs/rules |
| Codex project config | OpenAI Codex CLI | `.codex/config.toml` (per directory, loaded only for trusted projects) | Candidate, verified 2026-11-26 | Later | Some keys (`openai_base_url`, `model_provider`, `notify`) are ignored in project files. Source: developers.openai.com/codex/config-reference |
| Codex user config | OpenAI Codex CLI | `~/.codex/config.toml`, profile files `~/.codex/<name>.config.toml` | Candidate, verified 2026-11-26 | Later | User-level settings; profiles overlay the base file. Source: developers.openai.com/codex/config-advanced |
| Codex agent instructions | OpenAI Codex CLI | `AGENTS.md`, found by walking up to the project root (default: directory with `.git`) | Candidate, verified 2026-11-26 | Later | Covered by the shared `AGENTS.md` parser. Embedded up to 32 KiB by default |
| Gemini CLI settings | Gemini CLI | `~/.gemini/settings.json`, `.gemini/settings.json`, system file under `/etc/gemini-cli/` (Linux), `C:\ProgramData\gemini-cli\` (Windows), `/Library/Application Support/GeminiCli/` (macOS) | Candidate, partly verified 2026-11-26 | Later | Precedence between system, project and user files is not consistent across sources; verify on geminicli.com/docs/cli/configuration before building. The legacy v1 format is deprecated |
| Gemini CLI context | Gemini CLI | `GEMINI.md` in home, parent directories and current directory (filename configurable) | Candidate, verified 2026-11-26 | Later | Source: geminicli.com/docs/cli/configuration |

## Rules for adding a format

1. Record the source of the format's documentation and the version it was read from.
2. Write fixtures for valid, invalid and malformed files before the parser.
3. Map each capability to the canonical schema (`api/CAPABILITY-SCHEMA.md`). Unknown fields are reported as unknown, not ignored.
4. Add the row here with status **Supported** only after the tests pass.
5. Never add a format from a tool's marketing page alone. Use its own configuration reference.

## Related

- OD-01 in `product/OPEN-DECISIONS.md`: Release 1.0 formats.
- ADR-0006: the pilot covers `.claude/settings.json` only.
