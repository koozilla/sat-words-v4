# Wireframes
## SAT Vocabulary Memorization Web App

## Landing Page Wireframe (Text)
```
----------------------------------------------------
| [LOGO] SAT Word Mastery                         |
----------------------------------------------------
|  Headline: "Master SAT Vocabulary, 15 Words at a Time" 
|  Subtext:  "Proven system using flashcards, reviews, and spaced repetition." 
|
|  [Illustration or Hero Image] 
|
|  [ Start as Guest ]  [ Sign Up Free ] 
|
|  --- OR ---
|
|  Already have an account? [Log In] 
|
----------------------------------------------------
|  Benefits Section (3 columns): 
|   • 15-Word Active Pool → Focus, not overload 
|   • Images + Examples → Learn in context 
|   • Progress & Streaks → Stay motivated 
|
----------------------------------------------------
|  Testimonial/Quote (optional): 
|   "This app made studying SAT words actually fun!" – Student 
|
----------------------------------------------------
|  Footer: 
|   Links: About | Privacy | Terms 
----------------------------------------------------
```

### Flow Highlights
- Two big buttons side by side:
  - Start as Guest → goes straight to Dashboard (Top 25 words, 15 pool).
  - Sign Up Free → email + password form.
- Login link below for returning users.
- Visual cue (hero image): Could be a student with flashcards, or an abstract memory/learning illustration.
- Benefits section: Three short, icon-based highlights.
- Footer: Clean, minimal.

### Guest Mode Emphasis
- Guest button should feel equally inviting but with a small note under it: "Progress won't be saved. Upgrade anytime."
- Sign-up button can highlight benefits: "Save progress & unlock 500 words."

## Dashboard Wireframe (Text)
```
----------------------------------------------------
| [LOGO] SAT Word Mastery          [Profile Icon] |
----------------------------------------------------

| Greeting: "Welcome back, Joon!" (or "Guest User") |
| Banner (if Guest Mode): 
|   "You're in Guest Mode – progress won't be saved. 
|    [Sign Up to Save Progress]" 
----------------------------------------------------

[ Active Pool Section ]  
| Title: "Your Active Pool (15 words)" 
| Progress Bar: 10 Started | 3 Ready for Test | 2 Mastered
| Button: [Start Study Session] 
----------------------------------------------------

[ Today's Reviews ]  
| Title: "Words Due for Review Today" 
| Counter: "6 words due" 
| Button: [Start Review] 
----------------------------------------------------

[ Tier Progress ]  
| Title: "Current Tier: Top 25 Words" 
| Progress Bar: "18/25 introduced, 10/25 mastered" 
| Next Tier: "Top 100 – locked until all 25 are introduced" 
----------------------------------------------------

[ Achievements & Streaks ]  
| Streak: 🔥 "3-Day Study Streak" 
| Badges: [Top 25 Starter] [First 10 Mastered] 
----------------------------------------------------

[ Call to Action (Guest only) ]  
| Card: "You've mastered 4 words! Don't lose them." 
| Button: [Create Free Account] 
----------------------------------------------------

Footer: About | Help | Privacy | Terms
```

### Layout Breakdown
- **Top Bar**: Logo (clickable to return to Dashboard), Profile icon → dropdown: Settings, Log out.
- **Hero Section**: Friendly greeting, Guest users see a persistent banner prompting sign-up.
- **Core Sections**:
  - Active Pool (centerpiece): Shows pool count and state breakdown (Started, Ready, Mastered). Big "Start Study" button.
  - Reviews Due: Shows count of words due for review today. Big "Start Review" button.
  - Tier Progress: Visual bar showing current tier completion. Locked tiers grayed out.
  - Achievements & Streaks: Quick gamification boosts (badges earned, streak days).
- **Guest Conversion Callout**: Prominent card with conversion nudge: "You've made progress, save it!"

### User Flow from Dashboard
- Study Path: Click "Start Study Session" → flashcards from active pool.
- Review Path: Click "Start Review" → typed recall for due words.
- Tier Motivation: Progress bar motivates unlocking next tier.
- Conversion Path (Guest): Frequent prompts to sign up.

