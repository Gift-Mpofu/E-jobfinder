# E-JobFinder Architecture

This document describes the high-level architecture and design decisions of E-JobFinder.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Next.js Frontend (React 19)              │  │
│  │  - UI Components (Radix UI + Tailwind)            │  │
│  │  - Form Handling (React Hook Form + Zod)          │  │
│  │  - State Management & Hooks                       │  │
│  │  - Dark Mode (next-themes)                        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Next.js Server                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │         API Routes & Server Components             │  │
│  │  - Genkit AI Integration (@genkit-ai/next)        │  │
│  │  - SSR & SSG                                       │  │
│  │  - File uploads (PDF processing)                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    ↙            ↘
                   ↙              ↘
        ┌──────────────────┐   ┌─────────────────┐
        │   Supabase       │   │  Google Genkit  │
        │  (PostgreSQL)    │   │      AI         │
        │  - Auth          │   │  - Job Matching │
        │  - User Profiles │   │  - Personalized │
        │  - Job Data      │   │    Recommend.   │
        │  - Applications  │   │  - NLP          │
        └──────────────────┘   └─────────────────┘
```

## Architecture Layers

### 1. Presentation Layer (Frontend)

**Technology**: React 19 with Next.js App Router

**Responsibilities**:
- Render UI components
- Handle user interactions
- Display data fetched from backend
- Manage client-side form state

**Key Components**:
- Page components in `src/app/`
- Reusable components in `src/components/`
- UI primitives from Radix UI
- Custom hooks in `src/hooks/`

**Styling Approach**:
- Utility-first CSS with Tailwind
- Component-level class composition
- Theme support via next-themes
- Responsive design with mobile-first approach

### 2. Business Logic Layer

**Technology**: Next.js Server Components, API Routes, Genkit

**Responsibilities**:
- Process user input and validation
- Apply business rules
- Communicate with AI engine
- Handle complex calculations

**Key Features**:
- React Hook Form for form management
- Zod for runtime validation
- Custom hooks for reusable logic
- Genkit flows for AI operations

### 3. Data Access Layer

**Technology**: Supabase (PostgreSQL)

**Responsibilities**:
- Persist user data
- Store job listings
- Track applications
- Manage user sessions

**Key Features**:
- SSR (Server-Side Rendering) for Supabase
- Real-time subscriptions
- Row-level security policies
- Prepared statements via client

### 4. External Services Layer

**AI Engine**: Google Genkit

**Responsibilities**:
- Generate job recommendations
- Analyze user profiles
- Match skills with job requirements
- Provide insights and suggestions

## Data Flow

### Job Discovery Flow
```
User Browse Jobs
    ↓
Frontend Request
    ↓
Next.js API Route
    ↓
Supabase Query (Fetch Jobs)
    ↓
Return Job List
    ↓
Render in UI
```

### AI Recommendation Flow
```
User Profile Updated
    ↓
Trigger Genkit Flow
    ↓
Send Profile to Google Genkit AI
    ↓
AI Analyzes Skills & Preferences
    ↓
Generate Job Recommendations
    ↓
Store Results in Supabase
    ↓
Update UI with Recommendations
```

### Resume Upload Flow
```
User Upload PDF
    ↓
Form Validation (Zod)
    ↓
File Upload to Server
    ↓
Parse PDF (pdfjs-dist)
    ↓
Extract Text & Metadata
    ↓
Store in Supabase
    ↓
Trigger AI Analysis
    ↓
