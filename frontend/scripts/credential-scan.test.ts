import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// The hook script lives with the Kiro hooks, outside the app. Vitest runs it here so the guard itself is tested.
// @ts-expect-error plain JavaScript module without types
import { findSecrets } from '../../.kiro/hooks/scripts/credential-scan.mjs';

const script = path.resolve(__dirname, '..', '..', '.kiro', 'hooks', 'scripts', 'credential-scan.mjs');
const run = (payload: unknown) => spawnSync('node', [script], { input: JSON.stringify(payload), encoding: 'utf8' });

// Built at run time so this file never contains a complete fake key itself.
const supabaseKey = `sb_secret_${'A'.repeat(30)}`;
const hfToken = `hf_${'b'.repeat(34)}`;

describe('findSecrets', () => {
  it('finds each kind of secret', () => {
    expect(findSecrets(`const key = '${supabaseKey}'`)).toEqual(['Supabase secret key']);
    expect(findSecrets(`token: ${hfToken}`)).toEqual(['Hugging Face access token']);
    expect(findSecrets('AKIA' + 'ABCDEFGHIJKLMNOP')).toEqual(['AWS access key id']);
    expect(findSecrets('-----BEGIN ' + 'RSA PRIVATE KEY-----')).toEqual(['private key block']);
    expect(findSecrets('SERPER_API_KEY=' + 'a1b2c3d4'.repeat(5))).toEqual(['Serper key assignment']);
  });

  it('leaves ordinary code, short test tokens, and placeholders alone', () => {
    expect(findSecrets('const a = 1;\nexport default a;')).toEqual([]);
    expect(findSecrets("getToken: () => 'hf_abcdefghijklmnopqrstuvwxyz'")).toEqual([]);
    expect(findSecrets('Add SERPER_API_KEY as a Secret in the dashboard.')).toEqual([]);
    expect(findSecrets('sb_secret_… was never used')).toEqual([]);
    expect(findSecrets('VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toEqual([]);
  });

  it('skips a line marked as a deliberate example', () => {
    expect(findSecrets(`${supabaseKey} secret-scan:allow`)).toEqual([]);
    expect(findSecrets(`${supabaseKey} secret-scan:allow\nand ${hfToken}`)).toEqual(['Hugging Face access token']);
  });

  it('reads the \\n inside a JSON payload as a line break', () => {
    expect(findSecrets(JSON.stringify({ content: `ok\n${supabaseKey}` }))).toEqual(['Supabase secret key']);
    expect(findSecrets(JSON.stringify({ content: `${supabaseKey} secret-scan:allow\nok` }))).toEqual([]);
  });
});

describe('the hook as Kiro runs it', () => {
  it('lets a clean write through', () => {
    expect(run({ tool_name: 'fs_write', tool_input: { path: 'a.ts', text: 'export const a = 1;' } }).status).toBe(0);
  });

  it('blocks a write that contains a secret, with exit code 2 and a reason on STDERR', () => {
    const result = run({ tool_name: 'str_replace', tool_input: { newStr: `const k = '${supabaseKey}'` } });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/Blocked: .*Supabase secret key/);
    // The secret itself is never echoed back.
    expect(result.stderr).not.toContain(supabaseKey);
  });

  it('passes the script its own source (the patterns are not secrets)', async () => {
    const { readFileSync } = await import('node:fs');
    expect(run({ tool_name: 'fs_write', tool_input: { text: readFileSync(script, 'utf8') } }).status).toBe(0);
  });
});
