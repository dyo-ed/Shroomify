'use client';
import { User, Camera, Calendar, Edit3, Mail, Phone, Trophy, Target, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle, Clock, LogOut, BarChart3 } from 'lucide-react';
import React, { JSX, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

// Type definitions
interface UserData {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  experienceLevel: string;
  favoriteMethod: string;
  avatar?: string | null;
}

interface ActivityItem {
  id: number;
  type: 'scan' | 'achievement' | 'alert';
  title: string;
  time: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'red' | 'blue';
}

interface HistoryLog {
  id: number;
  date_logged: string | null;
  image: Uint8Array | null;
  detected_disease: number | null;
  email: string | null;
  confidence: number | null;
  chronologicalNumber?: number;
}

interface ProfileTabProps {
  userData?: UserData;
  onUpdateProfile?: (data: UserData) => void;
  onUpdateAvatar?: () => void;
  _activityData?: ActivityItem[];
  _personalizedTip?: string;
  _isLoggedIn?: boolean;
  onLogin?: (email: string, password: string) => Promise<void>;
  onSignUp?: (email: string, password: string, name: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  authLoading?: boolean;
  authError?: string | null;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ 
  userData = {
    name: "Juan Dela Cruz",
    email: "juan.delacruz@shroomify.com",
    phone: "+63 912 345 6789",
    joinDate: "January 2024",
    experienceLevel: "Intermediate",
    favoriteMethod: "Straw Substrate",
    avatar: null
  },
  onUpdateProfile,
  onUpdateAvatar,
  _activityData = [
    {
      id: 1,
      type: "scan",
      title: "Scanned fruiting bag #23",
      time: "2 hours ago",
      status: "Healthy",
      statusColor: "green"
    },
    {
      id: 2,
      type: "achievement",
      title: "Achieved 12-day streak",
      time: "1 day ago",
      status: "Achievement",
      statusColor: "yellow"
    },
    {
      id: 3,
      type: "alert",
      title: "Detected contamination early",
      time: "3 days ago",
      status: "Alert",
      statusColor: "red"
    }
  ],
  _personalizedTip = "Based on your cultivation history, consider trying the hardwood sawdust method next! Your success rate with straw substrate shows you're ready for intermediate techniques.",
  _isLoggedIn = false,
  onLogin,
  onSignUp,
  onGoogleLogin: _onGoogleLogin,
  authLoading: _propAuthLoading = false,
  authError = null
}) => {
  const { isLoggedIn: globalIsLoggedIn, user: globalUser, login: globalLogin, logout: globalLogout, loading: globalAuthLoading } = useAuth();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [localUserData, setLocalUserData] = useState<UserData>(
    globalUser ? {
      name: globalUser.full_name,
      email: globalUser.email,
      phone: "+63 912 345 6789", // Default phone
      joinDate: new Date(globalUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      experienceLevel: "Intermediate",
      favoriteMethod: "Straw Substrate",
      avatar: null
    } : userData
  );
  
  // Auth form states
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [localAuthLoading, setLocalAuthLoading] = useState<boolean>(false);

  // Logs state management
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Phone number editing state
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [phoneLoading, setPhoneLoading] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Tips rotation state
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);

  // Cultivation preferences editing state
  const [isEditingPreferences, setIsEditingPreferences] = useState<boolean>(false);
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(false);
  const [preferencesError, setPreferencesError] = useState<string>('');

  // Statistics state
  const [statistics, setStatistics] = useState<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    averagePerDay: number;
  }>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    averagePerDay: 0
  });
  const [statisticsLoading, setStatisticsLoading] = useState<boolean>(false);

  // Cultivation options
  const cultivationMethods = [
    'Straw Substrate',
    'Hardwood Sawdust',
    'Coco Coir',
    'Grain Spawn',
    'Liquid Culture',
    'Agar Plates',
    'Monotub',
    'PF Tek',
    'Bulk Substrate',
    'Outdoor Cultivation'
  ];

  const experienceLevels = [
    'Beginner',
    'Intermediate', 
    'Advanced',
    'Expert'
  ];

  // Helpful cultivation tips
  const cultivationTips = [
    {
      title: "🌡️ Temperature Control",
      tip: "Maintain consistent temperatures between 70-75°F (21-24°C) for optimal mushroom growth. Fluctuations can stress your mycelium."
    },
    {
      title: "💧 Humidity Management", 
      tip: "Keep humidity levels between 80-95% during fruiting. Use a hygrometer to monitor and mist regularly with distilled water."
    },
    {
      title: "🌬️ Fresh Air Exchange",
      tip: "Provide fresh air exchange (FAE) 2-3 times daily. This prevents CO2 buildup and promotes healthy mushroom development."
    },
    {
      title: "🔍 Early Contamination Detection",
      tip: "Check your bags daily for signs of contamination like unusual colors, odors, or textures. Early detection saves your crop."
    },
    {
      title: "📏 Proper Spacing",
      tip: "Allow adequate space between fruiting bodies. Overcrowding can lead to deformed mushrooms and increased contamination risk."
    },
    {
      title: "🧼 Sterile Environment",
      tip: "Always work in a clean, sterile environment. Use 70% isopropyl alcohol to sanitize tools and surfaces before handling."
    },
    {
      title: "⏰ Harvest Timing",
      tip: "Harvest mushrooms when the caps are fully opened but before the veil breaks completely for the best texture and flavor."
    },
    {
      title: "🔄 Substrate Preparation",
      tip: "Properly pasteurize your substrate at 160-180°F for 1-2 hours to eliminate competing organisms while preserving beneficial microbes."
    },
    {
      title: "💡 Light Requirements",
      tip: "Mushrooms need indirect light for proper development. Avoid direct sunlight - a simple LED light works perfectly."
    },
    {
      title: "📊 Growth Tracking",
      tip: "Keep a cultivation journal to track conditions, growth rates, and yields. This helps optimize your future grows."
    }
  ];

  // Fetch history logs from Supabase
  const fetchHistoryLogs = useCallback(async () => {
    if (!globalUser?.email) {
      setHistoryLogs([]);
      return;
    }

    setLogsLoading(true);
    setLogsError(null);

    try {
      // First, fetch ALL logs to calculate proper chronological numbers
      let { data: allLogs, error: allLogsError } = await supabase
        .from('"Logs"')
        .select('*')
        .eq('email', globalUser.email)
        .order('date_logged', { ascending: false });

      // If that fails, try without quotes
      if (allLogsError) {
        const result = await supabase
          .from('Logs')
          .select('*')
          .eq('email', globalUser.email)
          .order('date_logged', { ascending: false });
        
        allLogs = result.data;
        allLogsError = result.error;
      }

      if (allLogsError) {
        throw allLogsError;
      }

      // Add chronological numbering to ALL logs (oldest first, like in HistoryTab)
      const allLogsWithNumbers = (allLogs || []).map(log => {
        // Sort all logs by date to get chronological order
        const sortedLogs = [...(allLogs || [])].sort((a, b) => {
          const aDate = a.date_logged;
          const bDate = b.date_logged;
          
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
        
        const chronologicalIndex = sortedLogs.findIndex(sortedLog => sortedLog.id === log.id);
        return {
          ...log,
          chronologicalNumber: chronologicalIndex + 1
        };
      });

      // Now take only the 3 most recent logs for display
      const recentLogs = allLogsWithNumbers.slice(0, 3);
      
      setHistoryLogs(recentLogs);
    } catch (err) {
      console.error('Error fetching history logs:', err);
      setLogsError(`Failed to load recent activity: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setHistoryLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [globalUser?.email]);

  // Fetch user data from database including phone number and preferences
  const fetchUserData = useCallback(async () => {
    if (!globalUser?.email) return;

    try {
      const { data, error } = await supabase
        .from('Users')
        .select('phone_number, favorite, experience_level')
        .eq('email', globalUser.email)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      // Update local user data with data from database
      setLocalUserData(prev => ({
        ...prev,
        phone: data.phone_number || '+63',
        favoriteMethod: data.favorite || 'Straw Substrate',
        experienceLevel: data.experience_level || 'Intermediate'
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [globalUser?.email]);

  // Update local user data when global user changes
  useEffect(() => {
    if (globalUser) {
      setLocalUserData({
        name: globalUser.full_name,
        email: globalUser.email,
        phone: "+63", // Default phone, will be updated by fetchUserData
        joinDate: new Date(globalUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        experienceLevel: "Active",
        favoriteMethod: "Straw Substrate",
        avatar: null
      });
      
      // Fetch additional user data including phone number
      fetchUserData();
    }
  }, [globalUser, fetchUserData]);

  // Fetch logs when user changes
  useEffect(() => {
    if (globalUser) {
      fetchHistoryLogs();
    }
  }, [fetchHistoryLogs, globalUser]);

  // Fetch statistics from Supabase
  const fetchStatistics = useCallback(async () => {
    if (!globalUser?.email) {
      setStatistics({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        averagePerDay: 0
      });
      return;
    }

    setStatisticsLoading(true);

    try {
      // Get all logs for the user from the Logs table
      let { data, error } = await supabase
        .from('"Logs"')
        .select('id, date_logged, detected_disease, confidence')
        .eq('email', globalUser.email)
        .order('date_logged', { ascending: false });

      // If that fails, try without quotes
      if (error) {
        const result = await supabase
          .from('Logs')
          .select('id, date_logged, detected_disease, confidence')
          .eq('email', globalUser.email)
          .order('date_logged', { ascending: false });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        throw error;
      }

      const logs = data || [];
      const now = new Date();
      
      // Calculate date ranges with proper timezone handling
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Count scans by time period
      const todayScans = logs.filter(log => {
        if (!log.date_logged) return false;
        const logDate = new Date(log.date_logged);
        return logDate >= today;
      }).length;

      const weekScans = logs.filter(log => {
        if (!log.date_logged) return false;
        const logDate = new Date(log.date_logged);
        return logDate >= weekAgo;
      }).length;

      const monthScans = logs.filter(log => {
        if (!log.date_logged) return false;
        const logDate = new Date(log.date_logged);
        return logDate >= monthAgo;
      }).length;

      // Calculate average scans per day (based on last 30 days)
      const totalDays = Math.max(1, Math.floor((now.getTime() - monthAgo.getTime()) / (24 * 60 * 60 * 1000)));
      const averagePerDay = totalDays > 0 ? Math.ceil(monthScans / totalDays) : 0;

      setStatistics({
        today: todayScans,
        thisWeek: weekScans,
        thisMonth: monthScans,
        averagePerDay: averagePerDay
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStatistics({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        averagePerDay: 0
      });
    } finally {
      setStatisticsLoading(false);
    }
  }, [globalUser?.email]);

  // Fetch statistics when user changes
  useEffect(() => {
    if (globalUser) {
      fetchStatistics();
    }
  }, [fetchStatistics, globalUser]);

  // Auto-rotate tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => 
        (prevIndex + 1) % cultivationTips.length
      );
    }, 8000); // Change tip every 8 seconds

    return () => clearInterval(interval);
  }, [cultivationTips.length]);

  // Handle profile updates
  const handleProfileUpdate = (field: keyof UserData, value: string): void => {
    const updatedData = { ...localUserData, [field]: value };
    setLocalUserData(updatedData);
    if (onUpdateProfile) {
      onUpdateProfile(updatedData);
    }
  };

  // Handle avatar update
  const handleAvatarUpdate = (): void => {
    if (onUpdateAvatar) {
      onUpdateAvatar();
    }
  };

  // Generate initials from name
  const getInitials = (name: string): string => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  // Get activity icon based on type
  const _getActivityIcon = (type: ActivityItem['type']): JSX.Element => {
    const iconMap = {
      scan: Camera,
      achievement: Trophy,
      alert: Target
    };
    const IconComponent = iconMap[type];
    return <IconComponent className="w-4 h-4" />;
  };

  // Get status color classes
  const _getStatusColorClasses = (color: ActivityItem['statusColor']) => {
    const colorMap = {
      green: {
        bg: "bg-green-600/20",
        text: "text-green-400",
        iconBg: "bg-green-600/20"
      },
      yellow: {
        bg: "bg-yellow-600/20",
        text: "text-yellow-400",
        iconBg: "bg-yellow-600/20"
      },
      red: {
        bg: "bg-red-600/20",
        text: "text-red-400",
        iconBg: "bg-red-600/20"
      },
      blue: {
        bg: "bg-blue-600/20",
        text: "text-blue-400",
        iconBg: "bg-blue-600/20"
      }
    };
    return colorMap[color];
  };

  // Utility functions for logs
  const getStatusIcon = (detectedDisease: number | null) => {
    return (detectedDisease === 1 || detectedDisease === 2) ? (
      <AlertTriangle className="w-4 h-4 text-red-400" />
    ) : (
      <CheckCircle className="w-4 h-4 text-green-400" />
    );
  };

  const getStatusColor = (detectedDisease: number | null) => {
    return (detectedDisease === 1 || detectedDisease === 2)
      ? 'bg-red-600/20 text-red-400 border-red-600/30' 
      : 'bg-green-600/20 text-green-400 border-green-600/30';
  };

  const getStatusText = (detectedDisease: number | null) => {
    return (detectedDisease === 1 || detectedDisease === 2) ? 'Contaminated' : 'Healthy';
  };

  const formatDate = (dateLogged: string | null) => {
    if (!dateLogged) return 'No date';
    const date = new Date(dateLogged);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Save user to database
  const saveUserToDatabase = async (userEmail: string, userPassword: string, userName: string) => {
    try {
      const { data, error } = await supabase
        .from('Users')
        .insert([
          {
            email: userEmail,
            password: userPassword,
            full_name: userName,
            created_at: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
          }
        ])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      console.log('User saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  // Check user credentials for login
  const checkUserCredentials = async (userEmail: string, userPassword: string) => {
    try {
      const { data, error } = await supabase
        .from('Users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Invalid email or password');
      }

      // Check if user has a NULL password (Google OAuth user)
      if (data.password === null) {
        throw new Error('This account uses Google sign-in. Please use the "Continue with Google" button to sign in.');
      }

      // Check if password matches
      if (data.password !== userPassword) {
        throw new Error('Invalid email or password');
      }

      console.log('User logged in successfully:', data);
      return data;
    } catch (error) {
      console.error('Error checking credentials:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Enhanced validation
    if (!email.trim()) {
      setFormError('Please enter your email address');
      return;
    }

    if (!password.trim()) {
      setFormError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    if (isSignUp && !name.trim()) {
      setFormError('Please enter your full name');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      setLocalAuthLoading(true);
      
      if (isSignUp) {
        // Save to database first
        await saveUserToDatabase(email.trim(), password, name.trim());
        
        // Show success message
        setFormSuccess('Account created successfully!');
        
        // Clear form
        setEmail('');
        setPassword('');
        setName('');
        
        // Then call the original onSignUp if it exists
        if (onSignUp) {
          await onSignUp(email.trim(), password, name.trim());
        }
      } else {
        // Login logic
        const userData = await checkUserCredentials(email.trim(), password);
        
        // Show success message
        setFormSuccess('Login successful! Welcome back! 🍄');
        
        // Clear form
        setEmail('');
        setPassword('');
        
        // Use global login function
        globalLogin(userData);
        
        // Call the original onLogin if it exists
        if (onLogin) {
          await onLogin(email.trim(), password);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setFormError('Authentication failed. Please try again.');
    } finally {
      setLocalAuthLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setLocalAuthLoading(true);
      setFormError('');
      setFormSuccess('');

      // Sign in with Google using Supabase
      // Get the current origin, but replace localhost with the actual domain if in production
      let baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      
      // If we're in production but still getting localhost, try to detect the real domain
      if (baseUrl.includes('localhost') && typeof window !== 'undefined') {
        // Check if we're actually on a production domain
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          baseUrl = `${window.location.protocol}//${window.location.host}`;
        }
      }
      
      const redirectUrl = `${baseUrl}/auth/callback`;
      
      // Debug logging
      console.log('OAuth Debug Info:', {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        window_origin: typeof window !== 'undefined' ? window.location.origin : 'undefined',
        window_hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
        final_base_url: baseUrl,
        final_redirect_url: redirectUrl
      });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setFormError('Google login failed. Please try again.');
        return;
      }

      // The OAuth flow will redirect, so we don't need to handle the response here
      console.log('Google OAuth initiated:', data);
      
    } catch (error) {
      console.error('Google login error:', error);
      setFormError('Google login failed. Please try again.');
    } finally {
      setLocalAuthLoading(false);
    }
  };

  // Reset form when switching between login/signup
  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setFormError('');
    setFormSuccess('');
    setEmail('');
    setPassword('');
    setName('');
  };

  // Handle logout
  const handleLogout = () => {
    globalLogout();
    setFormError('');
    setFormSuccess('');
  };

  // Update phone number in Supabase
  const updatePhoneNumber = async (phoneNumber: string) => {
    if (!globalUser?.email) {
      setPhoneError('User not found');
      return;
    }

    setPhoneLoading(true);
    setPhoneError('');

    try {
      const { error } = await supabase
        .from('Users')
        .update({ phone_number: phoneNumber })
        .eq('email', globalUser.email);

      if (error) {
        throw error;
      }

      // Update local state
      setLocalUserData(prev => ({ ...prev, phone: phoneNumber }));
      setIsEditingPhone(false);
      setPhoneInput('');
    } catch (error) {
      console.error('Error updating phone number:', error);
      setPhoneError('Failed to update phone number. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // Handle phone number input change
  const handlePhoneInputChange = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Limit to 10 digits (Philippine mobile numbers)
    if (numericValue.length <= 10) {
      setPhoneInput(numericValue);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '+63';
    
    // If phone already starts with +63, return as is
    if (phone.startsWith('+63')) {
      return phone;
    }
    
    // If phone starts with 63, add +
    if (phone.startsWith('63')) {
      return `+${phone}`;
    }
    
    // If phone starts with 0, replace with +63
    if (phone.startsWith('0')) {
      return `+63${phone.substring(1)}`;
    }
    
    // Otherwise, add +63 prefix
    return `+63${phone}`;
  };

  // Handle phone number save
  const handlePhoneSave = () => {
    if (!phoneInput.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }

    if (phoneInput.length < 10) {
      setPhoneError('Phone number must be at least 10 digits');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneInput);
    updatePhoneNumber(formattedPhone);
  };

  // Handle phone number edit start
  const handlePhoneEditStart = () => {
    // Extract the number part from the current phone (remove +63)
    // If no phone is saved or it's just '+63', start with empty input
    const currentNumber = (localUserData.phone && localUserData.phone !== '+63') 
      ? localUserData.phone.replace(/^\+63/, '') 
      : '';
    setPhoneInput(currentNumber);
    setIsEditingPhone(true);
    setPhoneError('');
  };

  // Handle phone number edit cancel
  const handlePhoneEditCancel = () => {
    setIsEditingPhone(false);
    setPhoneInput('');
    setPhoneError('');
  };

  // Update cultivation preferences in Supabase
  const updatePreferences = async (favoriteMethod: string, experienceLevel: string) => {
    if (!globalUser?.email) {
      setPreferencesError('User not found');
      return;
    }

    setPreferencesLoading(true);
    setPreferencesError('');

    try {
      const { error } = await supabase
        .from('Users')
        .update({ 
          favorite: favoriteMethod,
          experience_level: experienceLevel 
        })
        .eq('email', globalUser.email);

      if (error) {
        throw error;
      }

      // Update local state
      setLocalUserData(prev => ({ 
        ...prev, 
        favoriteMethod: favoriteMethod,
        experienceLevel: experienceLevel 
      }));
      setIsEditingPreferences(false);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setPreferencesError('Failed to update preferences. Please try again.');
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Handle preferences save
  const handlePreferencesSave = (favoriteMethod: string, experienceLevel: string) => {
    if (!favoriteMethod || !experienceLevel) {
      setPreferencesError('Please select both favorite method and experience level');
      return;
    }

    updatePreferences(favoriteMethod, experienceLevel);
  };

  // Handle preferences edit start
  const handlePreferencesEditStart = () => {
    setIsEditingPreferences(true);
    setPreferencesError('');
  };

  // Handle preferences edit cancel
  const handlePreferencesEditCancel = () => {
    setIsEditingPreferences(false);
    setPreferencesError('');
  };

  // Statistics Bar Graph Component
  const StatisticsBarGraph = ({ stats, loading }: { stats: typeof statistics, loading: boolean }) => {
    const dataPoints = [
      { label: 'Today', value: stats.today, color: 'bg-blue-500' },
      { label: 'This Week', value: stats.thisWeek, color: 'bg-green-500' },
      { label: 'This Month', value: stats.thisMonth, color: 'bg-purple-500' },
      { label: 'Avg/Day', value: stats.averagePerDay, color: 'bg-orange-500' }
    ];

    // Filter out data points with zero values for the bar chart, excluding Avg/Day
    const nonZeroDataPoints = dataPoints.filter(item => item.value > 0 && item.label !== 'Avg/Day');
    const maxValue = nonZeroDataPoints.length > 0 ? Math.max(...nonZeroDataPoints.map(item => item.value)) : 1;
    
    console.log('Statistics data:', stats);
    console.log('Non-zero data points:', nonZeroDataPoints);
    console.log('Max value:', maxValue);
    
    const getBarHeight = (value: number) => {
      if (maxValue === 0) return 0;
      // Use pixel height, but leave some padding (container is h-48 = 192px, use 180px max)
      const containerHeight = 130; // Leave 12px padding
      const height = (value / maxValue) * containerHeight;
      // Ensure minimum height for visibility if value > 0, but don't exceed container
      const finalHeight = value > 0 ? Math.min(Math.max(height, 20), containerHeight) : 0;
      console.log(`Bar height for value ${value}: ${finalHeight}px (maxValue: ${maxValue})`);
      return finalHeight;
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-400 font-medium">Loading scan statistics...</span>
          </div>
        </div>
      );
    }

    const totalScans = stats.today + stats.thisWeek + stats.thisMonth;
    const hasAnyData = totalScans > 0;

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-2">
          {dataPoints.map((item, _index) => (
            <div key={item.label} className="bg-gray-700/50 rounded-lg p-2 border border-gray-600/50">
              <div className="text-center">
                <div className="text-lg font-bold text-white mb-1">{item.value}</div>
                <div className="text-xs text-gray-400 font-medium leading-tight">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bar Chart - Only show if there's data */}
        {hasAnyData && nonZeroDataPoints.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Activity Overview</h4>
              <div className="text-xs text-gray-500">
              </div>
            </div>
            
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-end justify-between space-x-2 h-48">
                {nonZeroDataPoints.map((item, _index) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center group">
                    <div className="w-full bg-gray-600/50 rounded-t-lg relative h-full">
                      <div
                        className={`w-full ${item.color} rounded-t-lg transition-all duration-700 ease-out group-hover:opacity-90 absolute bottom-0`}
                        style={{ 
                          height: `${getBarHeight(item.value)}px`,
                          minHeight: '8px'
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-3 text-center font-medium">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!hasAnyData && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Scan Data</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Start scanning your mushroom bags to see your activity statistics here
            </p>
          </div>
        )}
      </div>
    );
  };

  // Preferences Edit Form Component
  const PreferencesEditForm = ({ 
    currentFavoriteMethod, 
    currentExperienceLevel, 
    cultivationMethods, 
    experienceLevels, 
    onSave, 
    onCancel, 
    loading, 
    error 
  }: {
    currentFavoriteMethod: string;
    currentExperienceLevel: string;
    cultivationMethods: string[];
    experienceLevels: string[];
    onSave: (favoriteMethod: string, experienceLevel: string) => void;
    onCancel: () => void;
    loading: boolean;
    error: string;
  }) => {
    const [selectedMethod, setSelectedMethod] = useState(currentFavoriteMethod);
    const [selectedLevel, setSelectedLevel] = useState(currentExperienceLevel);

    const handleSave = () => {
      onSave(selectedMethod, selectedLevel);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Favorite Method
          </label>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-green-400"
          >
            {cultivationMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Experience Level
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-green-400"
          >
            {experienceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 relative">
      {/* Profile Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="relative bg-gradient-to-br from-green-600/20 to-blue-600/20 p-6">
          <div className="absolute top-4 right-4">
            <button 
              onClick={handleLogout}
              className="bg-gray-700/50 hover:bg-gray-600/50 p-2 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-300" />
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              {localUserData.avatar ? (
                <img 
                  src={localUserData.avatar} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials(localUserData.name)}
                </div>
              )}
              <button 
                onClick={handleAvatarUpdate}
                className="absolute -bottom-1 -right-1 bg-gray-700 hover:bg-gray-600 p-1.5 rounded-full transition-colors border-2 border-gray-800"
                aria-label="Update avatar"
              >
                <Camera className="w-3 h-3 text-gray-300" />
              </button>
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={localUserData.name}
                  onChange={(e) => handleProfileUpdate('name', e.target.value)}
                  className="text-xl font-semibold text-white bg-transparent border-b border-gray-600 focus:border-green-400 outline-none mb-1"
                  onBlur={() => setIsEditing(false)}
                  autoFocus
                />
              ) : (
                <h3 className="text-xl font-semibold text-white mb-1">{localUserData.name}</h3>
              )}
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                <span>Member since {localUserData.joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center text-gray-300 text-sm">
              <Mail className="w-4 h-4 mr-3 text-gray-400" />
              <span>{localUserData.email}</span>
            </div>
            <div className="flex items-center text-gray-300 text-sm">
              <Phone className="w-4 h-4 mr-3 text-gray-400" />
              {isEditingPhone ? (
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">+63</span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-green-400 w-32"
                      placeholder="9123456789"
                      maxLength={10}
                      autoFocus
                    />
                    <button
                      onClick={handlePhoneSave}
                      disabled={phoneLoading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      {phoneLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handlePhoneEditCancel}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {phoneError && (
                    <p className="text-red-400 text-xs mt-1">{phoneError}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={handlePhoneEditStart}
                  className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 group"
                >
                  {localUserData.phone && localUserData.phone !== '+63' ? (
                    <>
                      <span>{localUserData.phone}</span>
                      <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  ) : (
                    <span className="text-green-400 hover:text-green-300 font-medium">
                      + Add your number
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Statistics */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Scan Analytics</h3>
          <div className="text-sm text-gray-400">
            Real-time data from your scans
          </div>
        </div>
        <StatisticsBarGraph stats={statistics} loading={statisticsLoading} />
      </div>

      {/* Cultivation Preferences */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">🍄 Cultivation Preferences</h3>
          {!isEditingPreferences && (
            <button
              onClick={handlePreferencesEditStart}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Edit preferences"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {isEditingPreferences ? (
          <PreferencesEditForm 
            currentFavoriteMethod={localUserData.favoriteMethod}
            currentExperienceLevel={localUserData.experienceLevel}
            cultivationMethods={cultivationMethods}
            experienceLevels={experienceLevels}
            onSave={handlePreferencesSave}
            onCancel={handlePreferencesEditCancel}
            loading={preferencesLoading}
            error={preferencesError}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Favorite Method:</span>
              <span className="text-green-400 font-medium">{localUserData.favoriteMethod}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Experience Level:</span>
              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded text-sm">
                {localUserData.experienceLevel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">📊 Recent Activity</h3>
        
        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Loading recent scans...</span>
          </div>
        ) : logsError ? (
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-red-400 text-sm">{logsError}</p>
            </div>
          </div>
        ) : historyLogs.length > 0 ? (
          <div className="space-y-3">
            {historyLogs.map((log) => (
              <div key={log.id} className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${(log.detected_disease === 1 || log.detected_disease === 2) ? 'bg-red-600/20' : 'bg-green-600/20'} rounded-full flex items-center justify-center`}>
                  {getStatusIcon(log.detected_disease)}
                </div>
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">
                    Scanned bag #{log.chronologicalNumber || log.id} - {getStatusText(log.detected_disease)}
                  </p>
                  <div className="flex items-center space-x-2 text-gray-500 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(log.date_logged)}</span>
                    {log.confidence && (
                      <>
                        <span>•</span>
                        <span>{Math.round(log.confidence * 100)}% confidence</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(log.detected_disease)}`}>
                  {getStatusText(log.detected_disease)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">No recent scans found</p>
            <p className="text-gray-500 text-xs mt-1">Start scanning to see your activity here</p>
          </div>
        )}
      </div>

      {/* Cultivation Tips */}
      <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg p-4 border border-green-600/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">💡 Cultivation Tip</h3>
          <div className="flex space-x-1">
            {cultivationTips.map((_, _index) => (
              <div
                key={_index}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  _index === currentTipIndex ? 'bg-green-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-green-400 font-medium text-sm">
            {cultivationTips[currentTipIndex].title}
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            {cultivationTips[currentTipIndex].tip}
          </p>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Tip {currentTipIndex + 1} of {cultivationTips.length}
        </div>
      </div>

      {/* Login Gate Overlay */}
      {!globalIsLoggedIn && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden my-8">
                              <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 p-4 text-center">
                <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {isSignUp ? 'Join The KabuTeam' : 'Welcome Back'}
                </h3>
                <p className="text-gray-300 text-xs mt-1">
                  {isSignUp 
                    ? 'Create your account to start your cultivation journey' 
                    : 'Sign in to access your profile and cultivation data'
                  }
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 max-h-[50vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                  {/* Name field for signup */}
                  {isSignUp && (
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                        placeholder="Enter your full name"
                        required={isSignUp}
                        autoComplete="name"
                        aria-describedby={isSignUp ? "name-error" : undefined}
                      />
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                      placeholder="Enter your email"
                      required
                      autoComplete="email"
                      aria-describedby="email-error"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 pr-10"
                        placeholder="Enter your password"
                        required
                        minLength={6}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        aria-describedby="password-error"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Success display */}
                  {formSuccess && (
                    <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-3">
                      <p className="text-green-400 text-sm">{formSuccess}</p>
                    </div>
                  )}

                  {/* Error display */}
                  {(formError || authError) && (
                    <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">{formError || authError}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={localAuthLoading || globalAuthLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    {localAuthLoading || globalAuthLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center my-3">
                  <div className="flex-1 border-t border-gray-600"></div>
                  <span className="px-3 text-sm text-gray-400">or</span>
                  <div className="flex-1 border-t border-gray-600"></div>
                </div>

                {/* Google login button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={localAuthLoading || globalAuthLoading}
                  className="w-full bg-white hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] active:bg-gray-100 disabled:bg-gray-300 disabled:scale-100 disabled:shadow-none text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out flex items-center justify-center space-x-2 border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {localAuthLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span>{localAuthLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                {/* Toggle between login/signup */}
                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-green-400 hover:text-green-300 text-sm font-medium"
                  >
                    {isSignUp 
                      ? 'Already have an account? Sign in' 
                      : 'Need an account? Sign up'
                    }
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-3">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileTab;