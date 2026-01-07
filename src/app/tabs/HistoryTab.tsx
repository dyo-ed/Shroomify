'use client';
import { Calendar, Clock, AlertTriangle, CheckCircle, Eye, Trash2, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import ImageEnlargementModal from './ImageEnlargementModal';

// Types for better type safety and scalability
interface HistoryLog {
  id: number;
  date_logged?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  image: Uint8Array | string | null; // Can be Uint8Array or base64 string
  detected_disease: number | null;
  email: string | null;
  confidence: number | null;
}

interface ProcessedHistoryLog extends HistoryLog {
  chronologicalNumber: number;
}

interface FilterOptions {
  status: 'all' | 'healthy' | 'green_mold' | 'black_mold';
  dateRange: 'all' | 'today' | 'week' | 'month';
  minConfidence: number;
  searchTerm: string;
}

interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

// Configuration constants for easy scaling
const CONFIG = {
  ITEMS_PER_PAGE_OPTIONS: [10, 25, 50, 100],
  DEFAULT_ITEMS_PER_PAGE: 10,
  CONFIDENCE_THRESHOLDS: {
    HIGH: 90,
    MEDIUM: 75,
    LOW: 60
  },
  EXPORT_FORMATS: ['csv', 'json', 'pdf'] as const
};

const HistoryTab = () => {
  const { user } = useAuth();
  
  // State management for scalability
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    minConfidence: 0,
    searchTerm: ''
  });

  const [pagination, setPagination] = useState<PaginationConfig>({
    currentPage: 1,
    itemsPerPage: CONFIG.DEFAULT_ITEMS_PER_PAGE,
    totalItems: 0
  });

  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; logId: number | null }>({ show: false, logId: null });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<{ show: boolean; logIds: string[] }>({ show: false, logIds: [] });
  const [sortConfig, setSortConfig] = useState<{
    field: keyof HistoryLog;
    direction: 'asc' | 'desc';
  }>({
    field: 'date_logged',
    direction: 'desc'
  });
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);

  // Fetch history logs from Supabase
  const fetchHistoryLogs = useCallback(async () => {
    console.log('fetchHistoryLogs called, user:', user);
    console.log('user email:', user?.email);
    
    if (!user?.email) {
      console.log('No user email found, setting empty logs');
      setHistoryLogs([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Querying Supabase for email:', user.email);
      
      // First, let's check if the table exists and what data is in it
      console.log('Testing table access...');
      const testQuery = await supabase
        .from('"Logs"')
        .select('*')
        .limit(5);
      
      console.log('Test query result:', testQuery);
      
      // Let's also try some common table names
      console.log('Trying different table names...');
      const tablesToTry = ['Logs', 'logs'];
      
      for (const tableName of tablesToTry) {
        try {
          const result = await supabase.from(tableName).select('*').limit(1);
          console.log(`Table "${tableName}":`, result);
          if (result.data && result.data.length > 0) {
            console.log(`✅ Found data in table: ${tableName}`);
            break;
          }
        } catch (err) {
          console.log(`❌ Table "${tableName}" not found or error:`, err);
        }
      }
      
      // Use Supabase's built-in filtering (more reliable)
      console.log('DEBUG: Fetching data with email filter from Supabase');
      let { data, error: fetchError } = await supabase
        .from('"Logs"')
        .select('*')
        .eq('email', user.email)
        .order('date_logged', { ascending: false });

      // If that fails, try without quotes
      if (fetchError) {
        console.log('First query failed, trying without quotes:', fetchError);
        const result = await supabase
          .from('Logs')
          .select('*')
          .eq('email', user.email)
          .order('date_logged', { ascending: false });
        
        data = result.data;
        fetchError = result.error;
      }

      console.log('DEBUG: Filtered data from Supabase:', data);
      console.log('DEBUG: Looking for email:', user.email);
      
      // If no data found, try case-insensitive search
      if (!data || data.length === 0) {
        console.log('DEBUG: No data found, trying case-insensitive search');
        const { data: caseInsensitiveData, error: _caseError } = await supabase
          .from('"Logs"')
          .select('*')
          .ilike('email', user.email)
          .order('date_logged', { ascending: false });
        
        console.log('DEBUG: Case-insensitive search result:', caseInsensitiveData);
        if (caseInsensitiveData && caseInsensitiveData.length > 0) {
          data = caseInsensitiveData;
        }
      }

      console.log('Supabase response:', { data, error: fetchError });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        throw fetchError;
      }

      console.log('Setting history logs:', data);
      // Debug the image data structure
      if (data && data.length > 0) {
        console.log('Sample log data structure:', data[0]);
        if (data[0].image) {
          console.log('Image data type:', typeof data[0].image);
          console.log('Image data constructor:', data[0].image.constructor.name);
          if (data[0].image instanceof Uint8Array) {
            console.log('Image Uint8Array length:', data[0].image.length);
            console.log('First 10 bytes:', Array.from(data[0].image.slice(0, 10)));
          } else if (typeof data[0].image === 'string') {
            console.log('Image string length:', data[0].image.length);
            console.log('First 50 chars:', data[0].image.substring(0, 50));
          }
        }
      }
      setHistoryLogs(data || []);
    } catch (err) {
      console.error('Error fetching history logs:', err);
      setError(`Failed to load history logs: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setHistoryLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch data when component mounts or user changes
  useEffect(() => {
    fetchHistoryLogs();
  }, [fetchHistoryLogs]);

  // Cache for Blob URLs to avoid recreating them
  const [blobUrlCache, setBlobUrlCache] = useState<Map<number, string>>(new Map());

  // Cleanup Blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up all cached Blob URLs when component unmounts
      blobUrlCache.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [blobUrlCache]);

  // First, add chronological numbering to ALL logs based on date (oldest first)
  const logsWithChronologicalNumbers = useMemo((): ProcessedHistoryLog[] => {
    const sortedByDate = [...historyLogs].sort((a, b) => {
      // Try different possible date field names
      const aDate = a.date_logged || a.timestamp || a.created_at;
      const bDate = b.date_logged || b.timestamp || b.created_at;
      
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      
      try {
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      } catch (error) {
        console.warn('Invalid date format in chronological sorting:', aDate, bDate, error);
        return 0;
      }
    });

    return historyLogs.map(log => {
      const chronologicalIndex = sortedByDate.findIndex(sortedLog => sortedLog.id === log.id);
      return {
        ...log,
        chronologicalNumber: chronologicalIndex + 1
      };
    });
  }, [historyLogs]);

  // Filtered and sorted data with performance optimization
  const processedData = useMemo((): ProcessedHistoryLog[] => {
    let filtered = [...logsWithChronologicalNumbers];

    // Apply filters
    if (filters.status !== 'all') {
      // Map detected_disease to status: 0 = healthy, 1 = green_mold, 2 = black_mold
      filtered = filtered.filter(log => {
        switch (filters.status) {
          case 'healthy':
            return log.detected_disease === 0;
          case 'green_mold':
            return log.detected_disease === 1;
          case 'black_mold':
            return log.detected_disease === 2;
          default:
            return true;
        }
      });
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.email?.toLowerCase().includes(searchLower) ||
        log.id.toString().includes(searchLower)
      );
    }

    if (filters.minConfidence > 0) {
      filtered = filtered.filter(log => log.confidence && log.confidence >= filters.minConfidence);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => {
        // Try different possible date field names
        const dateValue = log.date_logged || log.timestamp || log.created_at;
        if (!dateValue) return false;
        
        try {
          const logDate = new Date(dateValue);
          return logDate >= cutoffDate;
        } catch (error) {
          console.warn('Invalid date format:', dateValue, error);
          return false;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      // Handle undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [logsWithChronologicalNumbers, filters, sortConfig]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, pagination.currentPage, pagination.itemsPerPage]);

  // Update total items when processed data changes
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, totalItems: processedData.length, currentPage: 1 }));
  }, [processedData.length]);

  // Statistics calculation
  const statistics = useMemo(() => {
    const total = processedData.length;
    const healthy = processedData.filter(log => log.detected_disease === 0).length;
    const greenMold = processedData.filter(log => log.detected_disease === 1).length;
    const blackMold = processedData.filter(log => log.detected_disease === 2).length;
    const contaminated = greenMold + blackMold; // Total contaminated for backward compatibility
    const avgConfidence = total > 0 
      ? Math.round(processedData.reduce((sum, log) => sum + (log.confidence || 0), 0) / total)
      : 0;
    
    return { total, healthy, greenMold, blackMold, contaminated, avgConfidence };
  }, [processedData]);

  // Event handlers
  const handleFilterChange = useCallback(
    <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const _handleSort = useCallback((field: keyof HistoryLog) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handleItemsPerPageChange = useCallback((itemsPerPage: number) => {
    setPagination(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
  }, []);

  const handleDeleteLog = useCallback((logId: number) => {
    setShowDeleteConfirm({ show: true, logId });
  }, []);

  const confirmDeleteLog = useCallback(async () => {
    if (!showDeleteConfirm.logId) return;

    setIsLoading(true);
    try {
      console.log('Attempting to delete log with ID:', showDeleteConfirm.logId);
      
      // Try with quotes first
      let { error: deleteError } = await supabase
        .from('"Logs"')
        .delete()
        .eq('id', showDeleteConfirm.logId);

      // If that fails, try without quotes
      if (deleteError) {
        console.log('Delete with quotes failed, trying without quotes:', deleteError);
        const result = await supabase
          .from('Logs')
          .delete()
          .eq('id', showDeleteConfirm.logId);
        deleteError = result.error;
      }

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(`Database error: ${deleteError.message || 'Unknown error'}`);
      }

      console.log('Log deleted successfully');
      // Refresh the data
      await fetchHistoryLogs();
      setShowDeleteConfirm({ show: false, logId: null });
    } catch (err) {
      console.error('Error deleting log:', err);
      setError(`Failed to delete log: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [showDeleteConfirm.logId, fetchHistoryLogs]);

  const cancelDeleteLog = useCallback(() => {
    setShowDeleteConfirm({ show: false, logId: null });
  }, []);

  const handleBulkAction = useCallback((action: 'delete' | 'export', logIds: string[]) => {
    if (action === 'delete') {
      setShowBulkDeleteConfirm({ show: true, logIds });
    } else {
      // Export functionality remains the same
      console.log(`Exporting logs:`, logIds);
    }
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    if (showBulkDeleteConfirm.logIds.length === 0) return;

    setIsLoading(true);
    try {
      // Convert string IDs back to numbers for the database
      const numericIds = showBulkDeleteConfirm.logIds.map(id => parseInt(id));
      console.log('Attempting to delete logs with IDs:', numericIds);
      
      // Try with quotes first
      let { error: deleteError } = await supabase
        .from('"Logs"')
        .delete()
        .in('id', numericIds);

      // If that fails, try without quotes
      if (deleteError) {
        console.log('Bulk delete with quotes failed, trying without quotes:', deleteError);
        const result = await supabase
          .from('Logs')
          .delete()
          .in('id', numericIds);
        deleteError = result.error;
      }

      if (deleteError) {
        console.error('Supabase bulk delete error:', deleteError);
        throw new Error(`Database error: ${deleteError.message || 'Unknown error'}`);
      }

      console.log('Logs deleted successfully');
      // Refresh the data
      await fetchHistoryLogs();
      setSelectedLogs(new Set());
      setShowBulkDeleteConfirm({ show: false, logIds: [] });
    } catch (err) {
      console.error('Error deleting logs:', err);
      setError(`Failed to delete selected logs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [showBulkDeleteConfirm.logIds, fetchHistoryLogs]);

  const cancelBulkDelete = useCallback(() => {
    setShowBulkDeleteConfirm({ show: false, logIds: [] });
  }, []);

  const handleExport = useCallback((format: typeof CONFIG.EXPORT_FORMATS[number]) => {
    const dataToExport = selectedLogs.size > 0 
      ? processedData.filter(log => selectedLogs.has(log.id.toString()))
      : processedData;
    
    console.log(`Exporting ${dataToExport.length} records as ${format}`);
    // Implementation would handle actual export logic
  }, [processedData, selectedLogs]);

  // Utility functions
  const getStatusIcon = (detectedDisease: number | null) => {
    switch (detectedDisease) {
      case 0:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 1:
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (detectedDisease: number | null) => {
    switch (detectedDisease) {
      case 0:
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 1:
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 2:
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusText = (detectedDisease: number | null) => {
    switch (detectedDisease) {
      case 0:
        return 'Healthy';
      case 1:
        return 'Green Mold';
      case 2:
        return 'Black Mold';
      default:
        return 'Unknown';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.HIGH) return 'text-green-400';
    if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return 'No date';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Invalid date format in formatDate:', dateValue, error);
      return 'Invalid date';
    }
  };

  const getImageSrc = (imageData: Uint8Array | string | null, logId: number): string | null => {
    if (!imageData) {
      console.log(`No image data for log ${logId}`);
      return null;
    }
    
    try {
      console.log(`Processing image for log ${logId}, type:`, typeof imageData, 'length:', imageData instanceof Uint8Array ? imageData.length : 'N/A');
      
      // If it's already a string (base64), return it
      if (typeof imageData === 'string') {
        console.log(`String image data for log ${logId}, starts with:`, imageData.substring(0, 50));
        
        // Check if it's already a data URL
        if (imageData.startsWith('data:')) {
          return imageData;
        }
        
        // Check if it's base64 without data URL prefix
        if (imageData.startsWith('/9j/') || imageData.startsWith('iVBOR')) {
          return `data:image/jpeg;base64,${imageData}`;
        }
        
        // Check if it's a hex-encoded string (like \x7b2230223a3235352c...)
        if (imageData.startsWith('\\x') || imageData.startsWith('\\x')) {
          console.log(`Detected hex-encoded format for log ${logId}`);
          try {
            // Convert hex string to regular string
            const hexString = imageData.replace(/\\x/g, '').replace(/\\x/g, '');
            console.log(`Hex string for log ${logId}:`, hexString.substring(0, 100));
            
            let jsonString = '';
            try {
              // Process hex string in chunks of 2 characters
              for (let i = 0; i < hexString.length; i += 2) {
                const hex = hexString.substr(i, 2);
                if (hex.length === 2 && /^[0-9A-Fa-f]{2}$/.test(hex)) {
                  const charCode = parseInt(hex, 16);
                  if (!isNaN(charCode)) {
                    jsonString += String.fromCharCode(charCode);
                  }
                }
              }
              console.log(`JSON string for log ${logId}:`, jsonString.substring(0, 100));
            } catch (hexError) {
              console.error(`Hex conversion error for log ${logId}:`, hexError);
              return null;
            }
            
            const jsonObject = JSON.parse(jsonString);
            console.log(`Parsed JSON object for log ${logId}, keys:`, Object.keys(jsonObject).length);
            
            // Convert the JSON object back to Uint8Array
            const uint8Array = new Uint8Array(Object.keys(jsonObject).length);
            for (const [key, value] of Object.entries(jsonObject)) {
              const index = parseInt(key);
              if (!isNaN(index) && typeof value === 'number') {
                uint8Array[index] = value;
              }
            }
            
            console.log(`Converted to Uint8Array for log ${logId}, length:`, uint8Array.length);
            
            // Check if we already have a cached Blob URL for this log
            if (blobUrlCache.has(logId)) {
              console.log(`Using cached Blob URL for log ${logId}`);
              return blobUrlCache.get(logId)!;
            }
            
            // Check if the data is too large for data URL (roughly 1MB limit)
            if (uint8Array.length > 1000000) {
              console.log(`Creating Blob URL for large image (${uint8Array.length} bytes) for log ${logId}`);
              // Use Blob URL for large images
              const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
              const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
              const url = URL.createObjectURL(blob);
              
              console.log(`Created Blob URL for log ${logId}:`, url);
              
              // Cache the URL
              setBlobUrlCache(prev => new Map(prev).set(logId, url));
              
              return url;
            } else {
              console.log(`Creating data URL for small image (${uint8Array.length} bytes) for log ${logId}`);
              // Use data URL for smaller images
              try {
                const base64 = btoa(String.fromCharCode(...uint8Array));
                const dataUrl = `data:image/jpeg;base64,${base64}`;
                console.log(`Created data URL for log ${logId}, length:`, dataUrl.length);
                return dataUrl;
              } catch (base64Error) {
                console.warn(`Failed to create base64 for log ${logId}, trying Blob URL instead:`, base64Error);
                // Fallback to Blob URL if base64 conversion fails
                const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
                const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                
                // Cache the URL
                setBlobUrlCache(prev => new Map(prev).set(logId, url));
                
                return url;
              }
            }
          } catch (jsonError) {
            console.error(`Failed to parse hex-encoded JSON for log ${logId}:`, jsonError);
            return null;
          }
        }
        
        return imageData;
      }
      
      // If it's Uint8Array, convert to Blob URL for better performance
      if (imageData instanceof Uint8Array) {
        console.log(`Uint8Array image data for log ${logId}, length:`, imageData.length);
        
        // Check if we already have a cached Blob URL for this log
        if (blobUrlCache.has(logId)) {
          console.log(`Using cached Blob URL for log ${logId}`);
          return blobUrlCache.get(logId)!;
        }
        
        // Check if the data is too large for data URL (roughly 1MB limit)
        if (imageData.length > 1000000) {
          console.log(`Creating Blob URL for large image (${imageData.length} bytes) for log ${logId}`);
          // Use Blob URL for large images - properly convert Uint8Array to ArrayBuffer
          const arrayBuffer = imageData.buffer.slice(imageData.byteOffset, imageData.byteOffset + imageData.byteLength) as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          
          console.log(`Created Blob URL for log ${logId}:`, url);
          
          // Cache the URL
          setBlobUrlCache(prev => new Map(prev).set(logId, url));
          
          return url;
        } else {
          console.log(`Creating data URL for small image (${imageData.length} bytes) for log ${logId}`);
          // Use data URL for smaller images
          try {
            const base64 = btoa(String.fromCharCode(...imageData));
            const dataUrl = `data:image/jpeg;base64,${base64}`;
            console.log(`Created data URL for log ${logId}, length:`, dataUrl.length);
            return dataUrl;
          } catch (base64Error) {
            console.warn(`Failed to create base64 for log ${logId}, trying Blob URL instead:`, base64Error);
            // Fallback to Blob URL if base64 conversion fails
            const arrayBuffer = imageData.buffer.slice(imageData.byteOffset, imageData.byteOffset + imageData.byteLength) as ArrayBuffer;
            const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            // Cache the URL
            setBlobUrlCache(prev => new Map(prev).set(logId, url));
            
            return url;
          }
        }
      }
      
      console.log(`Unknown image data type for log ${logId}:`, typeof imageData);
      return null;
    } catch (error) {
      console.error(`Error converting image data for log ${logId}:`, error);
      return null;
    }
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2 uppercase tracking-wide">
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              SCAN
            </span>
            <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
              HISTORY
            </span>
          </h2>
          <p className="text-gray-400">Track your contamination detection results over time</p>
        </div>
        
        {/* Export Controls */}
        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          <select
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            onChange={(e) => {
              const value = e.target.value as typeof CONFIG.EXPORT_FORMATS[number];
              if (CONFIG.EXPORT_FORMATS.includes(value)) {
                handleExport(value);
              }
            }}
            value=""
          >
            <option value="">Export as...</option>
            {CONFIG.EXPORT_FORMATS.map(format => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
          <button
            onClick={() => handleExport('csv')}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-blue-600/20 rounded flex items-center justify-center">
              <Calendar className="w-3 h-3 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-400">{statistics.total}</p>
              <p className="text-gray-400 text-xs hidden sm:block">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-green-600/20 rounded flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-400">{statistics.healthy}</p>
              <p className="text-gray-400 text-xs hidden sm:block">Healthy</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-yellow-600/20 rounded flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-400">{statistics.greenMold}</p>
              <p className="text-gray-400 text-xs hidden sm:block">Green</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-red-600/20 rounded flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-400">{statistics.blackMold}</p>
              <p className="text-gray-400 text-xs hidden sm:block">Black</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-purple-600/20 rounded flex items-center justify-center">
              <span className="text-purple-400 font-bold text-xs">%</span>
            </div>
            <div>
              <p className="text-sm font-bold text-purple-400">{statistics.avgConfidence}</p>
              <p className="text-gray-400 text-xs hidden sm:block">Avg %</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bags, contamination..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-row gap-2">
            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value as FilterOptions['status'])}
              className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="green_mold">Green Mold</option>
              <option value="black_mold">Black Mold</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value as FilterOptions['dateRange'])}
              className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLogs.size > 0 && (
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm">
              {selectedLogs.size} item{selectedLogs.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('export', Array.from(selectedLogs))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Export Selected
              </button>
              <button
                onClick={() => handleBulkAction('delete', Array.from(selectedLogs))}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Error Display */}
      {error && (
        <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* History Logs */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading history logs...</p>
          </div>
        ) : !user ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">Please log in</h3>
            <p className="text-gray-500 text-sm">You need to be logged in to view your scan history</p>
          </div>
        ) : paginatedData.length > 0 ? (
          paginatedData.map((log) => (
            <div key={log.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedLogs.has(log.id.toString())}
                      onChange={(e) => {
                        const newSelected = new Set(selectedLogs);
                        if (e.target.checked) {
                          newSelected.add(log.id.toString());
                        } else {
                          newSelected.delete(log.id.toString());
                        }
                        setSelectedLogs(newSelected);
                      }}
                      className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    {getStatusIcon(log.detected_disease)}
                    <div>
                      <h3 className="text-white font-semibold">Scan #{log.chronologicalNumber}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate((log.date_logged || log.timestamp || log.created_at) ?? null)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-row gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(log.detected_disease)}`}>
                        {getStatusText(log.detected_disease)}
                      </span>
                      <span className="text-sm">
                        <span className="text-gray-400">Confidence: </span>
                        <span className={`font-semibold ${getConfidenceColor((log.confidence || 0) * 100)}`}>
                          {log.confidence ? Math.round(log.confidence * 100) : 0}%
                        </span>
                      </span>
                    </div>

                    {(log.detected_disease === 1 || log.detected_disease === 2) && (
                      <div>
                        <span className="text-gray-400 text-sm">Status: </span>
                        <span className={`font-medium ${log.detected_disease === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {log.detected_disease === 1 ? 'Green Mold detected' : 'Black Mold detected'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <div 
                      className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-600 transition-colors group relative"
                      onClick={() => {
                        const imageSrc = getImageSrc(log.image, log.id);
                        console.log('Image clicked, src:', imageSrc);
                        if (imageSrc) {
                          setEnlargedImage({
                            src: imageSrc,
                            title: `Scan #${log.chronologicalNumber} - ${getStatusText(log.detected_disease)}`
                          });
                        }
                      }}
                    >
                      {(() => {
                        const imageSrc = getImageSrc(log.image, log.id);
                        console.log(`Rendering image for log ${log.id}, src:`, imageSrc ? 'Generated' : 'None');
                        return imageSrc ? (
                          <>
                            <img 
                              src={imageSrc} 
                              alt={`Scan ${log.chronologicalNumber}`}
                              className="w-full h-full object-cover rounded-lg pointer-events-none"
                              onLoad={() => console.log(`Image loaded successfully for log ${log.id}`)}
                              onError={(e) => {
                                console.error(`Image failed to load for log ${log.id}, src:`, imageSrc);
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : null;
                      })()}
                      <div 
                        className="w-full h-full flex items-center justify-center text-gray-500 text-xs pointer-events-none"
                        style={{ display: getImageSrc(log.image, log.id) ? 'none' : 'flex' }}
                      >
                        {log.image ? 'IMG' : 'No Image'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">No scan history found</h3>
            <p className="text-gray-500 text-sm">
              {filters.status === 'all' && !filters.searchTerm
                ? 'Start scanning your mushroom bags to see history here'
                : 'Try adjusting your filters to see more results'}
            </p>
            {user && (
              <button
                onClick={fetchHistoryLogs}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Show:</span>
            <select
              value={pagination.itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
            >
              {CONFIG.ITEMS_PER_PAGE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <span className="text-gray-400 text-sm">
              of {pagination.totalItems} results
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + Math.max(1, pagination.currentPage - 2);
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      pageNum === pagination.currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === totalPages}
              className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Scan Log</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this scan log? All data associated with this scan will be permanently removed.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDeleteLog}
                disabled={isLoading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLog}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Popup */}
      {showBulkDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Multiple Scan Logs</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">{showBulkDeleteConfirm.logIds.length}</span> selected scan logs? All data associated with these scans will be permanently removed.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelBulkDelete}
                disabled={isLoading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : `Delete ${showBulkDeleteConfirm.logIds.length} Logs`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Enlargement Modal */}
      <ImageEnlargementModal
        isOpen={enlargedImage !== null}
        onClose={() => setEnlargedImage(null)}
        imageSrc={enlargedImage?.src || ''}
        title={enlargedImage?.title || 'Image Preview'}
        alt="Enlarged scan image"
      />

    </div>
  );
};

export default HistoryTab;