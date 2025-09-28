const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple test script to check Ollama API connectivity
const testOllamaAPI = async () => {
  console.log('Testing Ollama API connectivity...');
    const payload = {
    model: "llama3.2:latest",
    prompt: "Write a one-sentence test response to confirm the API is working.",
    stream: false
  };
  
  // Prepare a safe payload for shell command
  const safePayload = JSON.stringify(payload).replace(/'/g, "'\\''");
  
  // Test command with verbose output
  const command = `curl -v -X POST "http://localhost:11434/api/generate" -d '${safePayload}' --max-time 30 -H "Content-Type: application/json"`;
  
  console.log('Executing command:', command);
  
  // Save the response to a file for easier debugging
  const responsePath = path.join(__dirname, 'ollama_test_response.json');
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing curl command:', error);
      return;
    }
    
    console.log('Curl connection info:');
    console.log(stderr);
    
    console.log('\nAPI Response:');
    console.log(stdout);
    
    // Try to parse the response
    try {
      const response = JSON.parse(stdout);
      console.log('\nParsed response:');
      console.log(response);
      
      if (response.response) {
        console.log('\nGenerated text:');
        console.log(response.response);
        console.log(`\nResponse length: ${response.response.length} characters`);
      } else {
        console.error('\nNo response field found in the API response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
    }
    
    // Save response to file
    fs.writeFileSync(responsePath, stdout);
    console.log(`\nResponse saved to ${responsePath}`);
  });
};

testOllamaAPI();
