const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const headTTSDir = path.join(process.cwd(), 'lib', 'headtts');
const engineDir = path.join(headTTSDir, 'modules');
const voicesDir = path.join(headTTSDir, 'voices');

console.log('Checking HeadTTS installation...');

// Function to check if directory exists and is not empty
function checkDirNotEmpty(dir) {
  try {
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) {
      return false;
    }
    
    const files = fs.readdirSync(dir);
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

// Check if HeadTTS is properly installed
if (!fs.existsSync(headTTSDir)) {
  console.error('❌ HeadTTS directory not found at:', headTTSDir);
  process.exit(1);
}

// Check if module files exist
if (!fs.existsSync(path.join(engineDir, 'headtts-node.mjs'))) {
  console.error('❌ HeadTTS engine modules not found');
  process.exit(1);
}

// Check if voices models exist or need to be downloaded
console.log('Checking voice models...');
const reqVoice = 'mm_merlin'; // Required minimum voice

if (!fs.existsSync(voicesDir) || !checkDirNotEmpty(voicesDir)) {
  console.log('⚠️ Voice models not found. HeadTTS will need to download them on first use.');
  
  // Create the voices directory if it doesn't exist
  if (!fs.existsSync(voicesDir)) {
    fs.mkdirSync(voicesDir, { recursive: true });
  }
  
  console.log('ℹ️ Note: The model files will be downloaded automatically when the HeadTTS server is started for the first time.');
  console.log('ℹ️ You can start the server with: npm run headtts:start');
}

// Check if node_modules are properly installed
if (!fs.existsSync(path.join(headTTSDir, 'node_modules'))) {
  console.log('ℹ️ Installing dependencies for HeadTTS...');
  try {
    execSync('npm install --ignore-scripts', { cwd: headTTSDir, stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error);
    process.exit(1);
  }
}

console.log('✅ HeadTTS is properly set up.');
console.log('');
console.log('You can start the HeadTTS server with:');
console.log('  npm run headtts:start');
console.log('');
console.log('You can test the TTS functionality with:');
console.log('  npm run headtts:test');
