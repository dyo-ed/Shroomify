'use client';
import { CheckCircle, ChevronDown, ChevronUp, Play } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface HomeTabProps {
  onNavigateToProfile: () => void;
}

const HomeTab = ({ onNavigateToProfile }: HomeTabProps) => {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();

  const cultivationMethods = [
    {
      id: 'straw',
      title: 'Straw Substrate Method',
      emoji: '🌾',
      description: 'Cost-effective method using pasteurized straw. Ideal for oyster mushrooms and wine cap mushrooms.',
      difficulty: 'Beginner Friendly',
      difficultyColor: 'bg-green-600/20 text-green-400',
      successRate: '80%',
      tutorials: [
        {
          title: 'How to Grow Oyster Mushrooms Commercially using Pasteurized Straw',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=wQd4ZwOtBuk',
          duration: '5:00',
          description: 'Growing oyster mushrooms on straw is the highest yield per substrate way to produce oyster mushrooms. Straw can be pasteurized and packed into buckets or sleeves with spawn for commercial production.',
          thumbnail: 'https://img.youtube.com/vi/wQd4ZwOtBuk/maxresdefault.jpg'
        },
        {
          title: 'Straw Substrate Preparation for Mushroom Growing',
          type: 'YouTube Tutorial', 
          url: 'https://www.youtube.com/watch?v=J4Vq-xHqUho',
          duration: '14:20',
          description: 'FreshCap Mushrooms tutorial on proper straw pasteurization and preparation',
          thumbnail: 'https://img.youtube.com/vi/J4Vq-xHqUho/maxresdefault.jpg'
        },
        {
          title: 'Growing Wine Cap Mushrooms on Straw',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=3Z1q8BFTyNU', 
          duration: '16:30',
          description: 'Mushroom Mountain\'s guide to cultivating wine cap mushrooms using straw',
          thumbnail: 'https://img.youtube.com/vi/3Z1q8BFTyNU/maxresdefault.jpg'
        }
      ]
    },
    {
      id: 'sawdust',
      title: 'Hardwood Sawdust',
      emoji: '🪵',
      description: 'Premium method for shiitake, lion\'s mane, and reishi. Requires supplemented sawdust and sterilization.',
      difficulty: 'Intermediate',
      difficultyColor: 'bg-yellow-600/20 text-yellow-400',
      successRate: '75%',
      tutorials: [
        {
          title: 'How to Make Shiitake Mushroom Blocks - Complete Process',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
          duration: '22:15',
          description: 'North Spore\'s detailed guide to creating shiitake mushroom blocks with hardwood sawdust',
          thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg'
        },
        {
          title: 'Lion\'s Mane Mushroom Cultivation on Sawdust',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=QH2-TGUlwu4',
          duration: '19:45',
          description: 'FreshCap Mushrooms tutorial on growing lion\'s mane using supplemented sawdust',
          thumbnail: 'https://img.youtube.com/vi/QH2-TGUlwu4/maxresdefault.jpg'
        },
        {
          title: 'Reishi Mushroom Growing on Hardwood Sawdust',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
          duration: '17:30',
          description: 'Mushroom Mountain\'s guide to cultivating reishi mushrooms on sawdust blocks',
          thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/maxresdefault.jpg'
        }
      ]
    },
    {
      id: 'agar',
      title: 'Agar Culture Work',
      emoji: '🌱',
      description: 'Advanced technique for isolating pure strains and maintaining genetic consistency in cultivation.',
      difficulty: 'Advanced',
      difficultyColor: 'bg-red-600/20 text-red-400',
      successRate: '90%',
      tutorials: [
        {
          title: 'Agar Work for Mushroom Cultivation - Complete Beginner Guide',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
          duration: '31:20',
          description: 'North Spore\'s comprehensive introduction to agar work and sterile techniques',
          thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/maxresdefault.jpg'
        },
        {
          title: 'Spore to Agar Transfer - Step by Step Process',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=7jVbJj66zqM',
          duration: '18:45',
          description: 'FreshCap Mushrooms detailed guide on proper spore transfer techniques',
          thumbnail: 'https://img.youtube.com/vi/7jVbJj66zqM/maxresdefault.jpg'
        },
        {
          title: 'Making Agar Plates at Home - DIY Mushroom Cultivation',
          type: 'YouTube Tutorial',
          url: 'https://www.youtube.com/watch?v=8kKx8JqCwqI',
          duration: '15:30',
          description: 'Mushroom Mountain\'s tutorial on preparing and storing agar plates',
          thumbnail: 'https://img.youtube.com/vi/8kKx8JqCwqI/maxresdefault.jpg'
        }
      ]
    }
  ];

  const toggleMethod = (methodId: string) => {
    setExpandedMethod(expandedMethod === methodId ? null : methodId);
  };

  return (
    <div className="p-6 space-y-8">
    {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-2xl font-extrabold mb-2 uppercase tracking-wide">
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            SHROOM
          </span>
          <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
            IFY
          </span>
        </h2>
        <p className="text-gray-400">An Image-based Contamination Detection for Oyster Mushroom Fruiting Bags</p>
      </div>

      {/* Join Us Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-green-600/20 to-blue-600/20 flex items-center justify-center">
          <img src="/banner_image.png" alt="Contamination Prevention" className="w-full h-full object-cover" />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-2 text-center">Identify Contamination Early and Prevent Bigger Problems Later!</h3>
          <p className="text-gray-400 text-sm mb-3 text-justify">
            Shroomify is your go-to application for mushroom cultivation-designed to detect contamination early.
            Using machine learning, Shroomify helps you monitor your fruiting bags, minimizing losses and maximizing productivity.
          </p>
          <div className="flex items-center text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span>Designed for beginners and pros alike</span>
          </div>

            {/* Join KabuTeam Button - Only show if not logged in */}
          {!isLoggedIn && (
            <div className="text-center">
              <button 
                onClick={onNavigateToProfile}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 mx-auto mt-5"
              >
                <span>🍄</span>
                <span>Join the KabuTeam</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Cultivation Methods */}
      <div className="pb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Popular Cultivation Methods</h3>
        <div className="space-y-3">
          {cultivationMethods.map((method) => (
            <div key={method.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleMethod(method.id)}
                className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{method.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium mb-1">{method.title}</h4>
                      {expandedMethod === method.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {method.description}
                    </p>
                    <div className="flex items-center text-xs">
                      <span className={`${method.difficultyColor} px-2 py-1 rounded mr-2`}>
                        {method.difficulty}
                      </span>
                      <span className="text-gray-500">Success Rate: {method.successRate}</span>
                    </div>
                  </div>
                </div>
              </button>
              
              {expandedMethod === method.id && (
                <div className="px-4 pb-6 border-t border-gray-700">
                  <div className="pt-4">
                    <h5 className="text-white font-medium mb-3 flex items-center">
                      <Play className="w-4 h-4 mr-2 text-red-500" />
                      Tutorial Videos & Resources
                    </h5>
                    <div className="space-y-3 pb-2">
                      {method.tutorials.map((tutorial, index) => (
                        <div key={index} className="bg-gray-700/50 rounded-lg border border-gray-600 overflow-hidden">
                          <div className="flex items-center">
                            <a
                              href={tutorial.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-32 h-20 bg-gray-600 flex-shrink-0 relative block hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={tutorial.thumbnail}
                                alt={tutorial.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTI4IDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iODAiIGZpbGw9IiM0QjU1NjMiLz48cGF0aCBkPSJNNDggMzJMMzIgNDhMNDggNjRINjRMMjQgNDhMNDggMzJINjRaIiBmaWxsPSIjOUNBM0FGIi8+PC9zdmc+';
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                              <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                                {tutorial.duration}
                              </div>
                            </a>
                            <div className="flex-1 p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h6 className="text-white font-medium text-sm flex-1 pr-2">{tutorial.title}</h6>
                              </div>
                              <p className="text-gray-400 text-xs mb-3 line-clamp-2">{tutorial.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Growth Stages */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Understanding Growth Stages</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <h4 className="text-white font-medium">Inoculation (Days 1-7)</h4>
            </div>
            <p className="text-gray-400 text-sm ml-11">
              Spores or liquid culture are introduced to sterile substrate. Critical contamination prevention period.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <h4 className="text-white font-medium">Colonization (Days 7-21)</h4>
            </div>
            <p className="text-gray-400 text-sm ml-11">
              Mycelium spreads through substrate. Maintain optimal temperature and humidity without light exposure.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <h4 className="text-white font-medium">Fruiting (Days 21-35)</h4>
            </div>
            <p className="text-gray-400 text-sm ml-11">
              Introduce fresh air exchange, light cycles, and maintain high humidity for mushroom formation.
            </p>
          </div>
        </div>
      </div>

      {/* Essential Parameters */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-4 border border-blue-600/20">
        <h3 className="text-lg font-semibold text-white mb-3">🌡️ Optimal Growing Conditions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-400 font-medium">Temperature:</span>
            <p className="text-gray-300">65-75°F (18-24°C)</p>
          </div>
          <div>
            <span className="text-blue-400 font-medium">Humidity:</span>
            <p className="text-gray-300">80-95% RH</p>
          </div>
          <div>
            <span className="text-blue-400 font-medium">Air Exchange:</span>
            <p className="text-gray-300">4-6 times per hour</p>
          </div>
          <div>
            <span className="text-blue-400 font-medium">Light Cycle:</span>
            <p className="text-gray-300">12 hours indirect light</p>
          </div>
        </div>
      </div>

      {/* Knowledge Tip */}
      <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg p-4 border border-green-600/20">
        <h3 className="text-lg font-semibold text-white mb-2">📚 Did You Know?</h3>
        <p className="text-gray-300 text-sm">
          Mushrooms are more closely related to animals than plants! They obtain nutrients by breaking down organic matter, 
          just like animals do, rather than producing their own food through photosynthesis like plants.
        </p>
      </div>
    </div>
  );
};

export default HomeTab;