Show Results to User
```

## Technology Decisions

### Why Next.js?
- **SSR Capabilities**: Better SEO for job listings
- **API Routes**: Integrated backend without separate server
- **App Router**: Modern, file-based routing
- **Vercel Integration**: Seamless deployment

### Why Supabase?
- **PostgreSQL**: Powerful relational database
- **Built-in Auth**: User authentication out of the box
- **Real-time**: Live updates for job listings
- **Row-level Security**: Fine-grained access control
- **Serverless**: Scale automatically

### Why Google Genkit?
- **AI/ML Integration**: Easy to add AI features
- **Flexibility**: Multiple AI model support
- **Monitoring**: Built-in observability
- **Reliability**: Production-ready

### Why Radix UI?
- **Accessibility**: WCAG compliant components
- **Unstyled**: Full control over styling with Tailwind
- **Composable**: Build complex UIs from primitives
- **Developer Experience**: Great TypeScript support

## File Structure Deep Dive

```
E-jobfinder/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── jobs/                    # Job listing routes
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── profile/                 # User profile routes
│   │   │   └── page.tsx
│   │   ├── api/                     # API routes
│   │   │   ├── jobs/               # Job endpoints
│   │   │   ├── recommendations/    # AI recommendations
│   │   │   └── upload/             # File upload
│   │   └── middleware.ts           # Next.js middleware
│   │
│   ├── components/                  # Reusable components
│   │   ├── ui/                      # Radix UI wrappers
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ...
│   │   ├── features/                # Feature components
│   │   │   ├── JobCard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── RecommendationList.tsx
│   │   │   └── ...
│   │   ├── layouts/                 # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── index.ts                # Component exports
│   │
│   ├── lib/                         # Utility functions
│   │   ├── supabase.ts             # Supabase client
│   │   ├── genkit.ts               # Genkit initialization
│   │   ├── utils.ts                # Helper functions
│   │   └── validation.ts           # Zod schemas
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useJobs.ts
│   │   ├── useAuth.ts
│   │   ├── useRecommendations.ts
│   │   └── ...
│   │
│   ├── types/                       # TypeScript types
│   │   ├── job.ts
│   │   ├── user.ts
│   │   └── ...
│   │
│   └── styles/                      # Global styles
│       └── globals.css
│
├── public/                          # Static assets
│   ├── images/
│   └── icons/
│
├── genkit.config.ts                 # Genkit configuration
├── genkit-flow.ts                   # Genkit flows definition
├── next.config.ts                   # Next.js config
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json                    # TypeScript config
└── package.json
```

## Authentication Flow

```
User Visits App
    ↓
Check Auth Token (next-auth / Supabase)
    ↓
If No Token → Redirect to Login
    ↓
If Valid Token → Load User Data
    ↓
Set User Context (React Context)
    ↓
Render Protected Routes
```

## Performance Optimizations

### Client-Side
- Code splitting via Next.js
- Image optimization
- Dynamic imports for heavy components
- Memoization of components

### Server-Side
- Server-side rendering (SSR)
- Server components by default
- Query optimization
- Caching strategies

### Network
- API response caching
- Pagination for large datasets
- Lazy loading of resources
- Compression

## Deployment Architecture

```
Development
    ↓ (npm run dev)
Development Server
    ↓
Production
    ↓ (npm run build)
Optimized Build
    ↓ (deployed to Vercel)
CDN + Edge Runtime
    ↓
Global Distribution
```

## Security Considerations

1. **Authentication**: Supabase Auth with JWT
2. **Authorization**: Row-level security policies in database
3. **Validation**: Zod for input validation
4. **API Security**: API routes with proper auth checks
5. **Environment Variables**: Sensitive data in .env
6. **HTTPS**: All communications encrypted
7. **CORS**: Proper cross-origin policies

## Scalability

### Database
- PostgreSQL with Supabase handles scaling
- Connection pooling
- Indexing strategy

### Frontend
- Serverless deployment on Vercel
- Auto-scaling
- Global CDN

### AI Services
- Genkit manages AI model scaling
- Request batching
- Rate limiting

## Monitoring & Logging

- Genkit built-in observability
- Browser console for client errors
- Supabase logs for database operations
- Vercel analytics for performance

## Future Considerations

- Caching layer (Redis)
- Advanced search (Elasticsearch)
- Message queue for async jobs
- Analytics platform integration
- Machine learning model training
