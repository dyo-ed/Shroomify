'use client'
import React from 'react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-100 bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/shroomify-logo.svg" alt="Shroomify" className="w-10 h-10" />
            </div>
            <h1 className="text-xl font-bold text-white">Shroomify</h1>
          </div>
          <div className="text-sm text-gray-400">
            AI Contamination Detection
          </div>
        </div>
      </header>
  );
};

export default Header;