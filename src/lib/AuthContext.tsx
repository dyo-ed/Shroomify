'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';

interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user data from localStorage on app start and listen for auth changes
  useEffect(() => {
    const savedUser = localStorage.getItem('shroomify_user');
    const savedLoginState = localStorage.getItem('shroomify_logged_in');
    
    console.log('AuthContext - Loading from localStorage:', { savedUser: !!savedUser, savedLoginState }); // Debug log
    
    if (savedUser && savedLoginState === 'true') {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
        console.log('AuthContext - Set isLoggedIn to true from localStorage'); // Debug log
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        // Clear invalid data
        localStorage.removeItem('shroomify_user');
        localStorage.removeItem('shroomify_logged_in');
      }
    } else {
      console.log('AuthContext - No valid saved auth data, setting isLoggedIn to false'); // Debug log
      setIsLoggedIn(false);
    }
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem('shroomify_user');
        localStorage.removeItem('shroomify_logged_in');
      }
    });
    
    setLoading(false);
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
    // Save to localStorage
    localStorage.setItem('shroomify_user', JSON.stringify(userData));
    localStorage.setItem('shroomify_logged_in', 'true');
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    // Clear from localStorage
    localStorage.removeItem('shroomify_user');
    localStorage.removeItem('shroomify_logged_in');
  };

  const value = {
    isLoggedIn,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};