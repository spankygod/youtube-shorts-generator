'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from '@/app/components/ProgressBar';
import { Modal } from '@/app/components/Modal';

// Define a simple MediaAsset type to replace the missing import
type MediaAsset = {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'music';
  tags?: string[];
  duration?: number;      // Duration in seconds (for music assets)
  trimmedDuration?: number; // Pre-trimmed duration if applicable (for music assets)
};

type GeneratedShort = {
  id: string;
  script: string;
  outputPath: string;
  permanentPath: string;
  jobId?: string; // Optional jobId for tracking and debugging
};

export default function ShortsPage() {  // All state declarations first
  const [subject, setSubject] = useState('');
  const [numberOfShorts, setNumberOfShorts] = useState(1);
  const [numberOfFacts, setNumberOfFacts] = useState(5);
  const [language, setLanguage] = useState<'English' | 'Filipino' | 'GenZ' | 'brainrot'>('English');
  const [storyStyle, setStoryStyle] = useState('reddit');
  const [customFact, setCustomFact] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null); // Track currently playing music
  const [previewVolume, setPreviewVolume] = useState<number>(0.5); // Volume control for preview (0-1)
  const [mood, setMood] = useState<string>('surprise'); // Single mood selection with default to surprise
  const [shortDuration, setShortDuration] = useState<'15-20' | '20-45' | '30-60'>('15-20');
  const [voice, setVoice] = useState<string>('af_jessica');  // Default to American Female Jessica voice
  const [speed, setSpeed] = useState<string>('1.0');  // Default to normal speed
  // States for dynamically loaded assets
  const [videoAssets, setVideoAssets] = useState<MediaAsset[]>([]);
  const [musicAssets, setMusicAssets] = useState<MediaAsset[]>([]);
  const [filteredVideoAssets, setFilteredVideoAssets] = useState<MediaAsset[]>([]);
  const [filteredMusicAssets, setFilteredMusicAssets] = useState<MediaAsset[]>([]);
  const [videoSearch, setVideoSearch] = useState('');
  const [musicSearch, setMusicSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedShorts, setGeneratedShorts] = useState<GeneratedShort[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState<{title: string, description: string}|null>(null);
  const [descLoading, setDescLoading] = useState(false);
  // Removed showAdvanced and activeTab, all options are now always visible
  
  // Audio player ref for music preview
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Fetch video/music assets from API on mount
  useEffect(() => {
    async function fetchAssets() {
      try {
        const [videosRes, musicRes] = await Promise.all([
          fetch('/api/assets?type=video'),
          fetch('/api/assets?type=music'),
        ]);
        const videos = await videosRes.json();
        const music = await musicRes.json();
        setVideoAssets(videos);
        setMusicAssets(music);
        setFilteredVideoAssets(videos);
        setFilteredMusicAssets(music);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load assets', e);
      }    }
    fetchAssets();
  }, []);

  // Helper function to filter music assets based on search text and duration
  const filterMusicAssets = (assets: MediaAsset[], searchText: string, duration: string) => {
    // First filter by search text
    let filtered = assets.filter(asset =>
      asset.name.toLowerCase().includes(searchText.toLowerCase())
    );
      // Then filter or highlight based on duration requirements
    if (duration === '30-60' && filtered.length > 0) {
      // Sort the assets to prioritize those that are appropriately sized or pre-trimmed
      filtered.sort((a, b) => {
        // If either asset is already trimmed to 60 seconds, prioritize it
        if (a.trimmedDuration === 60 && b.trimmedDuration !== 60) return -1;
        if (b.trimmedDuration === 60 && a.trimmedDuration !== 60) return 1;
        
        // If one asset is shorter than or equal to 60 seconds, prioritize it
        if (a.duration && b.duration) {
          if (a.duration <= 60 && b.duration > 60) return -1;
          if (b.duration <= 60 && a.duration > 60) return 1;
        }
        
        // Default behavior: keep original order
        return 0;
      });
    }
    
    return filtered;
  };

  // Filter video/music assets by search
  useEffect(() => {
    setFilteredVideoAssets(
      videoAssets.filter(asset =>
        asset.name.toLowerCase().includes(videoSearch.toLowerCase())
      )
    );
  }, [videoSearch, videoAssets]);

  useEffect(() => {
    setFilteredMusicAssets(
      filterMusicAssets(musicAssets, musicSearch, shortDuration)
    );
  }, [musicSearch, musicAssets, shortDuration]);// Generation progress tracking
    // Music preview functions
  const handlePlayMusic = (asset: MediaAsset, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting/deselecting the music when clicking play button
    event.preventDefault(); // Prevent form submission
    
    // If the same music is currently playing, stop it
    if (playingMusicId === asset.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setPlayingMusicId(null);
      return;
    }
    
    // Stop any currently playing music
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    
    // Start playing the selected music
    const audioPath = asset.path.startsWith('/') ? asset.path : `/assets/music/${asset.path}`;
    audioPlayerRef.current = new Audio(audioPath);
    audioPlayerRef.current.volume = previewVolume; // Set to 50% volume
    
    // Add event listener to reset playingMusicId when audio ends
    audioPlayerRef.current.onended = () => {
      setPlayingMusicId(null);
    };
    
    audioPlayerRef.current.play().catch(error => {
      console.error('Error playing audio:', error);
      setPlayingMusicId(null);
    });
    
    setPlayingMusicId(asset.id);
  };
  
  // Stop any playing music when component unmounts
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const [progressStatus, setProgressStatus] = useState<{ current: number; total: number; step: string }>({
    current: 0,
    total: 0,
    step: ''
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject) {
      alert("Please enter a subject");
      return;
    }

    if (selectedVideos.length === 0) {
      alert("Please select at least one video");
      return;
    }
    
    setIsLoading(true);
    setProgressStatus({
      current: 0,
      total: numberOfShorts,
      step: 'Starting generation'
    });
    
    try {
      const shortsData: GeneratedShort[] = [];
      
      // Generate shorts sequentially for better stability
      for (let i = 0; i < numberOfShorts; i++) {
        setProgressStatus({
          current: i + 1,
          total: numberOfShorts,
          step: `Generating short ${i + 1} of ${numberOfShorts}`
        });
        
        // Call the unified API endpoint that handles the entire process
        const response = await fetch('/api/generate-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            numberOfFacts,
            storyStyle,
            language,
            moods: [mood], // Use array with single mood for backward compatibility with API
            shortDuration,
            selectedVideos,
            selectedMusic,
            voice,  // Using full voice ID (e.g. am_fenrir)
            speed: parseFloat(speed)   // Convert speed string to number
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate short');
        }
        
        const data = await response.json();
        
        shortsData.push({
          id: `${i + 1}`,
          script: data.script,
          outputPath: data.outputPath || '',
          permanentPath: data.permanentPath,
          jobId: data.jobId
        });
        // Update the UI immediately after each short is done
        setGeneratedShorts([...shortsData]);
      }
      
      // Open the modal to display the generated shorts
      setIsModalOpen(true);
      setCurrentShortIndex(0);
      
    } catch (error: any) {
      console.error('Error generating shorts:', error);
      alert(`Error: ${error.message || 'An unknown error occurred'}`);
    } finally {
      setIsLoading(false);
      setProgressStatus({
        current: numberOfShorts,
        total: numberOfShorts,
        step: 'Generation complete'
      });
    }
  };

  // Handler to open folder in OS file explorer
  async function handleOpenFolder() {
    const videoPath = generatedShorts[currentShortIndex].permanentPath;
    try {
      const res = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: videoPath })
      });
      if (!res.ok) throw new Error('Failed to open folder');
      window.alert('Folder opened in file explorer');
    } catch (e) {
      window.alert('Could not open folder');
    }
  }

  // Handler to generate description using Ollama
  async function handleGenerateDescription() {
    setDescLoading(true);
    setGeneratedDescription(null);
    try {
      const script = generatedShorts[currentShortIndex].script;
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script })
      });
      if (!res.ok) throw new Error('Failed to generate description');
      const data = await res.json();
      setGeneratedDescription(data);
      setDescriptionModalOpen(true);
    } catch (e) {
      window.alert('Failed to generate description');
    } finally {
      setDescLoading(false);
    }
  }

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6 min-h-screen bg-black">
      <div className="max-w-4xl mx-auto w-full bg-[#18181b] rounded-2xl shadow-2xl p-6 md:p-10 border border-[#232326]">
        <h1 className="text-2xl font-bold mb-6 text-white">Create YouTube Shorts</h1>
        <div className="bg-[#18181b] rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Story Style Choice Box at the Top */}
          <div className="mb-0 pb-6 border-b border-[#232326]">
            <Label className="mb-2 block text-lg font-semibold text-white">Story Style</Label>            <div className="flex gap-4 flex-wrap">
              {['reddit', 'factual', 'educational', 'factual-educational'].map((style) => {
                const unifiedGradient = 'from-pink-500 via-purple-500 to-indigo-500';
                const selected = storyStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    className={`px-4 py-2 h-11 text-base rounded-2xl border-2 transition-all duration-150 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60 shadow-md relative overflow-hidden min-w-[100px] flex flex-col items-center
                      ${selected
                        ? `text-white border-transparent scale-105 ring-2 ring-primary/70 bg-gradient-to-r ${unifiedGradient} bg-[length:200%_200%] bg-[center_center]`
                        : 'bg-[#232326] text-white border-[#27272a] hover:bg-[#18181b] hover:border-primary/60 opacity-80 hover:opacity-100'}
                    `}
                    onClick={() => setStoryStyle(style)}
                    aria-pressed={selected}
                  >
                    <span className="relative z-10 font-bold">{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>          {/* Subject, Number of Facts (conditional), Number of Shorts in 1 line */}
          <div className={`grid grid-cols-1 ${['factual', 'educational', 'factual-educational', 'reddit'].includes(storyStyle) ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 pb-6 border-b border-[#232326] items-end mt-8`}>
            <div className="col-span-1 md:col-span-1 flex flex-col">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject for your shorts"
                className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-4 h-14 font-semibold mt-4"
              />
            </div>            {storyStyle === 'factual' && (
              <div className="col-span-1 flex flex-col">
                <Label htmlFor="numberOfFacts"># Facts/Short</Label>
                <Input
                  id="numberOfFacts"
                  type="number"
                  min={1}
                  max={10}
                  value={numberOfFacts}
                  onChange={(e) => setNumberOfFacts(parseInt(e.target.value))}
                  className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-4 h-14 font-semibold mt-4"
                />
              </div>
            )}
            {!['factual', 'educational', 'factual-educational', 'reddit'].includes(storyStyle) && (
              <div className="col-span-1 flex flex-col">
                <Label htmlFor="numberOfFacts"># Facts/Short</Label>
                <Input
                  id="numberOfFacts"
                  type="number"
                  min={1}
                  max={10}
                  value={numberOfFacts}
                  onChange={(e) => setNumberOfFacts(parseInt(e.target.value))}
                  className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-4 h-14 font-semibold mt-4"
                />
              </div>
            )}
            <div className="col-span-1 flex flex-col">
              <Label htmlFor="numberOfShorts"># Shorts</Label>
              <Input
                id="numberOfShorts"
                type="number"
                min={1}
                max={10}
                value={numberOfShorts}
                onChange={(e) => setNumberOfShorts(parseInt(e.target.value))}
                className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-4 h-14 font-semibold mt-4"
              />
            </div>
          </div>
            
          <div className="pb-6 border-b border-[#232326]">
            <Label className="mb-2 block text-lg font-semibold text-white">Language</Label>
            <div className="flex gap-4">
              {['English', 'Filipino', 'GenZ', 'brainrot'].map((lang) => {
                const unifiedGradient = 'from-pink-500 via-purple-500 to-indigo-500';
                const selected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`px-4 py-2 h-11 text-base rounded-2xl border-2 transition-all duration-150 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60 shadow-md relative overflow-hidden min-w-[100px] flex flex-col items-center
                      ${selected
                        ? `text-white border-transparent scale-105 ring-2 ring-primary/70 bg-gradient-to-r ${unifiedGradient} bg-[length:200%_200%] bg-[center_center]`
                        : 'bg-[#232326] text-white border-[#27272a] hover:bg-[#18181b] hover:border-primary/60 opacity-80 hover:opacity-100'}
                    `}
                    onClick={() => setLanguage(lang as any)}
                    aria-pressed={selected}
                  >
                    <span className="relative z-10 font-bold">{lang === 'GenZ' ? 'Gen Z' : lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>
            
          <div className="mt-4 space-y-6 pb-6 border-b border-[#232326]">          {/* Mood as single choice box */}
            <div className="pb-6 border-b border-[#232326]">
              <Label className="mb-2 block text-lg font-semibold text-white">Mood</Label>
              <div className="flex gap-4 flex-wrap">
                {['humor', 'surprise', 'mindblowing', 'fear'].map((m) => {
                  const unifiedGradient = 'from-pink-500 via-purple-500 to-indigo-500';
                  const selected = mood === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`px-4 py-2 h-11 text-base rounded-2xl border-2 transition-all duration-150 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60 shadow-md relative overflow-hidden min-w-[100px] flex flex-col items-center
                        ${selected
                          ? `text-white border-transparent scale-105 ring-2 ring-primary/70 bg-gradient-to-r ${unifiedGradient} bg-[length:200%_200%] bg-[center_center]`
                          : 'bg-[#232326] text-white border-[#27272a] hover:bg-[#18181b] hover:border-primary/60 opacity-80 hover:opacity-100'}
                      `}
                      onClick={() => setMood(m)}
                      aria-pressed={selected}
                    >
                      <span className="relative z-10 font-bold">{m.charAt(0).toUpperCase() + m.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Voice Selection */}
            <div className="pb-6 border-b border-[#232326]">
              <Label className="mb-2 block text-lg font-semibold text-white">Voice</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger className="w-full rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white h-12">
                      <SelectValue placeholder="Select voice" />                    </SelectTrigger>                      <SelectContent className="bg-[#18181b] border-[#27272a]">
                        <SelectItem value="af_jessica">Jessica (American Female)</SelectItem>
                        <SelectItem value="af_bella">Bella (American Female)</SelectItem>
                        <SelectItem value="af_nova">Nova (American Female)</SelectItem>
                        <SelectItem value="af_sarah">Sarah (American Female)</SelectItem>
                        <SelectItem value="am_fenrir">Fenrir (American Male)</SelectItem>
                        <SelectItem value="am_michael">Michael (American Male)</SelectItem>
                        <SelectItem value="am_adam">Adam (American Male)</SelectItem>
                        <SelectItem value="am_eric">Eric (American Male)</SelectItem>
                        <SelectItem value="af_sarah">Sarah (American Female)</SelectItem>
                        <SelectItem value="bf_lily">Lily (British Female)</SelectItem>
                        <SelectItem value="bf_emma">Emma (British Female)</SelectItem>
                        <SelectItem value="bm_george">George (British Male)</SelectItem>
                        <SelectItem value="bm_daniel">Daniel (British Male)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">                  <Select value={speed} onValueChange={setSpeed}>
                    <SelectTrigger className="w-full rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white h-12">
                      <SelectValue placeholder="Select speed" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-[#27272a]">
                      <SelectItem value="0.8">Slow (0.8x)</SelectItem>
                      <SelectItem value="1.0">Normal (1.0x)</SelectItem>
                      <SelectItem value="1.2">Fast (1.2x)</SelectItem>
                      <SelectItem value="1.5">Very Fast (1.5x)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Shorts Duration as choice box */}
            <div className="pb-6 border-b border-[#232326]">
              <Label className="mb-2 block text-lg font-semibold text-white">Short Duration</Label>
              <div className="flex gap-4 flex-wrap">
                {[ 
                  { value: '15-20', label: '15-20 sec', info: 'Short (15-20s)' },
                  { value: '20-45', label: '20-45 sec', info: 'Medium (20-45s)' },
                  { value: '30-60', label: '30-60 sec', info: 'Long (30-60s)' },
                ].map((d) => {
                  const unifiedGradient = 'from-pink-500 via-purple-500 to-indigo-500';
                  const selected = shortDuration === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      className={`px-8 py-4 h-16 text-lg rounded-2xl border-2 transition-all duration-150 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60 shadow-md relative overflow-hidden flex flex-col justify-center items-center min-w-[160px] text-center whitespace-normal break-words
                        ${selected
                          ? `text-white border-transparent scale-105 ring-2 ring-primary/70 bg-gradient-to-r ${unifiedGradient} bg-[length:200%_200%] bg-[center_center]`
                          : 'bg-[#232326] text-white border-[#27272a] hover:bg-[#18181b] hover:border-primary/60 opacity-80 hover:opacity-100'}
                      `}
                      onClick={() => setShortDuration(d.value as any)}
                      aria-pressed={selected}
                    >
                      <span className="relative z-10 font-bold break-words text-center w-full flex justify-center">{d.label}</span>
                      <span className="relative z-10 text-xs opacity-80 break-words text-center w-full flex justify-center">{d.info}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Shorts as checkbox removed */}
          </div>
            
            {/* Video Selection (inside form) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 pb-6 border-b border-[#232326]"
            >
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Select Videos</h2>
                  {selectedVideos.length > 0 && (
                    <span className="ml-2 text-sm text-primary font-semibold">{selectedVideos.length} selected</span>
                  )}
                </div>
                <Input
                  id="videoSearch"
                  type="text"
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="Search videos by name or tag"
                  className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-3 h-12 font-semibold w-72"
                />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                <AnimatePresence>
                  {filteredVideoAssets.length === 0 ? (
                    <motion.p
                      className="text-center py-10 text-muted-foreground min-w-[200px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      No videos found. Add videos in the Assets section.
                    </motion.p>
                  ) : (
                    filteredVideoAssets.map((asset, index) => (
                      <motion.button
                        type="button"
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group border rounded-lg p-3 flex flex-col items-start gap-2 cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px] max-w-[180px] ${selectedVideos.includes(asset.id) ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/40' : 'hover:border-primary/60 hover:bg-accent/30'}`}
                        onClick={() => {
                          if (selectedVideos.includes(asset.id)) {
                            setSelectedVideos(selectedVideos.filter(id => id !== asset.id));
                          } else {
                            setSelectedVideos([...selectedVideos, asset.id]);
                          }
                        }}
                        aria-pressed={selectedVideos.includes(asset.id)}
                      >
                        <div className="h-32 w-full bg-gray-100 dark:bg-gray-700 mb-2 rounded flex items-center justify-center overflow-hidden">
                          {asset.path && asset.path.endsWith('.mp4') ? (
                            <video
                              src={asset.path.startsWith('/') ? asset.path : `/assets/videos/${asset.path}`}
                              className="h-full w-full object-cover"
                              controls={false}
                              muted
                              loop
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <span className="text-2xl text-muted-foreground">🎬</span>
                          )}
                        </div>
                        <div className="text-sm font-medium truncate w-full">{asset.name}</div>
                        {selectedVideos.includes(asset.id) && (
                          <span className="text-xs text-primary font-semibold">Selected</span>
                        )}
                      </motion.button>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Music Selection (inside form) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4 pb-6 border-b border-[#232326]"
            >
              <div className="flex items-center justify-between mb-2 gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Select Music</h2>
                  {selectedMusic.length > 0 && (
                    <span className="ml-2 text-sm text-primary font-semibold">{selectedMusic.length} selected</span>
                  )}
                </div>
                <Input
                  id="musicSearch"
                  type="text"
                  value={musicSearch}
                  onChange={(e) => setMusicSearch(e.target.value)}
                  placeholder="Search music by name or tag"
                  className="rounded-xl border-2 border-[#27272a] bg-[#18181b] text-white focus:border-primary/60 focus:ring-primary/60 text-lg py-3 h-12 font-semibold w-72"
                />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                <AnimatePresence>
                  {filteredMusicAssets.length === 0 ? (
                    <motion.p
                      className="text-center py-10 text-muted-foreground min-w-[200px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      No music found. Add music in the Assets section.
                    </motion.p>
                  ) : (
                    filteredMusicAssets.map((asset, index) => (
                      <motion.button
                        type="button"
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}                        className={`group border rounded-lg p-3 flex flex-col items-start gap-2 cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px] max-w-[180px] ${
                          selectedMusic.includes(asset.id) 
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/40' 
                            : shortDuration === '30-60' && ((asset.trimmedDuration === 60) || (asset.duration && asset.duration <= 60))
                              ? 'border-green-500/50 hover:border-primary/60 hover:bg-accent/30' 
                              : 'hover:border-primary/60 hover:bg-accent/30'
                        }`}
                        onClick={() => {
                          if (selectedMusic.includes(asset.id)) {
                            setSelectedMusic(selectedMusic.filter(id => id !== asset.id));
                          } else {
                            setSelectedMusic([...selectedMusic, asset.id]);
                          }
                        }}
                        aria-pressed={selectedMusic.includes(asset.id)}
                      >                        <div className="h-16 w-full bg-gray-100 dark:bg-gray-700 mb-2 rounded flex items-center justify-center overflow-hidden relative">
                          {asset.path && asset.path.endsWith('.mp4') ? (
                            <video
                              src={asset.path.startsWith('/') ? asset.path : `/assets/music/${asset.path}`}
                              className="h-full w-full object-cover"
                              controls={false}
                              muted
                              loop
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <span className="text-3xl text-muted-foreground">🎵</span>
                          )}
                            {/* Play/Pause button overlay */}
                          <button
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-50"
                            onClick={(e) => handlePlayMusic(asset, e)}
                            onMouseDown={(e) => e.preventDefault()}
                            type="button" 
                            aria-label={playingMusicId === asset.id ? "Pause music" : "Play music"}
                          >
                            <span className={`text-white text-2xl ${playingMusicId === asset.id ? 'animate-pulse' : ''}`}>
                              {playingMusicId === asset.id ? '⏹️' : '▶️'}
                            </span>
                          </button>
                        </div>                        <div className="flex justify-between items-center w-full">
                          <div className="text-sm font-medium truncate max-w-[80%]">{asset.name}</div>
                          {playingMusicId === asset.id && (
                            <span className="text-xs bg-primary/80 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                              Playing
                            </span>
                          )}
                        </div>                        <div className="flex justify-between items-center w-full text-xs text-gray-400">
                          {selectedMusic.includes(asset.id) && (
                            <span className="text-xs text-primary font-semibold">Selected</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => handlePlayMusic(asset, event)}
                          className="mt-2 text-xs text-primary font-semibold underline"
                          onMouseDown={(event) => event.preventDefault()} 
                        >
                          {playingMusicId === asset.id ? 'Stop' : 'Preview'}
                        </button>
                      </motion.button>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>            <div className="pt-4 flex flex-col items-center gap-4">
              {isLoading && progressStatus.total > 0 && (
                <div className="w-full max-w-xl mb-4">
                  <ProgressBar 
                    current={progressStatus.current} 
                    total={progressStatus.total} 
                    step={progressStatus.step}
                  />
                </div>
              )}
              <motion.div
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-xs"
              >
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-6 text-2xl font-extrabold rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-2xl hover:opacity-90 transition min-h-[72px]"
                >
                  {isLoading ? 'Processing...' : 'Generate Shorts'}
                </Button>
              </motion.div>
            </div>
        </form>      </div>
      
      {/* Button to view previously generated shorts if any exist */}
      {generatedShorts.length > 0 && !isModalOpen && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2 text-lg"
          >
            <span>View Generated Shorts</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </Button>
        </div>
      )}
      
      {/* Shorts Popup Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generated YouTube Shorts"
        maxWidth="max-w-6xl"
      >
        <div className="p-6">
          {generatedShorts.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="bg-[#232326] rounded-full px-3 py-1 text-sm font-semibold">
                    {currentShortIndex + 1} of {generatedShorts.length}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentShortIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentShortIndex === 0}
                    variant="outline"
                    className="text-white"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentShortIndex(prev => Math.min(generatedShorts.length - 1, prev + 1))}
                    disabled={currentShortIndex === generatedShorts.length - 1}
                    variant="outline"
                    className="text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
              
              <motion.div 
                key={generatedShorts[currentShortIndex].id} 
                className="border border-[#232326] rounded-xl p-6 bg-[#18181b]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-pink-500 to-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                    {generatedShorts[currentShortIndex].id}
                  </span>
                  <span>YouTube Short</span>
                  <span className="ml-auto text-sm bg-[#232326] px-3 py-1 rounded-full">
                    Job ID: {generatedShorts[currentShortIndex].jobId}
                  </span>
                </h3>
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="w-full lg:w-1/2">
                    <h4 className="text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <span className="text-primary">📝</span> Generated Script:
                    </h4>
                    <div className="bg-[#232326] rounded-lg p-4 text-sm text-gray-200 h-[300px] overflow-y-auto mb-4">
                      {generatedShorts[currentShortIndex].script}
                    </div>
                    <div className="bg-[#232326]/50 rounded-lg p-4 text-xs text-gray-400">
                      <h5 className="font-medium mb-1">Generation Details:</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <span className="font-semibold">Language:</span> {language}
                        </div>
                        <div>
                          <span className="font-semibold">Style:</span> {storyStyle}
                        </div>
                        <div>
                          <span className="font-semibold">Duration:</span> {shortDuration} seconds
                        </div>
                        <div>
                          <span className="font-semibold">Voice:</span> {voice}
                        </div>
                        <div>
                          <span className="font-semibold">Speed:</span> {speed}x
                        </div>
                        <div>
                          <span className="font-semibold">Mood:</span> {mood}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/2">
                    <h4 className="text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <span className="text-primary">🎬</span> Generated Video:
                    </h4>
                    <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-lg border border-[#2a2a2d]">
                      <video
                        src={generatedShorts[currentShortIndex].permanentPath}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                        poster="/assets/video-poster.png"
                      />
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={handleOpenFolder}
                        className="bg-[#232326] hover:bg-[#2a2a2d] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                      >
                        <span>Open Folder</span>
                      </button>
                      <button
                        onClick={handleGenerateDescription}
                        disabled={descLoading}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
                      >
                        <span>{descLoading ? 'Generating...' : 'Generate Description'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </Modal>

      {/* Description Modal */}
      <Modal
        isOpen={descriptionModalOpen}
        onClose={() => setDescriptionModalOpen(false)}
        title="Viral YouTube Shorts Title & Description"
        maxWidth="max-w-lg"
      >
        <div className="p-4">
          {generatedDescription ? (
            <>
              <div className="mb-2">
                <span className="font-bold">Title:</span>
                <div className="flex items-center gap-2 bg-[#232326] rounded px-2 py-1 mt-1">
                  <span className="flex-1 break-words">{generatedDescription.title}</span>
                  <button onClick={() => navigator.clipboard.writeText(generatedDescription.title)} title="Copy title">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                  </button>
                </div>
              </div>
              <div>
                <span className="font-bold">Description:</span>
                <div className="flex items-center gap-2 bg-[#232326] rounded px-2 py-1 mt-1">
                  <span className="flex-1 break-words">{generatedDescription.description}</span>
                  <button onClick={() => navigator.clipboard.writeText(generatedDescription.description)} title="Copy description">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400">No description generated yet.</div>
          )}
        </div>
      </Modal>
      </div>
    </main>
  );
}
