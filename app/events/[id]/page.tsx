import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateTeamModal from './create-team-modal'
import TeamList from './team-list'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the event details
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) {
    redirect('/events')
  }

  // Fetch teams for this event
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      team_members(id) 
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: false })

// ... rest of code

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/dashboard">
                  <h1 className="text-xl font-bold text-gray-900">
                    Find Your Squad
                  </h1>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/events"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Events
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
                  {event.title}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {event.description}
                </p>
              </div>
              <div className="mt-4 flex md:ml-4 md:mt-0">
                <CreateTeamModal eventId={id} userId={user.id} />
              </div>
            </div>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <TeamList teams={teams || []} userId={user.id} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
