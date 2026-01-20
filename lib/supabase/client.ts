import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Custom cookie handling for cross-origin (Codespaces)
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')
            .slice(1)
            .join('=')
          return value
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          let cookieStr = `${name}=${value}`
          if (options?.maxAge) cookieStr += `; Max-Age=${options.maxAge}`
          if (options?.path) cookieStr += `; Path=${options.path}`
          cookieStr += '; SameSite=Lax'
          if (window.location.protocol === 'https:') {
            cookieStr += '; Secure'
          }
          document.cookie = cookieStr
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; Max-Age=0; Path=${options?.path || '/'}`
        },
      },
    }
  )
}
