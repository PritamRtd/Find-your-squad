import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/onboarding'
  const error_description = requestUrl.searchParams.get('error_description')
  
  // Get the origin from the request headers for Codespaces compatibility
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin

  // Handle OAuth errors
  if (error_description) {
    console.error('OAuth error:', error_description)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error_description)}`, origin))
  }

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: true,
              })
            })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Exchange code error:', error)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
    }
    
    if (data.session) {
      console.log('Session created for user:', data.session.user.id)
      
      // Check if user has completed onboarding (has profile with year_of_study)
      const { data: profile } = await supabase
        .from('profiles')
        .select('year_of_study, full_name')
        .eq('id', data.session.user.id)
        .single()

      const isNewUser = !profile
      const hasCompletedOnboarding = profile?.year_of_study

      // If profile exists and has year_of_study, user has completed onboarding
      // Go to dashboard regardless of where they came from (login or register)
      if (hasCompletedOnboarding) {
        return NextResponse.redirect(new URL('/dashboard', origin))
      }
      
      // Create initial profile if it doesn't exist (new user)
      if (isNewUser) {
        const user = data.session.user
        const metadata = user.user_metadata || {}
        
        // Google OAuth returns name in various fields - try all possibilities
        // Priority: full_name > name > given_name + family_name
        let fullName = metadata.full_name || metadata.name
        
        // If we got given_name and family_name, combine them
        if (!fullName && (metadata.given_name || metadata.family_name)) {
          fullName = [metadata.given_name, metadata.family_name].filter(Boolean).join(' ')
        }
        
        // Log for debugging
        console.log('Google user metadata:', JSON.stringify(metadata, null, 2))
        console.log('Extracted full name:', fullName)
        
        await supabase
          .from('profiles')
          .insert([{ 
            id: user.id,
            full_name: fullName || null,
            avatar_url: metadata.avatar_url || metadata.picture || null,
          }])
        
        // New user always goes to onboarding
        return NextResponse.redirect(new URL('/onboarding', origin))
      }
      
      // Existing user without completed onboarding
      // If they came from login (next=/dashboard), send them to onboarding to complete profile
      // If they came from register (next=/onboarding), send to onboarding
      // Either way, they need to complete onboarding first
      return NextResponse.redirect(new URL('/onboarding', origin))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=Could not authenticate user', origin))
}
