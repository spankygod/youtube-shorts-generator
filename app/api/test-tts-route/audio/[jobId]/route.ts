import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Get the jobId from URL path segments directly to avoid Next.js warning
  const segments = request.url.split('/');
  const jobId = segments[segments.length - 1];
  try {
    // Path to the audio file
    const audioPath = path.join(process.cwd(), 'temporary_files', jobId, 'tts_output.wav');
    // Check if the file exists
    try {
      await fs.access(audioPath);
    } catch (error) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }
    // Read the file as a buffer
    const audioBuffer = await fs.readFile(audioPath);
    // Return the audio file with appropriate headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `attachment; filename="tts_output_${jobId}.wav"`,
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json({ error: 'Failed to serve audio file' }, { status: 500 });
  }
}
