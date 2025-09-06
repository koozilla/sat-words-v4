# SAT Word Mastery

A comprehensive SAT vocabulary memorization web application built with Next.js 14, Supabase, and Tailwind CSS. Master SAT vocabulary using a proven 15-word active pool system with flashcards, spaced repetition, and gamification.

## 🚀 Features

### Core Learning System
- **15-Word Active Pool** - Focus on manageable sets of words
- **Flashcard Study Sessions** - Multiple choice with visual aids
- **Typed Recall Reviews** - Spaced repetition with exact spelling
- **Progress Tracking** - Tier-based progress (Top 25, 100, 200, etc.)
- **Session Summaries** - Performance stats and achievements

### User Experience
- **Guest Mode** - Try without signing up
- **Responsive Design** - Works on all devices
- **Modern UI/UX** - Clean, intuitive interface
- **Real-time Updates** - Live progress tracking

### Gamification
- **Achievement Badges** - 18+ badges for milestones
- **Streak Tracking** - Daily study streaks
- **Points System** - Earn points for progress
- **Tier Mastery** - Complete vocabulary tiers

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **State Management**: Zustand
- **Icons**: Lucide React

## 📁 Project Structure

```
sat-words-v4/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── study/            # Study session
│   ├── review/           # Review session
│   ├── session-summary/  # Session results
│   └── words/            # Word browser
├── lib/                   # Utilities and configurations
├── types/                 # TypeScript type definitions
├── supabase/             # Database schema and setup
├── tools/                # Development tools
│   └── word-details-generator/  # AI-powered word generation
├── tests/                 # Test scripts and utilities
├── docs/                  # Comprehensive documentation
│   ├── PRD.md            # Product Requirements Document
│   ├── TECH_DESIGN.md    # Technical Design Document
│   ├── PLAN.md           # Development Plan
│   ├── WIREFRAME.md      # UI/UX Wireframes
│   └── WORDS.md          # SAT Vocabulary Data
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Gemini API key (for word generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sat-words-v4
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.local.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME="SAT Word Mastery"
   ```

4. **Set up the database**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL from `supabase/schema.sql`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users** - User accounts and profiles
- **Words** - SAT vocabulary words with metadata
- **User Progress** - Individual word learning states
- **Sessions** - Study and review session records
- **Badges** - Achievement system
- **User Badges** - Earned achievements

## 🎯 Usage

### For Students
1. **Start as Guest** - Try the app without signing up
2. **Sign Up** - Create account to save progress
3. **Study Session** - Learn new words with flashcards
4. **Review Session** - Practice with spaced repetition
5. **Track Progress** - Monitor tier completion and achievements

### For Developers
1. **Word Generation** - Use the AI tool to generate word details
2. **Database Management** - Use Supabase dashboard
3. **Customization** - Modify themes, add features
4. **Deployment** - Deploy to Vercel with one click

## 📚 Documentation

Comprehensive project documentation is available in the [`docs/`](./docs/) directory:

- **[PRD.md](./docs/PRD.md)** - Product Requirements Document
- **[TECH_DESIGN.md](./docs/TECH_DESIGN.md)** - Technical Architecture
- **[PLAN.md](./docs/PLAN.md)** - Development Timeline
- **[WIREFRAME.md](./docs/WIREFRAME.md)** - UI/UX Design
- **[WORDS.md](./docs/WORDS.md)** - SAT Vocabulary Data

## 🛠 Development Tools

### Word Details Generator
Located in `tools/word-details-generator/`, this tool uses Gemini AI to generate:
- Definitions and part of speech
- Synonyms and antonyms
- Example sentences
- Difficulty ratings

**Usage:**
```bash
cd tools/word-details-generator
npm install
cp env.example .env
# Add your GEMINI_API_KEY
npm run generate
```

### Test Scripts
Located in `tests/`, these scripts help with development and testing:
- Database setup and test data creation
- Authentication testing
- Debugging utilities

See [`tests/README.md`](./tests/README.md) for detailed usage instructions.

## 📱 Pages Overview

- **Landing Page** (`/`) - Welcome and guest mode access
- **Dashboard** (`/dashboard`) - Main hub with stats and quick actions
- **Study Session** (`/study`) - Flashcard learning interface
- **Review Session** (`/review`) - Typed recall practice
- **Session Summary** (`/session-summary`) - Performance results
- **Words Browser** (`/words`) - Add words to active pool
- **Authentication** (`/auth/*`) - Login, signup, password reset

## 🎨 Design System

- **Colors**: Blue primary, green success, red error, yellow warning
- **Typography**: System fonts with clear hierarchy
- **Components**: Consistent card-based layout
- **Responsive**: Mobile-first design approach

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm start
```

## 📈 Performance

- **Image Optimization** - Next.js automatic optimization
- **Database Indexing** - Optimized queries with proper indexes
- **Caching** - Supabase real-time with efficient caching
- **Bundle Size** - Tree-shaking and code splitting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Deployment platform
- **Tailwind CSS** - Styling framework
- **Lucide** - Icon library
- **Gemini AI** - Word content generation

## 📞 Support

For support, email support@satwordmastery.com or create an issue in the GitHub repository.

---

**Built with ❤️ for SAT students everywhere**
