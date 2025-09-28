import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to promise-based
const execPromise = promisify(exec);

// Function to get audio/video duration in seconds
async function getMediaDuration(filePath: string): Promise<number> {
  try {
    // Use ffprobe to get video/audio duration
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execPromise(command);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Error getting media duration:', error);
    return 0;
  }
}

export async function GET(request: Request) {
  // Get type from query (?type=video or ?type=music)
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  let folder = '';
  if (type === 'video') {
    folder = path.join(process.cwd(), 'public/assets/videos');
  } else if (type === 'music') {
    folder = path.join(process.cwd(), 'public/assets/music');
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  try {
    const files = await fs.readdir(folder);
    // Only .mp4 files
    const mp4Files = files.filter(f => f.endsWith('.mp4'));
    
    // For music files, get duration information
    if (type === 'music') {
      // Create array of assets with duration information
      const assetPromises = mp4Files.map(async name => {
        const filePath = path.join(folder, name);
        const duration = await getMediaDuration(filePath);
          // Parse the name to check if it has a duration suffix or segment number
        const nameParts = name.replace(/\.mp4$/, '').split('_');
        let trimmedDuration = null;
        
        // Check if the name ends with a duration marker like "_60sec"
        const durationMatch = nameParts[nameParts.length - 1].match(/^(\d+)sec$/);
        if (durationMatch) {
          trimmedDuration = parseInt(durationMatch[1], 10);
        }
        
        // Check for the new naming convention with "-N" suffix (for segments)
        const segmentMatch = name.match(/-(\d+)\.mp4$/);
        if (segmentMatch) {
          // For the new naming convention, we use 60 seconds as the segment length
          trimmedDuration = 60;
        }
        
        return {
          id: name,
          name: name.replace(/\.mp4$/, ''),
          path: `/assets/music/${name}`,
          type,
          duration: duration,
          trimmedDuration: trimmedDuration,
        };
      });
      
      const assets = await Promise.all(assetPromises);
      return NextResponse.json(assets);
    } else {
      // For video files, just return the basic information
      const assets = mp4Files.map(name => ({
        id: name,
        name: name.replace(/\.mp4$/, ''),
        path: `/assets/${type === 'video' ? 'videos' : 'music'}/${name}`,
        type,
      }));
      return NextResponse.json(assets);
    }
  } catch (e) {
    console.error('Failed to read assets:', e);
    return NextResponse.json({ error: 'Failed to read assets' }, { status: 500 });
  }
}
