# Supabase Setup Guide

This guide will help you set up Supabase for the Find Your Squad application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)

## Step-by-Step Setup

### 1. Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Find Your Squad (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (this may take a few minutes)

### 2. Get Your API Credentials

1. Once your project is ready, go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL** (under Project API)
   - **anon public** key (under Project API keys)

### 3. Configure Environment Variables

1. In your project root, create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   Replace `your-project-url` and `your-anon-key` with the values from step 2.

### 4. Configure Authentication Settings (Optional)

By default, Supabase requires email confirmation. For development, you may want to disable this:

1. Go to **Authentication** > **Providers** in your Supabase dashboard
2. Click on **Email**
3. Toggle **Confirm email** to OFF
4. Click **Save**

> **Note**: For production, keep email confirmation enabled for security.

### 5. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000
3. Click "Create an account"
4. Register with a test email and password
5. You should be able to sign in and access the dashboard

### 6. Verify Users in Supabase

1. Go to **Authentication** > **Users** in your Supabase dashboard
2. You should see your test user listed

## Authentication Tables

Supabase automatically creates and manages the authentication tables for you. You don't need to create any tables manually for basic authentication to work.

The authentication system uses:
- `auth.users` - Stores user accounts
- `auth.sessions` - Manages user sessions
- `auth.refresh_tokens` - Handles token refresh

## Email Templates (Optional)

You can customize the email templates sent to users:

1. Go to **Authentication** > **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use Row Level Security (RLS)** when you add custom tables
3. **Enable email confirmation** in production
4. **Use strong database passwords**
5. **Regularly rotate your service_role key** (if you use it)

## Troubleshooting

### "Invalid API key" error
- Double-check your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure there are no extra spaces or quotes
- Restart your development server after changing `.env.local`

### Users can't sign in
- Check if email confirmation is enabled (disable for development)
- Verify the user exists in Authentication > Users
- Check browser console for error messages

### Redirect issues
- Ensure your middleware is configured correctly
- Check that the Supabase client is properly initialized

## Next Steps

Once authentication is working, you can:

1. Add user profiles by creating a `profiles` table
2. Implement Row Level Security (RLS) policies
3. Add social authentication (Google, GitHub, etc.)
4. Create additional protected routes
5. Add real-time features using Supabase Realtime

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Documentation](https://nextjs.org/docs)
