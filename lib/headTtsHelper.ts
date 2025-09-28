import path from 'path';
import fs from 'fs/promises';

interface HeadTTSSynthesizeOptions {
  text: string;
  outputPath: string;
  voice?: string;
  speed?: number;
  language?: string;
}

// Available voices in HeadTTS
const availableVoices = [
  'af_heart',    // American Female
  'af_alloy',    // American Female
  'af_aoede',    // American Female
  'af_bella',    // American Female
  'af_jessica',  // American Female
  'af_kore',     // American Female
  'af_nicole',   // American Female
  'af_nova',     // American Female
  'af_river',    // American Female
  'af_sarah',    // American Female
  'af_sky',      // American Female
  'am_adam',     // American Male
  'am_echo',     // American Male
  'am_eric',     // American Male
  'am_fenrir',   // American Male
  'am_liam',     // American Male
  'am_michael',  // American Male
  'am_onyx',     // American Male
  'am_puck',     // American Male
  'am_santa',    // American Male
  'bf_alice',    // British Female
  'bf_emma',     // British Female
  'bf_isabella', // British Female
  'bf_lily',     // British Female
  'bm_daniel',   // British Male
  'bm_fable',    // British Male
  'bm_george',   // British Male
  'bm_lewis'     // British Male
];

// Voice display names to IDs mapping
const voiceMapping: { [key: string]: string } = {
  'fenrir': 'am_fenrir',
  'michael': 'am_michael',
  'bella': 'af_bella',
  'jessica': 'af_jessica',
  'nova': 'af_nova',
  'sarah': 'af_sarah',
  'lily': 'bf_lily',
  'emma': 'bf_emma',
  'george': 'bm_george',
  'daniel': 'bm_daniel'
};

/**
 * Reminds the user that the HeadTTS server should be started manually.
 * The actual health check is performed within convertTextToSpeech.
 */
export async function ensureHeadTTSServerIsManaged(): Promise<void> {
  console.log("Reminder: HeadTTS server should be managed externally (e.g., started with 'npm run dev:with-tts' or 'node scripts/headtts-server.js start'). This helper will check its responsiveness before making TTS requests.");
}

/**
 * Converts text to speech using HeadTTS
 */
/**
 * The base URL for the HeadTTS server
 */
const HEADTTS_API_URL = 'http://127.0.0.1:8882';

/**
 * Converts text to speech using HeadTTS
 */
export async function convertTextToSpeech(options: HeadTTSSynthesizeOptions): Promise<string> {
  console.log('Converting text to speech using HeadTTS...');
  const { text, outputPath, voice = 'am_fenrir', speed = 1.0, language = 'en-us' } = options;
  
  const headTtsVoice = voiceMapping[voice] || voice;
  const finalVoice = availableVoices.includes(headTtsVoice) ? headTtsVoice : 'am_fenrir';
    try {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true }).catch(error => {
      console.error('Error creating output directory:', error);
      throw new Error(`Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`);
    });
    
    // For debugging, save the text to a file
    const textFilePath = path.join(outputDir, 'tts_script.txt');
    await fs.writeFile(textFilePath, text);
    
    console.log(`Preparing text for HeadTTS with voice ${finalVoice}, speed: ${speed}...`);    async function synthesizeText(input: string): Promise<Buffer> {
      const response = await fetch(`${HEADTTS_API_URL}/v1/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          voice: finalVoice,
          language,
          speed,
          audioEncoding: 'wav'
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HeadTTS synthesis failed: ${response.status} - ${errorText}`);
      }      // Parse JSON response with base64 audio
      const responseJson = await response.json();
      
      // Save JSON for debugging and for word timing extraction by subtitle generator
      // Use a systematic naming convention to ensure responses can be processed in order
      const timestamp = Date.now();
      const jsonFile = path.join(outputDir, `tts_response_${timestamp.toString().padStart(14, '0')}.json`);
      await fs.writeFile(jsonFile, JSON.stringify(responseJson, null, 2));
      // console.log(`Saved TTS response to ${jsonFile} with ${responseJson.words?.length || 0} words`); // Removed verbose log

      if (!responseJson.audio) {
        throw new Error('No audio data in HeadTTS response');
      }
      // Decode base64 audio to Buffer
      const wavBuffer = Buffer.from(responseJson.audio, 'base64');
      return wavBuffer;
    }

    // Helper to merge multiple WAV buffers
    function mergeWavBuffers(buffers: Buffer[]): Buffer {
      if (buffers.length === 1) return buffers[0];

      const header = buffers[0].slice(0, 44);
      const pcmChunks = buffers.map(buf => buf.slice(44));
      const totalPcmLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const newHeader = Buffer.from(header);
      newHeader.writeUInt32LE(36 + totalPcmLength, 4);  // File size
      newHeader.writeUInt32LE(totalPcmLength, 40);      // Data chunk size
      return Buffer.concat([newHeader, ...pcmChunks]);
    }

    // Process text in chunks if necessary
    const MAX_CHUNK_LENGTH = 450;
    let audioBuffers: Buffer[] = [];

    if (text.length > MAX_CHUNK_LENGTH) {
      console.log(`Text length (${text.length}) exceeds ${MAX_CHUNK_LENGTH} chars, processing in chunks...`);
      const chunks: string[] = [];
      let remainingText = text;

      while (remainingText.length > 0) {
        let chunk = remainingText.substring(0, MAX_CHUNK_LENGTH);
        if (remainingText.length > MAX_CHUNK_LENGTH) {
          const sentenceEnders = ['.', '!', '?', '\\n'];
          const lastSentenceEnd = Math.max(...sentenceEnders.map(e => chunk.lastIndexOf(e)));
          if (lastSentenceEnd > 0) {
            chunk = remainingText.substring(0, lastSentenceEnd + 1);
          }
        }
        chunks.push(chunk.trim());
        remainingText = remainingText.substring(chunk.length);
      }

      console.log(`Processing ${chunks.length} chunks...`);
      for (let i = 0; i < chunks.length; i++) {
        try {
          console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
          const buffer = await synthesizeText(chunks[i]);
          audioBuffers.push(buffer);
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error);
          throw error;
        }
      }
    } else {
      console.log('Processing text in a single request...');
      const buffer = await synthesizeText(text);
      audioBuffers.push(buffer);
    }

    // Merge buffers and write final file
    console.log('Merging audio chunks...');
    const finalBuffer = mergeWavBuffers(audioBuffers);
    await fs.writeFile(outputPath, finalBuffer);
    
    console.log(`HeadTTS successfully generated audio file at ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    // Log detailed error information with context
    console.error('Error in convertTextToSpeech using HeadTTS:', {
      textLength: text.length,
      voice: finalVoice,
      speed,
      language,
      message: error.message,
      stack: error.stack,
      code: error.code,
      type: error.constructor.name
    });

    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      throw new Error('HeadTTS server is not running or not accessible. Please ensure the TTS server is started.');
    }

    if (error.message.includes('Invalid WAV data')) {
      throw new Error('HeadTTS generated invalid audio data. This may be due to an unsupported voice configuration.');
    }    throw new Error(`HeadTTS conversion failed: ${error?.message || 'Unknown error'}`);
  }
}

// Export the options interface for external use
export type { HeadTTSSynthesizeOptions };
