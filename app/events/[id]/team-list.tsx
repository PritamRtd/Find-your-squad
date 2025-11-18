'use client'

import { useState, useMemo } from 'react'
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

interface TeamListProps {
  teams: Team[]
  userId: string
}

const SKILLS = [
  'All Skills',
  'Frontend',
  'Backend',
  'Full Stack',
  'UI/UX',
  'Mobile',
  'DevOps',
  'Data Science',
  'Machine Learning',
  'Blockchain',
  'Game Development',
  'Cloud',
  'Security',
  'Testing',
  'Database',
]

export default function TeamList({ teams, userId }: TeamListProps) {
  const [searchText, setSearchText] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('All Skills')

  const filteredTeams = useMemo(() => {
    if (!teams) return []

    return teams.filter((team) => {
      // Search filter: check if search text is in name or description
      const searchLower = searchText.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        team.name.toLowerCase().includes(searchLower) ||
        (team.description && team.description.toLowerCase().includes(searchLower))

      // Skill filter: check if selected skill is in name or description
      const matchesSkill =
        selectedSkill === 'All Skills' ||
        team.name.toLowerCase().includes(selectedSkill.toLowerCase()) ||
        (team.description &&
          team.description.toLowerCase().includes(selectedSkill.toLowerCase()))

      return matchesSearch && matchesSkill
    })
  }, [teams, searchText, selectedSkill])

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search Teams
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
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
              </div>
              <input
                type="text"
                id="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by team name or description..."
              />
            </div>
          </div>

          {/* Skill Filter Dropdown */}
          <div>
            <label
              htmlFor="skill-filter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filter by Skill
            </label>
            <select
              id="skill-filter"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchText || selectedSkill !== 'All Skills') && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchText && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {searchText}
                <button
                  onClick={() => setSearchText('')}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSkill !== 'All Skills' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Skill: {selectedSkill}
                <button
                  onClick={() => setSelectedSkill('All Skills')}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchText('')
                setSelectedSkill('All Skills')
              }}
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Teams
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'})
          </span>
        </h2>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            {searchText || selectedSkill !== 'All Skills'
              ? 'No teams match your filters'
              : 'No teams yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchText || selectedSkill !== 'All Skills'
              ? 'Try adjusting your search or filter criteria.'
              : 'Be the first to create a team for this event!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
