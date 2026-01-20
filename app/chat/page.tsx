import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatClient from './chat-client'

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; user?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Auth error in chat:', authError)
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
  }

  // Fetch all conversations (teams user is part of + pending requests)
  const { data: memberships, error: membershipError } = await supabase
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
    .in('status', ['leader', 'admin', 'accepted', 'pending', 'invited'])

  if (membershipError) {
    console.error('Membership fetch error:', membershipError)
  }

  // Fetch teams where user is the leader (to see incoming requests)
  const { data: ownedTeams, error: ownedTeamsError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      creator_id,
      events(title)
    `)
    .eq('creator_id', user.id)

  if (ownedTeamsError) {
    console.error('Owned teams fetch error:', ownedTeamsError)
  }

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

  // Count unread messages per team (handle if 'read' column doesn't exist)
  let unreadByTeam = new Map()
  try {
    const { data: unreadCounts } = teamIds.length > 0
      ? await supabase
          .from('messages')
          .select('team_id')
          .in('team_id', teamIds)
          .eq('read', false)
          .neq('sender_id', user.id)
      : { data: [] }

    unreadCounts?.forEach(msg => {
      unreadByTeam.set(msg.team_id, (unreadByTeam.get(msg.team_id) || 0) + 1)
    })
  } catch (err) {
    // If read column doesn't exist, just skip unread counts
    console.warn('Unread count query failed (read column may not exist):', err)
  }

  // ============================================================================
  // DIRECT MESSAGES
  // ============================================================================
  
  let dmConversationsWithProfiles: any[] = []
  
  try {
    // Fetch DM conversations
    const { data: dmConversations, error: dmError } = await supabase
      .from('dm_conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        updated_at
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (dmError) {
      // Table doesn't exist yet - this is expected if migration hasn't been run
      if (dmError.code === '42P01' || dmError.message?.includes('does not exist')) {
        console.warn('DM tables not set up yet. Run the direct_messages.sql migration.')
      } else {
        console.warn('DM conversations fetch error:', dmError.message || dmError.code)
      }
    } else if (dmConversations && dmConversations.length > 0) {
      // Get the other user's profile for each DM conversation
      dmConversationsWithProfiles = await Promise.all(
        dmConversations.map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
          
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, branch, year_of_study')
            .eq('id', otherUserId)
            .single()

          // Get last message
          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('id, content, sender_id, created_at, message_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read', false)
            .neq('sender_id', user.id)

          return {
            ...conv,
            otherUser: otherProfile,
            lastMessage: lastMsg,
            unreadCount: unreadCount || 0,
          }
        })
      )
    }
  } catch (err) {
    // Silently handle - DM feature just won't show any conversations
    console.warn('DM feature not available:', err)
  }

  // If there's a user param, we need to open/create that DM conversation
  let selectedDMUserId = params.user || null

  return (
    <ChatClient 
      user={user}
      profile={profile}
      memberships={memberships || []}
      teamsWithRequests={teamsWithRequests}
      lastMessages={Object.fromEntries(lastMessages)}
      unreadByTeam={Object.fromEntries(unreadByTeam)}
      selectedTeamId={params.team}
      dmConversations={dmConversationsWithProfiles}
      selectedDMUserId={selectedDMUserId}
    />
  )
}
