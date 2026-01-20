'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
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

    // Check if user already has a pending or accepted request
    const { data: existing, error: existingError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Check existing error:', existingError)
      return { success: false, error: `Database error: ${existingError.message}` }
    }

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'You already have a pending request for this team' }
      }
      if (existing.status === 'invited') {
        return { success: false, error: 'You have been invited to this team. Check your requests.' }
      }
      if (existing.status === 'accepted' || existing.status === 'leader') {
        return { success: false, error: 'You are already a member of this team' }
      }
      if (existing.status === 'rejected') {
        // Allow re-requesting if previously rejected - update the status
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        
        if (updateError) {
          return { success: false, error: `Failed to resubmit request: ${updateError.message}` }
        }
        
        revalidatePath('/explore')
        revalidatePath('/chat')
        return { success: true }
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
      console.error('Insert error:', error)
      return { success: false, error: `Failed to join team: ${error.message}` }
    }

    // Create a chat message for the request (non-critical)
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
  } catch (err: any) {
    console.error('Unexpected error in joinTeam:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}

export async function createEvent(data: { 
  title: string; 
  description: string;
  min_team_size?: number;
  max_team_size?: number;
  required_skills?: string[];
  event_date?: string;
  registration_deadline?: string;
  team_composition_rules?: {
    year_rules?: Array<{year: string, min?: number, max?: number}>;
    branch_rules?: Array<{branch: string, min?: number, max?: number}>;
    diversity?: {
      min_different_branches?: number;
      max_same_branch?: number;
      cross_branch_required?: boolean;
    };
  };
}): Promise<{ success: boolean; error?: string }> {
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

    const insertData: any = {
      title: data.title,
      description: data.description,
      created_by: user.id,
    }

    // Only add optional fields if they have values
    if (data.min_team_size) insertData.min_team_size = data.min_team_size
    if (data.max_team_size) insertData.max_team_size = data.max_team_size
    if (data.required_skills && data.required_skills.length > 0) insertData.required_skills = data.required_skills
    if (data.event_date) insertData.event_date = data.event_date
    if (data.registration_deadline) insertData.registration_deadline = data.registration_deadline
    if (data.team_composition_rules) insertData.team_composition_rules = data.team_composition_rules

    const { error } = await supabase
      .from('events')
      .insert(insertData)

    if (error) {
      console.error('Insert error:', error)
      return { success: false, error: `Failed to create event: ${error.message}` }
    }

    revalidatePath('/explore')
    revalidatePath('/events')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in createEvent:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
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

    // Verify user created the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Event fetch error:', eventError)
      return { success: false, error: `Event not found: ${eventError.message}` }
    }

    if (!event || event.created_by !== user.id) {
      return { success: false, error: 'Not authorized to delete this event' }
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: `Failed to delete event: ${error.message}` }
    }

    revalidatePath('/explore')
    revalidatePath('/events')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in deleteEvent:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}

export async function inviteToTeam(userId: string, teamId: string): Promise<{ success: boolean; error?: string }> {
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

    // Verify user is the team leader
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('created_by, name, max_size')
      .eq('id', teamId)
      .single()

    if (teamError) {
      console.error('Team fetch error:', teamError)
      return { success: false, error: `Team not found: ${teamError.message}` }
    }

    if (!team || team.created_by !== user.id) {
      return { success: false, error: 'Not authorized to invite to this team' }
    }

    // Check if team is full
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .in('status', ['accepted', 'leader'])

    if (membersError) {
      console.error('Members fetch error:', membersError)
      return { success: false, error: `Failed to check team members: ${membersError.message}` }
    }

    if (team.max_size && members && members.length >= team.max_size) {
      return { success: false, error: 'Team is full' }
    }

    // Check if user is already in the team or has a pending invite
    const { data: existing, error: existingError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Check existing error:', existingError)
      return { success: false, error: `Database error: ${existingError.message}` }
    }

    if (existing) {
      if (existing.status === 'invited') {
        return { success: false, error: 'User has already been invited to this team' }
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'User already has a pending request to join this team' }
      }
      if (existing.status === 'accepted' || existing.status === 'leader') {
        return { success: false, error: 'User is already a member of this team' }
      }
      if (existing.status === 'rejected') {
        // Update existing record to invited
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ status: 'invited', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        
        if (updateError) {
          return { success: false, error: `Failed to update invitation: ${updateError.message}` }
        }
        
        revalidatePath('/explore')
        revalidatePath('/chat')
        revalidatePath('/dashboard/requests')
        return { success: true }
      }
    }

    // Create invitation
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        status: 'invited',
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { success: false, error: `Failed to send invitation: ${insertError.message}` }
    }

    // Get inviter info for the message (non-critical)
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Create a chat message for the invitation (non-critical)
    await supabase
      .from('messages')
      .insert({
        team_id: teamId,
        sender_id: user.id,
        content: `${inviterProfile?.full_name || 'Team leader'} invited a new member to the team`,
        message_type: 'team_invite',
      })

    revalidatePath('/explore')
    revalidatePath('/chat')
    revalidatePath('/dashboard/requests')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in inviteToTeam:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}
