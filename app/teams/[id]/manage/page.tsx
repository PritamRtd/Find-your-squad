import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManageClient from './team-manage-client'

export default async function TeamManagePage({
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

  // Fetch team details
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      events(id, title, description)
    `)
    .eq('id', id)
    .single()

  if (error || !team) {
    redirect('/profile')
  }

  // Check if user is the creator/admin
  const isAdmin = team.creator_id === user.id

  // Check if user is a team admin (not creator but admin status)
  const { data: membership } = await supabase
    .from('team_members')
    .select('status')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  const canManage = isAdmin || membership?.status === 'admin'

  if (!canManage) {
    redirect('/profile')
  }

  // Fetch all team members
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      id,
      user_id,
      status,
      created_at,
      profiles!inner(id, full_name, avatar_url, year_of_study, branch, skills, contact_info)
    `)
    .eq('team_id', id)
    .order('created_at', { ascending: true })

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <TeamManageClient 
      user={user}
      profile={profile}
      team={team}
      members={members || []}
      isCreator={isAdmin}
    />
  )
}
