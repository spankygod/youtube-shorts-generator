// Minimal HeadTTS REST API test endpoint for debugging audio corruption
// Place this file in /app/api/test-tts-route/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// This endpoint supports two operations: setup and synthesize
export async function POST(request: Request) {
  try {
    // Get input from request body or use default
    const body = await request.json().catch(() => ({}));
    const { 
      operation = 'synthesize', // 'setup' or 'synthesize'
      text = 'Hello, this is a test of HeadTTS.',
      voice = 'am_fenrir', // A voice we know exists
      language = 'en-us',
      speed = 1.0,
      audioEncoding = 'wav'
    } = body;
      // Handle the setup operation (configuration)
    if (operation === 'setup') {
      // Send setup request to HeadTTS server with correct payload
      const setupPayload = {
        type: 'setup',
        id: Math.floor(Math.random() * 1000000), // Unique request identifier
        data: {
          voice,
          language,
          speed,
          audioEncoding
        }
      };
      console.log('[HeadTTS] Sending setup payload:', JSON.stringify(setupPayload, null, 2));
      const setupRes = await fetch('http://127.0.0.1:8882/v1/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupPayload)
      });
      
      // Just check if the request was successful, don't save anything
      if (!setupRes.ok) {
        const errText = await setupRes.text();
        return NextResponse.json({ 
          error: 'HeadTTS setup error', 
          details: errText 
        }, { status: 500 });
      }
      
      // Return only the API response and status
      let responseData;
      try {
        responseData = await setupRes.json();
      } catch (e) {
        responseData = { message: 'Response received successfully but no JSON content' };
      }
      
      return NextResponse.json({
        success: true,
        operation: 'setup',
        message: 'Voice configuration request completed',
        apiResponse: responseData,
        sentPayload: setupPayload
      });
    }
    
    // Handle the synthesize operation
    if (operation === 'synthesize') {
      // Create a unique job ID
      const jobId = uuidv4();
      
      // Create a directory for this job
      const tempDir = path.join(process.cwd(), 'temporary_files', jobId);
      await fs.mkdir(tempDir, { recursive: true });
      
      // Path for the audio output
      const outputPath = path.join(tempDir, 'tts_output.wav');
      
      // Compose RESTful synthesize payload
      const synthesizePayload = {
        input: text,
        voice,
        language,
        speed,
        audioEncoding
      };
      console.log('[HeadTTS] RESTful synthesize payload:', JSON.stringify(synthesizePayload, null, 2));
      
      const synthesizeRes = await fetch('http://127.0.0.1:8882/v1/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(synthesizePayload)
      });
      
      if (!synthesizeRes.ok) {
        const errText = await synthesizeRes.text();
        return NextResponse.json({ 
          error: 'HeadTTS synthesize error', 
          details: errText 
        }, { status: 500 });
      }

      // Read JSON response from HeadTTS server
      const responseJson = await synthesizeRes.json();
      // Save JSON response for debugging
      const jsonFile = path.join(tempDir, 'tts_response.json');
      await fs.writeFile(jsonFile, JSON.stringify(responseJson, null, 2));
      console.log(`TEST-TTS: JSON response saved to: ${jsonFile}`);
      if (!responseJson.audio) {
        console.error('TEST-TTS: No audio in response JSON');
      } else {
        // Decode base64 audio and save WAV file
        const wavBuffer = Buffer.from(responseJson.audio, 'base64');
        await fs.writeFile(outputPath, wavBuffer);
        console.log(`TEST-TTS: Successfully generated audio file at ${outputPath}`);
      }
      
      // Return a response with jobId that can be used to retrieve the audio
      return NextResponse.json({ 
        success: true, 
        operation: 'synthesize',
        jobId,
        audioUrl: `/api/test-tts-route/audio/${jobId}`,
        message: 'Audio generated successfully',
        sentPayload: synthesizePayload
      });
    }
    
    // If operation is neither setup nor synthesize
    return NextResponse.json({ 
      error: 'Invalid operation', 
      details: 'Operation must be either "setup" or "synthesize"' 
    }, { status: 400 });
    
  } catch (err) {
    console.error('TEST-TTS: Error in test TTS endpoint:', err);
    return NextResponse.json({ 
      error: 'Request failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

// Add a RESTful /synthesize POST handler for HeadTTS REST API compliance
export async function POST_synthesize(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // RESTful API expects these fields at the top level
    const {
      input = 'Hello, this is a test of HeadTTS.',
      voice = 'am_fenrir',
      language = 'en-us',
      speed = 1.0,
      audioEncoding = 'wav'
    } = body;

    // Compose the RESTful synthesize payload
    const synthesizePayload = {
      input,
      voice,
      language,
      speed,
      audioEncoding
    };
    console.log('[HeadTTS] RESTful /synthesize payload:', JSON.stringify(synthesizePayload, null, 2));

    // Send to HeadTTS RESTful server
    const synthesizeRes = await fetch('http://127.0.0.1:8882/v1/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(synthesizePayload)
    });

    if (!synthesizeRes.ok) {
      const errText = await synthesizeRes.text();
      return NextResponse.json({
        error: 'HeadTTS synthesize error',
        details: errText
      }, { status: 500 });
    }

    // Return the audio buffer directly
    const audioBuffer = await synthesizeRes.arrayBuffer();
    return new NextResponse(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': audioEncoding === 'wav' ? 'audio/wav' : 'audio/pcm',
        'Content-Disposition': `attachment; filename="tts_output.${audioEncoding}"`,
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error('RESTful /synthesize error:', err);
    return NextResponse.json({
      error: 'Request failed',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
