---
name: review-instructions
description: Audit .claude/CLAUDE.md and .claude/rules/ against the current code and propose improvements. Use at the end of a milestone or when asked to review the instructions.
---

# Review instructions

Read `.claude/CLAUDE.md`, every file in `.claude/rules/`, and `docs/decisions.md`. Don't edit anything; report findings in chat.

Check:

1. **Size.** Line count per file. Flag `CLAUDE.md` over ~150 lines and rule files over ~100; propose how to split.
2. **Scope.** Rules in `CLAUDE.md` that only apply to some files → propose a path-scoped rule. Rule `paths` that match no files, or miss files they should cover.
3. **Coverage.** Directories with code but no rule (list `apps/`, `packages/`, `infra/`). Conventions the code follows consistently that no rule states.
4. **Accuracy.** Rules contradicted by the code, by an accepted decision, or by another rule. Commands that no longer exist in `package.json`.
5. **Permissions.** Commands run often in recent work that `.claude/settings.json` doesn't cover.

Output: a list of findings, each with the file, the problem, and the exact proposed change as a diff. End with "no changes needed" if there are none.
