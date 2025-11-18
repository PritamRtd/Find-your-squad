'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CreateTeamModalProps {
  eventId: string
  userId: string
}

export default function CreateTeamModal({
  eventId,
  userId,
}: CreateTeamModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxSize, setMaxSize] = useState('')
  const [branchLimit, setBranchLimit] = useState<'all' | 'specific'>('all')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [yearLimit, setYearLimit] = useState<'all' | 'specific'>('all')
  const [selectedYears, setSelectedYears] = useState<string[]>([])

  const branches = ['CS', 'ECE', 'Mech', 'Civil', 'EE', 'IT']
  const years = ['1st', '2nd', '3rd', '4th']

  const handleBranchToggle = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch]
    )
  }

  const handleYearToggle = (year: string) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form
      if (!name.trim()) {
        throw new Error('Team name is required')
      }

      if (branchLimit === 'specific' && selectedBranches.length === 0) {
        throw new Error('Please select at least one branch')
      }

      if (yearLimit === 'specific' && selectedYears.length === 0) {
        throw new Error('Please select at least one year')
      }

      // Prepare team data
      const teamData = {
        event_id: eventId,
        creator_id: userId,
        name: name.trim(),
        description: description.trim() || null,
        max_size: maxSize ? parseInt(maxSize) : null,
        allowed_branches: branchLimit === 'all' ? null : selectedBranches,
        allowed_years: yearLimit === 'all' ? null : selectedYears,
      }

      // Insert team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert(teamData)
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as team leader
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          status: 'leader',
        })

      if (memberError) throw memberError

      // Success - reset form and close modal
      setName('')
      setDescription('')
      setMaxSize('')
      setBranchLimit('all')
      setSelectedBranches([])
      setYearLimit('all')
      setSelectedYears([])
      setIsOpen(false)

      // Refresh the page to show new team
      router.refresh()
    } catch (err) {
      console.error('Error creating team:', err)
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <svg
          className="-ml-0.5 mr-1.5 h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Create Team
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            ></div>

            <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    Create New Team
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-800">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium leading-6 text-gray-900"
                      >
                        Team Name *
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          placeholder="Enter team name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium leading-6 text-gray-900"
                      >
                        Description
                      </label>
                      <div className="mt-2">
                        <textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          placeholder="Describe your team..."
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="maxSize"
                        className="block text-sm font-medium leading-6 text-gray-900"
                      >
                        Max Team Size
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          id="maxSize"
                          value={maxSize}
                          onChange={(e) => setMaxSize(e.target.value)}
                          min="1"
                          className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          placeholder="Leave empty for unlimited"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                        Branch Limit
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="branch-all"
                            checked={branchLimit === 'all'}
                            onChange={() => {
                              setBranchLimit('all')
                              setSelectedBranches([])
                            }}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                          />
                          <label
                            htmlFor="branch-all"
                            className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                          >
                            Allow All Branches
                          </label>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="branch-specific"
                              checked={branchLimit === 'specific'}
                              onChange={() => setBranchLimit('specific')}
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                            />
                            <label
                              htmlFor="branch-specific"
                              className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                            >
                              Specific Branches
                            </label>
                          </div>
                          {branchLimit === 'specific' && (
                            <div className="mt-2 ml-7 space-y-2">
                              {branches.map((branch) => (
                                <label
                                  key={branch}
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBranches.includes(branch)}
                                    onChange={() => handleBranchToggle(branch)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {branch}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                        Year Limit
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="year-all"
                            checked={yearLimit === 'all'}
                            onChange={() => {
                              setYearLimit('all')
                              setSelectedYears([])
                            }}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                          />
                          <label
                            htmlFor="year-all"
                            className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                          >
                            Allow All Years
                          </label>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id="year-specific"
                              checked={yearLimit === 'specific'}
                              onChange={() => setYearLimit('specific')}
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-600"
                            />
                            <label
                              htmlFor="year-specific"
                              className="ml-3 block text-sm font-medium leading-6 text-gray-900"
                            >
                              Specific Years
                            </label>
                          </div>
                          {yearLimit === 'specific' && (
                            <div className="mt-2 ml-7 space-y-2">
                              {years.map((year) => (
                                <label key={year} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedYears.includes(year)}
                                    onChange={() => handleYearToggle(year)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {year} Year
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                      >
                        {loading ? 'Creating...' : 'Create Team'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={loading}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
