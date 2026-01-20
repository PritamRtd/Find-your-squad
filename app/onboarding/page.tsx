'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, FormEvent, useEffect } from 'react'

interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

interface QuizResult {
  questionIndex: number
  question: string
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
}

type Step = 'profile' | 'quiz' | 'results'

export default function OnboardingForm() {
  const router = useRouter()
  
  // Profile state - all fields from edit profile
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [branch, setBranch] = useState('')
  const [skills, setSkills] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Quiz state
  const [step, setStep] = useState<Step>('profile')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [quizScore, setQuizScore] = useState(0)
  const [skillsVerified, setSkillsVerified] = useState(false)
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  
  // Cooldown state
  const [canRetake, setCanRetake] = useState(true)
  const [retakeTime, setRetakeTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Load existing profile data on mount (for Google users who have partial data)
  useEffect(() => {
    const loadExistingProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Pre-fill name from Google if available
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name)
        }
        if (user.user_metadata?.avatar_url) {
          setAvatarPreview(user.user_metadata.avatar_url)
        }
        
        // Load existing profile if any
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          if (profile.full_name) setFullName(profile.full_name)
          if (profile.bio) setBio(profile.bio)
          if (profile.year_of_study) setYearOfStudy(profile.year_of_study)
          if (profile.branch) setBranch(profile.branch)
          if (profile.skills) setSkills(Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills)
          if (profile.contact_info) setContactInfo(profile.contact_info)
          if (profile.github_url) setGithubUrl(profile.github_url)
          if (profile.linkedin_url) setLinkedinUrl(profile.linkedin_url)
          if (profile.portfolio_url) setPortfolioUrl(profile.portfolio_url)
          if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
        }
      }
    }
    
    loadExistingProfile()
  }, [])

  const skillsArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)

  // Timer effect for cooldown
  useEffect(() => {
    if (retakeTime && retakeTime > Date.now()) {
      setCanRetake(false)
      const interval = setInterval(() => {
        const remaining = retakeTime - Date.now()
        if (remaining <= 0) {
          setCanRetake(true)
          setRetakeTime(null)
          setTimeRemaining('')
          clearInterval(interval)
        } else {
          const minutes = Math.floor(remaining / 60000)
          const seconds = Math.floor((remaining % 60000) / 1000)
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [retakeTime])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!fullName.trim()) {
      setError('Please enter your full name')
      setLoading(false)
      return
    }

    if (!yearOfStudy) {
      setError('Please select your year of study')
      setLoading(false)
      return
    }

    if (!branch) {
      setError('Please select your branch')
      setLoading(false)
      return
    }

    if (skillsArray.length === 0) {
      setError('Please enter at least one skill')
      setLoading(false)
      return
    }

    try {
      // Generate quiz questions using Gemini
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skills: skillsArray }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setSelectedAnswers(new Array(data.questions.length).fill(-1))
      setStep('quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return avatarPreview // Return existing URL if no new file
    
    const supabase = createClient()
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })
    
    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return avatarPreview // Return existing on error
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    return publicUrl
  }

  const handleSubmitQuiz = async () => {
    setLoading(true)
    setError(null)

    // Calculate score and create results array
    let correct = 0
    const results: QuizResult[] = questions.map((question, index) => {
      const isCorrect = selectedAnswers[index] === question.correctAnswer
      if (isCorrect) correct++
      
      return {
        questionIndex: index,
        question: question.question,
        selectedAnswer: selectedAnswers[index],
        correctAnswer: question.correctAnswer,
        isCorrect
      }
    })

    setCorrectCount(correct)
    setQuizResults(results)

    const scorePercentage = (correct / questions.length) * 100
    setQuizScore(scorePercentage)
    const verified = scorePercentage >= 60
    setSkillsVerified(verified)
    
    // Set cooldown time (5 minutes from now) if they failed
    if (!verified) {
      const cooldownTime = Date.now() + (5 * 60 * 1000) // 5 minutes
      setRetakeTime(cooldownTime)
      localStorage.setItem('quizRetakeTime', cooldownTime.toString())
    }

    try {
      const supabase = createClient()

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to complete onboarding')
        setLoading(false)
        return
      }

      // Upload avatar if provided
      const avatarUrl = await uploadAvatar(user.id)

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      const profileData = {
        full_name: fullName,
        bio: bio || null,
        year_of_study: yearOfStudy,
        branch: branch,
        skills: skillsArray,
        contact_info: contactInfo || null,
        github_url: githubUrl || null,
        linkedin_url: linkedinUrl || null,
        portfolio_url: portfolioUrl || null,
        avatar_url: avatarUrl,
        skills_verified: verified,
        updated_at: new Date().toISOString(),
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)

        if (updateError) {
          throw updateError
        }
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...profileData,
          })

        if (insertError) {
          throw insertError
        }
      }

      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/dashboard')
    router.refresh()
  }

  const handleRetakeQuiz = async () => {
    if (!canRetake) {
      setError(`Please wait ${timeRemaining} before retaking the quiz`)
      return
    }
    
    setLoading(true)
    setError(null)
    setCurrentQuestionIndex(0)
    setSelectedAnswers([])
    setQuizResults([])
    
    try {
      // Generate new quiz questions
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skills: skillsArray }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setSelectedAnswers(new Array(data.questions.length).fill(-1))
      setStep('quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  // Profile Form Step
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Fill in your details to help teammates find you
            </p>
          </div>

          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleProfileSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Avatar Upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-gray-200 bg-gray-100 overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500">Upload a profile photo (optional)</p>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                />
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell others about yourself..."
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                />
              </div>

              {/* Year of Study & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="yearOfStudy" className="block text-sm font-medium text-gray-700">
                    Year of Study <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="yearOfStudy"
                    required
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                  >
                    <option value="">Select year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduate">Graduate</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="branch"
                    required
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                  >
                    <option value="">Select branch</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Chemical Engineering">Chemical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700">
                  Contact Info
                </label>
                <input
                  id="contactInfo"
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Phone number or alternative email"
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                />
              </div>

              {/* Skills */}
              <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                  Skills <span className="text-red-500">*</span>
                </label>
                <input
                  id="skills"
                  type="text"
                  required
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g., JavaScript, React, Python, UI/UX Design"
                  className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your skills separated by commas. You&apos;ll take a short quiz to verify them.
                </p>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Social Links (optional)</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="githubUrl" className="block text-xs font-medium text-gray-600">
                      GitHub
                    </label>
                    <input
                      id="githubUrl"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="linkedinUrl" className="block text-xs font-medium text-gray-600">
                      LinkedIn
                    </label>
                    <input
                      id="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="portfolioUrl" className="block text-xs font-medium text-gray-600">
                      Portfolio
                    </label>
                    <input
                      id="portfolioUrl"
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating Quiz...' : 'Continue to Skills Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Step
  if (step === 'quiz') {
    const currentQuestion = questions[currentQuestionIndex]
    const allAnswered = selectedAnswers.every(answer => answer !== -1)

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Skills Verification Quiz
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Answer at least 60% correctly to verify your skills
          </p>
          
          {/* Progress indicator */}
          <div className="mt-4 flex justify-center gap-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600'
                    : selectedAnswers[index] !== -1
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              <h3 className="text-lg font-medium text-gray-900">
                {currentQuestion?.question}
              </h3>
            </div>

            <div className="space-y-3">
              {currentQuestion?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedAnswers[currentQuestionIndex] === index
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers[currentQuestionIndex] === -1}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results Step
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white py-6 px-4 shadow rounded-lg sm:px-8">
          {/* Score Summary */}
          <div className="text-center mb-6">
            {skillsVerified ? (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Skills Verified! 🎉
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-1">
                  You scored <span className="font-bold text-green-600">{quizScore.toFixed(0)}%</span> ({correctCount} out of {questions.length} correct)
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Your skills have been verified and will be displayed on your profile with a verification badge.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-3">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Not Quite There
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-1">
                  You scored <span className="font-bold text-yellow-600">{quizScore.toFixed(0)}%</span> ({correctCount} out of {questions.length} correct)
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mb-1">
                  You need 60% to verify your skills. Your profile has been saved, but skills are not verified.
                </p>
                {!canRetake && (
                  <p className="text-xs sm:text-sm text-red-600 font-medium mt-2">
                    You can retake the quiz in {timeRemaining}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Detailed Results */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Quiz Review</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {quizResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    result.isCorrect
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {result.isCorrect ? (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1.5">
                        Q{idx + 1}: {result.question}
                      </p>
                      {!result.isCorrect && (
                        <div className="space-y-1">
                          <p className="text-xs text-red-700">
                            <span className="font-medium">Your answer:</span>{' '}
                            {String.fromCharCode(65 + result.selectedAnswer)}.{' '}
                            {questions[result.questionIndex].options[result.selectedAnswer]}
                          </p>
                          <p className="text-xs text-green-700">
                            <span className="font-medium">Correct answer:</span>{' '}
                            {String.fromCharCode(65 + result.correctAnswer)}.{' '}
                            {questions[result.questionIndex].options[result.correctAnswer]}
                          </p>
                        </div>
                      )}
                      {result.isCorrect && (
                        <p className="text-xs text-green-700">
                          <span className="font-medium">Your answer:</span>{' '}
                          {String.fromCharCode(65 + result.selectedAnswer)}.{' '}
                          {questions[result.questionIndex].options[result.selectedAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 mt-4">
              <p className="text-xs sm:text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2 mt-6 mb-safe">
            <button
              onClick={handleContinue}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Dashboard
            </button>
            
            {!skillsVerified && (
              <button
                onClick={handleRetakeQuiz}
                disabled={loading || !canRetake}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating New Quiz...' : !canRetake ? `Retry in ${timeRemaining}` : 'Retake Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
