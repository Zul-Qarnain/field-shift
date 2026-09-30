# Prompt log

Companion to `docs/AI_USE.md` — the "Use of AI" disclosure asks for the tools, the prompts and the reasoning, not just the tools.

**No prompt transcript is published here yet.** The prompts that drove each assistant session are kept with the team in the session exports (Qoder CLI, Cursor, Grok). This file is the pointer and the format we will fill in before submission.

## What to append, oldest first

For every significant prompt:

| Field | Content |
| --- | --- |
| Date | Day the prompt ran |
| Tool | Which assistant and model |
| Prompt | The prompt text, or where the export lives |
| Result | What changed because of it (commit or document section) |

## Where the reasoning already lives

- `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` — decisions, data contracts and ADRs.
- `docs/AI_USE.md` — what the AI did and, equally, what it did not do.
- Git history — what actually landed, per reviewed commit.

*(TEAM TO FILL IN: paste the prompts, or link the exports, before the submission is locked.)*
