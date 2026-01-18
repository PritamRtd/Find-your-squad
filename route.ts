import { NextRequest, NextResponse } from 'next/server'

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

export interface QuizResponse {
  questions: QuizQuestion[]
}

export async function POST(request: NextRequest) {
  try {
    const { skills } = await request.json()
    console.log('Received skills:', skills)

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      console.error('Invalid skills array')
      return NextResponse.json(
        { error: 'Skills array is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    console.log('API Key present:', !!apiKey)
    console.log('API Key length:', apiKey?.length)

    if (!apiKey) {
      console.error('Gemini API key not configured')
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `Generate exactly 5 multiple choice quiz questions to verify someone's knowledge of these skills: ${skills.join(', ')}.

Each question should test practical knowledge, not just definitions.
The correctAnswer should be the index (0-3) of the correct option.
Make questions challenging but fair for someone who claims to know these skills.
Cover different skills from the list if possible.`

    // Using Gemini 1.5 Flash with structured output (JSON Schema)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    console.log('Making request to Gemini API...')
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "integer",
                    description: "Question number starting from 1"
                  },
                  question: {
                    type: "string",
                    description: "The quiz question text"
                  },
                  options: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    description: "Array of 4 answer options"
                  },
                  correctAnswer: {
                    type: "integer",
                    description: "Index (0-3) of the correct option"
                  }
                },
                required: ["id", "question", "options", "correctAnswer"]
              }
            }
          },
          required: ["questions"]
        }
      },
    }
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Response status:', response.status)
    console.log('Response statusText:', response.statusText)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API error response:', errorData)
      console.error('Response headers:', Object.fromEntries(response.headers.entries()))
      return NextResponse.json(
        { error: `Failed to generate quiz questions: ${errorData}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data, null, 2))
    
    // Extract the text content from Gemini's response (already JSON due to structured output)
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      console.error('No content in response. Full response:', JSON.stringify(data, null, 2))
      return NextResponse.json(
        { error: 'No content in Gemini response' },
        { status: 500 }
      )
    }

    console.log('Text content from Gemini:', textContent)

    // Parse the JSON response
    const quizData: QuizResponse = JSON.parse(textContent)
    console.log('Parsed quiz data:', quizData)

    // Validate the response structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error('Invalid quiz data structure:', quizData)
      return NextResponse.json(
        { error: 'Invalid quiz data structure' },
        { status: 500 }
      )
    }

    console.log('Successfully generated quiz with', quizData.questions.length, 'questions')
    return NextResponse.json(quizData)
  } catch (error) {
    console.error('Quiz generation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: `Failed to generate quiz: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
