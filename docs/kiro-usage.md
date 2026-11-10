# How Kiro was used in Hoomefy

This page lists each Kiro feature, what exists in the repository, and how far it has been confirmed to run. Rows marked **to confirm** exist as files but have not yet been reported as run inside Kiro, so the Devpost write-up must not describe them as used until they are.

| Feature | In the repo | Status |
| --- | --- | --- |
| Specs | `.kiro/specs/` (8 specs) | Used to build the app |
| Steering | `.kiro/steering/` (6 files) | Used to build the app |
| Agent hooks | `.kiro/hooks/` (3 hooks) | **To confirm** they fire in Kiro |
| Property-based tests | `*.property.test.ts` (6 files) | Run with Vitest; results below |
| Custom agents | `.kiro/agents/` (2 agents) | **To confirm** |
| MCP (OpenArt) | `.kiro/settings/mcp.json` (see below) | **To confirm** |
| Power | `powers/hoomefy-media-studio/` | **To confirm** the import |

## Specs

Each feature was written as requirements, design and tasks before code, in `.kiro/specs/`: `hoomefy`, `design-studio`, `haunted-takeover`, `haunted-mansion`, `scandinavian-elegant`, `haunted-ritual`, `studio-items` and `kiro-features`. Task lists are ticked as work lands, and the items that still need a live check are left open.

## Steering

Six always-on files in `.kiro/steering/`: product, tech, structure, security, testing and design guidelines. They were written early, when the plan was an AWS stack. The shipped app runs on Cloudflare Workers and Supabase, so some examples (Lambda, Cognito, DynamoDB) name products the app does not use. The principles (signed-in callers, validated input, no secrets in logs, tests next to code, brand palette and contrast) apply unchanged and are what the code was held to.

## Agent hooks

| Hook | Trigger | What it does |
| --- | --- | --- |
| `credential-guard` | `PreToolUse` on file writes | Runs `.kiro/hooks/scripts/credential-scan.mjs`. If the text about to be written looks like a key or token, it exits with code 2 and the write is blocked, with the reason shown to the agent. |
| `quality-gate` | `Stop` | Runs the type check and lint in `frontend/` when the agent finishes. |
| `worker-security-checklist` | `PostFileSave` on `frontend/worker/*.ts` (not tests) | Reminds the agent of the Worker security checklist. |

The scanner is tested outside Kiro (`frontend/scripts/credential-scan.test.ts`, 7 tests). During development the checklist hook fired once on a test file, which led to the matcher being tightened to skip `*.test.ts`. **To confirm:** that `credential-guard` blocked a write and that `quality-gate` ran at the end of a turn.

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

Kiro also provides a built-in `context-gatherer` sub-agent, which was used to map the studio code before large changes. **To confirm:** which sessions used it, and one run each of the two custom agents.

## MCP

OpenArt's hosted MCP server is `https://mcp.openart.ai/mcp`. The project config should be `.kiro/settings/mcp.json` with no key in it:

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

(The editing tool used for this change was blocked from writing under `.kiro/settings/`, so this file must be added by hand.) The same server is in the power's `mcp.json`.

The project owner reports that the images, videos and sound in the app came from OpenArt. **To confirm before submitting:** the list of assets and for each one the tool that produced it. The `Resource/` folder holds the originals. The one exception is the ambient music: `Resource/cinematic-soul-halloween-halloween-dark-music-617915.mp3` (the same file the app serves as `frontend/public/audio/haunted-ambient.mp3`) comes from [Pixabay Music](https://pixabay.com/music/), not from OpenArt. Say so on Devpost. **To confirm:** the track's Pixabay page and its licence terms at the time of download, and save the page link here. HeyGen is not used.

## Power

`powers/hoomefy-media-studio/` holds `plugin.json`, `mcp.json` and one skill, `generate-haunted-media`, which carries the brand rules and the steps for writing a prompt and generating media. Import it in Kiro: Powers panel, Add Custom Power, Import from a folder. **To confirm:** that the import worked and the skill ran.

## Verification loop

After each change: `npx tsc --noEmit`, eslint with zero warnings, `npx vitest run`, `npm run build`, and the Playwright suite (169 tests at the last full run, before the Kiro-features files). Live checks were made on the deployed site for images, the mirror takeover and the jumpscare. Prices still show as estimates until `SERPER_API_KEY` is set as a Worker secret.

## Code that existed before the hackathon

**To fill in by the project owner:** list any code, art or audio that predates the submission period, so the disclosure on Devpost matches the git history.
