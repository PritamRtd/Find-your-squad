'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateTeam(teamId: string, data: {
  name: string
  description?: string
  max_size?: number | null
  allowed_branches?: string[] | null
  allowed_years?: string[] | null
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Not authorized to update this team')
  }

  const { error } = await supabase
    .from('teams')
    .update({
      name: data.name,
      description: data.description,
      max_size: data.max_size,
      allowed_branches: data.allowed_branches,
      allowed_years: data.allowed_years,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/teams/${teamId}/manage`)
  revalidatePath('/profile')
  return { success: true }
}

export async function removeMember(teamId: string, membershipId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator or admin
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  const { data: userMembership } = await supabase
    .from('team_members')
    .select('status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  const canManage = team?.creator_id === user.id || userMembership?.status === 'admin'

  if (!canManage) {
    throw new Error('Not authorized to remove members')
  }

  // Don't allow removing the leader
  const { data: membership } = await supabase
    .from('team_members')
    .select('status, user_id')
    .eq('id', membershipId)
    .single()

  if (membership?.status === 'leader') {
    throw new Error('Cannot remove the team leader')
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', membershipId)

  if (error) {
    throw new Error(error.message)
  }

  // Send system message
  const { data: removedUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', membership?.user_id)
    .single()

  await supabase
    .from('messages')
    .insert({
      team_id: teamId,
      sender_id: user.id,
      content: `${removedUser?.full_name || 'A member'} was removed from the team`,
      message_type: 'system',
    })

  revalidatePath(`/teams/${teamId}/manage`)
  revalidatePath('/chat')
  return { success: true }
}

export async function promoteMember(teamId: string, membershipId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Only the team creator can promote members')
  }

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'admin', updated_at: new Date().toISOString() })
    .eq('id', membershipId)

  if (error) {
    throw new Error(error.message)
  }

  // Get user info for system message
  const { data: membership } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', membershipId)
    .single()

  const { data: promotedUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', membership?.user_id)
    .single()

  await supabase
    .from('messages')
    .insert({
      team_id: teamId,
      sender_id: user.id,
      content: `${promotedUser?.full_name || 'A member'} is now a team admin`,
      message_type: 'system',
    })

  revalidatePath(`/teams/${teamId}/manage`)
  revalidatePath('/chat')
  return { success: true }
}

export async function demoteMember(teamId: string, membershipId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Only the team creator can demote members')
  }

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', membershipId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/teams/${teamId}/manage`)
  return { success: true }
}

export async function deleteTeam(teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Only the team creator can delete the team')
  }

  // Delete the team (cascade will handle team_members and messages)
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  redirect('/profile')
}
