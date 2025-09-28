const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the HeadTTS server directory
const serverPath = path.join(process.cwd(), 'lib', 'headtts');

// Command-line arguments
const args = process.argv.slice(2);
const command = args[0] || 'start';

// Check if the HeadTTS directory exists
if (!fs.existsSync(serverPath)) {
  console.error(`HeadTTS directory not found at ${serverPath}`);
  process.exit(1);
}

/**
 * Starts the HeadTTS server
 */
function startServer() {
  console.log('Starting HeadTTS server...');
  
  const server = spawn('node', ['modules/headtts-node.mjs', '--port', '8882', '--threads', '1'], {
    cwd: serverPath,
    stdio: 'inherit'
  });
  
  server.on('error', (error) => {
    console.error('Failed to start HeadTTS server:', error);
    process.exit(1);
  });
  
  // console.log(`HeadTTS server started with PID: ${server.pid}`);
  console.log(`HeadTTS server process started with PID: ${server.pid}. Waiting for server to be ready...`);

  // A more reliable way to know the server is ready is to listen to its stdout for a specific message.
  // However, since stdio is 'inherit', the output goes directly to the parent terminal.
  // We will assume it's ready shortly after spawn or add a small delay if direct confirmation is hard.
  // For now, we'll just add a more informative log about where it *should* be.
  
  // Give a brief moment for the server to initialize and print its own ready message.
  setTimeout(() => {
    console.log(`HeadTTS server should be running on http://127.0.0.1:8882`);
  }, 1000); // 1 second delay, adjust if needed
  
  // Save the PID to a file for later stopping
  fs.writeFileSync(path.join(serverPath, 'server.pid'), server.pid.toString());
  
  // Keep the process running until Ctrl+C
  console.log('Press Ctrl+C to stop the server');
}

/**
 * Stops the HeadTTS server
 */
function stopServer() {
  try {
    // Read the PID from file
    const pidFile = path.join(serverPath, 'server.pid');
    
    if (!fs.existsSync(pidFile)) {
      console.log('No running HeadTTS server found');
      return;
    }
    
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    
    console.log(`Stopping HeadTTS server with PID: ${pid}`);
    
    // Try to kill the process
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', pid, '/f', '/t']);
    } else {
      process.kill(pid);
    }
    
    // Remove the PID file
    fs.unlinkSync(pidFile);
    
    console.log('HeadTTS server stopped');
  } catch (error) {
    console.error('Failed to stop HeadTTS server:', error);
  }
}

// Execute the command
if (command === 'start') {
  startServer();
} else if (command === 'stop') {
  stopServer();
} else {
  console.log('Unknown command. Use "start" or "stop"');
}
