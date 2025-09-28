import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execPromise = promisify(exec);

// Function to create a short video using FFmpeg
async function createShort(params: {
  jobId: string;
  videoPath: string;
  audioPath: string;
  musicPath: string;
  shortDuration: string;
}): Promise<string> {
  const { jobId, videoPath, audioPath, musicPath, shortDuration } = params;
  
  try {
    // Path for the output video file
    const outputDir = path.join(process.cwd(), 'temporary_files', jobId);
    const outputPath = path.join(outputDir, 'final_short.mp4');
    const permanentPath = path.join(process.cwd(), 'public', 'generated_shorts', `${jobId}.mp4`);
    
    // Ensure the output directory exists
    await fs.mkdir(path.join(process.cwd(), 'public', 'generated_shorts'), { recursive: true });
    
    // Parse duration range
    let maxDuration = 20; // Default 20 seconds
    if (shortDuration === '20-45') maxDuration = 45;
    if (shortDuration === '30-60') maxDuration = 60;
    
    // First, resize the video to 9:16 (vertical) if needed
    const tempVideoPath = path.join(outputDir, 'temp_resized.mp4');
    
    await execPromise(`ffmpeg -i "${videoPath}" -vf "scale=-1:1920,crop=1080:1920:(iw-1080)/2:0" -c:v libx264 -crf 23 "${tempVideoPath}"`);
    
    // Then, combine resized video, audio, and background music
    const ffmpegCommand = `ffmpeg -i "${tempVideoPath}" -i "${audioPath}" -i "${musicPath}" -filter_complex "[1:a]volume=1.0[a];[2:a]volume=0.2[b];[a][b]amix=inputs=2:duration=shortest[aout]" -map 0:v -map "[aout]" -c:v libx264 -c:a aac -shortest -t ${maxDuration} "${outputPath}"`;
    
    await execPromise(ffmpegCommand);
    
    // Copy to permanent location
    await fs.copyFile(outputPath, permanentPath);
    
    // Return the paths
    return {
      outputPath,
      permanentPath: `/generated_shorts/${jobId}.mp4`
    };
  } catch (error) {
    console.error('Error creating short:', error);
    throw new Error('Failed to create short video');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, videoId, musicId, audioPath, shortDuration } = body;
    
    if (!jobId || !videoId || !audioPath) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get the paths for the selected video and music
    const videoPath = path.join(process.cwd(), 'public', 'assets', 'videos', videoId);
    const musicPath = musicId 
      ? path.join(process.cwd(), 'public', 'assets', 'music', musicId)
      : ''; // Handle the case where no music is selected
    
    // Create the short
    const { outputPath, permanentPath } = await createShort({
      jobId,
      videoPath,
      audioPath,
      musicPath: musicPath || videoPath, // Use video file as "music" if no music selected
      shortDuration: shortDuration || '15-20'
    });
    
    return NextResponse.json({
      success: true,
      outputPath,
      permanentPath
    });
  } catch (error) {
    console.error('Error in create-short API:', error);
    return NextResponse.json({ error: 'Failed to create short' }, { status: 500 });
  }
}
