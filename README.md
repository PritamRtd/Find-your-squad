
# Find Your Squad

A modern platform to find teammates and join tech events or hackathons.

## Features

- 🚀 Next.js 14+ (App Router)
- 💎 TypeScript
- 🎨 Tailwind CSS
- 🔐 Supabase Auth & Storage
- 💬 Team & Direct Messaging
- 📱 Responsive, mobile-first design

## Pages

- **Home** – Clean landing page, quick intro & CTA
- **Explore** – Browse events, teams, and people
- **Chat** – Team and direct messaging
- **Dashboard** – Your teams, quick actions, pending requests
- **Profile** – Edit your info, skills, and avatar

## Getting Started

### Prerequisites

- Node.js 18.17+
- Supabase project

### Installation

```bash
git clone https://github.com/PreetamRtd/Find-your-squad.git
cd Find-your-squad
npm install
```

1. Create `.env.local` in the root:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Supabase Setup

- Create a project at [Supabase](https://app.supabase.com)
- Copy your API keys to `.env.local`
- Run the SQL in `supbase/migrations/` to set up tables and storage
- (Optional) Configure email templates in Supabase Auth

## Project Structure

```
app/
	dashboard/      # Dashboard page
	explore/        # Explore events/teams
	chat/           # Messaging
	profile/        # User profile
	...
lib/supabase/     # Supabase client/server utils
supbase/          # SQL migrations
```

## Build for Production

```bash
npm run build
npm start
```

## License

MIT
