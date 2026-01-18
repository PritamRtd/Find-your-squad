import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './chat-client'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const params = await searchParams
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

  // Fetch all conversations (teams user is part of + pending requests)
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      id,
      team_id,
      status,
      teams!inner(
        id,
        name,
        description,
        creator_id,
        events(title)
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['leader', 'admin', 'accepted', 'pending'])

  // Fetch teams where user is the leader (to see incoming requests)
  const { data: ownedTeams } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      creator_id,
      events(title)
    `)
    .eq('creator_id', user.id)

  // For each owned team, fetch pending requests
  const teamsWithRequests = await Promise.all(
    (ownedTeams || []).map(async (team) => {
      const { data: requests } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles!inner(id, full_name, avatar_url, year_of_study, branch, skills)
        `)
        .eq('team_id', team.id)
        .eq('status', 'pending')

      return {
        ...team,
        pendingRequests: requests || [],
      }
    })
  )

  // Fetch recent messages for the sidebar preview
  const teamIds = [
    ...(memberships?.map(m => m.team_id) || []),
    ...(ownedTeams?.map(t => t.id) || [])
  ].filter((v, i, a) => a.indexOf(v) === i) // unique

  const { data: recentMessages } = teamIds.length > 0
    ? await supabase
        .from('messages')
        .select(`
          id,
          team_id,
          content,
          message_type,
          created_at,
          sender_id,
          profiles!inner(full_name, avatar_url)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  // Group messages by team for last message preview
  const lastMessages = new Map()
  recentMessages?.forEach(msg => {
    if (!lastMessages.has(msg.team_id)) {
      lastMessages.set(msg.team_id, msg)
    }
  })

  // Count unread messages per team
  const { data: unreadCounts } = teamIds.length > 0
    ? await supabase
        .from('messages')
        .select('team_id')
        .in('team_id', teamIds)
        .eq('read', false)
        .neq('sender_id', user.id)
    : { data: [] }

  const unreadByTeam = new Map()
  unreadCounts?.forEach(msg => {
    unreadByTeam.set(msg.team_id, (unreadByTeam.get(msg.team_id) || 0) + 1)
  })

  return (
    <ChatClient 
      user={user}
      profile={profile}
      memberships={memberships || []}
      teamsWithRequests={teamsWithRequests}
      lastMessages={Object.fromEntries(lastMessages)}
      unreadByTeam={Object.fromEntries(unreadByTeam)}
      selectedTeamId={params.team}
    />
  )
}
