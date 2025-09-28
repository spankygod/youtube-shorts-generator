'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function VideosPage() {
  const [videos, setVideos] = useState([
    { id: 1, title: 'Complete Guide to Programming', duration: '12:35', status: 'Published', thumbnail: '/thumbnail1.jpg' },
    { id: 2, title: 'How to Build a Modern Dashboard', duration: '18:22', status: 'Processing', thumbnail: '/thumbnail2.jpg' },
    { id: 3, title: 'Top 10 Travel Destinations', duration: '22:47', status: 'Draft', thumbnail: '/thumbnail3.jpg' },
    { id: 4, title: 'Next.js Advanced Techniques', duration: '15:10', status: 'Published', thumbnail: '/thumbnail4.jpg' },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Videos</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
          Upload Video
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
          >
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
              {/* Placeholder for video thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">Thumbnail</span>
              </div>
              
              {/* Video duration badge */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{video.title}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                  ${video.status === 'Published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                    video.status === 'Processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                  {video.status}
                </span>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {videos.length === 0 && (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium">No videos</h3>
          <p className="mt-1 text-sm">Get started by uploading a video.</p>
          <div className="mt-6">
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
              Upload Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}