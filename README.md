# Find Your Squad

The easiest way to find teammates and explore tech events.

## Features

- 🚀 Built with Next.js 14+ (App Router)
- 💎 TypeScript for type safety
- 🎨 Tailwind CSS for styling
- 🔐 Google OAuth & Email/Password authentication via Supabase
- 🏫 RVCE email domain restriction (`@rvce.edu.in` only)
- 👤 User onboarding for profile completion
- 🛡️ Protected routes with middleware
- 📱 Responsive design

## Pages

- **Home** (`/`) - Landing page with navigation
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - New user registration
- **Dashboard** (`/dashboard`) - Protected dashboard (requires authentication)

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PreetamRtd/Find-your-squad.git
cd Find-your-squad
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your [Supabase Dashboard](https://app.supabase.com) under Project Settings > API.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Supabase Setup

1. Create a new project on [Supabase](https://app.supabase.com)
2. The authentication is already set up! Supabase creates the necessary tables automatically
3. (Optional) Configure email templates in Authentication > Email Templates
4. (Optional) Disable email confirmation in Authentication > Providers > Email for development

## Project Structure

```
Find-your-squad/
├── app/
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── lib/
│   └── supabase/         # Supabase client utilities
│       ├── client.ts     # Browser client
│       ├── server.ts     # Server client
│       └── middleware.ts # Middleware utilities
├── middleware.ts         # Next.js middleware for auth
└── .env.example          # Example environment variables
```

## Authentication Flow

The application uses Supabase Authentication with support for:

### Google OAuth (Recommended)
- Users can sign in with their Google account
- **Only `@rvce.edu.in` email addresses are allowed**
- First-time users are redirected to onboarding to complete their profile
- See [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md) for setup instructions

### Email/Password Authentication
- Users can create an account with email/password
- Email must be from the `@rvce.edu.in` domain
- Existing users can sign in with their credentials

### Authentication Process
1. **Login**: User signs in with Google OAuth or email/password
2. **Email Validation**: System verifies the email is from `@rvce.edu.in` domain
3. **Profile Check**: System checks if user profile exists and is complete
4. **Onboarding**: First-time users complete their profile (year of study, branch, skills)
5. **Dashboard**: Users with complete profiles access the dashboard
6. **Protected Routes**: Middleware ensures only authenticated users access protected pages
7. **Session Management**: Supabase handles sessions automatically
8. **Logout**: Users can logout from the dashboard

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Backend & Authentication

## License

MIT
