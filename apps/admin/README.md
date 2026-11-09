# Admin Application

The Super Admin administration interface for the Multi-Pole Management System.

## Features

- Global dashboard
- List all poles
- Create, edit, and manage poles
- View pole details
- Create and manage users
- Assign users to poles
- Manage roles and permissions
- View global statistics

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Auth + Database)
- Recharts (statistics)
- Lucide React (icons)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3001

## Authentication

The admin app is accessible only to Super Admins. Authentication is handled via Supabase Auth with RLS policies ensuring only Super Admins can access the admin routes.
