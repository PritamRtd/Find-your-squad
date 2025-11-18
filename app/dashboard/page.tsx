import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Redirect to onboarding if profile is incomplete
  if (!profile || !profile.year_of_study || !profile.branch) {
    redirect('/onboarding')
  }

  // Fetch teams where the current user has been accepted
  const { data: acceptedMemberships } = await supabase
    .from('team_members')
    .select(`
      id,
      team_id,
      status,
      teams!inner(
        id,
        name,
        description,
        event_id,
        events(title)
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  // For each accepted team, fetch the leader's contact info
  const teamsWithLeaders = await Promise.all(
    (acceptedMemberships || []).map(async (membership) => {
      const { data: leader } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles!inner(contact_info)
        `)
        .eq('team_id', membership.team_id)
        .eq('status', 'leader')
        .single()

      return {
        ...membership,
        leaderContactInfo: leader?.profiles?.contact_info || 'Not available',
      }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Find Your Squad
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/requests"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Requests
              </Link>
              <Link
                href="/events"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Browse Events
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="space-y-8">
                {/* Profile Information */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Your Profile
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Year of Study</p>
                      <p className="mt-1 text-sm text-gray-900">{profile.year_of_study}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Branch</p>
                      <p className="mt-1 text-sm text-gray-900">{profile.branch}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Skills</p>
                      <p className="mt-1 text-sm text-gray-900">{profile.skills}</p>
                    </div>
                  </div>
                </div>

                {/* Accepted Teams */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Your Teams
                  </h2>
                  {!teamsWithLeaders || teamsWithLeaders.length === 0 ? (
                    <div className="rounded-lg border-4 border-dashed border-gray-200 bg-white p-12 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No teams yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        You haven&apos;t been accepted into any teams yet. Browse events to find teams to join!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {teamsWithLeaders.map((membership) => (
                        <div
                          key={membership.id}
                          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                        >
                          <h3 className="text-lg font-semibold text-gray-900">
                            {membership.teams.name}
                          </h3>
                          {membership.teams.description && (
                            <p className="mt-2 text-sm text-gray-600">
                              {membership.teams.description}
                            </p>
                          )}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <svg
                                className="mr-2 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Event: {membership.teams.events?.title || 'Unknown'}
                            </div>
                            <div className="rounded-md bg-green-50 p-3 mt-4">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <svg
                                    className="h-5 w-5 text-green-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
                                    />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-green-800">
                                    Leader Contact
                                  </h3>
                                  <div className="mt-1 text-sm text-green-700">
                                    {membership.leaderContactInfo}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