## Study Session Wireframe (Text)
```
----------------------------------------------------
| [Progress Bar: Card 3 of 10]     [Exit Session]  |
----------------------------------------------------

[ IMAGE AREA ] 
|  Main image (large, centered) 
|  Carousel arrows (◀ ▶) if multiple images (up to 5)
|  Toggle: "Show Why this image?" → short description

----------------------------------------------------
[ DEFINITION ] 
| "Generous in forgiving; noble in spirit" 
----------------------------------------------------

[ MULTIPLE CHOICE OPTIONS ] 
| ( ) magnanimous 
| ( ) parsimonious 
| ( ) malicious 
| ( ) obdurate

[ Submit Answer Button ] 
----------------------------------------------------

[ FEEDBACK (after answer submitted) ] 
| If correct: ✅ "Correct! Magnanimous means generous and noble." 
| If incorrect: ❌ "Incorrect. Correct answer: Magnanimous." 
|   • Show synonyms: generous, noble  
|   • Show example: "He was magnanimous in victory."  

[ Next Button → ] 
```

### Key Interaction Details
- **Before Answer**: Shows image(s), definition, and options (4 total, shuffled).
- **Student selects an option and clicks Submit**.
- **After Answer**:
  - Correct: green highlight, "Correct!" message.
  - Incorrect: red highlight, reveal correct word with synonyms + example.
  - Both cases show Next button to proceed.
- **Image Features**: Up to 5 images → carousel navigation, Optional "Why this image?" description under each picture, Alt text available for accessibility.
- **Progress Indicator**: Always visible at the top: e.g., Card 3 of 10. Helps students know how far they are in the session.
- **Exit Option**: Small, visible "Exit Session" link to return to dashboard without losing progress.

### Study Session Flow
1. Start Study Session from Dashboard.
2. Cycle through cards (default: 10 cards per session).
3. Each card → flashcard format (image + definition + options).
4. Student answers, receives feedback, moves on.
5. At end of session → summary screen:
   - "You got 8/10 correct."
   - "3 words leveled up, 1 word reset."
   - "Keep your streak alive tomorrow!"

## Review Session Wireframe (Text)
```
----------------------------------------------------
| [Progress Bar: Card 4 of 12]     [Exit Session]  |
----------------------------------------------------

[ IMAGE AREA ] 
| Main image (large, centered) 
| Carousel arrows (◀ ▶) for up to 5 images
| Toggle: "Show Why this image?" → short description

----------------------------------------------------
[ DEFINITION ] 
| "Generous in forgiving; noble in spirit" 
----------------------------------------------------

[ PART OF SPEECH + HINT ] 
| Part of speech: adj. 
| Character count: _ _ _ _ _ _ _ _ _ _ _ _ (12 letters)

----------------------------------------------------
[ INPUT FIELD ] 
| [ Type your answer here... ] 

Buttons: [Submit]   [Hint]   [I Don't Know] 
----------------------------------------------------

[ FEEDBACK (after submit)] 
- If correct: ✅ "Correct! Magnanimous"  
   • Synonyms: generous, noble  
   • Example: "He was magnanimous in victory."  
- If incorrect spelling: ❌ "Incorrect spelling. Try again." (retry allowed)  
- If incorrect: ❌ "Incorrect. The correct answer is: Magnanimous."  

[ Next Button → ] 
```

### Key Interaction Details
- **Before Answer**: Shows image(s), definition, part of speech, and character count (underscores for letters, space for spaces).
- **Input field for typing the word**.
- **Buttons**:
  - Submit → check answer
  - Hint → reveals first letter or synonym (reduces score)
  - I Don't Know → reveals correct answer, counts as incorrect
- **After Answer**:
  - Correct: Success state + show synonyms and example.
  - Incorrect spelling: Clear feedback with retry option.
  - Incorrect: Show correct answer + supporting info.
- **Image Features**: Carousel for multiple images, Optional explanation: "Why this image?" description toggle.
- **Progress Indicator**: Always visible at the top: e.g., Card 4 of 12.
- **Exit Option**: "Exit Session" link to return to Dashboard without losing review schedule.

### Review Session Flow
1. Start Review Session from Dashboard (if words are due).
2. Each card = definition + image(s) + typed recall input.
3. Student types answer → feedback.
4. Word streaks tracked (3 consecutive = Mastered).
5. End of session → summary:
   - "You reviewed 12 words."
   - "2 words Mastered, 1 word reset."
   - Streaks & points update.

## Session Summary Wireframe (Text)
```
----------------------------------------------------
| [LOGO] SAT Word Mastery                         |
----------------------------------------------------

🎉  Great Job!  
"You completed your session."  

----------------------------------------------------
[ PERFORMANCE STATS ]  
- Total words studied: 10  
- Correct answers: 8  
- Incorrect answers: 2  
- Words promoted to Review: 3  
- Words Mastered: 2  

----------------------------------------------------
[ VISUAL PROGRESS ]  
| Tier Progress Bar: "Top 25 — 18/25 mastered"  
| Active Pool: "15/15 words active"  

----------------------------------------------------
[ ACHIEVEMENTS ]  
🏅 Badge earned: "Top 10 Words Mastered"  
🔥 Streak: "4 days in a row!"  

----------------------------------------------------
[ NEXT STEPS ]  
- [ Start Another Session ]  
- [ Go to Dashboard ]  

----------------------------------------------------
[ GUEST MODE CTA ] (if applicable)  
"You've mastered 4 words today. Don't lose them!"  
[ Create Free Account ]  

----------------------------------------------------
Footer: About | Help | Privacy | Terms
```

