// Core application types
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  study_streak: number
  total_points: number
  current_tier: string
  last_study_date: string | null
}

export interface Word {
  id: string
  word: string
  definition: string
  part_of_speech: string
  example_sentence: string
  synonyms: string[]
  antonyms: string[]
  tier: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  image_urls: string[]
  image_descriptions: string[]
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  word_id: string
  state: WordState
  study_streak: number
  review_streak: number
  last_studied: string | null
  next_review_date: string | null
  review_interval: number
  created_at: string
  updated_at: string
}

export type WordState = 'not_started' | 'started' | 'ready' | 'mastered'

export interface Session {
  id: string
  user_id: string
  session_type: 'study' | 'review'
  words_studied: number
  correct_answers: number
  words_promoted: number
  words_mastered: number
  started_at: string
  completed_at: string | null
  is_guest: boolean
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  criteria: Record<string, any>
  tier: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
}

// Application state types
export interface AppState {
  // User state
  user: User | null
  isGuest: boolean
  
  // Study state
  activePool: Word[]
  currentSession: Session | null
  wordsDueForReview: Word[]
  
  // Progress state
  tierProgress: TierProgress
  achievements: Badge[]
  streak: number
  
  // Actions
  setUser: (user: User | null) => void
  setActivePool: (words: Word[]) => void
  updateWordProgress: (wordId: string, newState: WordState) => void
  completeSession: (sessionData: SessionData) => void
}

export interface TierProgress {
  currentTier: string
  wordsIntroduced: number
  wordsMastered: number
  totalWordsInTier: number
  nextTierUnlocked: boolean
}

export interface SessionData {
  wordsStudied: number
  correctAnswers: number
  wordsPromoted: number
  wordsMastered: number
  sessionType: 'study' | 'review'
}

// Guest mode types
export interface GuestData {
  activePool: Word[]
  wordProgress: Record<string, UserProgress>
  sessionHistory: Session[]
  streak: number
  points: number
  lastStudyDate: string
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// Component prop types
export interface FlashcardProps {
  word: Word
  onAnswer: (isCorrect: boolean) => void
  onNext: () => void
}

export interface TypedRecallProps {
  word: Word
  onAnswer: (isCorrect: boolean) => void
  onNext: () => void
}

export interface DashboardProps {
  user: User | null
  isGuest: boolean
  activePool: Word[]
  wordsDueForReview: Word[]
  tierProgress: TierProgress
  achievements: Badge[]
}
