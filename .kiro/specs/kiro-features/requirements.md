# Kiro features: requirements

## Goal

Use Kiro's own features in the repository (agent hooks, property-based tests, custom agents, MCP, a power) and record exactly what was and was not run, without changing how the shipped app behaves.

## Requirements

1. **Agent hooks.** The repo has hooks in `.kiro/hooks/` that run on real events:
   - a `PreToolUse` command hook that blocks a file write containing a secret (exit code 2, reason on STDERR);
   - a `Stop` command hook that runs the type check and lint when the agent finishes;
   - a `PostFileSave` agent hook that reminds the agent of the Worker security checklist when a Worker route file (not a test) is saved.
2. **Property-based tests.** Core pure logic has fast-check properties next to its example tests: prompt building, item detection and cleaning, shopping search, candle light, and image dimensions, plus the Worker's detect response parser.
3. **Hardening only.** A property that fails on a real input may justify a minimal fix. Each fix gets a regression example test. No other app code changes.
4. **Custom agents.** `.kiro/agents/` has a read-only reviewer that checks a change against the steering files, and an asset director that uses the OpenArt MCP tools.
5. **MCP.** The OpenArt server (`https://mcp.openart.ai/mcp`) is configured without any key in the repo.
6. **Power.** `powers/hoomefy-media-studio/` is a local power (plugin manifest, MCP config, one skill) that can be imported through the Powers panel.
7. **Honest record.** `docs/kiro-usage.md` states, per feature, what exists in the repo and what has been confirmed to run in Kiro. Anything not confirmed is marked as such.

## Out of scope

- A separate Kiro Crew repository (the "Best Kiro Crew App" bonus needs its own new repo).
- Any change to the running app's behaviour, styles or routes.
