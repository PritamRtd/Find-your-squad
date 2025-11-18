# Database Migrations

This directory contains SQL migrations for the Find Your Squad application.

## How to Apply the Migration

### Option 1: Using Supabase SQL Editor (Recommended)

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `mvp_schema.sql` and paste it into the editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## What This Migration Creates

### Tables

1. **profiles** - User profile information
   - Extends `auth.users` with additional fields
   - Fields: year_of_study, branch, skills[], contact_info

2. **events** - Event listings
   - Fields: title, description, created_at

3. **teams** - Teams for events
   - Fields: event_id, creator_id, name, description, max_size, allowed_branches[], allowed_years[]

4. **team_members** - Team membership tracking
   - Fields: team_id, user_id, status (pending/accepted/rejected/leader)

### Security (Row Level Security)

All tables have RLS enabled with appropriate policies:
- **Public Read**: Everyone can view events, teams, profiles, and team members
- **User Control**: Users can only modify their own profiles
- **Creator Control**: Only team creators can update their teams
- **Member Management**: Team creators can accept/reject membership requests

### Performance

Indexes are created on:
- Foreign key columns (event_id, creator_id, team_id, user_id)
- Status column in team_members

### Automatic Timestamps

Triggers automatically update the `updated_at` field whenever a record is modified.

## Verification

After running the migration, verify the tables were created:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies;
```

## Next Steps

After applying this migration:

1. Create a profile for your test users
2. Create sample events
3. Test team creation and membership workflows
4. Verify RLS policies are working correctly
