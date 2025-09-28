import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { convertTextToSpeech, ensureHeadTTSServerIsManaged } from '@/lib/headTtsHelper'; // Changed import path for convertTextToSpeech

// Function to convert text to speech using HeadTTS
async function textToSpeech(text: string, options?: { 
  voice?: string; 
  speed?: number;
  language?: string;
}): Promise<string> {
  try {
    // Create a unique directory for this job
    const jobId = uuidv4();
    const tempDir = path.join(process.cwd(), 'temporary_files', jobId);
    
    // Ensure directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Path for the output audio file
    const outputPath = path.join(tempDir, 'tts_output.wav');
    
    // Make sure the HeadTTS server is running
    await ensureHeadTTSServerIsManaged();
    
    // Use our ttsHelper to convert text to speech
    await convertTextToSpeech({
      text,
      outputPath,
      voice: options?.voice || 'am_fenrir', // Changed default voice to am_fenrir
      speed: options?.speed || 1.5,
      language: options?.language || 'en-us'
    });
    
    // Return the path to the generated audio file
    return outputPath;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw new Error('Failed to convert text to speech. Please check the input and server configuration.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, voice, speed, language } = body;
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    console.log(`Processing TTS request for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    const audioPath = await textToSpeech(text, {
      voice,
      speed,
      language
    });
    
    // Extract the job ID from the path
    const jobId = path.basename(path.dirname(audioPath));
    
    // Create a public URL for the audio file
    const publicUrl = `/api/text-to-speech/audio/${jobId}`;
    
    return NextResponse.json({ 
      success: true, 
      audioPath,
      audioUrl: publicUrl,
      jobId
    });
  } catch (error: any) {
    console.error('Error in text-to-speech API:', error);
    return NextResponse.json({ 
      error: 'Failed to convert text to speech', 
      details: error?.message || 'Unknown error' 
    }, { status: 500 });
  }
}
