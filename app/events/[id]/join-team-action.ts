'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Server Action to handle team join requests with validation.
 * Validates user attributes against team rules before creating a request.
 * 
 * @param teamId - The ID of the team to join
 * @param userId - The ID of the user requesting to join
 * @returns Success message or throws an error with specific validation message
 */
export async function joinTeam(teamId: string, userId: string) {
  const supabase = await createClient()

  try {
    // 1. Fetch the team data including rules
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, allowed_branches, allowed_years, max_size')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      throw new Error('Team not found')
    }

    // 2. Fetch the user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('branch, year_of_study')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // 3. Count current 'accepted' or 'leader' members in team_members
    const { count: currentCount, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .in('status', ['accepted', 'leader'])

    if (countError) {
      throw new Error('Failed to check team capacity')
    }

    // 4. VALIDATION

    // Check if user has already requested or is a member
    const { data: existingMembership } = await supabase
      .from('team_members')
      .select('status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingMembership) {
      if (existingMembership.status === 'pending') {
        throw new Error('You have already applied to this team')
      } else if (existingMembership.status === 'accepted' || existingMembership.status === 'leader') {
        throw new Error('You are already a member of this team')
      } else if (existingMembership.status === 'rejected') {
        throw new Error('Your previous application was rejected')
      }
    }

    // Check year requirement
    if (team.allowed_years && team.allowed_years.length > 0) {
      if (!userProfile.year_of_study || !team.allowed_years.includes(userProfile.year_of_study)) {
        throw new Error('Year requirement not met')
      }
    }

    // Check branch requirement
    if (team.allowed_branches && team.allowed_branches.length > 0) {
      if (!userProfile.branch || !team.allowed_branches.includes(userProfile.branch)) {
        throw new Error('Branch requirement not met')
      }
    }

    // Check team size limit
    if (team.max_size !== null && team.max_size !== undefined) {
      const memberCount = currentCount || 0
      if (memberCount >= team.max_size) {
        throw new Error('Team is full')
      }
    }

    // 5. If all validations pass, insert into team_members with status 'pending'
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        status: 'pending',
      })

    if (insertError) {
      throw new Error('Failed to submit application')
    }

    return { success: true, message: 'Application submitted successfully!' }
  } catch (error) {
    // Re-throw the error to be caught by the client
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred')
  }
}