### Key Elements
- **Performance Stats**: Shows words studied, accuracy, words promoted, words mastered. Encourages reflection on progress made during the session.
- **Visual Progress**: Tier bar: Clear visual of how close the student is to completing the current tier. Active pool status: Confirms pool is full and balanced.
- **Achievements**: Badges: Immediate recognition if a milestone was hit. Streaks: Reinforces daily consistency.
- **Next Steps**: Two clear CTAs: "Start Another Session" or "Go to Dashboard." Keeps the momentum going instead of a dead-end screen.
- **Guest Mode CTA**: For guest users only: Motivational message tied to their progress: "Don't lose your 4 mastered words!" Big button: "Create Free Account."

### Session Summary Flow
1. End of Study/Review Session → summary screen auto-appears.
2. Student sees performance results, visual tier progress, and achievements.
3. Guest users get a clear sign-up nudge tied to their progress.
4. Options: start another session or return to Dashboard.

## End-to-End Journey Map
```
[ 1. Landing Page ]
----------------------------------------------------
Headline: "Master SAT Vocabulary, 15 Words at a Time"
Buttons: [ Start as Guest ]   [ Sign Up Free ]
Link: Already have an account? [Log In]
----------------------------------------------------

 ↓ Guest chooses "Start as Guest"
 ↓ Registered chooses "Sign Up Free"
----------------------------------------------------

[ 2. Dashboard ]
----------------------------------------------------
Greeting: "Welcome back, Joon!" (or "Guest User")
Banner (Guest): "You're in Guest Mode – progress won't be saved."

Sections:
- Active Pool (15 words) → [ Start Study Session ]
- Today's Reviews → [ Start Review ]
- Tier Progress Bar
- Achievements & Streaks
(Guest CTA: "You've mastered 3 words – save your progress!")
----------------------------------------------------

 ↓ User clicks "Start Study Session" or "Start Review"
----------------------------------------------------

[ 3a. Study Session (Flashcards) ]
----------------------------------------------------
Progress: "Card 3 of 10" | [Exit]
Image + Definition
4 Options (MCQ)
Feedback after answer: Correct / Incorrect
Next → advances to next card
----------------------------------------------------

[ 3b. Review Session (Typed Recall) ]
----------------------------------------------------
Progress: "Card 4 of 12" | [Exit]
Image(s) + Definition
Part of Speech + Character Count
Input field: Type answer
Buttons: [Submit] [Hint] [I Don't Know]
Feedback: Correct / Almost / Incorrect
Next → advances to next card
----------------------------------------------------

 ↓ After last card
----------------------------------------------------

[ 4. Session Summary ]
----------------------------------------------------
🎉 "Great Job! You completed your session."
Stats: 10 studied | 8 correct | 2 mastered
Tier Progress Bar
Achievements: Badge earned, streak updated
Next Steps: [ Start Another Session ] [ Go to Dashboard ]
Guest CTA: "You've mastered 4 words today – Create Free Account!"
----------------------------------------------------

 ↓ Back to Dashboard
----------------------------------------------------

[ 5. Ongoing Loop ]
- Pool refills when words are mastered
- Reviews scheduled by spaced repetition
- Progress accumulates until next tier unlocks
- Guest users prompted to sign up at milestones
```

### Journey Highlights
- **Entry Choice**: Guest Mode = instant play, Registered = full features.
- **Core Loop**: Dashboard → Study/Review Session → Summary → Dashboard.
- **Motivation Hooks**: Progress bars, streaks, badges, achievements.
- **Conversion Hooks (Guest)**: Session summaries, dashboard banners, tier lock.
- **Closure**: Every session ends with positive reinforcement + clear next step.

✅ This journey map ties together:
- Landing Page (entry)
- Dashboard (hub)
- Study/Review Sessions (learning cycle)
- Session Summary (motivation + conversion)
- Return to Dashboard (ongoing loop)

This shows the complete student flow:
1. Landing Page → Guest / Sign Up
2. Dashboard → Study or Review
3. Study (Flashcards) / Review (Typed Recall)
4. Session Summary → motivation & conversion
5. Loop continues with pool refill + spaced repetition
