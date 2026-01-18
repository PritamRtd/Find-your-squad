import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './logout-button'
import Navbar from '../components/navbar'

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
        creator_id,
        events(title)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['accepted', 'leader', 'admin'])

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
        leaderContactInfo: (leader as any)?.profiles?.contact_info || 'Not available',
      }
    })
  )

  // Count pending requests for teams user owns
  const { data: ownedTeams } = await supabase
    .from('teams')
    .select('id')
    .eq('creator_id', user.id)

  const teamIds = ownedTeams?.map(t => t.id) || []
  
  let pendingCount = 0
  if (teamIds.length > 0) {
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .in('team_id', teamIds)
      .eq('status', 'pending')
    pendingCount = count || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />

      <div className="pt-4 md:pt-20 pb-20 md:pb-8">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {profile?.full_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-600 mt-1">Here's what's happening with your teams</p>
              </div>
              <div className="flex gap-3">
                {pendingCount > 0 && (
                  <Link
                    href="/chat"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    <span className="w-5 h-5 flex items-center justify-center bg-yellow-600 text-white text-xs rounded-full">
                      {pendingCount}
                    </span>
                    Pending Requests
                  </Link>
                )}
                <Link
                  href="/explore"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Explore Events
                </Link>
                <LogoutButton />
              </div>
            </div>
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
                      {teamsWithLeaders.map((membership) => {
                        const isLeader = membership.status === 'leader'
                        const isAdmin = membership.status === 'admin'
                        return (
                          <div
                            key={membership.id}
                            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {(membership.teams as any).name}
                              </h3>
                              {(isLeader || isAdmin) && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  isLeader ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {isLeader ? 'Leader' : 'Admin'}
                                </span>
                              )}
                            </div>
                            {(membership.teams as any).description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                {(membership.teams as any).description}
                              </p>
                            )}
                            <div className="text-sm text-gray-500 mb-4">
                              <span className="font-medium">Event:</span> {(membership.teams as any).events?.title || 'Unknown'}
                            </div>
                            <div className="flex gap-2">
                              <Link
                                href={`/chat?team=${membership.team_id}`}
                                className="flex-1 px-3 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Chat
                              </Link>
                              {(isLeader || isAdmin) && (
                                <Link
                                  href={`/teams/${membership.team_id}/manage`}
                                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Manage
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
