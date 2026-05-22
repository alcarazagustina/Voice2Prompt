# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | C:\Users\AgustinaAlcaraz\.config\opencode\skills\branch-pr\SKILL.md |
| When a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | chained-pr | C:\Users\AgustinaAlcaraz\.config\opencode\skills\chained-pr\SKILL.md |
| When writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | C:\Users\AgustinaAlcaraz\.config\opencode\skills\cognitive-doc-design\SKILL.md |
| When drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | C:\Users\AgustinaAlcaraz\.config\opencode\skills\comment-writer\SKILL.md |
| Use ONLY when editing opencode's own configuration: opencode.json, .opencode/*, ~/.config/opencode/* | customize-opencode | <built-in> |
| When user asks "how do I do X", "find a skill for X", or expresses interest in extending capabilities | find-skills | C:\Users\AgustinaAlcaraz\.agents\skills\find-skills\SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\AgustinaAlcaraz\.config\opencode\skills\go-testing\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | C:\Users\AgustinaAlcaraz\.config\opencode\skills\issue-creation\SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:\Users\AgustinaAlcaraz\.config\opencode\skills\judgment-day\SKILL.md |
| When user wants to audit, review, or diagnose SEO issues on their site | seo-audit | C:\Users\AgustinaAlcaraz\.agents\skills\seo-audit\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\AgustinaAlcaraz\.config\opencode\skills\skill-creator\SKILL.md |
| When implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | C:\Users\AgustinaAlcaraz\.config\opencode\skills\work-unit-commits\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (`status:approved` label) — no exceptions
- Branch names MUST match `^type/description$` — types: feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert
- PR body requires: `Closes #N`, exactly one `type:*` label, 1-3 bullet summary, changes table, test plan, contributor checklist
- Automated checks must pass before merge; blank PRs are blocked

### chained-pr
- MUST split when PR exceeds 400 changed lines, unless maintainer-approved `size:exception`
- Each PR must be autonomous, one deliverable unit, with start/finish/before/after documented
- Include a dependency diagram marking the current PR
- Two strategies: Stacked PRs to main (fast) or Feature Branch Chain (safe rollback) — ask user once
- Diff hygiene: if a child PR shows parent PR changes, its base branch is wrong — retarget/rebase

### cognitive-doc-design
- Lead with the answer: put the decision/action/outcome first, context after
- Progressive disclosure: happy path → details → edge cases → references
- Chunking: group related info into small sections, keep lists short
- Use tables, checklists, and templates — recognition over recall
- PR docs: state what to review first, what's out of scope, link prev/next PR

### comment-writer
- Start with the actionable point — be warm/direct, not corporate
- Keep to 1-3 paragraphs or a tight bullet list
- Explain the technical reason WHY when asking for a change
- No pile-ons — comment on highest-value issue only
- Match thread language; in Spanish use Rioplatense voseo (`podés`, `tenés`, `fijate`)
- No em dashes — use commas, periods, or parentheses instead

### customize-opencode
- ONLY for opencode's own config: opencode.json, .opencode/*, ~/.config/opencode/*
- Covers agents, subagents, skills, plugins, MCP servers, and permission rules
- Do NOT use for the user's application code or any non-opencode project

### find-skills
- When user asks "how do I do X" or "find a skill for X", search across known skill registries
- Help discover and install skills from the open agent skills ecosystem
- Focus on finding the right skill, not implementing the feature yourself

### go-testing
- Table-driven tests with `t.Run()` per case — standard Go pattern
- Bubbletea: test `Model.Update()` directly by sending `tea.KeyMsg`
- teatest: use `tm.Send()` for TUI integration tests, `tm.FinalModel()` to assert final model state
- Golden files in `testdata/*.golden` for complex multi-line output; use `-update` flag for regeneration
- Subtests with `t.Run`, benchmarks with `testing.B`
- Use `t.TempDir()` for temp files — auto-cleanup guaranteed

### issue-creation
- MUST use template (bug_report.yml or feature_request.yml) — blank issues disabled
- Each issue gets `status:needs-review` on creation; needs `status:approved` before any PR
- Bug report: pre-flight checks, description, steps to reproduce, expected vs actual, OS, agent, shell
- Feature request: description, motivation, acceptance criteria, alternatives considered
- Search for duplicates before creating

### judgment-day
- Launch TWO blind parallel judges via `delegate` — NEVER sequential, NEVER do the review yourself
- Skill Resolution first: get skill registry, inject matching compact rules into BOTH judge prompts
- Verdict: Confirmed (both judges) → fix immediately; Suspect (one judge) → triage; Contradiction → flag for manual decision
- WARNING classification: real (causes bug in normal use) → fix; theoretical (contrived scenario) → report as INFO, don't fix
- Fix + re-judge: max 2 iterations, then ask user if they want to continue
- Convergence: 0 confirmed CRITICALs + 0 confirmed real WARNINGs = APPROVED

### seo-audit
- Audit scope: site context, keyword research, technical SEO, on-page, off-page, content quality
- Technical: crawlability, indexability, Core Web Vitals, structured data, sitemaps, robots.txt
- On-page: title tags, meta descriptions, headings, content quality, internal linking structure
- Off-page: backlink profile, competitor analysis, domain authority assessment
- Recommendations: prioritize by impact/effort, include concrete implementation steps

### skill-creator
- Structure: `skills/{name}/SKILL.md` (required) + `assets/` (templates/schemas) + `references/` (doc links)
- Frontmatter requires: name, description (with Trigger:), license, metadata version
- SKILL.md sections: When to Use, Critical Patterns, Code Examples, Commands, Resources
- Naming: `{technology}` for generic skills, `{project}-{component}` for specific ones
- Code templates → assets/; links to existing docs → references/

### work-unit-commits
- Commit by deliverable work unit, NOT by file type (don't do models then services then tests)
- Tests and docs belong in the SAME commit as the code they verify
- Each commit must tell a story — a reviewer should understand why it exists from its diff and message
- Every commit should be a candidate for a chained PR if the change grows
- Before committing: one clear purpose, rollback-safe, repo works with only this commit applied

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | C:\Users\AgustinaAlcaraz\.config\opencode\AGENTS.md | Global agent instructions (user-level) |

Read the convention files listed above for project-specific patterns and rules.
