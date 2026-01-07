'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/?error=auth_failed');
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          
          // Extract user information from Google OAuth
          const userEmail = user.email;
          const userName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.user_metadata?.display_name ||
                          'Google User';
          
          if (userEmail) {
            // Check if user already exists in our Users table
            const { data: existingUser, error: fetchError } = await supabase
              .from('Users')
              .select('*')
              .eq('email', userEmail)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
              console.error('Error checking existing user:', fetchError);
              router.push('/?error=database_error');
              return;
            }

            let userData;

            if (existingUser) {
              // User exists, update their information if needed
              userData = existingUser;
              console.log('Existing user logged in:', userData);
            } else {
              // User doesn't exist, create new user with NULL password
              const { data: newUser, error: insertError } = await supabase
                .from('Users')
                .insert([
                  {
                    email: userEmail,
                    password: null, // Set password to NULL for Google users
                    full_name: userName,
                    created_at: new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
                  }
                ])
                .select()
                .single();

              if (insertError) {
                console.error('Error creating new user:', insertError);
                router.push('/?error=user_creation_failed');
                return;
              }

              userData = newUser;
              console.log('New Google user created:', userData);
            }

            // Login the user in our app
            login(userData);
            
            // Redirect to home page
            router.push('/?success=google_login');
          } else {
            console.error('No email found in Google OAuth response');
            router.push('/?error=no_email');
          }
        } else {
          console.error('No session found');
          router.push('/?error=no_session');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/?error=unexpected_error');
      }
    };

    handleAuthCallback();
  }, [router, login]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing Google sign-in...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}
