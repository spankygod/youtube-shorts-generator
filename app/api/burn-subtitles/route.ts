import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Helper to format milliseconds to ffmpeg timestamp (hh:mm:ss.ms)
function msToTimestamp(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Helper to format milliseconds to SRT timestamp format (00:00:00,000)
function msToSrtTimestamp(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  const millis = Math.floor((totalSeconds % 1) * 1000)
    .toString()
    .padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${millis}`;
}

export async function POST(request: Request) {
  try {
    const { jobId, inputVideoPath } = await request.json();

    // Verify input video exists before processing
    try {
      await fs.access(inputVideoPath);
    } catch {
      return NextResponse.json({ error: `Input video not found at ${inputVideoPath}` }, { status: 404 });
    }

    const tempDir = path.join(process.cwd(), 'temporary_files', jobId);    // Find all JSON response files (since TTS might be chunked)
    const files = await fs.readdir(tempDir);
    const jsonFiles = files.filter(f => f.startsWith('tts_response_') && f.endsWith('.json'));
    if (!jsonFiles.length) {
      return NextResponse.json({ error: 'No TTS response JSON found' }, { status: 404 });
    }
    
    // Sort JSON files by timestamp (which should match the order they were created)
    jsonFiles.sort();    // Collect and combine all words, times, and durations
    let allWords: string[] = [];
    let allTimes: number[] = [];
    let allDurations: number[] = [];
    let timeOffset = 0; // Track timing offset for each chunk
    
    console.log(`Found ${jsonFiles.length} TTS response files to process`);
    
    for (const jsonFile of jsonFiles) {
      const responseJsonPath = path.join(tempDir, jsonFile);
      const responseJson = JSON.parse(await fs.readFile(responseJsonPath, 'utf-8'));
      
      const chunkWords = responseJson.words || [];
      const chunkTimes = responseJson.wtimes || [];
      const chunkDurations = responseJson.wdurations || [];
      
      if (chunkWords.length === 0) {
        console.log(`Warning: No words found in ${jsonFile}, skipping`);
        continue;
      }
        // Apply time offset to this chunk if it's not the first one
      if (allWords.length > 0 && chunkTimes.length > 0) {
        // End of previous chunk
        const lastEndTime = allTimes[allTimes.length - 1] + (allDurations[allDurations.length - 1] || 500);
        const chunkStartTime = chunkTimes[0];
        
        // Fixed offset calculation - ensure consistent timing between chunks
        // This approach ensures that the subtitles are properly synchronized with audio
        timeOffset = lastEndTime - chunkStartTime;
        
        // Add a small natural gap between chunks if needed (100ms)
        timeOffset += 100;
      }
      
      // Add words from this chunk
      allWords = allWords.concat(chunkWords);
        // Add times and durations with offset applied
      for (let i = 0; i < chunkTimes.length; i++) {
        // Apply offset to each time - this keeps the proper relative timing between words
        allTimes.push(chunkTimes[i] + timeOffset);
        
        // Use the actual duration if available, otherwise use a reasonable default
        // Make sure the duration is within reasonable limits
        const wordDuration = chunkDurations[i] || 0;
        allDurations.push(wordDuration > 0 ? wordDuration : 250); // Use 250ms as minimum duration
      }
      
      // Log more detailed information for debugging
      console.log(`Processed ${jsonFile}: added ${chunkWords.length} words with offset ${timeOffset}ms`);
      
      // Add chunk markers to help verify alignment
      if (chunkWords.length > 0) {
        const firstWordTime = allTimes[allTimes.length - chunkWords.length];
        const lastWordTime = allTimes[allTimes.length - 1];
        const chunkDuration = lastWordTime - firstWordTime + (allDurations[allDurations.length - 1] || 0);
        console.log(`   Chunk timing: ${msToTimestamp(firstWordTime)} - ${msToTimestamp(lastWordTime)} (duration: ${chunkDuration}ms)`);
      }
    }
    
    const words: string[] = allWords;
    const times: number[] = allTimes;
    const durs: number[] = allDurations;    // Build ASS subtitle content for debugging
    let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2
Collisions: Normal

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ShortsCaption,Anton,250,&H0000FFFF,&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,12,1,2,50,50,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;    // Generate ASS subtitles for all words
    // Group words into phrases to reduce position jumping
    for (let i = 0; i < words.length; i++) {
      const start = msToTimestamp(times[i]);
      let end;
      
      // Calculate end time based on actual word duration
      // This ensures timing stays consistent throughout the video
      const duration = durs[i] || 500; // Default 500ms if no duration is available
      
      if (i < words.length - 1) {
        // Use the minimum of: calculated duration or time until next word (minus small gap)
        // This prevents words from overlapping while keeping proper timing
        const timeToNextWord = times[i + 1] - times[i] - 20; // 20ms gap
        end = msToTimestamp(times[i] + Math.min(duration, Math.max(timeToNextWord, 100)));
      } else {
        // Last word: use its full duration
        end = msToTimestamp(times[i] + duration);
      }
      const text = words[i].replace(/\r?\n/g, ' ').trim();
      // Make sure there's consistent positioning by using centered text with fixed positioning
      assContent += `Dialogue: 0,${start},${end},ShortsCaption,,0,0,0,,{\\pos(540,1720)\\an2}${text}\n`;
    }

    // Write ASS file for debugging/inspection
    const assPath = path.join(tempDir, 'subtitles.ass');
    await fs.writeFile(assPath, assContent, 'utf-8');
    console.log(`Created ASS subtitle file with ${words.length} words`);
      // Define output path for the subtitled video
    const outputPath = path.join(tempDir, 'subtitled.mp4');
    
    // Create a version of the video with hardcoded dimensions first
    const tempScaledPath = path.join(tempDir, 'temp_scaled.mp4');
    
    // First scale the video to a standard size to avoid any dimension issues
    const scaleCmd = `ffmpeg -hide_banner -loglevel error -i "${inputVideoPath}" -vf "scale=1080:1920" -c:a copy "${tempScaledPath}"`;
    console.log('Scaling video with command:', scaleCmd);
    
    try {
      await execPromise(scaleCmd);
      console.log('Video scaled successfully');
    } catch (scaleErr: any) {
      console.error('Error scaling video:', scaleErr);
      return NextResponse.json({ error: `Failed to scale video: ${scaleErr.message}` }, { status: 500 });
    }    // Fix paths for Windows - replace backslashes with forward slashes and escape colons
    // Note: FFmpeg needs special handling for Windows paths with subtitles filter
    const fixedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    
    // Now burn the subtitles using the ASS file with proper path handling
    // Using 'subtitles=' filter with the fixed path ensures compatibility across platforms
    const ffmpegCmd = `ffmpeg -hide_banner -loglevel info -i "${tempScaledPath}" -vf "subtitles='${fixedAssPath}'" -c:a copy "${outputPath}"`;
    
    console.log('Burning subtitles with command:', ffmpegCmd);
    
    // Save the command to a file for debugging purposes
    await fs.writeFile(path.join(tempDir, 'subtitle_command.txt'), ffmpegCmd, 'utf-8');
      // Execute FFmpeg and capture output
    try {
      console.log(`Executing FFmpeg subtitle command for job ${jobId}...`);
      const { stdout, stderr } = await execPromise(ffmpegCmd);
      
      // Log FFmpeg output for diagnostics
      if (stdout.trim()) console.log('FFmpeg stdout:', stdout);
      if (stderr.trim()) console.log('FFmpeg stderr:', stderr);
      
      // Verify the output file exists
      await fs.access(outputPath);
      console.log(`Successfully created subtitled video at ${outputPath}`);
    } catch (ffErr: any) {
      console.error('FFmpeg subtitle burning failed:', {
        error: ffErr.message,
        stderr: ffErr.stderr,
        command: ffmpegCmd,
        jobId
      });
      
      // Create a detailed error file for debugging
      const errorLogPath = path.join(tempDir, 'subtitle_error.txt');
      await fs.writeFile(errorLogPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        command: ffmpegCmd,
        error: ffErr.message,
        stderr: ffErr.stderr || 'No stderr output'
      }, null, 2));
      
      return NextResponse.json({ 
        error: `FFmpeg failed: ${ffErr.message}`, 
        details: ffErr.stderr,
        command: ffmpegCmd
      }, { status: 500 });
    }// Return the path to the subtitled video - DON'T copy to public yet
    // (We'll copy in the generate-shorts endpoint)
    return NextResponse.json({
      success: true,
      subtitledVideo: outputPath
    });
  } catch (err: any) {
    console.error('Error in burn-subtitles route:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
