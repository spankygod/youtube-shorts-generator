// Minimal HeadTTS REST API test endpoint for debugging audio corruption
// Place this file in /app/api/test-headtts/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  // Hardcoded minimal payload for HeadTTS
  const payload = {
    text: 'Hello, this is a test of HeadTTS.',
    speaker: 'en_us_001', // Change to a valid speaker for your HeadTTS install
    format: 'wav',
    speed: 1.0,
    // Add other required fields if your HeadTTS server expects them
  };

  try {
    const ttsRes = await fetch('http://127.0.0.1:8882/v1/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return NextResponse.json({ error: 'HeadTTS error', details: errText }, { status: 500 });
    }
    const audioBuffer = await ttsRes.arrayBuffer();
    // Return the WAV file as a binary response
    return new Response(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="headtts-test.wav"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Request failed', details: err instanceof Error ? err.message : err }, { status: 500 });
  }
}
