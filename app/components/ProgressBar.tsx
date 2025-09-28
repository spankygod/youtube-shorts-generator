'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  step?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ 
  current, 
  total,
  step,
  showPercentage = true,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {step && (
          <div className="text-sm font-medium text-gray-300">{step}</div>
        )}
        {showPercentage && (
          <div className="text-sm font-medium text-gray-300">{percentage}%</div>
        )}
      </div>
      <div className="w-full bg-[#232326] rounded-full h-2">
        <motion.div 
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}