import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExploreClient from './explore-client'

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all teams with member count
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      events(id, title),
      team_members(id, status)
    `)
    .order('created_at', { ascending: false })

  // Process teams to add member count
  const teamsWithCount = teams?.map(team => ({
    ...team,
    memberCount: team.team_members?.filter((m: any) => m.status === 'accepted' || m.status === 'leader').length || 0
  }))

  return (
    <ExploreClient 
      user={user}
      profile={profile}
      events={events || []}
      teams={teamsWithCount || []}
    />
  )
}
