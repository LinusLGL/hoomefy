#!/usr/bin/env node
/**
 * Secret guard for the PreToolUse hook in .kiro/hooks/credential-guard.json.
 *
 * Kiro runs this before the agent writes a file and passes the tool call as JSON on STDIN. If the text about to be
 * written looks like a real secret, the script exits with code 2: Kiro then blocks the write and shows STDERR to the
 * agent, which has to remove the secret. Anything else exits 0 and the write goes ahead.
 *
 * Why: a Supabase secret key was once pasted into a chat during this project. It was never used or stored, and this
 * hook makes sure that kind of value cannot reach the repository by accident.
 *
 * The whole STDIN payload is scanned as text, so it does not depend on the exact JSON field names. A line that contains
 * the marker `secret-scan:allow` is skipped, for documentation and tests that need a deliberate example.
 */

import { pathToFileURL } from 'node:url';

const PATTERNS = [
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: 'Hugging Face access token', re: /\bhf_[A-Za-z0-9]{34,}\b/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Cloudflare API token assignment', re: /CLOUDFLARE_API_TOKEN\s*[=:]\s*['"]?[A-Za-z0-9_-]{30,}/ },
  { name: 'Serper key assignment', re: /SERPER_API_KEY\s*[=:]\s*['"]?[a-f0-9]{32,}/i },
];

/** Returns the names of the secret kinds found in `text`. */
export function findSecrets(text) {
  const found = new Set();
  // The payload is JSON, so a newline inside the written text arrives as the two characters \n.
  for (const line of text.split(/\r?\n|\\n/)) {
    if (line.includes('secret-scan:allow')) continue;
    for (const { name, re } of PATTERNS) if (re.test(line)) found.add(name);
  }
  return [...found];
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = await readStdin();
  const found = findSecrets(input);
  if (found.length > 0) {
    process.stderr.write(
      `Blocked: this write contains what looks like a secret (${found.join(', ')}). ` +
        'Keep secrets in environment variables, a .env.local file that is not committed, or Cloudflare / Supabase secrets, ' +
        'and write a placeholder here instead.\n'
    );
    process.exit(2);
  }
  process.exit(0);
}
