# Technical Design Document
## SAT Vocabulary Memorization Web App

### Overview
This document outlines the technical architecture and implementation strategy for the SAT Vocabulary Memorization Web App. The application is designed to help high school students master SAT vocabulary through a focused, gamified learning experience with a 15-word active pool system.

### Tech Stack
- **Frontend**: Next.js 14 (App Router) - Modern React framework with server-side rendering and API routes
- **Database**: Supabase (PostgreSQL) - Managed database with built-in authentication and real-time capabilities
- **Authentication**: Supabase Auth - Handles user registration, login, and session management
- **Image Storage**: Vercel - CDN-optimized storage for Gemini-generated cartoon images
- **Deployment**: Vercel - Seamless deployment with automatic scaling
- **Styling**: Tailwind CSS - Utility-first CSS framework for rapid UI development
- **Real-time**: Supabase Realtime - Live updates for progress tracking and collaborative features

### Architecture Overview

The application follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │    Supabase     │    │     Vercel      │
│                 │    │                 │    │                 │
│ • Pages/Routes  │◄──►│ • PostgreSQL DB │    │ • Image Storage │
│ • Components    │    │ • Auth          │    │ • Static Assets │
│ • State Mgmt    │    │ • Realtime      │    │                 │
│ • localStorage  │    │ • API Routes    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### Design Principles
- **User-Centric**: Optimized for student learning patterns and engagement
- **Performance-First**: Fast loading times and smooth interactions
- **Scalable**: Architecture supports growth from hundreds to thousands of users
- **Maintainable**: Clean code structure with clear separation of concerns
- **Secure**: Robust authentication and data protection

### Database Schema (Supabase)

The database design follows a normalized structure optimized for the learning application's specific needs. Each table serves a distinct purpose in tracking user progress, managing word content, and enabling gamification features.

#### Users Table
**Purpose**: Stores user account information and learning statistics
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  study_streak INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_tier VARCHAR(50) DEFAULT 'top_25',
  last_study_date DATE
);
```

#### Words Table
**Purpose**: Contains all SAT vocabulary words with their definitions, examples, and associated images
**Design Notes**: Images are stored as URLs pointing to Vercel storage, enabling fast loading and CDN optimization
```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) UNIQUE NOT NULL,
  definition TEXT NOT NULL,
  part_of_speech VARCHAR(50) NOT NULL,
  example_sentence TEXT NOT NULL,
  synonyms TEXT[],
  antonyms TEXT[],
  tier VARCHAR(50) NOT NULL, -- 'top_25', 'top_100', 'top_200', 'top_500'
  image_urls TEXT[], -- Array of Vercel image URLs
  image_descriptions TEXT[], -- Array of descriptions for each image
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Progress Table
**Purpose**: Tracks individual word mastery state and spaced repetition scheduling for each user
**Design Notes**: Implements the core learning algorithm with streak tracking and review intervals
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL, -- 'not_started', 'started', 'ready', 'mastered'
  study_streak INTEGER DEFAULT 0,
  review_streak INTEGER DEFAULT 0,
  last_studied TIMESTAMP,
  next_review_date DATE,
  review_interval INTEGER DEFAULT 1, -- Days: 1, 3, 7, 14, 30
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);
```

#### Sessions Table
**Purpose**: Records study and review session data for analytics and progress tracking
**Design Notes**: Supports both guest and registered user sessions with detailed performance metrics
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL, -- 'study', 'review'
  words_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  words_promoted INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  is_guest BOOLEAN DEFAULT FALSE
);
```

#### Badges Table
**Purpose**: Defines achievement badges and tracks user accomplishments
**Design Notes**: Flexible criteria system allows for complex badge requirements
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100) NOT NULL,
  criteria JSONB NOT NULL, -- Conditions to earn badge
  tier VARCHAR(50) NOT NULL
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

### API Design

The API follows RESTful principles with clear separation between authentication (handled by Supabase) and custom business logic (handled by Next.js API routes).

#### Authentication Endpoints
**Handled by Supabase Auth** - Provides secure, production-ready authentication
```typescript
// Supabase Auth handles these automatically
POST /auth/signup
POST /auth/signin
POST /auth/signout
POST /auth/reset-password
```

