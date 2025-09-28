import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { URL } from 'url';

// Convert exec to promise-based
const execPromise = promisify(exec);

// Path to the locally downloaded yt-dlp binary
const YT_DLP_PATH = path.join(process.cwd(), 'yt-dlp.exe');

// Function to get video duration in seconds
async function getVideoDuration(filePath: string): Promise<number> {
  try {
    // Use ffprobe to get video duration
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execPromise(command);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 0;
  }
}

// Function to split video into segments
async function splitVideo(
  inputPath: string, 
  outputDir: string, 
  baseName: string, 
  segmentDuration: number
): Promise<string[]> {
  try {
    const duration = await getVideoDuration(inputPath);
    if (duration <= 0) {
      throw new Error('Unable to determine video duration');
    }

    // Calculate how many segments we need
    const segmentsCount = Math.ceil(duration / segmentDuration);
    const paths: string[] = [];

    // Create segments
    for (let i = 0; i < segmentsCount; i++) {
      const startTime = i * segmentDuration;
      const outputFileName = `${baseName}${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);
      
      // Try to trim leading black frames (up to 2 seconds) for each segment
      // Uses ffmpeg's blackdetect filter to find black frames and trim them
      // Only applies to the first 2 seconds of each segment
      let blackStart = 0;
      try {
        // Use frame-accurate seeking by placing -ss after -i
        const detectBlackCmd = `ffmpeg -hide_banner -i "${inputPath}" -ss ${startTime} -t 2 -vf blackdetect=d=0.1:pic_th=0.98 -an -f null - 2>&1`;
        const { stdout } = await execPromise(detectBlackCmd);
        const output = stdout;
        const match = output.match(/black_start:(\d+\.?\d*)/);
        if (match) {
          blackStart = parseFloat(match[1]);
        }
      } catch {}
      // If blackStart was detected, trim it from the segment
      const trimOffset = blackStart > 0 && blackStart < 2 ? blackStart : 0;
      // Use frame-accurate seeking for the actual segment extraction and resize to vertical (9:16)
      const command =
        `ffmpeg -y -i "${inputPath}" ` +
        `-ss ${startTime + trimOffset} -t ${segmentDuration - trimOffset} ` +
        `-vf "scale=-2:1920,crop=1080:1920" ` +
        `-avoid_negative_ts 1 -reset_timestamps 1 -movflags +faststart "${outputPath}"`;
      await execPromise(command);
      
      // Add public path to the list
      const publicPath = `/assets/${path.basename(outputDir)}/${outputFileName}`;
      paths.push(publicPath);
    }

    // Delete the original file after splitting
    await fs.unlink(inputPath);
    
    return paths;
  } catch (error) {
    console.error('Error splitting video:', error);
    throw error;
  }
}

// Function to trim music file to the specified duration
async function trimMusic(
  inputPath: string,
  outputDir: string,
  baseName: string,
  maxDuration: number
): Promise<string[]> {
  try {
    const duration = await getVideoDuration(inputPath);
    if (duration <= 0) {
      throw new Error('Unable to determine music duration');
    }

    // If the music is already shorter than the requested duration, just return it
    if (duration <= maxDuration) {
      console.log('Music file is already shorter than the requested duration, using as-is');
      return [`/assets/music/${baseName}.mp4`];
    }

    // Calculate how many segments we need
    const segmentsCount = Math.ceil(duration / maxDuration);
    const paths: string[] = [];

    // Create segments with the new naming convention: baseName-1, baseName-2, etc.
    for (let i = 0; i < segmentsCount; i++) {
      const startTime = i * maxDuration;
      const outputFileName = `${baseName}-${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);
      
      // Use ffmpeg to extract the segment
      const command = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${maxDuration} -c:a copy "${outputPath}"`;
      await execPromise(command);
      
      // Add public path to the list
      paths.push(`/assets/music/${outputFileName}`);
    }

    // Delete the original file after splitting
    await fs.unlink(inputPath);
    
    return paths;
  } catch (error) {
    console.error('Error trimming music file:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { url, type, filename, duration = 'full' } = await request.json();
    
    if (!url || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    
    // Make sure it's a YouTube URL
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return NextResponse.json({ error: 'URL must be from YouTube' }, { status: 400 });
    }
    
    try {
      // Check if yt-dlp binary exists
      try {
        await fs.access(YT_DLP_PATH);
        console.log('Found yt-dlp binary at:', YT_DLP_PATH);
      } catch (err) {
        console.error('yt-dlp binary not found at:', YT_DLP_PATH);
        return NextResponse.json({ 
          error: 'YouTube downloader binary not found', 
          details: 'Please ensure yt-dlp.exe is in the project root directory'
        }, { status: 500 });
      }
      
      // Determine file paths
      const basePath = path.join(process.cwd(), 'public', 'assets');
      const directory = type === 'video' ? path.join(basePath, 'videos') : path.join(basePath, 'music');
      
      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });
      
      // Get video info using direct command execution instead of the library
      console.log('Getting video info...');
      let videoTitle = '';
      let thumbnail = '';
      
      try {
        // Use a command to get basic info
        const infoCommand = `"${YT_DLP_PATH}" --dump-json "${url}" --no-warnings --no-check-certificate`;
        console.log('Running command:', infoCommand);
        
        const { stdout } = await execPromise(infoCommand);
        const videoInfo = JSON.parse(stdout);
        videoTitle = videoInfo.title || '';
        thumbnail = videoInfo.thumbnail || '';
        
        console.log('Video info retrieved successfully');
      } catch (infoError) {
        console.error('Error getting video info:', infoError);
        // Continue with default values
        videoTitle = `YouTube Video ${Date.now()}`;
      }
      
      // Determine filename
      let finalFilename = '';
      if (filename && filename.trim()) {
        // Sanitize the filename to remove invalid characters
        finalFilename = filename
          .replace(/[\\/:*?"<>|]/g, '')
          .trim();
      } else {
        // Use video title if no filename is provided
        finalFilename = videoTitle
          .replace(/[\\/:*?"<>|]/g, '')
          .trim();
      }
      
      // Ensure we have a valid filename
      if (!finalFilename) {
        finalFilename = `youtube_${Date.now()}`;
      }
      
      // Add appropriate extension - mp4 for video, webm for audio (if ffmpeg not available)
      let extension = '.mp4';
      
      // Construct the download command based on type with explicit format options
      let downloadCommand = '';
      
      if (type === 'video') {
        // Download video with a maximum of 1080p
        // The format selector below will:
        // 1. Try to get the best video up to 1080p and best audio, and merge them
        // 2. If merging isn't possible, fall back to the best combined quality up to 1080p
        downloadCommand = `"${YT_DLP_PATH}" "${url}" -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 -o "${directory}/${finalFilename}${extension}" --no-warnings --no-check-certificate`;
      } else {
        // For audio, get the best audio quality
        downloadCommand = `"${YT_DLP_PATH}" "${url}" -f "bestaudio" -o "${directory}/${finalFilename}${extension}" --no-warnings --no-check-certificate`;
      }
      
      console.log('Running download command:', downloadCommand);
      
      try {
        // Execute the download command
        const { stdout, stderr } = await execPromise(downloadCommand);
        console.log('Download command output:', stdout);
        if (stderr) {
          console.warn('Download stderr:', stderr);
        }
      } catch (downloadError) {
        console.error('Download command error:', downloadError);
        throw downloadError;
      }
      
      console.log(`Download completed: ${finalFilename}${extension}`);
      
      let result: any = {
        success: true,
        title: videoTitle,
        thumbnail: thumbnail
      };
        // If duration is not 'full', process the file based on type
      if (duration !== 'full') {
        const filePath = path.join(directory, `${finalFilename}${extension}`);
        
        // Determine segment duration in seconds
        let segmentDuration = 0;
        switch (duration) {
          case '60sec':
            segmentDuration = 60;
            break;
          case '3min':
            segmentDuration = 180;
            break;
          case '5min':
            segmentDuration = 300;
            break;
        }
        
        if (segmentDuration > 0) {
          if (type === 'video') {
            console.log(`Splitting video into ${segmentDuration}-second segments...`);
            
            // Split the video and get the generated file paths
            const paths = await splitVideo(filePath, directory, finalFilename, segmentDuration);
            
            result.message = `Video split into ${paths.length} segments`;
            result.paths = paths;          } else if (type === 'music') {
            console.log(`Splitting music file into ${segmentDuration}-second segments...`);
            
            // Split the music file into segments of the specified duration
            const musicPaths = await trimMusic(filePath, directory, finalFilename, segmentDuration);
            
            result.message = `Music split into ${musicPaths.length} segments`;
            result.paths = musicPaths;
            result.duration = segmentDuration;  // Include duration in the result
          }
        }
      } else {
        // Generate the public URL path for the asset (full video or audio)
        const publicUrl = `/assets/${type === 'video' ? 'videos' : 'music'}/${finalFilename}${extension}`;
        result.message = `Successfully downloaded and saved as "${finalFilename}${extension}"`;
        result.path = publicUrl;
        
        // For full files, add the actual duration to the result
        if (type === 'music') {
          try {
            const fullPath = path.join(directory, `${finalFilename}${extension}`);
            const duration = await getVideoDuration(fullPath);
            result.duration = duration;  // Include actual duration in the result
          } catch (e) {
            console.error('Error getting music duration:', e);
          }
        }
      }
      
      return NextResponse.json(result);
      
    } catch (downloadError) {
      console.error('YouTube download error:', downloadError);
      return NextResponse.json({ 
        error: 'Failed to download from YouTube', 
        details: downloadError instanceof Error ? downloadError.message : String(downloadError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ 
      error: 'Failed to process YouTube URL', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}