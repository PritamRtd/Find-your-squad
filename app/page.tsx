import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Find Your Squad
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            The easiest way to find teammates and explore tech events.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="flex w-full items-center justify-center rounded-md bg-white px-4 py-3 text-base font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Create an account
          </Link>
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-md bg-gray-100 px-4 py-3 text-base font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
