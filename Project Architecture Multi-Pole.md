# Project Architecture: Multi-Pole Management System

Act as a senior software architect and full-stack engineer. I want you to help me transform my existing application into a scalable multi-pole (multi-chantier) management system.

**Important:** Do not start implementing anything immediately. First inspect the existing project, understand its architecture, and propose an implementation plan.

## 1. Existing Project

- Frontend: Next.js.
- Backend and database: Supabase.
- Authentication: Supabase Auth.
- The application already contains business data stored in Supabase.
- There is also an existing Electron desktop application that I eventually want to rebuild using **Tauri 2 with Rust**, while keeping the same application UI and functionality.
- This project is independent of my other GMAO application.

Preserve existing functionality and data. Avoid unnecessary rewrites.

## 2. Main Objective: Multi-Pole Architecture

I want the application to support multiple independent poles (chantiers).

Each pole must have completely independent data.

For example:

- T154
- T165
- T200

A user assigned to T154 must only access T154 data. They must never access data belonging to T165 or T200.

Every business data record must belong to exactly one pole.

### Existing Data Migration

All existing records currently stored in Supabase must be assigned to a new pole:

- Pole code: T154
- Pole name: T154

Do not lose, delete, duplicate, or modify existing business data during migration.

New poles must start with empty business data.

## 3. User Roles and Permissions

Implement three roles:

### Super Admin
- Has access to all poles.
- Can create, edit, and manage poles.
- Can create users.
- Can assign users to poles.
- Can manage user roles.
- Can view global information across all poles.

### Pole Admin
- Belongs to exactly one pole.
- Can manage users belonging to their own pole.
- Can access and manage their pole's data.
- Cannot access or manage other poles.

### User
- Belongs to exactly one pole.
- Can access only their assigned pole's data.
- Cannot manage users, roles, or poles.

A user must belong to exactly one pole. Users cannot switch between poles.

## 4. Separate Applications

I prefer two completely separate applications rather than having an administration section inside the main application.

### Application A: Admin Application

URL: `admin.example.com`

Accessible only to Super Admins.

Features:
- Global dashboard.
- List all poles.
- Create, edit, and manage poles.
- View pole details.
- Create and manage users.
- Assign users to poles.
- Manage roles and permissions.
- View global statistics.

The Admin Application must not expose its administration functionality to ordinary users.

### Application B: Main Application

URL: `app.example.com`

Accessible to Pole Admins and Users.

Features:
- Existing application functionality.
- Automatically identify the authenticated user's assigned pole.
- Display the current pole in the interface.
- Load only the data belonging to that pole.
- Pole Admins can manage users within their own pole.
- Ordinary users have restricted permissions.

Users must not manually select a pole.

## 5. Backend and Database Architecture

Both applications must use the same Supabase project.

Proposed database structure:

### poles
- id (UUID, primary key)
- code (unique, e.g. T154)
- name
- created_at

### profiles
- id (UUID, references auth.users)
- pole_id (UUID, references poles.id)
- role (super_admin, pole_admin, user)
- created_at

Each user has one profile and, except for Super Admins, belongs to exactly one pole.

Every business table must include:

`pole_id UUID REFERENCES poles(id)`

Adapt this structure to the existing database rather than blindly creating duplicate tables or unnecessary abstractions.

### Row Level Security (RLS)

Security is extremely important.

Implement Supabase Row Level Security policies to enforce data isolation:

- Super Admin: access all poles.
- Pole Admin: access only their assigned pole.
- User: access only their assigned pole, subject to permissions.

Do not rely on frontend filtering for security.

Never expose the Supabase service-role key in frontend code.

Privileged administrative operations must be performed securely on the server side.

Avoid recursive RLS policies. Consider secure helper functions where appropriate.

## 6. Repository Architecture

I prefer a monorepo structure that allows both applications to share code.

Proposed structure:

apps/
  admin/
  main/

packages/
  database/
  auth/
  types/
  ui/

Adapt this structure to the existing repository and technology choices.

Shared packages should contain reusable database types, authentication logic, UI components, and utilities where appropriate.

The two applications should have separate routes, layouts, and access rules.

## 7. Future Desktop Application

I eventually want to replace Electron with Tauri 2 and Rust.

The desktop application should:
- Reuse the main application's UI as much as technically practical.
- Support Windows and Linux.
- Eventually support offline operation.
- Use a local database, preferably SQLite.
- Synchronize local changes with Supabase when internet connectivity is available.

Do not implement offline synchronization yet. First design the web multi-pole architecture correctly.

When evaluating Next.js compatibility with Tauri, consider whether the application uses SSR, API routes, Server Actions, or other server-side features. Do not assume that static export will work without inspecting the code.

## 8. Important Development Rules

1. Inspect the existing repository before proposing changes.
2. Inspect the complete Supabase database schema.
3. Identify all business tables and their relationships.
4. Identify existing authentication, profiles, and RLS policies.
5. Identify database functions, triggers, views, and storage policies that might be affected.
6. Determine the safest way to associate existing records with T154.
7. Preserve all existing functionality.
8. Do not redesign unrelated parts of the application.
9. Do not introduce unnecessary dependencies.
10. Do not make destructive database changes without explaining them and obtaining approval.
11. Never assume table names or relationships without inspecting the actual schema.
12. Keep the implementation modular and maintainable.

## 9. Required Workflow

Work in the following phases:

### Phase 1 — Project Audit
Analyze the existing Next.js application, Supabase integration, authentication, database schema, and current permissions.

Deliver:
- Existing architecture overview.
- Database table inventory.
- Table relationship diagram.
- Current authentication flow.
- Current RLS policies.
- Potential migration risks.

Do not modify anything.

### Phase 2 — Architecture Design
Design the multi-pole architecture based on the actual existing schema.

Deliver:
- Final database schema changes.
- User-role and permission model.
- RLS policy design.
- Admin and Main application architecture.
- Authentication flow between both applications.
- Migration strategy for assigning existing records to T154.

Wait for my approval before implementing.

### Phase 3 — Database Migration
Implement the approved database changes.

Requirements:
- Create the T154 pole.
- Associate existing business records with T154.
- Add pole relationships to relevant tables.
- Implement secure RLS policies.
- Preserve existing records and relationships.
- Provide rollback instructions.

### Phase 4 — Main Application
Modify the existing application to support pole-based access and data isolation.

Preserve its existing UI and functionality as much as possible.

### Phase 5 — Admin Application
Create the separate Super Admin application with pole and user management.

### Phase 6 — Testing and Security
Test:
- Data isolation between poles.
- Super Admin global access.
- Pole Admin restrictions.
- User restrictions.
- Unauthorized access attempts through direct API requests.
- Existing functionality after migration.
- Authentication and session handling.

## 10. First Task

Start with **Phase 1 only**.

Inspect the existing repository and explain what you find.

If you cannot access the Supabase schema directly, tell me exactly what information or SQL export you need from me.

Do not write implementation code or modify the database until I approve the architecture and migration plan.

I want a carefully designed system based on my actual project, not a generic implementation.