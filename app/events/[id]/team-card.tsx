'use client'

import { useState } from 'react'
import { joinTeam } from './join-team-action'



interface TeamCardProps {
  team: {
    id: string
    name: string
    description: string | null
    max_size: number | null
    allowed_branches: string[] | null
    allowed_years: string[] | null
    // Update this type:
    team_members: Array<{ id: string }> 
  }
  userId: string
}

export default function TeamCard({ team, userId }: TeamCardProps) {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({ show: false, message: '', type: 'success' })

  const handleApply = async () => {
    setLoading(true)
    setToast({ show: false, message: '', type: 'success' })

    try {
      const result = await joinTeam(team.id, userId)
      setToast({
        show: true,
        message: result.message,
        type: 'success',
      })
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' })
      }, 3000)
    } catch (error) {
      setToast({
        show: true,
        message: error instanceof Error ? error.message : 'Failed to apply',
        type: 'error',
      })
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setToast({ show: false, message: '', type: 'error' })
      }, 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm relative">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`absolute top-2 right-2 left-2 rounded-md p-3 ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  toast.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
      {team.description && (
        <p className="mt-2 text-sm text-gray-600">{team.description}</p>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm text-gray-500">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          Max Size: {team.team_members.length} / {team.max_size || 'Unlimited'}
        </div>
        {team.allowed_branches && team.allowed_branches.length > 0 && (
          <div className="flex items-center text-sm text-gray-500">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Branches: {team.allowed_branches.join(', ')}
          </div>
        )}
        {team.allowed_years && team.allowed_years.length > 0 && (
          <div className="flex items-center text-sm text-gray-500">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Years: {team.allowed_years.join(', ')}
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={handleApply}
          disabled={loading}
          className="w-full inline-flex justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    </div>
  )
}