#### Custom API Routes (Next.js)
**Purpose**: Handle business logic specific to the vocabulary learning application

```typescript
// /api/words/[tier]/route.ts
GET /api/words/top-25
GET /api/words/top-100
GET /api/words/top-200
GET /api/words/top-500

// /api/user/progress/route.ts
GET /api/user/progress
PUT /api/user/progress

// /api/user/session/route.ts
POST /api/user/session/start
PUT /api/user/session/complete

// /api/user/badges/route.ts
GET /api/user/badges
POST /api/user/badges/earn
```

### Component Architecture

The frontend follows a modular component architecture that promotes reusability and maintainability. Components are organized by feature and responsibility.

#### Page Structure
**Design Philosophy**: Each page represents a distinct user journey step
```
app/
├── page.tsx                    # Landing page
├── dashboard/
│   └── page.tsx               # Dashboard
├── study/
│   └── page.tsx               # Study session
├── review/
│   └── page.tsx               # Review session
├── summary/
│   └── page.tsx               # Session summary
├── auth/
│   ├── login/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
└── api/
    └── [routes as defined above]
```

#### Component Structure
**Design Philosophy**: Atomic design principles with clear component hierarchy
```
components/
├── ui/                        # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ProgressBar.tsx
│   └── Modal.tsx
├── auth/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── GuestModeBanner.tsx
├── study/
│   ├── Flashcard.tsx
│   ├── ImageCarousel.tsx
│   └── StudySession.tsx
├── review/
│   ├── TypedRecall.tsx
│   ├── ReviewSession.tsx
│   └── HintButton.tsx
├── dashboard/
│   ├── ActivePool.tsx
│   ├── TierProgress.tsx
│   ├── Achievements.tsx
│   └── ReviewsDue.tsx
└── layout/
    ├── Header.tsx
    ├── Footer.tsx
    └── Navigation.tsx
```

### State Management

The application uses a hybrid approach combining Zustand for global state management and localStorage for guest mode persistence.

#### Global State (Zustand)
**Purpose**: Manages application-wide state that needs to be shared across components
**Design Benefits**: Lightweight, TypeScript-friendly, and easy to test
```typescript
interface AppState {
  // User state
  user: User | null;
  isGuest: boolean;
  
  // Study state
  activePool: Word[];
  currentSession: Session | null;
  wordsDueForReview: Word[];
  
  // Progress state
  tierProgress: TierProgress;
  achievements: Badge[];
  streak: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setActivePool: (words: Word[]) => void;
  updateWordProgress: (wordId: string, newState: WordState) => void;
  completeSession: (sessionData: SessionData) => void;
}
```

#### Local Storage (Guest Mode)
**Purpose**: Provides persistence for guest users without requiring account creation
**Design Benefits**: Seamless guest experience with easy conversion to registered accounts
```typescript
interface GuestData {
  activePool: Word[];
  wordProgress: Record<string, WordProgress>;
  sessionHistory: Session[];
  streak: number;
  points: number;
  lastStudyDate: string;
}
```

### Real-time Updates

Supabase Realtime provides live synchronization of user progress across devices and sessions.

#### Supabase Realtime Subscriptions
**Purpose**: Keep user progress synchronized in real-time across multiple browser tabs or devices
**Design Benefits**: Enhanced user experience with instant progress updates
```typescript
// Listen for progress updates
const subscription = supabase
  .channel('user-progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_progress',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Update local state with real-time changes
    updateWordProgress(payload.new);
  })
  .subscribe();
```

### Image Management

The image system generates cartoon-style visual aids for each vocabulary word using Gemini AI, stored efficiently on Vercel's CDN.

#### Data Source & Image Generation
**Note**: WORDS.md file already exists with 500 SAT words
**Purpose**: Process existing word data and generate visual learning aids
**Design Benefits**: Consistent, high-quality images that enhance memory retention

```typescript
// WORDS.md file structure (500 words total)
// Format: word|definition|part_of_speech|example|synonyms|antonyms|tier

// Script to process WORDS.md and generate images
const processWordsAndGenerateImages = async () => {
  const wordsData = await parseWordsFromMarkdown('WORDS.md');
  
  for (const wordData of wordsData) {
    // Generate images using Gemini AI
    const images = await generateImagesWithGemini(wordData.word, wordData.definition);
    const imageUrls = await uploadToVercel(images);
    
    // Store word in database with image URLs
    await insertWordToDatabase({
      ...wordData,
      image_urls: imageUrls,
      image_descriptions: generateImageDescriptions(wordData.word, wordData.definition)
    });
  }
};
```

