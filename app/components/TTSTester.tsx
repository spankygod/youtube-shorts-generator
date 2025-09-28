'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export default function TTSTester() {
  const [text, setText] = useState('Hello, this is a test of the HeadTTS integration with the LilyShorts project.');
  const [voice, setVoice] = useState('michael');
  const [speed, setSpeed] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // List of available voices based on files in lib/headtts/voices
  const availableVoices = [
    { value: 'af_bella', label: 'Bella (Female)' },
    { value: 'am_fenrir', label: 'Fenrir (Male)' },
    { value: 'am_michael', label: 'Michael (Male)' },
    { value: 'bm_george', label: 'George (Male)' },
    { value: 'bf_lily', label: 'Lily (Female)' },
    { value: 'af_nova', label: 'Nova (Female)' },
    // Add more as needed from your voices directory
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, speed }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Unknown error');
      }
      
      setAudioUrl(data.audioUrl);
    } catch (error: any) {
      setError(error.message || 'Failed to convert text to speech');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  return (
    <div className="bg-[#181c24] shadow-lg rounded-xl p-8 mt-8 border border-[#23272f]">
      <h2 className="text-2xl font-bold mb-4 text-white">HeadTTS Tester</h2>
      <p className="mb-4 text-gray-300 text-base">
        Test the HeadTTS integration by converting text to speech.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="text" className="text-white text-lg">Text to speak</Label>
          <Textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Enter text to convert to speech"
            className="w-full bg-[#23272f] text-white border border-[#353b48] rounded-lg p-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="voice" className="text-white text-lg">Voice</Label>
            <select 
              id="voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-[#353b48] rounded-lg bg-[#23272f] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableVoices.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Label htmlFor="speed" className="text-white text-lg">Speed</Label>
            <select
              id="speed"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-[#353b48] rounded-lg bg-[#23272f] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0.8">Slow (0.8x)</option>
              <option value="1.0">Normal (1.0x)</option>
              <option value="1.2">Fast (1.2x)</option>
              <option value="1.5">Very Fast (1.5x)</option>
            </select>
          </div>
        </div>
        
        <div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
          >
            {isLoading ? 'Converting...' : 'Convert to Speech'}
          </Button>
        </div>
      </form>
      
      {error && (
        <div className="mt-4 bg-red-900/80 p-4 rounded text-red-200 text-base">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {audioUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 text-white">Generated Audio:</h3>
          <audio
            ref={audioRef}
            controls
            className="w-full bg-[#23272f]"
            src={audioUrl}
            onError={() => setError('Failed to load audio file')}
          />
          <div className="mt-2 flex space-x-4">
            <Button 
              onClick={playAudio} 
              variant="outline" 
              className="flex-1 border-blue-600 text-blue-200 hover:bg-blue-900/40"
            >
              Play Again
            </Button>
            <Button 
              onClick={() => window.open(audioUrl, '_blank')}
              variant="outline"
              className="flex-1 border-blue-600 text-blue-200 hover:bg-blue-900/40"
            >
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
