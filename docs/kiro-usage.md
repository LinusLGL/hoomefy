# How Kiro was used in Hoomefy

This page lists each Kiro feature, what is in the repository, and what has been verified. Where a feature has not yet been run inside Kiro, the page says so instead of claiming it.

| Feature | In the repo | Status |
| --- | --- | --- |
| Specs | `.kiro/specs/` (8 specs) | Used to build the app |
| Steering | `.kiro/steering/` (6 files) | Used to build the app |
| Agent hooks | `.kiro/hooks/` (3 hooks) | `credential-guard` blocked a test write in Kiro. The checklist hook fired during development. `quality-gate` is tested outside Kiro; a run at the end of a turn has not been observed. |
| Property-based tests | `*.property.test.ts` (6 files) | Run with Vitest; results below |
| Custom agents | `.kiro/agents/` (2 agents) | Both ran once in the Kiro IDE as sub-agents (details below). The asset director had no OpenArt tools in that session. |
| MCP (OpenArt) | `.kiro/settings/mcp.json` and the power's `mcp.json` | Configured. In the Kiro session where this was checked, the OpenArt server was not connected, so no OpenArt tool call from Kiro has been recorded. |
| Power | `powers/hoomefy-media-studio/` | Imported into the Kiro IDE (Add Custom Power, from a folder). Activated, and its skill was read, in a Kiro session. Its OpenArt tools were not available. |

## Specs

Each feature was written as requirements, design and tasks before code, in `.kiro/specs/`: `hoomefy`, `design-studio`, `haunted-takeover`, `haunted-mansion`, `scandinavian-elegant`, `haunted-ritual`, `studio-items` and `kiro-features`. Task lists are ticked as work lands, and the items that still need a live check are left open. The lists also record the quality gates after each stage: unit tests grew from 282 to 339 and Playwright runs from 87 to 124 in the task records, and stand at 738 unit tests and 169 Playwright tests now.

## Steering

Six always-on files in `.kiro/steering/`: product, tech, structure, security, testing and design guidelines. They were written early, when the plan was an AWS stack. The shipped app runs on Cloudflare Workers and Supabase, so some examples (Lambda, Cognito, DynamoDB) name products the app does not use. The principles (signed-in callers, validated input, no secrets in logs, tests next to code, brand palette and contrast) apply unchanged and are what the code was held to.

## Agent hooks

| Hook | Trigger | What it does |
| --- | --- | --- |
| `credential-guard` | `PreToolUse` on file writes | Runs `.kiro/hooks/scripts/credential-scan.mjs`. If the text about to be written looks like a key or token, it exits with code 2 and the write is blocked, with the reason shown to the agent. |
| `quality-gate` | `Stop` | Runs the type check and lint in `frontend/` when the agent finishes. |
| `worker-security-checklist` | `PostFileSave` on `frontend/worker/*.ts` (not tests) | Reminds the agent of the Worker security checklist. |

The scanner is tested outside Kiro (`frontend/scripts/credential-scan.test.ts`, 7 tests), and the `quality-gate` script passes when run by hand. During development the checklist hook fired once on a test file, which led to the matcher being tightened to skip `*.test.ts`. **Test run in Kiro (November 11, 2026):** the agent tried to write a file containing a fake, obviously test-only Supabase-style secret key. Kiro intercepted the write before it ran, and `credential-guard` returned "Blocked: this write contains what looks like a secret (Supabase secret key)". The file was not created. A `quality-gate` run at the end of an agent turn has not been observed.

## Property-based tests

fast-check is a dev dependency and runs under Vitest. Files:

- `src/features/studio/prompt.property.test.ts`
- `src/features/furniture/items.property.test.ts`
- `src/features/furniture/shopping.property.test.ts`
- `src/features/haunting/candleLight.property.test.ts`
- `src/features/studio/dimensions.property.test.ts`
- `worker/detect.property.test.ts`

They found three real input-handling gaps, each fixed with the smallest change and a regression example test:

1. `sanitizeProducts` accepted an infinite or absurd price (for example `1e999`) from a shopping result.
2. `mapSerperShopping` did the same on the server side. Both now reject prices outside `0..1,000,000`.
3. `fitToModelSize` returned `NaN` for an infinite input. It now guards with `isFinite`.

Other failures during the work were wrong assumptions in the properties themselves (a burn-down bound, a panorama limit that is by design, and what the image check verifies), and the properties were corrected. They are not counted as app bugs.

