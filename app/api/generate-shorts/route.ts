import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { generateScriptWithLogs } from '../generate-script/improved-route';
import { convertTextToSpeech } from '@/lib/headTtsHelper'; // Changed import path

const execPromise = promisify(exec);

// Create the necessary directories
async function ensureDirectories() {
  const tempDir = path.join(process.cwd(), 'temporary_files');
  const outputDir = path.join(process.cwd(), 'public', 'generated_shorts');
  
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
}

// Use the improved script generation function with enhanced logging
const generateScript = generateScriptWithLogs;

// Function to convert text to speech using the TTS helper
async function textToSpeech(text: string, jobId: string, voice: string = 'am_fenrir', speed: number = 1.0): Promise<string> {
  try {
    // Create a unique directory for this job
    const tempDir = path.join(process.cwd(), 'temporary_files', jobId);
    
    // Ensure directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Path for the output audio file
    const outputPath = path.join(tempDir, 'tts_output.wav');
    
    console.log(`[Job ${jobId}] Converting text to speech (voice: ${voice})...`);
    
    return await convertTextToSpeech({
      text,
      outputPath,
      voice,
      speed
    });
  } catch (error: any) {
    console.error(`[Job ${jobId}] TTS error: ${error.message}`);
    // Propagate the error to be handled by the POST handler's try-catch
    throw new Error(`Failed to convert text to speech: ${error?.message || 'Unknown error'}`);
  }
}

