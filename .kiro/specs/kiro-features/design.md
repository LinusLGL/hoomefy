# Kiro features: design

## Hooks (`.kiro/hooks/`)

| File | Trigger | Action | Notes |
| --- | --- | --- | --- |
| `credential-guard.json` | `PreToolUse`, matcher `fs_write\|str_replace\|fs_append` | command `node .kiro/hooks/scripts/credential-scan.mjs` | Exit 2 blocks the write. A line containing `secret-scan:allow` is skipped. |
| `quality-gate.json` | `Stop` | command `node .kiro/hooks/scripts/check.mjs` | Runs `tsc --noEmit` and eslint in `frontend/`. A command hook, so it cannot loop the agent. |
| `worker-security-checklist.json` | `PostFileSave`, matcher on `frontend/worker/*.ts` except `*.test.ts` | agent prompt | `PostFileSave` cannot block, so this one only reminds. |

`credential-scan.mjs` exports `findSecrets` so `frontend/scripts/credential-scan.test.ts` can test it without Kiro.

## Property-based tests (fast-check, run by Vitest)

Each `*.property.test.ts` sits next to the module it covers. Properties state invariants (for example: a cleaned price is finite and within bounds; the candle never goes below zero; a fitted size keeps the aspect ratio and is finite). The tests found three real input-handling gaps, fixed minimally with regression tests:

- `sanitizeProducts` and `mapSerperShopping` accepted an infinite or absurd price. Added `MAX_PRICE` and an `isPrice` guard.
- `fitToModelSize` returned `NaN` for an infinite input. Added an `isFinite` guard.

## Agents (`.kiro/agents/`)

- `hoomefy-reviewer`: tools `read` only, `fs_write` and `shell` denied, steering files loaded as resources.
- `hoomefy-asset-director`: `read` plus the `OpenArt` MCP server, writes and shell denied.

## MCP and power

- Project MCP config `.kiro/settings/mcp.json`: one `OpenArt` HTTP server, no key.
- `powers/hoomefy-media-studio/`: `plugin.json`, `mcp.json` (same server) and `skills/generate-haunted-media/SKILL.md`.

## Risks

- OpenArt's sign-in method is not confirmed. If it needs OAuth, Kiro will prompt on first use; no credential is stored in the repo.
- Hooks, agents and the power only count as used once someone has run them in Kiro. See `docs/kiro-usage.md`.