## Custom agents

- `hoomefy-reviewer`: read-only. Loads the steering files and reviews a change against security, tests, product and design, reporting findings with severity, file and line. Writes and shell are denied.
- `hoomefy-asset-director`: read plus the `OpenArt` MCP tools. Writes a prompt in the brand palette, shows it, then generates. Writes and shell are denied.

**First runs (Kiro IDE, November 11, 2026):**

- `hoomefy-reviewer`: the first call returned "Agent not found in registry". The permission rules in both agent files were then corrected to match Kiro's configuration reference (`match` as a list, and `*` instead of `**` for shell patterns), and the second call ran. The reviewer read `frontend/worker/guard.ts` and `detect.ts` against the security steering file and returned "ship with fixes": no high findings, two medium and several low. The medium findings are that the per-user rate limit is skipped silently if the limiter binding is missing (production does declare it), and that 4 calls a minute per user still allows a few accounts to use up the shared daily AI allowance. It also listed what it checked and found sound: sign-in check before any work, input validation, cleaning of model output, and nothing sensitive logged. It reported that it ran no tests. These findings are recorded here and have not been acted on.
- `hoomefy-asset-director`: it ran, read the existing haunted audio and images, and drafted (without sending) a prompt for a short candle-ignition sound. It reported that no OpenArt tools were available in that session, so nothing was generated. A second run, after `.kiro/settings/mcp.json` was added and the power was installed, gave the same answer: no OpenArt tools.

It is not established whether the first "not found" was caused by the configuration format or by the agent list not having reloaded. Both were changed or reloaded before the second call.

Kiro also provides a built-in `context-gatherer` sub-agent, which was used to map the studio code before large changes such as moving the wishes box and removing the old furniture picker.

## MCP

OpenArt's hosted MCP server is `https://mcp.openart.ai/mcp`. It is configured without any key. As a project-level config (`.kiro/settings/mcp.json`) it reads:

```json
{
  "mcpServers": {
    "OpenArt": {
      "type": "http",
      "url": "https://mcp.openart.ai/mcp",
      "disabled": false
    }
  }
}
```

The same server is in the power's `mcp.json`, which is in the repository. After both files were in place, a Kiro session listed no OpenArt tools: the power reported no available servers, and the asset-director agent reported no OpenArt tool. So the connection (or its sign-in) was not established in that session, and no media was generated through Kiro's MCP connection.

The generated images, video clips and the five ritual voice lines (`frontend/public/audio/ritual/script1.mp3` to `script5.mp3`) were produced with OpenArt. HeyGen was not used.

Three audio files come from [Pixabay Music](https://pixabay.com/music/) and not from OpenArt:

- `frontend/public/audio/haunted-ambient.mp3` (the looping ambient track)
- `frontend/public/audio/haunting-start.mp3` (the sting when the haunting begins)
- `frontend/public/audio/firesound.mp3` (the candle fire sound)

## Power

`powers/hoomefy-media-studio/` holds `plugin.json`, `mcp.json` and one skill, `generate-haunted-media`, which carries the brand rules and the steps for writing a prompt and generating media. To use it, import it in Kiro: Powers panel, Add Custom Power, Import from a folder. It was imported this way on November 11, 2026, and Kiro then listed it as installed with the keywords and the `generate-haunted-media` skill. In that session the skill's full instructions were read through Kiro, which confirms the power loads. The skill's final step, generating through OpenArt, has not run.

## Verification loop

After each change: `npx tsc --noEmit`, eslint with zero warnings, `npx vitest run` (738 tests at the last run), `npm run build`, and the Playwright suite (169 tests at the last full run, before the Kiro-features files). Live checks were made on the deployed site for images, the mirror takeover and the jumpscare. Prices still show as estimates until `SERPER_API_KEY` is set as a Worker secret.

## Pre-existing code and third-party content

This is a new project. The repository's first commit is dated November 9, 2026, inside the Submission Period. No boilerplate, starter kit or template was used, and no earlier application code was reused. Third-party content in the project: FLUX.2 [klein] 4B (Apache 2.0), Meta Llama 4 Scout and Google Gemma on Cloudflare Workers AI, OpenArt-generated media, three Pixabay Music tracks, Google Fonts, and the open-source packages in `frontend/package.json`.
