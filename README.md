# HeavyCare - Gestion de Maintenance Préventive et stock

HeavyCare est une plateforme complète pour la gestion de maintenance, le suivi des huiles et la gestion des équipements pour parcs d'engins lourds.

## Quick Start

1. **Install dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env file with your actual Supabase credentials
   ```

3. **Apply database migrations:**

   ```bash
   # Run the migration scripts in your Supabase SQL Editor
   # See DATABASE_MIGRATION_INSTRUCTIONS.md for detailed instructions
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GEMINI_API_KEY`: Google Gemini AI API key (optional, for AI features)

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Recent Fixes and Improvements

### Database Schema Updates

- Added `serial_number` and `registration_number` columns to machines table
- Fixed maintenance_range values in maintenance_records table
- Enabled NULL values for machine_id in maintenance_records for unmatched records

### Import Functionality

- Enhanced validation for machine imports with serial and registration numbers
- Improved date parsing for maintenance records
- Better handling of mixed content Excel files
- Added detailed error messages for import issues

### UI/UX Improvements

- Added warning toast type support
- Fixed type safety issues
- Enhanced error handling and user feedback

See [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md) for detailed information about all fixes.

## Troubleshooting

### Maintenance Import Issues

If you're experiencing problems with maintenance record imports, check the [MAINTENANCE_IMPORT_TROUBLESHOOTING.md](MAINTENANCE_IMPORT_TROUBLESHOOTING.md) guide for detailed troubleshooting steps.

## Project Structure

```
frontend/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...             # Feature-specific components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── index.html          # HTML template
├── index.tsx           # Application entry point
├── App.tsx             # Main App component
└── vite.config.ts      # Vite configuration
```

## Key Features

- **Machine Management**: Track and manage heavy machinery
- **Filter Management**: Inventory and assign filters to machines
- **Maintenance Scheduling**: Preventive maintenance tracking
- **Dashboard & Analytics**: Visual insights and reporting
- **Theme Customization**: Multiple themes and custom color options
- **AI Assistant**: Smart recommendations and analysis
- **QR Code Support**: Quick machine identification

## Technologies Used

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Supabase for backend services
- Google Gemini AI for intelligent features

## Notes

- The application uses import maps for dependencies in development
- Tailwind CSS is loaded via CDN in the HTML template
- The project supports both light and dark themes
- Hot reload is enabled for development
