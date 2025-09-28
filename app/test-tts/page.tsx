'use client';

import React, { useState, useRef } from 'react';
import styles from './TestTTS.module.css';

// Define types for our state
type TabType = 'setup' | 'synthesize';
type ResultType = 'success' | 'error' | null;

interface ResultData {
  message: string;
  voiceName?: string;
  details?: string;
}

interface SetupValues {
  voice: string;
  language: string;
  speed: string;
  audioEncoding: string;
}

interface ResponseData {
  success?: boolean;
  error?: string;
  details?: string;
  audioUrl?: string;
  message?: string;
  apiResponse?: any;
  sentSettings?: {
    voice: string;
    language: string;
    speed: number;
    audioEncoding: string;
  };
}

export default function TestTTSPage() {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('setup');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [resultType, setResultType] = useState<ResultType>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [setupValues, setSetupValues] = useState<SetupValues>({
    voice: 'am_fenrir',
    language: 'en-us',
    speed: '1.0',
    audioEncoding: 'wav'
  });

  const [inputText, setInputText] = useState<string>(
    'Hello, this is a test of the HeadTTS integration. If you can hear this message, the text-to-speech system is working correctly.'
  );

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle tab switching
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
  };
  // Handle setup form submission
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setResultType(null);
    
    try {
      const response = await fetch('/api/test-tts-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'setup',
          voice: setupValues.voice,
          language: setupValues.language,
          speed: parseFloat(setupValues.speed),
          audioEncoding: setupValues.audioEncoding
        })
      });
      
      const data = await response.json() as ResponseData;
      setDebugInfo(JSON.stringify(data, null, 2));
      
      if (response.ok) {
        setResult({
          message: 'Voice configuration request completed!',
          voiceName: getVoiceDisplayName(setupValues.voice),
          details: data.message || 'Request processed successfully'
        });
        setResultType('success');
        
        // Auto-switch to synthesize tab after success
        setTimeout(() => {
          switchTab('synthesize');
        }, 2000);
      } else {
        setResult({
          message: `Error: ${data.error || 'Unknown error'}`,
          details: data.details || ''
        });
        setResultType('error');
      }
    } catch (error: any) {
      setResult({
        message: `Error: ${error.message || 'Request failed'}`,
      });
      setResultType('error');
      setDebugInfo(error.stack || error.toString());
    } finally {
      setIsLoading(false);
    }
  };

  // Handle synthesize form submission
  const handleSynthesizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      alert('Please enter some text to convert');
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    setResultType(null);
    setAudioUrl('');
    
    try {
      const response = await fetch('/api/test-tts-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'synthesize',
          text: inputText
        })
      });
      
      const data = await response.json() as ResponseData;
      setDebugInfo(JSON.stringify(data, null, 2));
      
      if (response.ok) {
        setResult({
          message: 'Audio generated successfully!'
        });
        setResultType('success');
        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
        }
      } else {
        setResult({
          message: `Error: ${data.error || 'Unknown error'}`,
          details: data.details || ''
        });
        setResultType('error');
      }
    } catch (error: any) {
      setResult({
        message: `Error: ${error.message || 'Request failed'}`,
      });
      setResultType('error');
      setDebugInfo(error.stack || error.toString());
    } finally {
      setIsLoading(false);
    }
  };

  // Reset results
  const handleReset = () => {
    setResult(null);
    setResultType(null);
    setDebugInfo('');
    setAudioUrl('');
  };

  // Helper function to get display name for voice
  const getVoiceDisplayName = (voiceId: string): string => {
    const voiceNames: Record<string, string> = {
      'am_fenrir': 'Fenrir (Male)',
      'af_bella': 'Bella (Female)',
      'am_michael': 'Michael (Male)',
      'bm_george': 'George (Male)',
      'bf_lily': 'Lily (Female)',
      'af_nova': 'Nova (Female)'
    };
    
    return voiceNames[voiceId] || voiceId;
  };

  async function handleSynthesize(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAudioUrl('');
    try {
      const res = await fetch("/api/test-tts-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text })
      });
      if (!res.ok) throw new Error("TTS API error");
      const data = await res.json();
      if (!data.audio) throw new Error("No audio returned");
      // Decode base64 to Blob
      const audioBuffer = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      const blob = new Blob([audioBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  function handlePlay() {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }

  function handleDownload() {
    if (audioUrl) {
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = "tts-audio.wav";
      a.click();
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HeadTTS API Tester</h1>
      <p className={styles.subtitle}>
        Test the HeadTTS API with separate setup and synthesize operations as per official docs.
      </p>
      
      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'setup' ? styles.active : ''}`}
            onClick={() => switchTab('setup')}
          >
            1. Configure Voice (Setup)
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'synthesize' ? styles.active : ''}`}
            onClick={() => switchTab('synthesize')}
          >
            2. Convert Text (Synthesize)
          </button>
        </div>
        
        <div className={styles.tabContent}>
          {activeTab === 'setup' && (
            <div className={styles.tabPanel}>
              <h2>Configure Voice Settings</h2>
              <p>Configure the voice settings on the HeadTTS server. These settings will persist for subsequent synthesize requests.</p>
              
              <form onSubmit={handleSetupSubmit}>
                <div className={styles.formRow}>
                  <label htmlFor="setup-voice">Voice:</label>
                  <select
                    id="setup-voice"
                    value={setupValues.voice}
                    onChange={(e) => setSetupValues({...setupValues, voice: e.target.value})}
                    className={styles.fullWidth}
                  >
                    <option value="am_fenrir">Fenrir (Male)</option>
                    <option value="af_bella">Bella (Female)</option>
                    <option value="am_michael">Michael (Male)</option>
                    <option value="bm_george">George (Male)</option>
                    <option value="bf_lily">Lily (Female)</option>
                    <option value="af_nova">Nova (Female)</option>
                  </select>
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="setup-language">Language:</label>
                  <select
                    id="setup-language"
                    value={setupValues.language}
                    onChange={(e) => setSetupValues({...setupValues, language: e.target.value})}
                    className={styles.fullWidth}
                  >
                    <option value="en-us">English (US)</option>
                  </select>
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="setup-speed">Speech Speed:</label>
                  <select
                    id="setup-speed"
                    value={setupValues.speed}
                    onChange={(e) => setSetupValues({...setupValues, speed: e.target.value})}
                    className={styles.fullWidth}
                  >
                    <option value="0.8">Slow (0.8x)</option>
                    <option value="1.0">Normal (1.0x)</option>
                    <option value="1.2">Fast (1.2x)</option>
                    <option value="1.5">Very Fast (1.5x)</option>
                  </select>
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="setup-audio-encoding">Audio Format:</label>
                  <select
                    id="setup-audio-encoding"
                    value={setupValues.audioEncoding}
                    onChange={(e) => setSetupValues({...setupValues, audioEncoding: e.target.value})}
                    className={styles.fullWidth}
                  >
                    <option value="wav">WAV</option>
                    <option value="pcm">PCM (Raw)</option>
                  </select>
                </div>
                
                <div className={styles.actions}>
                  <button 
                    type="submit" 
                    className={styles.setupButton}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Applying Configuration...' : 'Apply Voice Configuration'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {activeTab === 'synthesize' && (
            <div className={styles.tabPanel}>
              <h2>Convert Text to Speech</h2>
              <p>Convert text to speech using the previously configured voice settings.</p>
              
              <form onSubmit={handleSynthesizeSubmit}>
                <div className={styles.formRow}>
                  <label htmlFor="synthesize-text">Text to convert to speech:</label>
                  <textarea
                    id="synthesize-text"
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className={styles.fullWidth}
                  />
                </div>
                
                <div className={styles.actions}>
                  <button 
                    type="submit"
                    className={styles.primaryButton} 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Generating...' : 'Generate Audio'}
                  </button>
                  <button 
                    type="button" 
                    className={styles.secondaryButton}
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
          {result && (
          <div className={`${styles.result} ${resultType === 'success' ? styles.success : styles.error}`}>
            <div className={styles.resultContent}>
              <p>{result.message}</p>
              {resultType === 'success' && result.voiceName && (
                <p>Voice: <strong>{result.voiceName}</strong></p>
              )}
              {resultType === 'success' && activeTab === 'setup' && (
                <p>You can now go to the Synthesize tab to generate speech.</p>
              )}
              {resultType === 'success' && result.details && (
                <p><em>{result.details}</em></p>
              )}
              {resultType === 'error' && result.details && (
                <p>{result.details}</p>
              )}
            </div>
            
            {audioUrl && (
              <>
                <audio ref={audioRef} controls className={styles.audioPlayer}>
                  <source src={audioUrl} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div className={styles.actions}>
                  <button 
                    className={styles.primaryButton}
                    onClick={() => window.open(audioUrl, '_blank')}
                  >
                    Download Audio
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {debugInfo && (
          <div className={styles.debugContainer}>
            <h3>Debug Information</h3>
            <pre className={styles.debugInfo}>{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
