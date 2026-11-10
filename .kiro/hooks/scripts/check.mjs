#!/usr/bin/env node
/**
 * Quality gate for the Stop hook in .kiro/hooks/quality-gate.json.
 *
 * When the agent finishes a turn, this runs the same two checks every change to Hoomefy has to pass: the TypeScript
 * type check and ESLint with zero warnings allowed. It is a Node script (not a shell one-liner) so it behaves the same
 * in PowerShell, cmd and bash. It exits non-zero when a check fails, and the output shows what to fix.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..', '..', '..', 'frontend');

const CHECKS = [
  ['type check', ['tsc', '--noEmit']],
  ['lint', ['eslint', 'src', 'tests', 'worker', 'functions', '--ext', 'ts,tsx', '--max-warnings', '0']],
];

let failed = 0;
for (const [label, args] of CHECKS) {
  process.stdout.write(`\n> ${label}: npx ${args.join(' ')}\n`);
  const result = spawnSync('npx', args, { cwd: frontend, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    failed += 1;
    process.stdout.write(`\n${label} FAILED (exit ${result.status})\n`);
  } else {
    process.stdout.write(`${label} passed\n`);
  }
}
process.exit(failed === 0 ? 0 : 1);
