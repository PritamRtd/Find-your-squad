# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Find Your Squad application.

## Prerequisites

- A Supabase project (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- A Google Cloud Console account

## Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in the required fields:
     - App name: Find Your Squad
     - User support email: Your email
     - Developer contact email: Your email
   - Add authorized domains if deploying to production
   - Click **Save and Continue**
   - Add scopes: `email` and `profile` (should be added by default)
   - Click **Save and Continue**
   - Add test users if needed (only required if app is in testing mode)

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Find Your Squad
   - Authorized JavaScript origins:
     - For development: `http://localhost:3000`
     - For production: Your production URL
   - Authorized redirect URIs:
     - For development: `http://localhost:3000/auth/callback`
     - For production: `https://your-domain.com/auth/callback`
   - Click **Create**

7. Copy the **Client ID** and **Client Secret** (you'll need these for Supabase)

## Step 2: Configure Google OAuth in Supabase

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Google** in the list and click to expand it
5. Enable the Google provider by toggling it on
6. Enter your Google OAuth credentials:
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
7. Copy the **Callback URL (for OAuth)** shown in Supabase
8. Click **Save**

## Step 3: Update Google Cloud Console with Supabase Callback URL

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add the Supabase callback URL to **Authorized redirect URIs**:
   - The URL will look like: `https://your-project-ref.supabase.co/auth/v1/callback`
5. Click **Save**

## Step 4: Test the Authentication Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`
3. Click **Sign in with Google**
4. You should be redirected to Google's login page
5. Sign in with a Google account that has an `@rvce.edu.in` email address
6. After successful authentication:
   - First-time users will be redirected to `/onboarding` to complete their profile
   - Returning users will be redirected to `/dashboard`

## Email Domain Restriction

The application only allows users with `@rvce.edu.in` email addresses. This validation happens:

1. **Client-side**: In the login and register forms
2. **Server-side**: In the auth callback route (`/app/auth/callback/route.ts`)

If a user tries to sign in with a non-RVCE email, they will be:
- Automatically signed out
- Redirected to the login page with an error message

## Authentication Flow

### For First-Time Users

1. User clicks "Sign in with Google"
2. User authenticates with Google (must use @rvce.edu.in email)
3. System checks email domain
4. If valid, creates a user profile in the `profiles` table
5. Redirects to `/onboarding` to complete profile information
6. After completing onboarding, redirects to `/dashboard`

### For Returning Users

1. User clicks "Sign in with Google"
2. User authenticates with Google
3. System checks email domain
4. System checks if profile exists and is complete
5. Redirects to `/dashboard` if profile is complete
6. Redirects to `/onboarding` if profile is incomplete

## Troubleshooting

### "Only @rvce.edu.in email addresses are allowed" error

- Make sure you're using a Google account with an `@rvce.edu.in` email address
- The domain restriction is enforced server-side in the auth callback

### "Authentication failed" error

- Verify that your Google OAuth credentials are correctly configured in Supabase
- Check that the redirect URI in Google Cloud Console matches the Supabase callback URL
- Ensure the Google OAuth consent screen is properly configured

### Redirect issues

- Make sure the callback URL is added to **both**:
  1. Google Cloud Console (Authorized redirect URIs)
  2. Your application's environment (should be automatic)

### "Invalid Client" error

- Double-check that your Client ID and Client Secret are correct in Supabase
- Verify that your OAuth consent screen is published (or the user is added as a test user)

## Production Deployment

When deploying to production:

1. Update the **Authorized JavaScript origins** in Google Cloud Console:
   - Add your production domain: `https://your-domain.com`

2. Update the **Authorized redirect URIs** in Google Cloud Console:
   - Add your production callback: `https://your-domain.com/auth/callback`
   - Keep the Supabase callback URL as well

3. Update the OAuth consent screen:
   - Add your production domain to authorized domains
   - Publish the app (move from Testing to Production)

## Security Notes

- Never commit your Google Client Secret to version control
- All Google OAuth credentials are stored securely in Supabase
- The email domain restriction (`@rvce.edu.in`) is enforced server-side for security
- User sessions are managed securely by Supabase Auth

## Resources

- [Supabase Google Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
