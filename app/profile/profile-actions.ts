'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  full_name?: string
  bio?: string
  year_of_study?: string
  branch?: string
  skills?: string[]
  contact_info?: string
  github_url?: string
  linkedin_url?: string
  portfolio_url?: string
  avatar_url?: string
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

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: data.full_name,
          bio: data.bio,
          year_of_study: data.year_of_study,
          branch: data.branch,
          skills: data.skills,
          contact_info: data.contact_info,
          github_url: data.github_url,
          linkedin_url: data.linkedin_url,
          portfolio_url: data.portfolio_url,
          avatar_url: data.avatar_url,
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return { success: false, error: `Failed to create profile: ${insertError.message}` }
      }
    } else if (checkError) {
      console.error('Check error:', checkError)
      return { success: false, error: `Database error: ${checkError.message}` }
    } else {
      // Profile exists, update it
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          bio: data.bio,
          year_of_study: data.year_of_study,
          branch: data.branch,
          skills: data.skills,
          contact_info: data.contact_info,
          github_url: data.github_url,
          linkedin_url: data.linkedin_url,
          portfolio_url: data.portfolio_url,
          avatar_url: data.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return { success: false, error: `Failed to update profile: ${updateError.message}` }
      }
    }

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in updateProfile:', err)
    return { success: false, error: `Unexpected error: ${err.message || 'Unknown error'}` }
  }
}

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return { url: publicUrl }
}

export async function deleteTeam(teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify user is the creator/leader of the team
  const { data: team } = await supabase
    .from('teams')
    .select('creator_id')
    .eq('id', teamId)
    .single()

  if (!team || team.creator_id !== user.id) {
    throw new Error('Not authorized to delete this team')
  }

  // Delete the team (cascade will handle team_members)
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function leaveTeam(teamId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is the leader - leaders can't leave, they must delete the team
  const { data: membership } = await supabase
    .from('team_members')
    .select('status')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (membership?.status === 'leader') {
    throw new Error('Leaders cannot leave the team. Delete the team instead.')
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
