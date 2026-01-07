'use client'

import React, { useState, useEffect } from 'react';
import { Camera, Home, User, History } from 'lucide-react';
import Header from './tabs/Header';
import HomeTab from './tabs/HomeTab';
import ScanTab from './tabs/ScanTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';




const ShroomifyApp = () => {
  const [activeTab, setActiveTab] = useState('home');

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Listen for navigation events from other components
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent) => {
      const { tabName } = event.detail;
      if (tabName && ['home', 'scan', 'history', 'profile'].includes(tabName)) {
        setActiveTab(tabName);
      }
    };

    window.addEventListener('navigateToTab', handleNavigateToTab as EventListener);
    
    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab as EventListener);
    };
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab onNavigateToProfile={() => setActiveTab('profile')} />;
      case 'scan':
        return <ScanTab />;
      case 'history':
        return <HistoryTab />;
      case 'profile':
        return <ProfileTab />;
      // default:
      //   return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900" style={{ backgroundColor: '#1f1f1f' }}>
      <Header />
      
      <main className="pb-20 pt-20">
        {renderActiveTab()}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-2 z-50" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-around">
          <button
            onClick={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'home' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('scan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'scan' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs">Scan</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'history' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-xs">History</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('profile');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'profile' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ShroomifyApp;