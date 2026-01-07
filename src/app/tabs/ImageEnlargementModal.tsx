'use client';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Flame } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

interface ImageEnlargementModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  alt?: string;
  title?: string;
}

const ImageEnlargementModal: React.FC<ImageEnlargementModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  alt = 'Enlarged image',
  title = 'Image Preview'
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);
  const [isGeneratingHeatmap, setIsGeneratingHeatmap] = useState(false);
  const [displayImageSrc, setDisplayImageSrc] = useState<string>(imageSrc);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  console.log('ImageEnlargementModal props:', { isOpen, imageSrc: imageSrc ? 'Present' : 'Missing', title });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setDisplayImageSrc(imageSrc);
      setIsHeatmapMode(false);
    }
  }, [isOpen, imageSrc]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setScale(prev => Math.min(prev * 1.2, 5));
          break;
        case '-':
          e.preventDefault();
          setScale(prev => Math.max(prev / 1.2, 0.1));
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setRotation(prev => (prev + 90) % 360);
          break;
        case '0':
          e.preventDefault();
          setScale(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // Touch handlers for mobile
  const getTouchDistance = (touches: React.TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    if (!touch1 || !touch2) return 0;
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    if (!touch1) return { x: 0, y: 0 };
    if (!touch2) return { x: touch1.clientX, y: touch1.clientY };
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      setTouchDistance(distance);
      const center = getTouchCenter(e.touches);
      if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        setLastTouchCenter({
          x: center.x - rect.left - rect.width / 2,
          y: center.y - rect.top - rect.height / 2
        });
      }
    } else if (e.touches.length === 1) {
      // Single touch drag
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchDistance !== null) {
      // Pinch zoom
      const newDistance = getTouchDistance(e.touches);
      const scaleChange = newDistance / touchDistance;
      setScale(prev => Math.max(0.1, Math.min(5, prev * scaleChange)));
      setTouchDistance(newDistance);
    } else if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(null);
    setLastTouchCenter(null);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = displayImageSrc;
    link.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHeatmap = async () => {
    if (isGeneratingHeatmap) return;
    
    setIsGeneratingHeatmap(true);
    try {
      // Use the original imageSrc prop (not the displayed one) for heatmap generation
      const sourceImage = isHeatmapMode ? imageSrc : displayImageSrc;
      
      // Convert base64 image to blob if needed
      let imageBlob: Blob;
      if (sourceImage.startsWith('data:')) {
        const response = await fetch(sourceImage);
        imageBlob = await response.blob();
      } else {
        const response = await fetch(sourceImage);
        imageBlob = await response.blob();
      }

      // Create FormData
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');

      // Call heatmap API
      const apiUrl = process.env.NEXT_PUBLIC_NGROK_URL || 'https://reliably-one-kiwi.ngrok-free.app';
      const response = await fetch(`${apiUrl}/api/heatmap`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate heatmap');
      }

      const data = await response.json();
      if (data.status === 'success' && data.image) {
        // Update displayed image source to heatmap
        const heatmapSrc = `data:image/jpeg;base64,${data.image}`;
        setDisplayImageSrc(heatmapSrc);
        setIsHeatmapMode(true);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating heatmap:', error);
      alert('Failed to generate heatmap. Please try again.');
    } finally {
      setIsGeneratingHeatmap(false);
    }
  };

  const handleResetImage = () => {
    setDisplayImageSrc(imageSrc);
    setIsHeatmapMode(false);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-0 sm:p-4">
      <div className="relative w-full h-full max-w-7xl max-h-screen sm:max-h-[95vh] flex flex-col">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 gap-3 sm:gap-0">
          {/* Title and Info - Mobile optimized */}
          <div className="flex items-center justify-between sm:justify-start sm:space-x-3 min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-white truncate pr-2">{title}</h3>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400 flex-shrink-0">
              <span className="hidden sm:inline">{Math.round(scale * 100)}%</span>
              <span className="sm:hidden">{Math.round(scale * 100)}%</span>
              {rotation !== 0 && <span className="hidden sm:inline">• {rotation}°</span>}
            </div>
          </div>
          
          {/* Controls - Responsive layout */}
          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-2">
            {/* Desktop Controls */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setScale(prev => Math.max(0.1, prev / 1.2))}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setScale(1);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-sm"
                  title="Reset"
                >
                  100%
                </button>
                <button
                  onClick={() => setScale(prev => Math.min(5, prev * 1.2))}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              
              <button
                onClick={isHeatmapMode ? handleResetImage : handleHeatmap}
                disabled={isGeneratingHeatmap}
                className={`p-2 rounded transition-colors ${
                  isHeatmapMode 
                    ? 'text-orange-400 hover:text-orange-300 hover:bg-gray-700' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                } ${isGeneratingHeatmap ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isHeatmapMode ? 'Reset to Original' : 'Generate Heatmap'}
              >
                <Flame className={`w-4 h-4 ${isGeneratingHeatmap ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Mobile Controls - Simplified */}
            <div className="flex sm:hidden items-center space-x-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setScale(prev => Math.max(0.1, prev / 1.2))}
                className="p-2.5 text-gray-400 active:text-white active:bg-gray-700 rounded transition-colors touch-manipulation"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setScale(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                }}
                className="px-3 py-2 text-gray-400 active:text-white active:bg-gray-700 rounded transition-colors text-xs touch-manipulation"
                title="Reset"
              >
                Reset
              </button>
              <button
                onClick={() => setScale(prev => Math.min(5, prev * 1.2))}
                className="p-2.5 text-gray-400 active:text-white active:bg-gray-700 rounded transition-colors touch-manipulation"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2.5 text-gray-400 active:text-white active:bg-gray-700 rounded transition-colors touch-manipulation"
                title="Rotate"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={isHeatmapMode ? handleResetImage : handleHeatmap}
                disabled={isGeneratingHeatmap}
                className={`p-2.5 rounded transition-colors touch-manipulation ${
                  isHeatmapMode 
                    ? 'text-orange-400 active:text-orange-300 active:bg-gray-700' 
                    : 'text-gray-400 active:text-white active:bg-gray-700'
                } ${isGeneratingHeatmap ? 'opacity-50' : ''}`}
                title={isHeatmapMode ? 'Reset to Original' : 'Generate Heatmap'}
              >
                <Flame className={`w-5 h-5 ${isGeneratingHeatmap ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            
            {/* Close Button - Always visible */}
            <button
              onClick={onClose}
              className="p-2 sm:p-2 text-gray-400 hover:text-white active:text-white hover:bg-gray-700 active:bg-gray-700 rounded transition-colors touch-manipulation flex-shrink-0"
              title="Close"
            >
              <X className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Image Container - Touch enabled */}
        <div 
          ref={imageContainerRef}
          className="flex-1 flex items-center justify-center overflow-hidden bg-gray-900 touch-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative cursor-grab active:cursor-grabbing select-none touch-none"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            onMouseDown={handleMouseDown}
          >
            <img
              src={displayImageSrc}
              alt={alt}
              className="max-w-none"
              style={{
                maxWidth: 'none',
                maxHeight: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
                touchAction: 'none'
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Instructions - Hidden on mobile, shown on desktop */}
        <div className="hidden sm:block p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">+</kbd>
              <span>Zoom In</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">-</kbd>
              <span>Zoom Out</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">R</kbd>
              <span>Rotate</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">0</kbd>
              <span>Reset</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>

        {/* Mobile Hint */}
        <div className="sm:hidden p-3 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Pinch to zoom • Drag to pan • Tap buttons to control
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageEnlargementModal;
