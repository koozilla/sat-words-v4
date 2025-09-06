import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          study_streak: number
          total_points: number
          current_tier: string
          last_study_date: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          study_streak?: number
          total_points?: number
          current_tier?: string
          last_study_date?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          study_streak?: number
          total_points?: number
          current_tier?: string
          last_study_date?: string | null
        }
      }
      words: {
        Row: {
          id: string
          word: string
          definition: string
          part_of_speech: string
          example_sentence: string
          synonyms: string[]
          antonyms: string[]
          tier: string
          image_urls: string[]
          image_descriptions: string[]
          created_at: string
        }
        Insert: {
          id?: string
          word: string
          definition: string
          part_of_speech: string
          example_sentence: string
          synonyms: string[]
          antonyms: string[]
          tier: string
          image_urls: string[]
          image_descriptions: string[]
          created_at?: string
        }
        Update: {
          id?: string
          word?: string
          definition?: string
          part_of_speech?: string
          example_sentence?: string
          synonyms?: string[]
          antonyms?: string[]
          tier?: string
          image_urls?: string[]
          image_descriptions?: string[]
          created_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          word_id: string
          state: string
          study_streak: number
          review_streak: number
          last_studied: string | null
          next_review_date: string | null
          review_interval: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word_id: string
          state: string
          study_streak?: number
          review_streak?: number
          last_studied?: string | null
          next_review_date?: string | null
          review_interval?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word_id?: string
          state?: string
          study_streak?: number
          review_streak?: number
          last_studied?: string | null
          next_review_date?: string | null
          review_interval?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
