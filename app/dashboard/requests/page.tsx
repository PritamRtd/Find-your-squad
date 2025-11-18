import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RequestActions from './request-actions'

export default async function RequestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all teams created by the current user
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('creator_id', user.id)

  const teamIds = teams?.map((team) => team.id) || []

  // Fetch all pending team member requests for teams created by this user
  const { data: requests } = await supabase
    .from('team_members')
    .select(`
      id,
      team_id,
      user_id,
      status,
      created_at,
      teams!inner(id, name),
      profiles!inner(id, year_of_study, branch, skills)
    `)
    .in('team_id', teamIds.length > 0 ? teamIds : [''])
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Get user emails for display
  const userIds = requests?.map((r) => r.user_id) || []
  const { data: authUsers } = userIds.length > 0
    ? await supabase.auth.admin.listUsers()
    : { data: null }

  const userEmailMap = new Map(
    authUsers?.users?.map((u) => [u.id, u.email]) || []
  )

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
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Team Join Requests
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage pending applications to teams you created
            </p>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              {!requests || requests.length === 0 ? (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    No pending requests
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don&apos;t have any pending team join requests at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {userEmailMap.get(request.user_id) || 'Unknown User'}
                            </h3>
                            <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {(request.teams as any).name}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Year of Study
                              </p>
                              <p className="mt-1 text-sm text-gray-900">
                                {(request.profiles as any).year_of_study || 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Branch
                              </p>
                              <p className="mt-1 text-sm text-gray-900">
                                {(request.profiles as any).branch || 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Skills
                              </p>
                              <p className="mt-1 text-sm text-gray-900">
                                {(request.profiles as any).skills || 'Not specified'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs text-gray-500">
                              Applied on{' '}
                              {new Date(request.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <RequestActions requestId={request.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