// Function to create a short video using FFmpeg
async function createShort(params: {
  jobId: string;
  videoPath: string;
  audioPath: string;
  musicPath?: string;
  shortDuration: string;
}): Promise<{ outputPath: string; permanentPath: string }> {
  const { jobId, videoPath, audioPath, musicPath, shortDuration } = params;
  
  try {
    // Path for the output video file
    const outputDir = path.join(process.cwd(), 'temporary_files', jobId);
    const outputPath = path.join(outputDir, 'final_short.mp4');
    // Change permanentPath to a folder per jobId, with final_shorts.mp4 inside
    const permanentDir = path.join(process.cwd(), 'public', 'generated_shorts', jobId);
    await fs.mkdir(permanentDir, { recursive: true });
    let permanentPath = path.join(permanentDir, 'final_shorts.mp4');
    
    // Parse duration range
    let maxDuration = 20; // Default 20 seconds
    if (shortDuration === '20-45') maxDuration = 45;
    if (shortDuration === '30-60') maxDuration = 60;
    // Skip resizing; use original video directly
    // Use the original video path without scaling
    const tempVideoPath = videoPath;

    // Then, combine video, audio, and background music
    let ffmpegCommand;

    if (musicPath) {
      console.log('Combining video, TTS audio, and background music...');
      ffmpegCommand = `ffmpeg -hide_banner -loglevel error -i "${tempVideoPath}" -i "${audioPath}" -i "${musicPath}" -filter_complex "[1:a]volume=1.0[a];[2:a]volume=0.2[b];[a][b]amix=inputs=2:duration=shortest[aout]" -map 0:v -map "[aout]" -c:v libx264 -c:a aac -shortest -t ${maxDuration} "${outputPath}"`;
    } else {
      console.log('Combining video and TTS audio without background music...');
      ffmpegCommand = `ffmpeg -hide_banner -loglevel error -i "${tempVideoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v libx264 -c:a aac -shortest -t ${maxDuration} "${outputPath}"`;
    }
    
    await execPromise(ffmpegCommand);    // Step 4: Burn subtitles onto the combined video - Don't copy to permanent location yet
    try {
      console.log(`[Job ${jobId}] Burning subtitles onto video...`);
      
      // Get the current host and port from the environment or use a default
      const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Add a longer delay to ensure all TTS response files are written to disk
      // This ensures the burn-subtitles route can find all the TTS responses
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const burnResponse = await fetch(`${host}/api/burn-subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, inputVideoPath: outputPath }) // Use temp file, not permanent
      });
      
      if (!burnResponse.ok) {
        const errorData = await burnResponse.json();
        console.error(`[Job ${jobId}] Subtitle burn API returned error:`, errorData);
        throw new Error(`Subtitle burn failed with status ${burnResponse.status}: ${errorData.error || 'Unknown error'}`);
      }
      
      const burnData = await burnResponse.json();
      
      if (burnData.subtitledVideo) {
        // This should be the path to the subtitled video in temp directory
        const subtitledVideoPath = burnData.subtitledVideo;
        console.log(`[Job ${jobId}] Subtitles applied successfully, now copying to public folder`);
        
        // Copy the subtitled video to the permanent location
        await fs.copyFile(subtitledVideoPath, permanentPath);
        
        return {
          outputPath: subtitledVideoPath,
          permanentPath: `/generated_shorts/${jobId}/final_shorts.mp4`
        };
      }    } catch (subErr) {
      console.error(`[Job ${jobId}] Subtitle burn failed:`, subErr);
      
      // Create a detailed error log
      const errorLogPath = path.join(process.cwd(), 'temporary_files', jobId, 'subtitle_error_log.txt');
      await fs.writeFile(errorLogPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        error: subErr instanceof Error ? subErr.message : String(subErr),
        stack: subErr instanceof Error ? subErr.stack : undefined
      }, null, 2));
      
      // If subtitle burning fails, fall back to the non-subtitled video
      console.log(`[Job ${jobId}] Falling back to non-subtitled video`);
      await fs.copyFile(outputPath, permanentPath);
    }

    // Return the paths
    return {
      outputPath,
      permanentPath: `/generated_shorts/${jobId}/final_shorts.mp4`
    };  } catch (error: any) {
    console.error(`[Job ${jobId}] Error creating short:`, error);
    throw new Error(`Failed to create short video: ${error?.message || 'Unknown error'}`);
  }
}

export async function POST(request: Request) {
  // Create a unique job ID at the beginning
  const jobId = uuidv4();
  console.log(`Starting job ${jobId}`);
  
  try {
    await ensureDirectories();
    
    const body = await request.json();
    const {
      subject,
      numberOfFacts,
      storyStyle,
      language,
      moods,
      shortDuration,
      selectedVideos,
      selectedMusic
    } = body;
    
    // Input validation
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }
    
    if (!selectedVideos || selectedVideos.length === 0) {
      return NextResponse.json({ error: 'At least one video must be selected' }, { status: 400 });
    }
    
    console.log(`Job ${jobId} - Processing request for subject: ${subject}`);
    
    // Step 1: Generate Script
    console.log(`Job ${jobId} - Step 1: Generating script...`);
    let script: string;
    try {
      script = await generateScript({
        subject,
        numberOfFacts: numberOfFacts || 5,
        storyStyle: storyStyle || 'reddit',
        language: language || 'English',
        moods: moods || ['humor'],
        shortDuration: shortDuration || '15-20',
        jobId // Pass jobId to improve logging
      });
      console.log(`Job ${jobId} - Script generated successfully (${script.length} characters)`);
      // Log the actual script output for debugging
      console.log(`Job ${jobId} - Llama3.2 output:\n${script}`);
    } catch (scriptError) {
      console.error(`Job ${jobId} - Script generation failed:`, scriptError);
      const errMsg = (scriptError instanceof Error) ? scriptError.message : String(scriptError);
      throw new Error(`Script generation failed: ${errMsg}`);
    }
    // Step 2: Text to Speech
    console.log(`Job ${jobId} - Step 2: Converting text to speech...`);
    let audioPath: string;
    try {
      // Extract voice and speed from the request body
      const voiceToUse = body.voice || 'am_fenrir';
      const speedToUse = body.speed || 1.0;
      
      audioPath = await textToSpeech(script, jobId, voiceToUse, speedToUse);
    } catch (ttsError) {
      console.error(`Job ${jobId} - Text-to-speech failed:`, ttsError);
      // Create a directory for the job and a placeholder file
      const tempDir = path.join(process.cwd(), 'temporary_files', jobId);
      await fs.mkdir(tempDir, { recursive: true });
      audioPath = path.join(tempDir, 'tts_output.mp3');
      
      // Try to generate silent audio as absolute fallback
      try {
        await execPromise(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -c:a libmp3lame -q:a 2 "${audioPath}"`);
      } catch (fallbackError) {
        console.error(`Job ${jobId} - Fallback silent audio generation failed:`, fallbackError);
        // Create empty file as last resort
        await fs.writeFile(audioPath, '');
      }
    }
    
    // Step 3: Select random video and music
    console.log(`Job ${jobId} - Step 3: Selecting media assets...`);
    // Select a random video from the selected ones
    const randomVideoIndex = Math.floor(Math.random() * selectedVideos.length);
    const videoId = selectedVideos[randomVideoIndex];
    const videoPath = path.join(process.cwd(), 'public', 'assets', 'videos', videoId);
    console.log(`Job ${jobId} - Selected video: ${videoId}`);
    
    // If music selected, choose a random one
    let musicPath;
    if (selectedMusic && selectedMusic.length > 0) {
      const randomMusicIndex = Math.floor(Math.random() * selectedMusic.length);
      const musicId = selectedMusic[randomMusicIndex];
      musicPath = path.join(process.cwd(), 'public', 'assets', 'music', musicId);
      console.log(`Job ${jobId} - Selected music: ${musicId}`);
    } else {
      console.log(`Job ${jobId} - No music selected`);
    }
    
    // Step 4: Create the short video
    console.log(`Job ${jobId} - Step 4: Creating short video...`);
    let videoResult;
    try {
      videoResult = await createShort({
        jobId,
        videoPath,
        audioPath,
        musicPath,
        shortDuration: shortDuration || '15-20'
      });
      console.log(`Job ${jobId} - Video created successfully: ${videoResult.permanentPath}`);    } catch (videoError: any) {
      console.error(`Job ${jobId} - Video creation failed:`, videoError);
      throw new Error(`Failed to create video: ${videoError?.message || 'Unknown error during video creation'}`);
    }
    
    // Return all the information needed
    return NextResponse.json({
      success: true,
      jobId,
      script,
      permanentPath: videoResult.permanentPath
    });  } catch (error: any) {
    console.error(`Job ${jobId} - Fatal error:`, error);
    return NextResponse.json(
      { error: error?.message || 'An unknown error occurred', jobId }, 
      { status: 500 }
    );
  }
}
