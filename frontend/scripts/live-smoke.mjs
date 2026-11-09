// Calls the real FLUX.2 klein Space once, outside the browser, to check it is up and still answers the way
// the studio expects. It spends a few seconds of YOUR free Hugging Face GPU allowance, so it is not part of
// the automated tests.
//
//   npm run smoke:live -- path/to/room.jpg [output.png]
//   HF_TOKEN=hf_xxx npm run smoke:live -- room.jpg     (optional: use your own, larger allowance)

import fs from 'node:fs';
import { Client, handle_file } from '@gradio/client';

const SPACE = process.env.AI_SPACE ?? 'black-forest-labs/FLUX.2-klein-4B';
const [input, output = 'smoke-result.png'] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run smoke:live -- <room photo> [output file]');
  process.exit(2);
}

const photo = new Blob([fs.readFileSync(input)], { type: 'image/jpeg' });
const token = process.env.HF_TOKEN?.startsWith('hf_') ? process.env.HF_TOKEN : undefined;
const started = Date.now();
const seconds = () => ((Date.now() - started) / 1000).toFixed(1);

console.log(`Connecting to ${SPACE}${token ? ' with your token' : ' anonymously'}...`);
const client = await Client.connect(SPACE, { events: ['data', 'status'], ...(token ? { token } : {}) });
console.log(`Connected after ${seconds()}s.`);

const job = client.submit('/infer', {
  prompt:
    'Edit this photograph of a living room. Restyle the interior in Scandinavian style: bright white walls, light oak furniture, soft wool textiles. Keep the exact room layout, camera angle, windows and doors. Photorealistic interior photograph.',
  input_images: [{ image: handle_file(photo), caption: null }],
  mode_choice: 'Distilled (4 steps)',
  seed: 0,
  randomize_seed: true,
  width: 1024,
  height: 720,
  num_inference_steps: 4,
  guidance_scale: 1,
  prompt_upsampling: false,
});

let url = null;
for await (const msg of job) {
  if (msg.type === 'status') {
    if (msg.stage === 'error') {
      console.error('The Space reported an error:', msg.message ?? msg.title ?? msg);
      process.exit(1);
    }
    console.log(`  status: ${msg.stage}${msg.position !== undefined ? ` (queue position ${msg.position})` : ''}`);
  } else if (msg.type === 'data') {
    url = msg.data?.[0]?.url ?? null;
  }
}
if (!url) {
  console.error('No image came back. The Space may have changed its API.');
  process.exit(1);
}

const res = await fetch(url);
if (!res.ok) {
  console.error(`The image could not be downloaded (HTTP ${res.status}).`);
  process.exit(1);
}
const bytes = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(output, bytes);
console.log(`OK: ${bytes.length} bytes (${res.headers.get('content-type')}) saved to ${output} in ${seconds()}s.`);
