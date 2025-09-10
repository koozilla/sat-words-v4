# Product Requirement Document (PRD)
## SAT Vocabulary Memorization Web App

### 1. Overview
The SAT Vocabulary Memorization Web App helps high school students master SAT-level vocabulary using tiered word lists, a 15-word active pool, flashcard practice, typed recall review, and spaced repetition. The app ensures focus, builds long-term retention, and motivates with progress tracking and gamification. Students may sign up with email + password or try the app in guest mode before registering.

### 2. Objectives
- Enable students to efficiently learn and retain SAT vocabulary.
- Keep learning focused with a 15-word pool that rotates as words are mastered.
- Support visual memory with up to 5 images per word.
- Motivate through progress dashboards, points, streaks, and badges.
- Provide flexible access: guest mode for quick trial, full login for saved progress.

### 3. Target Users
- **Primary**: High school students preparing for the SAT.
- **Secondary**: Parents and teachers who track progress.

### 4. Authentication & Accounts

#### Email + Password Login
- Students can create accounts with a simple email + password.
- Password reset available via email.
- Accounts save all progress, mastery history, streaks, and badges.

#### Guest Mode
Students can start using the app instantly without creating an account.

Guest sessions include:
- Access to the same study and review features.
- A temporary 15-word pool from the Top 25.
- Basic progress during the session.
- Guest progress is not saved once the session ends.

Students are prompted to create an account to:
- Save progress across sessions.
- Unlock higher tiers (Top 100, Top 200, Top 500).
- Earn and keep badges and streaks.

### 5. Content & Word Lists
- Preloaded tiers: Top 25 → Top 100 → Top 200 → Top 500 (cumulative).
- Students must introduce all words from one tier before unlocking the next.
- Each word includes:
  - Definition
  - Part of speech
  - Example sentence
  - Synonyms and antonyms
  - Up to 5 images with descriptions (generated using Gemini AI with cartoon-style prompts)

### 6. Word States
- **Not Started** – not introduced
- **Started (Study)** – in flashcards, building MCQ streak
- **Ready for Test (Review)** – in typed recall under spaced repetition
- **Mastered** – long-interval review only

#### Promotion rules:
- Study → Review: 3 consecutive correct answers in flashcards
- Review → Mastered: 3 consecutive correct answers in typed recall
- Any miss resets streaks

### 7. Active Learning Pool
- Always 10 active words at a time.
- Mastered words leave the pool, replaced with new words from the current tier.
- Students must introduce all words in the tier before moving to the next tier.
- If a tier has fewer than 10 remaining, the pool shrinks until the next tier unlocks.

### 8. Study & Review Modes

#### Flashcards (Study)
- Show image + definition.
- 4 options: 1 correct, 3 distractors randomly chosen from the same tier.
- Immediate feedback with explanation.
- Word moves to review after 3 correct streak.
- Default session: 10 questions per study session.

#### Typed Recall (Review)
- Show image(s) + definition + part of speech + character count.
- Students type the word.
- No typo tolerance - exact spelling required.
- Optional hints (first letter or synonym).
- Word becomes mastered after 3 correct streak.

#### Images
- Up to 5 per word, carousel format.
- Each image has a short description explaining the connection.
- Students can toggle images or descriptions on/off.
- Images generated using Gemini AI with cartoon-style prompts for visual learning.

### 9. Spaced Repetition
- Review intervals: 1 → 3 → 7 → 14 → 30 days.
- Incorrect answers shorten intervals.
- Only words that clear the flashcard streak enter review.

### 10. Progress Tracking
Dashboard shows:
- Pool status (10 words)
- State breakdown: Not Started, Started, Ready, Mastered
- Tier progress
- Reviews due today/this week
- Streaks and badges

### 11. Gamification
- Points for correct answers, with streak bonuses.
- Badges for milestones (e.g., mastering Top 25).
- Streak tracking for daily activity.
- Optional leaderboards in classroom/group mode.

### 12. User Flows

#### Onboarding
- Guest mode option: Start studying instantly with a 15-word pool from the Top 25.
- Sign up option: Register with email + password to save progress.

#### Daily Session
- Dashboard shows due reviews and pool words.
- Session begins with due reviews (typed).
- Then flashcard practice from active pool.
- Mastered words exit pool; new words enter.

#### Tier Progression
- Guest mode: limited to Top 25 (demo experience).
- Registered users: unlock next tier after introducing all words in the current tier.

### 13. Success Metrics
- Percentage of guest users converting to registered accounts.
- Words mastered per week (guest vs. registered).
- Average session length.
- Tier completion rates.
- Retention at 1 week and 1 month.

### 14. Risks & Considerations
- Guest users may not convert if onboarding is too frictionless—need clear prompts to sign up.
- Must balance streak requirements (3 consecutive correct) to avoid discouragement.
- Distractors chosen randomly may feel repetitive.
- Image quality and description accuracy affect learning experience.
- Accessibility: provide alt text, high-contrast mode, and toggles for images.

## Onboarding Flow

### Entry Point
**Landing Page (first-time visitor)**
- Headline: "Master SAT Words, 15 at a Time"
- Two primary buttons:
  - Start as Guest (instant trial)
  - Sign Up (email + password)

### 1. Guest Mode Flow

#### Step 1 — Click "Start as Guest"
- Instantly drops user into dashboard with 10 words from Top 25 auto-loaded.
- Banner at top: "You're in Guest Mode. Progress will reset when you leave. Sign up to save your work and unlock more words."

#### Step 2 — Begin Studying
- Flashcards appear immediately.
- Words follow the normal study → review flow.
- Progress tracked only for the current session.

#### Step 3 — End of Session Prompt
After 10–15 minutes or when user closes a session:
- Pop-up: "Want to keep your progress? Sign up for free!"
- CTA: Create Account (pre-filled with guest session stats: e.g., "You mastered 3 words today—don't lose them!").

#### Limits in Guest Mode
- Only Top 25 tier available.
- No streaks, badges, or leaderboard.
- No saving across devices/sessions.

### 2. Registered User Flow

#### Step 1 — Click "Sign Up"
Simple form:
- Email
- Password (min 8 chars)
- Confirm Password
- Button: Create Account

#### Step 2 — Email Confirmation (optional)
- Prompt: "Check your inbox to confirm your email."
- After confirmation, redirected to Dashboard.

#### Step 3 — Dashboard
- Active pool filled with 10 words from Top 25.
- Tier progression unlocked as user introduces words.
- Full features available:
  - Progress saved automatically.
  - Streaks and badges.
  - Unlock Top 100, 200, 500 tiers.

### 3. Conversion Nudges

#### For Guest Users
- Persistent banner: "Guest Mode: Progress won't be saved. Sign up anytime."
- Pop-up after mastering 5+ words: "Great work! Sign up now to keep your streak."
- Tier lock prompt: "You've completed the Top 25! Sign up to unlock the Top 100."

#### For Registered Users
- Motivational streak reminders.
- Badges and milestones visible on dashboard.

### 4. Visual Summary (side-by-side)

| Guest Mode | Registered Mode |
|------------|-----------------|
| Access | Instant, no sign-up | Email + password login |
| Words Available | Top 25 only | All tiers (25 → 100 → 200 → 500) |
| Pool Size | 10 words | 10 words |
| Progress Save | Session-only (lost on exit) | Saved across sessions & devices |
| Streaks/Badges | ❌ Not available | ✅ Available |
| Conversion | Banner + session-end prompts | Not applicable |
