# Emberwing agent instructions

## Model routing and parallel work

Claude is the primary agent for this project from 2026-11-16. Codex / ChatGPT remains supported as a secondary agent. Both tools follow the same two roles and the same rules below; only the model names differ. This replaces the earlier rule that used `gpt-6.1-sol` for everything, and the Astra Ultra / Sol xhigh split before it.

- **Coordinator:** planning, game design, architecture, task breakdown, review of worker results, and release decisions.
- **Worker:** implementation, mechanical refactors, test triage, probes, and routine debugging.
- **Runner (cheapest tier):** trivial, fully specified chores once work is established and accepted by the user: running a named test list, committing an explicit file list, pushing `main`, following a written release checklist step by step. A runner makes no decisions; if anything differs from its brief (a test fails, an unexpected file is modified, a push is rejected) it stops and reports to the coordinator. Requested by the user on 2026-11-16.

| Tool | Coordinator | Worker | Runner |
| --- | --- | --- | --- |
| Claude (primary) | Fable 5.2 (`claude-fable-5-2`), selected by the user in the session model picker | Opus (currently Opus 5.5), started as a subagent with `model="opus"` | Haiku, started as a subagent with `model="haiku"` |
| Codex / ChatGPT (secondary) | `gpt-6.1-sol`, `high` reasoning | `gpt-6.1-sol`; set `model="gpt-6.1-sol"`, `reasoning_effort="high"`, `fork_turns="none"` | Same as worker |

- Use the coordinator for figuring things out, decisions, and finding logic errors; the worker for mid-tier implementation; the runner for anything a checklist fully describes.
- Once the user accepts a change, a runner commits and pushes it to `main` without a further request. Pushing `main` does not deploy: the public game is published from `gh-pages` through the isolated-artifact release procedure in `handoff.md` section 15, which the coordinator plans and a runner may then execute step by step.

- The coordinator model (Fable 5.2) is chosen by the user in the app's model picker; a running session cannot switch its own model. If the session is on a different Fable version, say so and continue — do not silently substitute a worker model for coordination.
- Route mundane, boilerplate, repetitive and mechanical implementation work to Opus workers rather than doing it in the coordinator session. The coordinator may make a very small edit itself when writing a worker brief would cost more than the edit.
- Delegate independent implementation and verification work in parallel whenever operationally safe, within the user's authorized scope. Give each worker a clear task and file ownership; avoid conflicting concurrent edits.
- Workers start without the conversation history. Supply the approved plan, decisions, constraints, relevant files, and acceptance checks rather than relying on omitted history.
- Workers must return new requirements and proposed design or architecture changes to the coordinator before implementing them. The coordinator reviews results and directs follow-up work.
- Never silently substitute another model or reasoning effort. If the required model or setting is unavailable, report the limitation and obtain user direction before dependent work.
- Saved configuration sets session defaults; it does not switch the model of an already running chat.
- Only one tool works in the repository at a time. When switching between Claude and Codex, update `handoff.md` first so the other tool starts from the current state.
- `CLAUDE.md` imports this file and holds Claude-only notes. Keep shared rules here, not there.

## Game design and art preferences

- Match new and changed art to the established game visual language, including palette, lighting, framing, and pixel density appropriate to its displayed scale. Before shipping a global pixelation redesign, show previews of a few actual in-game screens and obtain user approval.
- **Show designs, do not describe them.** Present a proposed look as a live preview in the design lab (`dist/design-lab/`, served at `/design-lab/index.html`) next to the current look, and give it a version code (`v1.0-pause`). The user approves by code; see `docs/design-versions.md` for the registry and rules. Fix clear design mistakes proactively without waiting to be asked.
- Design mobile-first for Pixel 10 landscape: comfortable touch reach, readable icons and fonts, clear contrast, and adequate padding. Provide a sensible, accessible scaled mobile preview on desktop.
- Keep menu flows simple and player-centered. Make interactable elements and availability obvious, keep Back and Cancel predictable, and explain consequences before the player commits.
- Use progressive disclosure and a clickable glossary of standardized keywords and icons instead of walls of text.
- **Never require reading during active play.** The player cannot read and fly at the same time. Any text meant to be read — hints, lessons, instructions — appears only while the simulation is fully stopped, and play resumes only through an explicit player action (the existing countdown/ramp). In-flight channels are limited to non-reading cues: icons, arrows, color, sound. Confirmed by the user on 2026-11-16.
- Reuse one coherent Spark motif from the actual game, with a distinct symbol for stored containers.
- Apply established design principles and relevant lessons from comparable games such as Slay the Spire and Balatro for layout, build readability, and choices, while retaining Emberwing's own aesthetic.
- Favor meaningful tradeoffs and accessible human play. Account for reaction time and limited sight when balancing, and avoid needless complexity.

## User preferences

- Billing and money: Always obtain explicit user approval BEFORE opening, navigating to, or interacting with billing, checkout, payments, subscriptions, paid services, plan activation, or anything involving money. This includes services or plans advertised as free when billing details, possible charges, overages, or financial terms are involved. Do not enter these areas speculatively or treat general task authorization as permission. Let the user enter card details and accept financial/contract terms themselves. This preference was explicitly requested on 2026-10-28.
