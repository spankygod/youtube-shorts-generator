'use client';

import { useState, FormEvent } from 'react';

export default function AssetsPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [assetType, setAssetType] = useState<'video' | 'music'>('video');
  const [duration, setDuration] = useState<'full' | '60sec' | '3min' | '5min'>('full');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentAssets, setRecentAssets] = useState<Array<{
    path: string;
    title: string;
    thumbnail?: string;
    type: 'video' | 'music';
  }>>([]);

  // Add storage path information
  const getStoragePath = () => {
    if (assetType === 'video') {
      return '/public/assets/videos/';
    } else {
      return '/public/assets/music/';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setSuccess('');
    
    // Basic URL validation
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call our API to download the YouTube content
      const response = await fetch('/api/download-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          type: assetType,
          filename: customFilename,
          duration: duration
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to download');
      }
      
      setSuccess(data.message || `Successfully downloaded and saved as "${data.path}"`);
      
      // Add the new asset to the recent assets list
      if (Array.isArray(data.paths)) {
        // Multiple files were created (trimmed clips)
        const newAssets = data.paths.map((path: string, index: number) => ({
          path,
          title: `${data.title} (Part ${index + 1})`,
          thumbnail: data.thumbnail,
          type: assetType
        }));
        setRecentAssets(prev => [...newAssets, ...prev.slice(0, Math.max(0, 5 - newAssets.length))]);
      } else {
        // Single file was created
        setRecentAssets(prev => [{
          path: data.path,
          title: data.title,
          thumbnail: data.thumbnail,
          type: assetType
        }, ...prev.slice(0, 4)]); // Keep only the 5 most recent
      }
      
      setYoutubeUrl('');
      setCustomFilename('');
    } catch (err) {
      setError(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-4">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Add Assets</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* YouTube URL Input */}
          <div className="space-y-2">
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              YouTube Link
            </label>
            <input
              type="text"
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
            />
          </div>
          
          {/* Custom Filename Input */}
          <div className="space-y-2">
            <label htmlFor="customFilename" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Filename (optional)
            </label>
            <input
              type="text"
              id="customFilename"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="Enter a custom filename (no extension needed)"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave blank to use the original YouTube video title
            </p>
          </div>
          
          {/* Duration Selection */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Duration</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div 
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  duration === 'full' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setDuration('full')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Full</span>
                  {duration === 'full' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Download entire video
                </p>
              </div>
              
              <div 
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  duration === '60sec' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setDuration('60sec')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">60 Seconds</span>
                  {duration === '60sec' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Split into 60s clips
                </p>
              </div>
              
              <div 
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  duration === '3min' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setDuration('3min')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">3 Minutes</span>
                  {duration === '3min' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Split into 3min clips
                </p>
              </div>
              
              <div 
                className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                  duration === '5min' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setDuration('5min')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">5 Minutes</span>
                  {duration === '5min' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Split into 5min clips
                </p>
              </div>
            </div>
          </div>
          
          {/* Asset Type Selection */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Asset Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  assetType === 'video' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setAssetType('video')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-blue-500">
                    {assetType === 'video' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                  </div>
                  <span className="font-medium">Video</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 pl-8">
                  Download as video for background
                </p>
              </div>
              
              <div 
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  assetType === 'music' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => setAssetType('music')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-blue-500">
                    {assetType === 'music' && <div className="w-3 h-3 bg-blue-500 rounded-full"></div>}
                  </div>
                  <span className="font-medium">Music</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 pl-8">
                  Download as audio for background music
                </p>
              </div>
            </div>
          </div>
          
          {/* Storage Location Info */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Storage Location
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Assets will be saved to: <span className="font-mono bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">{getStoragePath()}</span>
            </p>
            {duration !== 'full' && assetType === 'video' && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-yellow-600 dark:text-yellow-400">Note:</span> Videos will be split into multiple files with sequential numbering (e.g., video1.mp4, video2.mp4, etc.)
              </p>
            )}
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <div className="flex">
                <div className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
              <div className="flex">
                <div className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </div>
              </div>
            </div>
          )}
          
          {/* Download Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Downloading...' : 'Add to library'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Recently Added Assets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Recently Added Assets</h2>
        
        {recentAssets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recentAssets.map((asset, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                  {asset.thumbnail ? (
                    <img 
                      src={asset.thumbnail} 
                      alt={asset.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {asset.type === 'music' ? '🎵' : '🎬'}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {asset.type}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs truncate font-medium" title={asset.title}>
                    {asset.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Downloaded assets will appear here. They will be available for selection when creating shorts.
          </p>
        )}
      </div>
    </div>
  );
}