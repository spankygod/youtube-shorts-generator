#!/usr/bin/env node
// scripts/test-synthesize.js
// A minimal script to test HeadTTS REST API /v1/synthesize

import fs from 'fs/promises';
import path from 'path';

async function main() {
  const url = 'http://127.0.0.1:8882/v1/synthesize';
  const payload = {
    input: 'Hello world from HeadTTS!',
    voice: 'am_fenrir',
    language: 'en-us',
    speed: 1,
    audioEncoding: 'wav'
  };

  console.log('Sending request to', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Response status:', response.status);
  if (!response.ok) {
    const text = await response.text();
    console.error('Error response body:', text);
    process.exit(1);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('Received audio buffer,', buffer.byteLength, 'bytes');

  const outDir = path.join(process.cwd(), 'temporary_files', 'test');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'hello.wav');
  await fs.writeFile(outFile, buffer);

  console.log('✅ Audio saved to', outFile);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
