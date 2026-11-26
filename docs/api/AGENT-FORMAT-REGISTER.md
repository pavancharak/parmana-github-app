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
| Aider config and conventions | Aider | `.aider.conf.yml` in the home directory, the git root and the current directory; later files take priority. `read:` in the config loads a conventions file at startup | Verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/config/aider_conf.md and .../docs/usage/conventions.md, read in full. Conventions do not load automatically. The file name `CONVENTIONS.md` is only an example, not a reserved name. `--config <file>` loads one file only |
| Qwen Code settings | Qwen Code (Alibaba) | User `~/.qwen/settings.json`; project `.qwen/settings.json`; system `/etc/qwen-code/settings.json` (Linux), `C:\ProgramData\qwen-code\settings.json` (Windows), `/Library/Application Support/QwenCode/settings.json` (macOS); system defaults file in the same folders | Candidate, verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/QwenLM/qwen-code/main/docs/users/configuration/settings.md, read in full. Precedence, lowest to highest: defaults, system defaults, user, project, system, environment variables, command-line arguments. Several keys are deprecated or removed (e.g. `tools.allowed`, `security.auth.apiKey`), and the old format is migrated with a backup. Parsers must handle these legacy keys |
| Qwen Code context | Qwen Code | `~/.qwen/<context.fileName>` (global) and the same file name from the current directory up to the project root (`.git`) or home. Default name `QWEN.md`; set with `context.fileName` (string or list) | Candidate, verified 2026-11-26 (project's own docs) | Later | Same source as the settings row. Context files are concatenated. `context.loadFromIncludeDirectories` loads the file from added directories |
| Kimi CLI (Python) | Moonshot Kimi CLI | `~/.kimi/config.toml` (from search snippets) | Archived, do not build | None | The repo says it is archived and read-only, and that existing installations will stop working. Replaced by Kimi Code CLI |
| Kimi Code CLI | Moonshot Kimi Code CLI | `~/.kimi/config.toml`, `~/.kimi/AGENTS.md` (global), `AGENTS.md` in project root and subdirectories (from search snippets) | Candidate, NOT verified | Later | The repo README gives no config paths. Its configuration page (moonshotai.github.io/kimi-code) could not be resolved from the build session on 2026-11-26 |
| Trae rules | Trae (ByteDance) | `.trae/rules/` (from search snippets, disputed by one source: `.trae/project_rules.md`) | Candidate, NOT verified | Later | No official reference page found. Third-party guides disagree on layout |
| GitHub Copilot instructions (path-specific) | GitHub Copilot | `.github/instructions/**/*.instructions.md` (from search snippets) | Candidate, NOT verified | Later | docs.github.com could not be resolved on 2026-11-26. Search snippets say precedence is path-specific, then repository-wide, then agent files |
| GitHub Copilot coding agent | GitHub Copilot | `AGENTS.md` (nearest file wins, nested), `.github/copilot-instructions.md` (from search snippets) | Candidate, NOT verified | Later | Same source problem as above. Search snippets mention a changelog entry adding AGENTS.md support to the coding agent |
| Amazon Q Developer project rules | Amazon Q Developer | `.amazonq/rules/*.md` (from search snippets) | Candidate, NOT verified | Later | docs.aws.amazon.com could not be resolved on 2026-11-26. An AWS blog post makes priority claims that are not in the official docs |
| JetBrains Junie guidelines | JetBrains Junie | `.junie/AGENTS.md` (used alone if present), then root `AGENTS.md`, then legacy `.junie/guidelines.md`; global `~/.junie/AGENTS.md` (from search snippets) | Candidate, NOT verified | Later | Official Junie docs host not resolved on 2026-11-26. Search snippets disagree on the default file, so check the version in use |
| Devin instructions | Devin (Cognition) | `AGENTS.md` at the project root or elsewhere; first 16 KiB loaded automatically (from search snippets) | Candidate, NOT verified | Later | docs.devin.ai not resolved on 2026-11-26. The 16 KiB limit is unconfirmed and may differ by product |
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
