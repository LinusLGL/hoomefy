# Kiro features: tasks

- [x] 1. Hooks: `credential-guard`, `quality-gate`, `worker-security-checklist` and the two scripts
- [x] 2. Unit test for the secret scanner (`frontend/scripts/credential-scan.test.ts`)
- [x] 3. Add `fast-check` as a dev dependency (lock file included, because the Cloudflare build type-checks the tests)
- [x] 4. Property tests: prompt, items, shopping, candle light, dimensions, Worker detect parser
- [x] 5. Hardening fixes found by the properties, each with a regression example test
- [x] 6. Custom agents: `hoomefy-reviewer`, `hoomefy-asset-director`
- [x] 7. Local power `powers/hoomefy-media-studio`
- [ ] 8. Project MCP config `.kiro/settings/mcp.json` (the editing tool was blocked from writing under `.kiro/settings/`; add by hand, contents in `docs/kiro-usage.md`)
- [x] 9. `docs/kiro-usage.md`
- [ ] 10. Open the repo in Kiro and switch the three hooks on; record what fired
- [ ] 11. Select each custom agent and run one task; record the result
- [ ] 12. Import the power from `powers/hoomefy-media-studio`; record the result
- [ ] 13. Authorise OpenArt in Kiro and list the assets it actually produced
