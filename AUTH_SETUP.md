# Authentication Setup Guide

## Overview

The GestiFiltres application now includes complete authentication using Supabase with support for:

- Email/password authentication
- Google OAuth authentication
- Password reset functionality
- User profile management

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up
3. Go to Settings > API
4. Copy your Project URL and anon/public key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env` in the frontend directory
2. Update the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

### 3. Enable Google Authentication (Optional)

1. In your Supabase project, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins
   - Add `https://your-project-id.supabase.co/auth/v1/callback` to authorized redirect URIs

### 4. Configure RLS (Row Level Security)

Enable RLS on your database tables to secure user data:

```sql
-- Enable RLS on all tables
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_types ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all data" ON machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert data" ON machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update data" ON machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete data" ON machines FOR DELETE TO authenticated USING (true);

-- Repeat similar policies for other tables
```

### 5. Database Schema

Your Supabase database should have the following tables (already defined in types/supabase.ts):

- `machines`
- `filter_groups`
- `filter_types`
- `maintenance_records`

## Features Added

### Authentication Context

- Centralized authentication state management
- Automatic session handling
- Sign in, sign up, sign out functions
- Google OAuth integration

### Login Page

- Modern, responsive design
- Email/password and Google authentication
- Password visibility toggle
- Form validation
- Error handling

### User Profile

- View user information
- Change password functionality
- Account management
- Secure logout

### Protected Routes

- All application features require authentication
- Automatic redirect to login for unauthenticated users
- Loading states during authentication checks

## Usage

1. Start the development server: `npm run dev`
2. Navigate to the application at http://localhost:3000
3. Register a new account or sign in with existing credentials
4. Use Google OAuth for quick authentication (if configured)
5. Access user profile from the sidebar
6. Manage your account settings and security

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive configuration
- Enable RLS policies appropriate for your use case
- Regularly rotate API keys
- Monitor authentication logs in Supabase dashboard