#### Image Storage Structure
**Purpose**: Organized storage system for efficient image retrieval and CDN optimization
**Design Benefits**: Fast loading times and scalable image management
```
vercel-storage/
├── words/
│   ├── top-25/
│   │   ├── magnanimous-1.png
│   │   ├── magnanimous-2.png
│   │   └── ...
│   ├── top-100/
│   └── ...
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Vercel
VERCEL_PROJECT_ID=your_project_id
VERCEL_TOKEN=your_vercel_token
```

### Deployment Strategy

#### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### Build Process
1. Parse WORDS.md file (500 words)
2. Generate word images with Gemini AI
3. Upload images to Vercel storage
4. Seed database with words and image URLs
5. Deploy Next.js app to Vercel

### Security Considerations

Security is implemented at multiple layers to protect user data and ensure application integrity.

#### Row Level Security (RLS)
**Purpose**: Database-level security ensuring users can only access their own data
**Design Benefits**: Prevents data leaks and unauthorized access even if application logic fails
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only see their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only see their own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id);
```

#### API Security
**Purpose**: Protect API endpoints from abuse and ensure data integrity
**Design Benefits**: Rate limiting, input validation, and CORS protection
- Rate limiting on API routes
- Input validation and sanitization
- CORS configuration
- Environment variable protection

### Performance Optimizations

Multiple optimization strategies ensure fast loading times and smooth user experience.

#### Image Optimization
**Purpose**: Minimize image load times while maintaining visual quality
**Design Benefits**: Faster page loads and reduced bandwidth usage
- Next.js Image component with lazy loading
- WebP format for better compression
- Responsive image sizes

#### Database Optimization
**Purpose**: Ensure fast database queries and efficient resource usage
**Design Benefits**: Reduced query times and improved scalability
- Indexes on frequently queried columns
- Connection pooling
- Query optimization

#### Caching Strategy
**Purpose**: Minimize redundant data fetching and improve response times
**Design Benefits**: Faster user experience and reduced server load
- Static generation for word lists
- Client-side caching for user progress
- CDN for images via Vercel

### Development Workflow

A streamlined development process ensures efficient code delivery and maintenance.

#### Local Development
**Purpose**: Set up development environment quickly and efficiently
**Design Benefits**: Consistent development experience across team members
```bash
# Setup
npm install
cp .env.example .env
# Configure environment variables

# Database setup
npm run db:setup
npm run parse:words  # Parse WORDS.md and generate images
npm run db:seed

# Development
npm run dev
```

#### Database Migrations
**Purpose**: Manage database schema changes safely and consistently
**Design Benefits**: Version-controlled database changes with rollback capability
```bash
# Create migration
npm run db:migrate:create add_user_badges_table

# Run migrations
npm run db:migrate:up
```

### Testing Strategy

Comprehensive testing ensures application reliability and maintainability.

#### Unit Tests
**Purpose**: Test individual components and functions in isolation
**Design Benefits**: Catch bugs early and ensure code quality
- Component testing with React Testing Library
- API route testing
- Utility function testing

#### Integration Tests
**Purpose**: Test complete user workflows and system interactions
**Design Benefits**: Ensure end-to-end functionality works correctly
- User flow testing
- Database integration testing
- Authentication flow testing

### Monitoring & Error Handling

Robust error handling and monitoring ensure application stability and user experience.

#### Error Boundaries
**Purpose**: Gracefully handle React component errors without crashing the entire app
**Design Benefits**: Better user experience and easier debugging
```typescript
// Global error boundary for the app
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryProvider>
      {children}
    </ErrorBoundaryProvider>
  );
}
```

#### Logging
**Purpose**: Track application behavior and identify issues in production
**Design Benefits**: Better debugging and performance monitoring
- Console logging for development
- Error tracking for production
- Performance monitoring

This technical design provides a solid foundation for implementing the SAT Vocabulary app with the specified tech stack and requirements.
