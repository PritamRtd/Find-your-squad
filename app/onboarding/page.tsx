'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { QUIZ_BANK } from '@/lib/quizData'

export default function OnboardingForm() {
  const router = useRouter()
  const supabase = createClient()

  // --- FORM DATA ---
  const [yearOfStudy, setYearOfStudy] = useState('')
  const [branch, setBranch] = useState('')
  const [skills, setSkills] = useState('')
  
  // --- UI & LOGIC STATE ---
  const [step, setStep] = useState<'form' | 'quiz' | 'result'>('form')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalize skill name for lookup
  const rawSkill = skills.split(',')[0]?.trim()
  const skillKey = Object.keys(QUIZ_BANK).find(
    k => k.toLowerCase() === rawSkill?.toLowerCase()
  )

  // --- STEP 1: FORM VALIDATION ---
  const startQuiz = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!skillKey) {
      setError(`Quiz unavailable for "${rawSkill}". Try: JavaScript, Python, C, Java, or SQL.`)
      return
    }
    setStep('quiz')
  }

  // --- STEP 2: QUIZ INTERACTION ---
  const handleAnswer = async (isCorrect: boolean) => {
    if (loading) return 

    const updatedScore = isCorrect ? score + 1 : score
    
    if (currentQuestionIndex < 4) {
      setScore(updatedScore)
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setScore(updatedScore)
      await finalizeProfile(updatedScore)
    }
  }

  // --- STEP 3: ATOMIC DATABASE SAVE ---
  const finalizeProfile = async (finalScore: number) => {
    setLoading(true)
    const isPassed = finalScore >= 3

    if (isPassed) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Authentication session lost.")

        // THE ONLY WRITE: Save everything at once only after passing
        const { error: dbError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            year_of_study: yearOfStudy,
            branch: branch,
            skills: [skillKey],
            verified_skills: [skillKey] 
          })

        if (dbError) throw dbError
        setStep('result')
      } catch (err) {
        setError("Database error. Please check your Supabase columns.")
        setStep('form') 
      }
    } else {
      setStep('result') // Fail state
    }
    setLoading(false)
  }

  const handleFailExit = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- UI: RESULT VIEW ---
  if (step === 'result') {
    const isPassed = score >= 3
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full">
          <div className="text-7xl mb-6">{isPassed ? '🎉' : '⚠️'}</div>
          <h2 className="text-3xl font-bold mb-2">{isPassed ? 'Verified!' : 'Test Failed'}</h2>
          <p className="text-gray-500 mb-8">You scored {score} out of 5</p>
          
          {isPassed ? (
            <button onClick={() => router.push('/dashboard')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">
              Continue to Dashboard
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-red-500 text-sm bg-red-50 p-4 rounded-xl">No data was saved. You must score 3/5 to create a profile.</p>
              <button onClick={handleFailExit} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold">
                Restart Onboarding
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- UI: QUIZ VIEW ---
  if (step === 'quiz' && skillKey) {
    const q = QUIZ_BANK[skillKey][currentQuestionIndex]
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="flex justify-between mb-8 text-sm font-bold text-blue-600 uppercase tracking-widest">
            <span>{skillKey} Validation</span>
            <span>{currentQuestionIndex + 1} / 5</span>
          </div>
          <h3 className="text-2xl font-semibold mb-8 text-gray-800 leading-tight">{q.q}</h3>
          <div className="space-y-3">
            {q.options.map(opt => (
              <button 
                key={opt} 
                disabled={loading}
                onClick={() => handleAnswer(opt === q.a)} 
                className="w-full text-left p-5 border-2 border-gray-50 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- UI: FORM VIEW ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Join the Squad</h2>
        <p className="text-gray-500 mb-8">Set up your profile and prove your skills.</p>
        
        <form onSubmit={startQuiz} className="space-y-6">
          {error && <p className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-medium">{error}</p>}
          
          <div className="space-y-4">
            <select required value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)} className="w-full border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500">
              <option value="">Select Year of Study</option>
              <option value="1st">1st Year</option><option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option><option value="4th">4th Year</option>
            </select>

            <select required value={branch} onChange={e => setBranch(e.target.value)} className="w-full border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500">
              <option value="">Select Branch</option>
              <option value="CS">Computer Science</option><option value="ECE">Electronics</option>
              <option value="Mech">Mechanical</option>
            </select>

            <input 
              required 
              value={skills} 
              onChange={e => setSkills(e.target.value)} 
              placeholder="Primary Skill (e.g. Python)" 
              className="w-full border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-md transition transform active:scale-95">
            Start Skill Quiz
          </button>
        </form>
      </div>
    </div>
  )
}