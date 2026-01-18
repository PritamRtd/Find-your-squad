'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinTeam(teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user already has a pending or accepted request
  const { data: existing } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('You already have a pending request for this team')
    }
    if (existing.status === 'accepted' || existing.status === 'leader') {
      throw new Error('You are already a member of this team')
    }
  }

  // Create join request
  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: user.id,
      status: 'pending',
    })

  if (error) {
    throw new Error(error.message)
  }

  // Create a chat message for the request
  await supabase
    .from('messages')
    .insert({
      team_id: teamId,
      sender_id: user.id,
      content: 'Requested to join the team',
      message_type: 'join_request',
    })

  revalidatePath('/explore')
  revalidatePath('/chat')
  return { success: true }
}

export async function createEvent(data: { title: string; description: string }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('events')
    .insert({
      title: data.title,
      description: data.description,
      created_by: user.id,
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/explore')
  revalidatePath('/events')
  return { success: true }
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user created the event
  const { data: event } = await supabase
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single()

  if (!event || event.created_by !== user.id) {
    throw new Error('Not authorized to delete this event')
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/explore')
  revalidatePath('/events')
  return { success: true }
}
