'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(teamId: string, content: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      return { success: false, error: `Authentication error: ${authError.message}` }
    }
    
    if (!user) {
      return { success: false, error: 'Not authenticated. Please log in again.' }
    }

    // Check if user is the team creator (they don't need to be in team_members)
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('creator_id')
      .eq('id', teamId)
      .single()

    if (teamError) {
      console.error('Team fetch error:', teamError)
      return { success: false, error: `Team not found: ${teamError.message}` }
    }

    const isCreator = team?.creator_id === user.id

    // If not creator, verify user is a member of the team
    if (!isCreator) {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('status')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error('Membership check error:', membershipError)
        return { success: false, error: `Membership check failed: ${membershipError.message}` }
      }

      // Allow messages from accepted, admin, and leader statuses
      const allowedStatuses = ['accepted', 'admin', 'leader']
      if (!membership || !allowedStatuses.includes(membership.status)) {
        const statusMsg = membership ? `Your status is "${membership.status}"` : 'You are not a member'
        return { success: false, error: `Not authorized to send messages. ${statusMsg}. You must be an accepted team member.` }
      }
    }

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        team_id: teamId,
        sender_id: user.id,
        content,
        message_type: 'text',
      })

    if (insertError) {
      console.error('Message insert error:', insertError)
      return { success: false, error: `Failed to send message: ${insertError.message}` }
    }

    revalidatePath('/chat')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in sendMessage:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}

export async function acceptRequest(membershipId: string, teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the team leader/creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Not authorized to accept requests')
  }

  // Get the user who made the request
  const { data: membership } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', membershipId)
    .single()

  // Update membership status
  const { error } = await supabase
    .from('team_members')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', membershipId)

  if (error) {
    throw new Error(error.message)
  }

  // Send system message
  if (membership) {
    const { data: acceptedUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', membership.user_id)
      .single()

    await supabase
      .from('messages')
      .insert({
        team_id: teamId,
        sender_id: membership.user_id,
        content: `${acceptedUser?.full_name || 'A new member'} has joined the team!`,
        message_type: 'system',
      })
  }

  revalidatePath('/chat')
  revalidatePath('/dashboard/requests')
  return { success: true }
}

export async function rejectRequest(membershipId: string, teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the team leader/creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Not authorized to reject requests')
  }

  // Update membership status to rejected
  const { error } = await supabase
    .from('team_members')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', membershipId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/chat')
  revalidatePath('/dashboard/requests')
  return { success: true }
}

export async function markAsRead(teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return
  }

  // Mark all messages in this team as read for this user
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('team_id', teamId)
    .neq('sender_id', user.id)

  revalidatePath('/chat')
}

// ============================================================================
// DIRECT MESSAGE FUNCTIONS
// ============================================================================

export async function getOrCreateDMConversation(otherUserId: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (user.id === otherUserId) {
      return { success: false, error: 'Cannot start a conversation with yourself' }
    }

    // Determine user1 and user2 (user1 < user2 for consistency)
    const user1 = user.id < otherUserId ? user.id : otherUserId
    const user2 = user.id < otherUserId ? otherUserId : user.id

    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('dm_conversations')
      .select('id')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .single()

    // Check if table doesn't exist
    if (findError && (findError.code === '42P01' || findError.message?.includes('does not exist'))) {
      return { success: false, error: 'Direct messages table does not exist. Please run the migration.' }
    }

    if (existing) {
      return { success: true, conversationId: existing.id }
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('dm_conversations')
      .insert({ user1_id: user1, user2_id: user2 })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating DM conversation:', createError)
      if (createError.code === '42P01' || createError.message?.includes('does not exist')) {
        return { success: false, error: 'Direct messages table does not exist. Please run the migration.' }
      }
      return { success: false, error: createError.message }
    }

    revalidatePath('/chat')
    return { success: true, conversationId: newConv.id }
  } catch (err: any) {
    console.error('Error in getOrCreateDMConversation:', err)
    return { success: false, error: err.message || 'Failed to create conversation' }
  }
}

export async function sendDM(conversationId: string, content: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Verify user is part of this conversation
    const { data: conv, error: convError } = await supabase
      .from('dm_conversations')
      .select('id, user1_id, user2_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conv) {
      return { success: false, error: 'Conversation not found' }
    }

    if (conv.user1_id !== user.id && conv.user2_id !== user.id) {
      return { success: false, error: 'Not authorized to send messages in this conversation' }
    }

    // Send the message
    const { error: insertError } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: 'text',
      })

    if (insertError) {
      console.error('Error sending DM:', insertError)
      return { success: false, error: insertError.message }
    }

    // Update conversation's updated_at
    await supabase
      .from('dm_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    revalidatePath('/chat')
    return { success: true }
  } catch (err: any) {
    console.error('Error in sendDM:', err)
    return { success: false, error: err.message }
  }
}

export async function markDMAsRead(conversationId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return
  }

  // Mark all messages in this conversation as read (except own messages)
  await supabase
    .from('direct_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)

  revalidatePath('/chat')
}
