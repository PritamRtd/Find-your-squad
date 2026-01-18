import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
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

  // Fetch teams where user is admin/leader
  const { data: adminTeams } = await supabase
    .from('team_members')
    .select(`
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
    .in('status', ['leader', 'admin', 'accepted'])

  // Fetch teams where user is a member
  const { data: memberTeams } = await supabase
    .from('team_members')
    .select(`
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
    .eq('status', 'accepted')

  return (
    <ProfileClient 
      user={user}
      profile={profile}
      adminTeams={adminTeams || []}
      memberTeams={memberTeams || []}
    />
  )
}
