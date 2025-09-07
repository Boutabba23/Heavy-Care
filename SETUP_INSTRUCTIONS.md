# Database Setup Instructions

## Step 1: Set Up Your Supabase Database

To fix the "failed to fetch" error and get your application working, you need to create the database tables in Supabase.

### 1.1: Access Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com) and sign in to your project
2. Navigate to your project: https://supabase.com/dashboard/project/yklkxvvoeovksyslcfjy
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** to create a new SQL script

### 1.2: Run the Database Setup Script

1. Copy the entire content from `database_setup.sql` file
2. Paste it into the SQL Editor
3. Click **Run** button to execute the script

This will create:

- All required tables ([machines](file://c:\Users\Mohamed\Desktop\Coding\Maintenance-App-Gemini-Builder\frontend\components\DashboardView.tsx#L394-L394), filter_groups, filter_types, maintenance_records)
- Proper indexes for performance
- Row Level Security (RLS) policies
- Sample data for testing

### 1.3: Verify Table Creation

After running the script, you can verify the tables were created:

1. Go to **Table Editor** in the left sidebar
2. You should see all four tables: machines, filter_groups, filter_types, maintenance_records
3. Each table should contain some sample data

## Step 2: Update Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yklkxvvoeovksyslcfjy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Google AI Configuration (optional)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

**Important**: Replace `your_actual_anon_key_here` with your real Supabase anon key from:

- Supabase Dashboard → Settings → API → Project API keys → anon/public

## Step 3: Restart the Development Server

After setting up the database and environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 4: Test User Registration

1. Open http://localhost:3000 in your browser
2. Try creating a new account
3. The application should now work without "failed to fetch" errors

## What Was Fixed

The original error occurred because:

1. **Missing Database Tables**: The application was trying to fetch data from tables that didn't exist
2. **Environment Variables**: Needed to be updated for Next.js conventions
3. **SSR Issues**: localStorage access during server-side rendering was causing crashes
4. **Column Name Mismatch**: Database used snake_case but application expected camelCase

All these issues have been resolved with the updates made to your codebase.

## Troubleshooting

If you still see errors:

1. **Check Supabase Connection**:

   - Verify your Supabase URL and anon key in `.env`
   - Make sure the project is active in Supabase dashboard

2. **Verify Database Tables**:

   - Go to Supabase → Table Editor
   - Confirm all four tables exist with sample data

3. **Check Console Errors**:

   - Open browser developer tools (F12)
   - Look for any remaining errors in the Console tab

4. **Authentication Issues**:
   - Try signing up with a new email address
   - Check Supabase → Authentication → Users to see if accounts are being created

## Next Steps

Once the application is working:

1. You can start adding your own machines and filter data
2. Customize the sample data to match your needs
3. Set up Google AI integration for the AI assistant features
4. Configure any additional authentication providers if needed
