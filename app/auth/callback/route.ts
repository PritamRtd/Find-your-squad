import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if email is from @rvce.edu.in domain
      const email = data.user.email
      if (!email || !email.endsWith('@rvce.edu.in')) {
        // Email is not from allowed domain, sign them out
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL(
            '/login?error=Only @rvce.edu.in email addresses are allowed',
            request.url
          )
        )
      }

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('year_of_study, branch')
        .eq('id', data.user.id)
        .single()

      // If no profile exists, create one
      if (!profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            year_of_study: null,
            branch: null,
            skills: null,
            contact_info: email,
          })

        if (insertError) {
          console.error('Error creating profile:', insertError)
          // Sign out the user if profile creation fails
          await supabase.auth.signOut()
          return NextResponse.redirect(
            new URL(
              '/login?error=Failed to create user profile. Please try again.',
              request.url
            )
          )
        }

        // Redirect to onboarding for first-time users
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Check if profile is complete
      if (!profile.year_of_study || !profile.branch) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Profile exists and is complete, redirect to dashboard
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=Authentication failed', request.url))
}
