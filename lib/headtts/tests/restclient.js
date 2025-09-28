
const fs = require('fs');
const path = require('path');
const http = require('http');

async function sendRequest(requestFile) {
  try {
    // Read the request file
    const requestData = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
    
    const { endpoint, voice, language, speed, text, output } = requestData;
    
    // Use local REST endpoint
    const serverURL = new URL(endpoint.replace('ws://', 'http://') + '/v1/synthesize');
    
    // Prepare the request options
    const options = {
      hostname: serverURL.hostname,
      port: serverURL.port,
      path: serverURL.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Create the request body
    const requestBody = JSON.stringify({
      input: text,
      voice: voice || 'am_fenrir',
      language: language || 'en-us',
      speed: speed || 1.0,
      audioEncoding: 'wav'
    });
    
    // Create a promise to handle the request
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        // Check for error status code
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP Error: ${res.statusCode}`));
        }
        
        // Collect the response data
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        
        res.on('end', () => {
          try {
            // Combine all chunks
            const buffer = Buffer.concat(chunks);
            
            // Write to the output file
            fs.writeFileSync(output, buffer);
            
            console.log(`Audio saved to ${output}`);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
      
      // Handle request errors
      req.on('error', (error) => {
        reject(error);
      });
      
      // Send the request body
      req.write(requestBody);
      req.end();
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get the request file from command line arguments
const requestFile = process.argv[2];

if (!requestFile) {
  console.error('Please provide a request file path');
  process.exit(1);
}

sendRequest(requestFile).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
