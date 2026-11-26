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
| GitHub Copilot instructions | GitHub Copilot | `.github/copilot-instructions.md` | Planned; path verified 2026-11-26 | 1.0 | FR-03 target. Source: https://docs.github.com/en/copilot/concepts/prompting-and-context/custom-instructions (see log) |
| MCP configuration | Any MCP client | Supported MCP JSON files | Planned | 1.0 | List of supported files to be fixed in the parser spec |
| GitHub Actions workflows | GitHub Actions | `.github/workflows/*.yml` | Planned | 1.0 | Covers workflow modification and secret access |
| Cursor project rules | Cursor | `.cursor/rules/` as `.mdc` files (a plain `.md` file is ignored); `AGENTS.md` in the project root and subdirectories | Verified 2026-11-26 (official page text, downloaded and read) | Later | Sources: https://cursor.com/docs/rules and https://cursor.com/docs/context/rules. Precedence: Team → Project → User rules, all merged, earlier sources win on conflict. Nested AGENTS.md instructions combine with parent directories, with the more specific taking precedence. Legacy `.cursorrules` is not mentioned on the page |
| Codex project config | OpenAI Codex CLI | `.codex/config.toml` in the project, walked from project root to the working directory; loaded only for trusted projects | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session | Later | Pages: developers.openai.com/codex/config-advanced and config-reference. Project files ignore `openai_base_url`, `model_provider`, `model_providers`, `notify`, `profile`, `profiles`, `otel` and others, with a startup warning. Profiles overlay as `~/.codex/<name>.config.toml`. Precedence and the default `project_doc_max_bytes` are not in the downloaded pages. Earlier 308 redirect note was from the build session only |
| Codex user config | OpenAI Codex CLI | `~/.codex/config.toml`; profile files `~/.codex/<name>.config.toml` (selected with `--profile`) | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session | Later | Same pages as the Codex project row |
| Codex agent instructions | OpenAI Codex CLI | `AGENTS.md`, found by walking up from the working directory to the project root (default: a directory containing `.git`; change with `project_root_markers`). `project_doc_fallback_filenames` adds fallback names; `project_doc_max_bytes` caps what is read | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session | Later | The 32 KiB default is not in the downloaded pages and stays unverified. `model_instructions_file` replaces the built-in instructions instead of AGENTS.md |
| Windsurf rules | Windsurf, now Devin Desktop | `AGENTS.md`, `AGENTS.local.md` and `AGENT.md` at the workspace root and each directory down to the working directory. Current rule paths: `.devin/rules/*.md`, `~/.devin/rules/`, `~/.devin/global_rules.md`. Legacy `.windsurf/rules/*.md`, `.windsurf/global_rules.md` and `.windsurfrules` are imported by default | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session (page: docs.devin.ai/desktop/devin-local/customizations, saved under the Windsurf URL name) | Later | The Windsurf URL now redirects to the Devin Desktop docs. Skills: `.devin/skills/`; legacy `.windsurf/skills/` also read. Character limit: not on the downloaded page |
| Cline rules | Cline | Workspace: `.clinerules/` or `.cline/rules/` at the project root (folders). Global: `~/Documents/Cline/Rules` (Windows: `Documents\Cline\Rules`); Cline also searches `~/.cline/rules` and `~/Cline/Rules` | Verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/cline/cline/main/docs/customization/cline-rules.mdx, read in full. Path scoping: YAML frontmatter `paths:` with glob patterns; rules without frontmatter are always active. Workspace and global rules are combined; workspace wins on conflict. `AGENTS.md` is also listed. The page only detects `.cursorrules` and `.windsurfrules`; it does not say how they are parsed |
| Aider config and conventions | Aider | `.aider.conf.yml` in the home directory, the git root and the current directory; later files take priority. `read:` in the config loads a conventions file at startup | Verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/config/aider_conf.md and .../docs/usage/conventions.md, read in full. Conventions do not load automatically. The file name `CONVENTIONS.md` is only an example, not a reserved name. `--config <file>` loads one file only |
| Qwen Code settings | Qwen Code (Alibaba) | User `~/.qwen/settings.json`; project `.qwen/settings.json`; system `/etc/qwen-code/settings.json` (Linux), `C:\ProgramData\qwen-code\settings.json` (Windows), `/Library/Application Support/QwenCode/settings.json` (macOS); system defaults file in the same folders | Candidate, verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/QwenLM/qwen-code/main/docs/users/configuration/settings.md, read in full. Precedence, lowest to highest: defaults, system defaults, user, project, system, environment variables, command-line arguments. Several keys are deprecated or removed (e.g. `tools.allowed`, `security.auth.apiKey`), and the old format is migrated with a backup. Parsers must handle these legacy keys |
| Qwen Code context | Qwen Code | `~/.qwen/<context.fileName>` (global) and the same file name from the current directory up to the project root (`.git`) or home. Default name `QWEN.md`; set with `context.fileName` (string or list) | Candidate, verified 2026-11-26 (project's own docs) | Later | Same source as the settings row. Context files are concatenated. `context.loadFromIncludeDirectories` loads the file from added directories |
| Kimi CLI (Python) | Moonshot Kimi CLI | `~/.kimi/config.toml` (from search snippets) | Archived, do not build | None | The repo says it is archived and read-only, and that existing installations will stop working. Replaced by Kimi Code CLI |
| Kimi Code CLI | Moonshot Kimi Code CLI | Config `~/.kimi-code/config.toml` (override the folder with `KIMI_CODE_HOME`); UI prefs `tui.toml` in the same folder; MCP servers `~/.kimi-code/mcp.json` or project `.kimi-code/mcp.json` | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session (page: moonshotai.github.io/kimi-code/en/configuration/config-files) | Later | Corrects the earlier `~/.kimi/config.toml`, which belongs to the archived Kimi CLI. The page names AGENTS.md as a workspace file the CLI reloads, but its discovery and precedence rules are not on the downloaded page and stay unverified |
| Trae rules | Trae (ByteDance) | `.trae/rules/` (from search snippets, disputed by one source: `.trae/project_rules.md`) | Candidate, NOT verified | Later | No official reference page found. Third-party guides disagree on layout |
| GitHub Copilot instructions (path-specific) | GitHub Copilot | `.github/instructions/**/*.instructions.md` | Candidate, verified 2026-11-26 (official page) | Later | Source: https://docs.github.com/en/copilot/concepts/prompting-and-context/custom-instructions (see log). On GitHub.com Copilot Chat, path-specific instructions rank above repository-wide instructions. Most other surfaces "combine applicable instruction files without defining a general precedence order". The earlier "then agent files" order was from search snippets and is replaced by the page's wording |
| GitHub Copilot coding agent | GitHub Copilot | `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` are read as agent instructions; `.github/copilot-instructions.md` is repository-wide | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session (page: docs.github.com custom-instructions) | Later | Precedence, highest first: personal, path-specific, repository-wide, agent instructions, organization. Most surfaces combine files without a general order. Nested AGENTS.md handling is not stated on the page. Earlier "nearest file wins" claim was not on the page |
| Amazon Q Developer project rules | Amazon Q Developer | `.amazonq/rules/*.md` (Markdown files; the page's example is `cdk-rules.md`) | Candidate, verified 2026-11-26 (official page) | Later | Source: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html (see log). Only the IDE is named as a product that loads these rules. Load order is not stated. The AWS blog priority claims are not on the official page and are not used |
| JetBrains Junie guidelines | JetBrains Junie | In order: `.junie/AGENTS.md` in the project root; `AGENTS.md` in the project root combined with `.junie/playbook.md` and every `.junie/rules/*.md`; legacy `.junie/guidelines.md` or `.junie/guidelines/`. Global: `~/.junie/AGENTS.md` (Windows: `%USERPROFILE%\.junie\AGENTS.md`) | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session (page: junie.jetbrains.com/docs/guidelines-and-memory.html) | Later | Project guidelines take precedence over global ones when they conflict. The page says AGENTS.md content is "combined with" the other files, so it does not say `.junie/AGENTS.md` is used alone. The earlier "used alone" note came from a search snippet |
| Devin instructions | Devin (Cognition) | `AGENTS.md` in the project root or elsewhere. The first 16 KiB (16,384 bytes) of each file is loaded automatically; the rest can be read on demand | Verified 2026-11-26 from page text the owner downloaded (curl), not fetched by the build session (page: docs.devin.ai/onboard-devin/agents-md) | Later | Directory scoping is not on this page; it belongs to the Devin Desktop page under the Windsurf row |
| Gemini CLI settings | Gemini CLI | User: `~/.gemini/settings.json`. Project: `.gemini/settings.json`. System: `/etc/gemini-cli/settings.json` (Linux), `C:\ProgramData\gemini-cli\settings.json` (Windows), `/Library/Application Support/GeminiCli/settings.json` (macOS). System defaults: `system-defaults.json` in the same folders | Candidate, verified 2026-11-26 (project's own docs) | Later | Source: raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/reference/configuration.md, read verbatim. Precedence, lowest to highest: hardcoded defaults, system defaults, user, project, system, environment variables, command-line arguments. The system file overrides all other settings files. The website copy (geminicli.com) could not be resolved from the build session, so the wording may differ there. Version or commit not shown on the page |
| Gemini CLI context | Gemini CLI | `~/.gemini/<context fileName>`, plus files from the current directory up to the project root (`.git`) or home, and subdirectories (limit 200, `context.discoveryMaxDirs`). Default name `GEMINI.md`, set by `context.fileName` | Candidate, partly verified 2026-11-26 | Later | Location rules came from a summary of the repo page, not the verbatim text. Confirm before building |

## Verification log, 2026-11-26

Pages were fetched on 2026-11-26 from the URLs listed here only. Quotes are copied from the fetch output. A quote the fetch tool shortened is marked. No fact below comes from search snippets or memory.

### Cursor: verified

- https://cursor.com/docs/rules and https://cursor.com/docs/context/rules: both HTTP 200. The two texts were identical, so the fetch cannot show whether the second is a separate page.
- "Project rules live in `.cursor/rules` as `.mdc` files and are version-controlled."
- "Project rules must use the `.mdc` extension."
- "A plain `.md` file in `.cursor/rules` is ignored by the rules system"
- Nested rules: "Organize rules in folders" (example `frontend/components.mdc`). How subfolder rules apply is not stated.
- AGENTS.md: "Cursor supports AGENTS.md in the project root and subdirectories." and "Instructions from nested `AGENTS.md` files are combined with parent directories"
- Legacy `.cursorrules`: not stated on these pages.

### OpenAI Codex: not verified

- https://developers.openai.com/codex/config-reference: HTTP 308 Permanent Redirect to https://learn.chatgpt.com/docs/config-file/config-reference. Not followed. No content read.
- https://developers.openai.com/codex/config-advanced: HTTP 308 Permanent Redirect to https://learn.chatgpt.com/docs/config-file/config-advanced. Not followed. No content read.
- Not verified: user config path, project `.codex/config.toml` loading, ignored keys in project files, AGENTS.md discovery, project root markers, size limit and default.

### Windsurf: not verified

- https://docs.windsurf.com/windsurf/cascade/agents-md: HTTP 307 Temporary Redirect to https://docs.devin.ai/desktop/cascade/agents-md.
- That target failed with `getaddrinfo ENOTFOUND docs.devin.ai`. The fetch agent followed this one redirect, which goes beyond the instruction not to try other URLs. The linked rules page was not reached.
- Not verified: AGENTS.md discovery, `.windsurf/rules`, `.windsurfrules`, global rules path, character limit.

### Kimi Code CLI: not verified

- https://moonshotai.github.io/kimi-code/en/configuration/config-files failed with `getaddrinfo ENOTFOUND moonshotai.github.io`.
- Not verified: config file paths, AGENTS.md discovery and precedence, global vs project precedence.

### GitHub Copilot: verified (repository and path-specific instructions)

Source: https://docs.github.com/en/copilot/concepts/prompting-and-context/custom-instructions (HTTP 200). The fetch tool marked this source as not pre-approved and shortened each quote to 125 characters or less.

- Repository-wide: "These are specified in a `copilot-instructions.md` file in the `.github` directory of the repository."
- Path-specific: "These are specified in one or more `NAME.instructions.md` files within or below the `.github/instructions` directory in the repository."
- Agent instructions: "Agent instructions, which are similar to repository-wide custom instructions, but are currently not supported by all Copilot features." and "These are specified in files called `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`."
- Precedence, Copilot Chat on GitHub.com, highest first: personal instructions; repository custom instructions (path-specific, then repository-wide, then agent instructions such as `AGENTS.md`); organization custom instructions.
- Other surfaces: "Most surfaces and clients, including Copilot CLI, Visual Studio Code and Visual Studio, combine applicable instruction files without defining a general precedence order."
- Nested AGENTS.md handling: not stated on this page.

### Amazon Q Developer: verified

Source: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html (HTTP 200).

- "Project rules are defined in Markdown files in the project's `{{project-root}}/.amazonq/rules` folder."
- "It must be a Markdown file. For example: `cdk-rules.md`"
- "Amazon Q will automatically use them as context whenever a developer chats with Amazon Q within your project."
- "You can build a library of project rules that you can use when chatting with Amazon Q in the IDE."
- Load order and precedence: not stated on this page.

### JetBrains Junie: not verified

- https://junie.jetbrains.com/docs/guidelines-and-memory.html failed with `getaddrinfo ENOTFOUND junie.jetbrains.com`.
- Not verified: lookup order, global guidelines path, default file.

### Devin: not verified

- https://docs.devin.ai/onboard-devin/agents-md failed with `getaddrinfo ENOTFOUND docs.devin.ai`.
- Not verified: AGENTS.md location, automatic load limit and value, directory scoping.

## Rules for adding a format

1. Record the source of the format's documentation and the version it was read from.
2. Write fixtures for valid, invalid and malformed files before the parser.
3. Map each capability to the canonical schema (`api/CAPABILITY-SCHEMA.md`). Unknown fields are reported as unknown, not ignored.
4. Add the row here with status **Supported** only after the tests pass.
5. Never add a format from a tool's marketing page alone. Use its own configuration reference.

## Related

- OD-01 in `product/OPEN-DECISIONS.md`: Release 1.0 formats.
- ADR-0006: the pilot covers `.claude/settings.json` only.
