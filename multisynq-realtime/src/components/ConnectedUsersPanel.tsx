'use client';

import React from 'react';

export default function ConnectedUsersPanel() {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected Users</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Users:</span>
          <span className="text-sm font-bold text-blue-600">1</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className="text-sm font-bold text-green-600">Local Mode</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 mb-2">Note:</h4>
        <p className="text-xs text-gray-600">
          React Together is disabled. Connect to Multisynq for real-time collaboration.
        </p>
      </div>
    </div>
  );
} 