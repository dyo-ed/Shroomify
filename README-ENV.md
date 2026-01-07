# Environment Setup for Shroomify

This document explains how to set up the environment variables for the Shroomify project.

## Frontend Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_NGROK_URL=https://reliably-one-kiwi.ngrok-free.app
```

## Backend Environment Variables

The backend configuration is in `backend/config.env`. Update the following values:

```bash
# ngrok Configuration
NGROK_DOMAIN=reliably-one-kiwi.ngrok-free.app
NGROK_AUTHTOKEN=your_ngrok_authtoken_here

# Security Configuration
SECRET_KEY=your_secret_key_here
```

## Getting Your Values

### Supabase
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key

### ngrok
1. Sign up at https://ngrok.com
2. Get your authtoken from the dashboard
3. Update the NGROK_AUTHTOKEN in backend/config.env

### Secret Key
Generate a random secret key for Flask sessions:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## File Structure
- `.env.local` - Frontend environment variables (create this file)
- `backend/config.env` - Backend environment variables (already exists)
- `env.example` - Example frontend environment file
