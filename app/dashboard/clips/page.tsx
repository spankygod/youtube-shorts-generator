'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ClipsPage() {
  const [clips, setClips] = useState([
    { id: 1, title: 'Funny Gaming Moment', source: 'Gaming Stream #23', duration: '0:45', createdAt: '2025-05-01' },
    { id: 2, title: 'Key Interview Highlight', source: 'Expert Interview', duration: '1:20', createdAt: '2025-05-03' },
    { id: 3, title: 'Product Showcase Clip', source: 'Product Launch Video', duration: '0:35', createdAt: '2025-05-04' },
    { id: 4, title: 'Tutorial Highlight', source: 'Full Tutorial Video', duration: '1:12', createdAt: '2025-05-06' }
  ]);
  
  const [isGridView, setIsGridView] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Clips</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create short clips from your longer videos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsGridView(false)}
              className={`px-3 py-1.5 ${!isGridView ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setIsGridView(true)}
              className={`px-3 py-1.5 ${isGridView ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all">
            Create New Clip
          </button>
        </div>
      </div>

      {isGridView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clips.map((clip, index) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
            >
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {clip.duration}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{clip.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  From: {clip.source}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Created on {clip.createdAt}
                </p>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                    To Short
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clips.map((clip, index) => (
                  <motion.tr
                    key={clip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-4">{clip.title}</td>
                    <td className="px-4 py-4">{clip.source}</td>
                    <td className="px-4 py-4">{clip.duration}</td>
                    <td className="px-4 py-4">{clip.createdAt}</td>
                    <td className="px-4 py-4">
                      <div className="flex space-x-2">
                        <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Edit</button>
                        <button className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">To Short</button>
                        <button className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Delete</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {clips.length === 0 && (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No clips available. Create your first one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}