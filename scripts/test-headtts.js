/**
 * This script tests the HeadTTS integration by generating a short audio file
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Path to the HeadTTS server directory
const serverPath = path.join(process.cwd(), 'lib', 'headtts');
const testOutputDir = path.join(process.cwd(), 'temporary_files', 'headtts-test');
const testOutputFile = path.join(testOutputDir, 'test-output.wav');
const testText = "This is a test of the HeadTTS integration with the LilyShorts project. If you can hear this message, the text-to-speech system is working correctly.";

// Make sure the output directory exists
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

// Write a request file for the HeadTTS system
const requestFile = path.join(testOutputDir, 'test-request.json');
fs.writeFileSync(requestFile, JSON.stringify({
  endpoint: 'ws://127.0.0.1:8882',
  voice: 'mm_merlin', // Male voice (Michael equivalent)
  language: 'en-us',
  speed: 1.0,
  text: testText,
  output: testOutputFile
}));

// Check if the HeadTTS server is already running
async function isServerRunning() {
  try {
    const res = await fetch('http://127.0.0.1:8882/v1/voices');
    return res.ok;
  } catch (error) {
    return false;
  }
}

// Start the server
async function startServer() {
  console.log('Starting HeadTTS server...');
  
  const server = spawn('node', ['modules/headtts-node.mjs', '--port', '8882', '--threads', '1'], {
    cwd: serverPath,
    stdio: 'inherit'
  });
  
  server.on('error', (error) => {
    console.error('Failed to start HeadTTS server:', error);
    process.exit(1);
  });
  
  console.log(`HeadTTS server started with PID: ${server.pid}`);
  
  // Save the PID to a file for later stopping
  fs.writeFileSync(path.join(serverPath, 'server.pid'), server.pid.toString());
  
  // Wait for server to be ready
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}

// Run the test
async function runTest() {
  try {
    // Check if server is running, if not start it
    const serverRunning = await isServerRunning();
    if (!serverRunning) {
      await startServer();
    } else {
      console.log('HeadTTS server is already running');
    }
    
    // Run the test using the REST client
    console.log('Running HeadTTS test...');
    console.log(`Input text: "${testText}"`);
    console.log(`Output file: ${testOutputFile}`);
    
    // Execute the client
    await exec(`node ${path.join(serverPath, 'tests', 'restclient.js')} "${requestFile}"`);
    
    // Check if the output file was created
    if (fs.existsSync(testOutputFile)) {
      console.log('\n✅ HeadTTS test successful! Audio file created successfully.');
      console.log(`You can play the test file at: ${testOutputFile}`);
    } else {
      console.error('❌ Test failed: No output file was created');
    }
    
    // Only stop the server if we started it
    if (!serverRunning) {
      console.log('Stopping HeadTTS server...');
      if (process.platform === 'win32') {
        await exec(`taskkill /pid ${fs.readFileSync(path.join(serverPath, 'server.pid'), 'utf8')} /f /t`);
      } else {
        process.kill(parseInt(fs.readFileSync(path.join(serverPath, 'server.pid'), 'utf8')));
      }
      fs.unlinkSync(path.join(serverPath, 'server.pid'));
      console.log('HeadTTS server stopped');
    }
  } catch (error) {
    console.error('Error running HeadTTS test:', error);
  }
}

// Run the test
runTest();
