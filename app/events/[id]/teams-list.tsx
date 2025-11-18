'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TeamCard from './team-card'

interface Team {
  id: string
  name: string
  description: string | null
  max_size: number | null
  allowed_branches: string[] | null
  allowed_years: string[] | null
  team_members?: Array<{ count: number }>
}

interface TeamsListProps {
  initialTeams: Team[]
  userId: string
  eventId: string
}

// Common skills that teams might need
const SKILL_OPTIONS = [
  'React',
  'Node.js',
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'UI/UX',
  'Design',
  'Backend',
  'Frontend',
  'Full Stack',
  'Mobile',
  'DevOps',
  'Machine Learning',
  'Data Science',
  'Database',
  'API',
  'Testing',
]

export default function TeamsList({
  initialTeams,
  userId,
  eventId,
}: TeamsListProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [searchText, setSearchText] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchFilteredTeams = async () => {
      setLoading(true)
      try {
        // Start with the base query
        let query = supabase
          .from('teams')
          .select(
            `
            *,
            team_members(count)
          `
          )
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })

        // Build filter conditions
        const filters: string[] = []

        // Apply search filter if search text is provided
        if (searchText) {
          // Sanitize search text to prevent query injection
          const sanitizedSearch = searchText.replace(/[%,]/g, '')
          // Search in both name and description
          filters.push(
            `name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`
          )
        }

        // Apply skill filter if a skill is selected
        if (selectedSkill) {
          // Sanitize skill filter (should already be from dropdown, but ensure safety)
          const sanitizedSkill = selectedSkill.replace(/[%,]/g, '')
          // Search for skill in both name and description
          filters.push(
            `name.ilike.%${sanitizedSkill}%,description.ilike.%${sanitizedSkill}%`
          )
        }

        // Apply all filters (they work as AND between filters, OR within each filter)
        filters.forEach((filter) => {
          query = query.or(filter)
        })

        const { data, error } = await query

        if (error) {
          console.error('Error fetching teams:', error)
          setTeams(initialTeams) // Fallback to initial teams on error
        } else {
          setTeams(data || [])
        }
      } catch (error) {
        console.error('Error in fetchFilteredTeams:', error)
        setTeams(initialTeams)
      } finally {
        setLoading(false)
      }
    }

    // Debounce the search to avoid too many requests
    const timeoutId = setTimeout(() => {
      if (searchText || selectedSkill) {
        fetchFilteredTeams()
      } else {
        setTeams(initialTeams)
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchText, selectedSkill, eventId, initialTeams, supabase])

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search teams
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="Search by team name or description..."
            />
          </div>
        </div>

        {/* Skill Filter Dropdown */}
        <div className="sm:w-64">
          <label htmlFor="skill-filter" className="sr-only">
            Filter by skill
          </label>
          <select
            id="skill-filter"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          >
            <option value="">All Skills</option>
            {SKILL_OPTIONS.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchText || selectedSkill) && (
        <p className="mb-4 text-sm text-gray-600">
          {loading ? (
            'Searching...'
          ) : (
            <>
              Showing {teams.length} of {initialTeams.length} team
              {initialTeams.length !== 1 ? 's' : ''}
            </>
          )}
        </p>
      )}

      {/* Teams Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-lg border-4 border-dashed border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            No teams found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchText || selectedSkill
              ? 'Try adjusting your search or filter criteria.'
              : 'Be the first to create a team for this event!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
