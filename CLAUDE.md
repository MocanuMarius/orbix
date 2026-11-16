# Orbix: Claude instructions

@AGENTS.md

The shared project rules are in AGENTS.md, imported above, so Claude and Codex read the same text. Do not copy rules into this file. If the import did not load, read AGENTS.md before doing anything else.

## Claude-only notes

- Start with `handoff.md` for current state, pending backlog and release traps.
- Roles: Fable coordinates; Opus workers implement, started as subagents with `model="opus"`. See the routing table in AGENTS.md.
- The full suite (`npm test`) takes about three minutes and had 66 of 783 tests failing on 2026-11-16, before any Claude changes. Compare against that baseline rather than expecting a clean run.
- When Claude works through a sandboxed shell that cannot delete files in this folder, Git commands that write (commit, checkout, stash, pull) can leave `.lock` files under `.git`. Use `GIT_OPTIONAL_LOCKS=0` for read-only Git commands there, and run writing Git commands only where deletion is allowed.
