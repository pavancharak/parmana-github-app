# Agent configuration format register

Document version: 1.0
Status as of 2026-11-26. Owner: Pavan Charak. Rows marked "verified" were read from the tool's own published documentation on that date. Rows marked "not verified" were not read from official pages, and must not be built from; the tool's docs may change, so re-check before each parser is written.

Parmana analyses only the formats listed here with status **Supported**. Any other file is reported as unsupported and is never treated as safe (FR-03 item 10, FR-04 item 5).

Each format has a version. A parser change that alters how a format is read bumps the parser version recorded in evidence (FR-03 item 4).

## Status key

- **Supported:** a versioned parser exists, with fixtures and tests.
- **Planned:** agreed for a later release, no parser yet.
- **Candidate, to verify:** a tool we may support. Its file locations and format must be checked against the tool's current documentation before any parser is written. Nothing in this row is verified.

## Register

| Format | Agent or tool | Discovery path | Status | Release | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude Code settings | Claude Code | User `~/.claude/settings.json`; shared project `.claude/settings.json`; project local `.claude/settings.local.json`; managed settings (system directory, path not stated on the page) | Planned (pilot), paths verified 2026-11-26 | Pilot (ADR-0006) | Source: code.claude.com/docs/en/settings, read in full. Precedence, highest first: managed, command line, project local, shared project, user. List keys such as `permissions.allow` are combined across levels, not overridden |
| Claude Code settings, local | Claude Code | `.claude/settings.local.json` | Verified 2026-11-26 | 1.0 | Project-local level, above shared project settings. Source: code.claude.com/docs/en/settings |
| Agent instructions | Any tool that reads `AGENTS.md` | `AGENTS.md` | Planned | 1.0 | Shared format; instructions text is analysed for declared capabilities only where structured |
| GitHub Copilot instructions | GitHub Copilot | `.github/copilot-instructions.md` | Planned | 1.0 | FR-03 target |
| MCP configuration | Any MCP client | Supported MCP JSON files | Planned | 1.0 | List of supported files to be fixed in the parser spec |
| GitHub Actions workflows | GitHub Actions | `.github/workflows/*.yml` | Planned | 1.0 | Covers workflow modification and secret access |
| Cursor project rules | Cursor | `.cursor/rules/*.mdc`, nested directories allowed (from search snippets) | Candidate, NOT verified: official page unreachable | Later | cursor.com/docs/rules could not be resolved from the build session on 2026-11-26. Do not build from this row until verified |
| Codex project config | OpenAI Codex CLI | `.codex/config.toml` (from search snippets) | Candidate, NOT verified: official page unreachable | Later | developers.openai.com could not be resolved from the build session on 2026-11-26. Do not build from this row until verified |
| Codex user config | OpenAI Codex CLI | `~/.codex/config.toml`, profiles `~/.codex/<name>.config.toml` (from search snippets) | Candidate, NOT verified: official page unreachable | Later | Same source problem as the Codex project row |
| Codex agent instructions | OpenAI Codex CLI | `AGENTS.md` (from search snippets) | Candidate, NOT verified: official page unreachable | Later | Same source problem as the Codex project row. The 32 KiB limit is unverified |
| Windsurf rules | Windsurf | `.windsurf/rules/*.md`, `.windsurfrules` (legacy), `AGENTS.md` in subdirectories | Candidate, NOT verified: official page unreachable | Later | docs.windsurf.com could not be resolved on 2026-11-26. Search snippets mention a character limit that is unconfirmed |
| Cline rules | Cline | Workspace: `.clinerules/` or `.cline/rules/` at the project root (folders). Global: `~/Documents/Cline/Rules` (Windows: `Documents\Cline\Rules`); Cline also searches `~/.cline/rules` and `~/Cline/Rules` | Verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/cline/cline/main/docs/customization/cline-rules.mdx, read in full. Path scoping: YAML frontmatter `paths:` with glob patterns; rules without frontmatter are always active. Workspace and global rules are combined; workspace wins on conflict. `AGENTS.md` is also listed. The page only detects `.cursorrules` and `.windsurfrules`; it does not say how they are parsed |
| Aider config and conventions | Aider | `.aider.conf.yml`; conventions file loaded through a `read:` entry (from search snippets) | Candidate, NOT verified: official page unreachable | Later | aider.chat could not be resolved on 2026-11-26. Search snippets disagree on search order |
| Gemini CLI settings | Gemini CLI | User: `~/.gemini/settings.json`. Project: `.gemini/settings.json`. System: `/etc/gemini-cli/settings.json` (Linux), `C:\ProgramData\gemini-cli\settings.json` (Windows), `/Library/Application Support/GeminiCli/settings.json` (macOS). System defaults: `system-defaults.json` in the same folders | Candidate, verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/configuration.md, read verbatim. Precedence, lowest to highest: hardcoded defaults, system defaults, user, project, system, environment variables, command-line arguments. The system file overrides all other settings files. The website copy (geminicli.com) could not be resolved from the build session, so the wording may differ there. Version or commit not shown on the page |
| Gemini CLI context | Gemini CLI | `~/.gemini/<context fileName>`, plus files from the current directory up to the project root (`.git`) or home, and subdirectories (limit 200, `context.discoveryMaxDirs`). Default name `GEMINI.md`, set by `context.fileName` | Candidate, partly verified 2026-11-26 | Later | Location rules came from a summary of the repo page, not the verbatim text. Confirm before building |

## Rules for adding a format

1. Record the source of the format's documentation and the version it was read from.
2. Write fixtures for valid, invalid and malformed files before the parser.
3. Map each capability to the canonical schema (`api/CAPABILITY-SCHEMA.md`). Unknown fields are reported as unknown, not ignored.
4. Add the row here with status **Supported** only after the tests pass.
5. Never add a format from a tool's marketing page alone. Use its own configuration reference.

## Related

- OD-01 in `product/OPEN-DECISIONS.md`: Release 1.0 formats.
- ADR-0006: the pilot covers `.claude/settings.json` only.
