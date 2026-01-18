# Find Your Squad - System Design Document

## 🎯 Vision
A platform where students can easily find teammates for hackathons, coding competitions, and tech events. Focus on **simplicity** and **quick team formation**.

---

## 👤 User Personas

### 1. **The Solo Participant** (Primary)
- Wants to join a hackathon but has no team
- Looking for teammates with complementary skills
- Needs to quickly browse and join teams

### 2. **The Team Leader**
- Has an idea or partial team
- Wants to recruit specific skills (e.g., "need a frontend dev")
- Manages team composition and requests

### 3. **The Event Organizer** (Secondary)
- Creates events/hackathons
- Wants to see participation metrics
- May want to feature certain teams

---

## 🔄 Core User Flows

### Flow 1: Finding & Joining a Team
```
Register → Complete Profile → Browse Events → View Teams → 
Request to Join → Chat with Leader → Get Accepted → Team Chat
```

### Flow 2: Creating a Team
```
Register → Complete Profile → Browse Events → Create Team → 
Set Requirements → Review Requests → Accept Members → Team Chat
```

### Flow 3: Team Communication
```
Open Chat → View Team Chats → Send Messages → 
Review Join Requests → Accept/Reject → Coordinate
```

---

## 📱 Feature Priority Matrix

### P0 - Must Have (MVP)
| Feature | Status | Notes |
|---------|--------|-------|
| User Registration/Login | ✅ Done | Supabase Auth |
| Profile with Skills | ✅ Done | Enhanced with avatar, bio |
| Browse Events | ✅ Done | List view |
| Create/Join Teams | ✅ Done | With requirements |
| Join Requests | ✅ Done | Integrated in chat |
| Team Chat | 🔧 Fixing | Polling-based |
| Mobile Navigation | ✅ Done | Bottom nav |

### P1 - Should Have
| Feature | Status | Notes |
|---------|--------|-------|
| Skill-based Matching | ❌ Todo | Suggest teams based on skills |
| Notifications | ❌ Todo | Email/push for requests |
| Team Search/Filter | ✅ Done | In explore page |
| Profile Verification | ❌ Todo | Verify skills via quiz |
| Event Categories | ❌ Todo | Filter by type |

### P2 - Nice to Have
| Feature | Status | Notes |
|---------|--------|-------|
| Team Rating/Reviews | ❌ Todo | Post-event feedback |
| Skill Endorsements | ❌ Todo | LinkedIn-style |
| Event Calendar | ❌ Todo | Google Calendar sync |
| Team Templates | ❌ Todo | Quick team creation |
| AI Team Suggestions | ❌ Todo | Match users to teams |

---

## 🗄️ Database Schema (Simplified)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   profiles  │       │   events    │       │    teams    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ full_name   │       │ title       │       │ event_id(FK)│
│ avatar_url  │       │ description │       │ creator_id  │
│ bio         │       │ created_by  │       │ name        │
│ year_of_study│      │ event_date  │       │ description │
│ branch      │       │ location    │       │ max_size    │
│ skills[]    │       │ created_at  │       │ looking_for │
│ contact_info│       └─────────────┘       │ status      │
│ github_url  │                             └─────────────┘
│ linkedin_url│              │                     │
└─────────────┘              │                     │
       │                     │                     │
       │         ┌───────────┴──────────┐         │
       │         │                      │         │
       ▼         ▼                      ▼         ▼
┌─────────────────────┐         ┌─────────────────────┐
│    team_members     │         │      messages       │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ team_id (FK)        │         │ team_id (FK)        │
│ user_id (FK)        │         │ sender_id (FK)      │
│ status (enum)       │         │ content             │
│ role (enum)         │         │ message_type        │
│ created_at          │         │ created_at          │
└─────────────────────┘         └─────────────────────┘

Status: pending | accepted | rejected
Role: leader | admin | member
Message Type: text | system | join_request
```

---

## 🔧 Technical Architecture

### Frontend
- **Next.js 16** - App Router, Server Components
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### Backend
- **Supabase** (Free Tier)
  - PostgreSQL database
  - Row Level Security (RLS)
  - Authentication
  - Storage for avatars

### Chat Implementation (Polling-based)
Since Supabase Realtime requires additional setup, we use polling:
```
1. Initial load: Fetch all messages
2. Poll every 3 seconds for new messages
3. Optimistic updates for sent messages
4. Last message timestamp tracking
```

### API Structure
```
/api
  /chat
    /[teamId]/messages  - GET (poll), POST (send)
  /teams
    /[id]/members       - CRUD operations
  /profile
    /update             - Update profile
    /avatar             - Upload avatar
```

---

## 🎨 Design System

### Colors
- **Primary**: Blue (#2563EB) - Actions, links
- **Success**: Green (#16A34A) - Accepted, online
- **Warning**: Yellow (#CA8A04) - Pending, admin badge
- **Danger**: Red (#DC2626) - Delete, reject
- **Neutral**: Gray scale - Text, borders

### Components
- **Cards**: Rounded corners (xl), subtle shadows
- **Buttons**: Rounded (lg), clear hierarchy
- **Forms**: Full-width inputs, clear labels
- **Navigation**: Fixed position, clear icons

### Mobile First
- Bottom navigation on mobile
- Top navigation on desktop
- Touch-friendly targets (min 44px)
- Swipe gestures for chat

---

## 🔐 Security Considerations

### Row Level Security (RLS)
- Users can only read public profiles
- Users can only update their own profile
- Team messages visible only to members
- Join requests visible to team leaders

### Input Validation
- Sanitize all user inputs
- Validate file uploads (avatar)
- Rate limiting on messages

---

## 📊 Metrics to Track

### User Engagement
- Daily active users
- Teams created per event
- Join request conversion rate
- Messages sent per team

### Growth
- New registrations
- Profile completion rate
- Events with active teams

---

## 🚀 Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Hosting Options
- **Vercel** (Recommended) - Free tier, auto-deploy
- **Netlify** - Alternative

---

## 📋 Next Steps

1. ✅ Fix chat with polling mechanism
2. ✅ Add proper error handling
3. ⬜ Implement notifications
4. ⬜ Add skill-based matching
5. ⬜ Event date/location fields
6. ⬜ Team status (open/closed)
