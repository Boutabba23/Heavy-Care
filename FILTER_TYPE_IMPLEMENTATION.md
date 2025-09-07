# Implementation: Filter Type Selection for Filter Groups

## Summary

This implementation adds a "Type de filtre" (filter type) selection when creating filter groups, and ensures that when assigning filters to engines, only filter groups of the same type are displayed (e.g., only "huile" - oil filters).

## Changes Made

### 1. Database Schema Update

- **File**: `database_setup.sql` and `database_migration.sql`
- **Changes**: Added `filter_type TEXT` column to the `filter_groups` table
- **Index**: Created index on `filter_type` for better performance
- **Sample Data**: Updated sample filter groups to have specific filter types

### 2. TypeScript Types Update

- **File**: `types.ts`
- **Changes**: Added `filterType: string` field to the `FilterGroup` interface
- **Purpose**: Ensures type safety for the new filter type field

### 3. Filter Group Modal Enhancement

- **File**: `components/FilterGroupModal.tsx`
- **Changes**:
  - Added `filterTypes: FilterType[]` prop to the component interface
  - Added filter type state management (`filterType`, `filterTypeError`)
  - Added filter type validation in `handleSave` function
  - Added `handleFilterTypeChange` function
  - Added filter type select dropdown in the UI after the group name field
  - Updated `useEffect` to handle filter type when editing existing groups
  - Updated form submission to include `filterType` in the saved data

### 4. App Content Update

- **File**: `components/AppContent.tsx`
- **Changes**: Added `filterTypes={state.filterTypes}` prop when rendering `FilterGroupModal`

### 5. Backend Logic Update

- **File**: `hooks/useAppLogic.ts`
- **Changes**:
  - Updated `saveFilterGroup` function to save `filter_type` field to database
  - Updated `fetchData` function to load `filterType` from `filter_type` column
  - Maintains backward compatibility with existing data (empty string if null)

### 6. Machine Filter Assignment Update

- **File**: `components/MachineDetailView.tsx`
- **Changes**: Updated filter group selection dropdown to only show groups where `group.filterType === filterType.id`

## How It Works

### Creating a New Filter Group

1. User clicks "Nouveau Groupe" in Filter Management
2. Modal opens with "Type de filtre" dropdown populated with available filter types
3. User must select both a group name and a filter type
4. Validation ensures both fields are filled before saving
5. Filter group is saved with the selected filter type

### Assigning Filters to Engines

1. User goes to machine detail view
2. For each filter type assigned to the machine, they can select a filter group
3. **Key Feature**: The dropdown now only shows filter groups that match the current filter type
4. Example: For "Filtre à huile" type, only groups with `filterType: "ft-oil"` are shown

### Database Structure

```sql
-- New column added to existing filter_groups table
ALTER TABLE public.filter_groups
ADD COLUMN filter_type TEXT;

-- Example data
INSERT INTO filter_groups (name, filter_type, ...) VALUES
('Filtres Huile Standard', 'ft-oil', ...),
('Filtres Air Premium', 'ft-air', ...);
```

## User Experience Improvements

### Before Implementation

- All filter groups were shown for every filter type
- Users could accidentally assign an air filter group to an oil filter type
- No organization by filter type

### After Implementation

- Filter groups are organized by type during creation
- Filter assignment is filtered by type, preventing mistakes
- Clear separation between different filter types (huile, air, carburant, etc.)
- Improved data integrity and user experience

## Migration Instructions

For existing installations:

1. **Database Migration**: Run the `database_migration.sql` script in Supabase SQL Editor
2. **Manual Data Update**: Existing filter groups will have `filter_type = null`, administrators should:
   - Edit existing filter groups to set appropriate filter types
   - Or run manual UPDATE queries to set filter types based on group names

For new installations:

- Use the updated `database_setup.sql` which includes the `filter_type` column

## Technical Details

### Validation

- Filter type is required when creating/editing filter groups
- Frontend validation prevents empty filter type submission
- Backend stores the filter type in the database

### Performance

- Added database index on `filter_type` for efficient filtering
- Client-side filtering in React for immediate response

### Backward Compatibility

- Existing filter groups without filter type are handled gracefully
- No breaking changes to existing functionality
- Gradual migration path for existing data

### Error Handling

- Proper error messages for missing filter type
- Form validation prevents invalid submissions
- Database constraints ensure data integrity

## Example Usage

```typescript
// Creating a new oil filter group
const oilFilterGroup = {
  name: "Filtres Huile CAT 320D",
  filterType: "ft-oil", // Links to oil filter type
  references: [...]
};

// When assigning to machine, only oil filter groups shown
const availableGroups = filterGroups.filter(
  group => group.filterType === "ft-oil"
);
```

This implementation ensures data integrity, improves user experience, and provides a logical organization structure for filter management.
