'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(teamId: string, content: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is a member of the team
  const { data: membership } = await supabase
    .from('team_members')
    .select('status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.status === 'pending' || membership.status === 'rejected') {
    throw new Error('Not authorized to send messages in this team')
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      team_id: teamId,
      sender_id: user.id,
      content,
      message_type: 'text',
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/chat')
  return { success: true }
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
