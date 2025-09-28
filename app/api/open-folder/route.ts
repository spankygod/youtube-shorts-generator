import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }
    // Always open the directory, never select a file
    // Convert web path to absolute path if needed
    let absPath = filePath;
    if (filePath.startsWith('/generated_shorts/')) {
      absPath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''));
    }
    // If the path is a file, open its parent directory
    let dir = absPath;
    const fs = require('fs');
    if (fs.existsSync(absPath) && fs.lstatSync(absPath).isFile()) {
      dir = path.dirname(absPath);
    }
    // If the path is a directory, use as is
    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
      return NextResponse.json({ error: `Directory does not exist: ${dir}` }, { status: 404 });
    }
    const command = `explorer.exe "${dir}"`;
    try {
      await execPromise(command);
    } catch (e) {
      // No logging
      throw e;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    // No logging
    return NextResponse.json({ error: (error instanceof Error) ? error.message : 'Failed to open folder' }, { status: 500 });
  }
}
