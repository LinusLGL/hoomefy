// Checks that your Supabase project keeps every person's designs and photos private.
//
//   npm run check:supabase
//
// It signs up two throwaway accounts (needs "Confirm email" switched off), tries to read, change and delete
// one account's data from the other and from a visitor who is not signed in, then removes everything it
// created. The two throwaway users stay in Authentication -> Users; delete them from the dashboard.
// It uses only the public (publishable) key, read from the environment or from frontend/.env.local.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function fromEnvFile(name) {
  try {
    const line = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).find((l) => l.startsWith(name + '='));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}
const URL_ = process.env.VITE_SUPABASE_URL ?? fromEnvFile('VITE_SUPABASE_URL');
const KEY = process.env.VITE_SUPABASE_ANON_KEY ?? fromEnvFile('VITE_SUPABASE_ANON_KEY');
if (!URL_ || !KEY) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (in the environment or frontend/.env.local).');
  process.exit(2);
}
if (/service_role|sb_secret/.test(KEY)) {
  console.error('That is a secret key. Use the public (publishable / anon) key here, and never put a secret key in this project.');
  process.exit(2);
}
const mk = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`);
};

const stamp = Date.now().toString(36);
const accounts = [];
async function signUp(label) {
  const c = mk();
  const email = `hoomefy.rls.${label}.${stamp}@example.com`;
  const { data, error } = await c.auth.signUp({ email, password: 'CheckPass123' });
  if (error || !data.session) throw new Error(`sign-up ${label} failed: ${error?.message ?? 'no session'}`);
  accounts.push(email);
  return { c, id: data.user.id, email };
}

const jpeg = (n = 40) => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(n).fill(7)])], { type: 'image/jpeg' });
const A = await signUp('a');
const B = await signUp('b');
const anon = mk();
console.log('accounts:', accounts.join(', '));

// --- A saves a design the normal way ---
const designId = crypto.randomUUID();
const aOrig = `${A.id}/${designId}/original.jpg`;
const aGen = `${A.id}/${designId}/generated.jpg`;
const up1 = await A.c.storage.from('designs').upload(aOrig, jpeg(), { contentType: 'image/jpeg' });
const up2 = await A.c.storage.from('designs').upload(aGen, jpeg(), { contentType: 'image/jpeg' });
check('A can upload their own two images', !up1.error && !up2.error, up1.error?.message ?? up2.error?.message ?? '');
const ins = await A.c.from('designs').insert({ id: designId, name: 'A private design', room_type: 'living-room', style: 'japandi', prompt: 'p', preferences: {}, shopping: [], original_path: aOrig, generated_path: aGen }).select('*').single();
check('A can save a design row', !ins.error && ins.data?.user_id === A.id, ins.error?.message ?? '');
const aList = await A.c.from('designs').select('id');
check('A sees their own design', aList.data?.length === 1);

// --- B cannot see or change it ---
const bList = await B.c.from('designs').select('id');
check('B sees none of A\'s designs', !bList.error && bList.data.length === 0, `rows=${bList.data?.length}`);
const bById = await B.c.from('designs').select('*').eq('id', designId);
check('B cannot fetch A\'s design by its id', !bById.error && bById.data.length === 0);
await B.c.from('designs').update({ name: 'hacked' }).eq('id', designId);
const aAfterUpdate = await A.c.from('designs').select('name').eq('id', designId).single();
check('B cannot rename A\'s design', aAfterUpdate.data?.name === 'A private design', `name=${aAfterUpdate.data?.name}`);
await B.c.from('designs').delete().eq('id', designId);
const aAfterDelete = await A.c.from('designs').select('id').eq('id', designId);
check('B cannot delete A\'s design', aAfterDelete.data?.length === 1);

// --- B cannot get at A's image files ---
const bSigned = await B.c.storage.from('designs').createSignedUrl(aOrig, 60);
check('B cannot get a link to A\'s photo', !!bSigned.error || !bSigned.data?.signedUrl, bSigned.error?.message ?? 'no url');
const bDl = await B.c.storage.from('designs').download(aOrig);
check('B cannot download A\'s photo', !!bDl.error, bDl.error?.message ?? '');
const bLs = await B.c.storage.from('designs').list(A.id);
check('B cannot list A\'s folder', !bLs.error && bLs.data.length === 0, `files=${bLs.data?.length}`);
const bRm = await B.c.storage.from('designs').remove([aOrig]);
const aStill = await A.c.storage.from('designs').download(aOrig);
check('B cannot delete A\'s photo', !aStill.error, bRm.error?.message ?? '');
const bUp = await B.c.storage.from('designs').upload(`${A.id}/${crypto.randomUUID()}/x.jpg`, jpeg(), { contentType: 'image/jpeg' });
check('B cannot upload into A\'s folder', !!bUp.error, bUp.error?.message ?? '');

// --- B cannot forge a row for A or point at A's files ---
const forge1 = await B.c.from('designs').insert({ id: crypto.randomUUID(), user_id: A.id, name: 'forged', style: 'japandi', original_path: `${A.id}/f/o.jpg`, generated_path: `${A.id}/f/g.jpg` });
check('B cannot create a row in A\'s name', !!forge1.error, forge1.error?.message ?? '');
const forge2 = await B.c.from('designs').insert({ id: crypto.randomUUID(), name: 'points at A', style: 'japandi', original_path: aOrig, generated_path: aGen });
check('B cannot save a row that points at A\'s files', !!forge2.error, forge2.error?.message ?? '');

// --- an anonymous visitor gets nothing ---
const anonList = await anon.from('designs').select('id');
check('a visitor who is not signed in sees no designs', !anonList.error && anonList.data.length === 0);
const anonIns = await anon.from('designs').insert({ id: crypto.randomUUID(), name: 'x', style: 'japandi', original_path: 'a/b/c', generated_path: 'a/b/d' });
check('a visitor who is not signed in cannot save', !!anonIns.error, anonIns.error?.message ?? '');
const anonDl = await anon.storage.from('designs').download(aOrig);
check('a visitor who is not signed in cannot download photos', !!anonDl.error);
const pub = await fetch(`${URL_}/storage/v1/object/public/designs/${aOrig}`);
check('the bucket is not public', pub.status !== 200, `HTTP ${pub.status}`);

// --- file rules ---
const txt = await A.c.storage.from('designs').upload(`${A.id}/${crypto.randomUUID()}/note.txt`, new Blob(['hello'], { type: 'text/plain' }), { contentType: 'text/plain' });
check('only JPEG files are accepted', !!txt.error, txt.error?.message ?? '');
const big = await A.c.storage.from('designs').upload(`${A.id}/${crypto.randomUUID()}/big.jpg`, new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: 'image/jpeg' }), { contentType: 'image/jpeg' });
check('files over 5 MB are refused', !!big.error, big.error?.message ?? '');
const badStyle = await A.c.from('designs').insert({ id: crypto.randomUUID(), name: 'x', style: 'haunted-chic', original_path: `${A.id}/q/o.jpg`, generated_path: `${A.id}/q/g.jpg` });
check('an unknown style is refused by the database', !!badStyle.error, badStyle.error?.message ?? '');
const noName = await A.c.from('designs').insert({ id: crypto.randomUUID(), name: '', style: 'japandi', original_path: `${A.id}/q/o.jpg`, generated_path: `${A.id}/q/g.jpg` });
check('an empty name is refused by the database', !!noName.error, noName.error?.message ?? '');

// --- the 50 designs limit ---
const ids = [designId];
let limitError = null;
for (let i = 0; i < 52 && !limitError; i++) {
  const id = crypto.randomUUID();
  const r = await A.c.from('designs').insert({ id, name: `limit ${i}`, style: 'minimalist', original_path: `${A.id}/${id}/o.jpg`, generated_path: `${A.id}/${id}/g.jpg` });
  if (r.error) limitError = r.error.message;
  else ids.push(id);
}
check('a person cannot keep more than 50 designs', ids.length === 50 && /limit/i.test(limitError ?? ''), `kept=${ids.length} error=${limitError}`);

// --- clean up everything A created ---
await A.c.from('designs').delete().in('id', ids);
await A.c.storage.from('designs').remove([aOrig, aGen]);
const left = await A.c.from('designs').select('id');
const files = await A.c.storage.from('designs').list(`${A.id}/${designId}`);
check('clean-up left nothing behind', left.data?.length === 0 && (files.data?.length ?? 0) === 0, `rows=${left.data?.length} files=${files.data?.length}`);

console.log(`\n${pass} passed, ${fail} failed`);
console.log('Throwaway users still in Authentication -> Users (delete them from the dashboard):\n  ' + accounts.join('\n  '));
process.exit(fail ? 1 : 0);

