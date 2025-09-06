import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface WordProgress {
  id: string;
  user_id: string;
  word_id: string;
  state: 'not_started' | 'started' | 'ready' | 'mastered';
  study_streak: number;
  review_streak: number;
  last_studied: string | null;
  next_review_date: string | null;
  review_interval: number;
}

export interface WordStateTransition {
  wordId: string;
  fromState: string;
  toState: string;
  streak: number;
  isCorrect: boolean;
}

export class WordStateManager {
  private supabase: any;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Handle study session answer and update word state
   */
  async handleStudyAnswer(
    userId: string,
    wordId: string,
    isCorrect: boolean
  ): Promise<WordStateTransition | null> {
    try {
      // Get current progress
      const { data: progress, error } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single();

      if (error) {
        console.error('Error fetching word progress:', error);
        return null;
      }

      const currentState = progress.state;
      const currentStreak = progress.study_streak;

      let newState = currentState;
      let newStreak = currentStreak;
      let transition: WordStateTransition | null = null;

      if (isCorrect) {
        newStreak = currentStreak + 1;
        
        // Check if ready to transition to review (3 correct streak)
        if (currentState === 'started' && newStreak >= 3) {
          newState = 'ready';
          transition = {
            wordId,
            fromState: 'started',
            toState: 'ready',
            streak: newStreak,
            isCorrect: true
          };
        }
      } else {
        // Reset streak on incorrect answer
        newStreak = 0;
        transition = {
          wordId,
          fromState: currentState,
          toState: currentState, // Stay in same state
          streak: newStreak,
          isCorrect: false
        };
      }

      // Update progress in database
      const { error: updateError } = await this.supabase
        .from('user_progress')
        .update({
          state: newState,
          study_streak: newStreak,
          last_studied: new Date().toISOString(),
          next_review_date: newState === 'ready' ? this.calculateNextReviewDate(1) : null
        })
        .eq('user_id', userId)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('Error updating word progress:', updateError);
        return null;
      }

      return transition;
    } catch (error) {
      console.error('Error handling study answer:', error);
      return null;
    }
  }

  /**
   * Handle review session answer and update word state
   */
  async handleReviewAnswer(
    userId: string,
    wordId: string,
    isCorrect: boolean
  ): Promise<WordStateTransition | null> {
    try {
      // Get current progress
      const { data: progress, error } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single();

      if (error) {
        console.error('Error fetching word progress:', error);
        return null;
      }

      const currentState = progress.state;
      const currentStreak = progress.review_streak;
      const currentInterval = progress.review_interval;

      let newState = currentState;
      let newStreak = currentStreak;
      let newInterval = currentInterval;
      let transition: WordStateTransition | null = null;

      if (isCorrect) {
        newStreak = currentStreak + 1;
        
        // Check if ready to transition to mastered (1 correct answer in ready state)
        if (currentState === 'ready') {
          newState = 'mastered';
          transition = {
            wordId,
            fromState: 'ready',
            toState: 'mastered',
            streak: newStreak,
            isCorrect: true
          };
        } else {
          // Increase review interval for correct answers in other states
          newInterval = this.getNextInterval(currentInterval);
        }
      } else {
        // Reset streak and decrease interval on incorrect answer
        newStreak = 0;
        newInterval = Math.max(1, Math.floor(currentInterval / 2));
        transition = {
          wordId,
          fromState: currentState,
          toState: currentState, // Stay in same state
          streak: newStreak,
          isCorrect: false
        };
      }

      // Update progress in database
      const { error: updateError } = await this.supabase
        .from('user_progress')
        .update({
          state: newState,
          review_streak: newStreak,
          review_interval: newInterval,
          last_studied: new Date().toISOString(),
          next_review_date: newState === 'mastered' ? null : this.calculateNextReviewDate(newInterval)
        })
        .eq('user_id', userId)
        .eq('word_id', wordId);

      if (updateError) {
        console.error('Error updating word progress:', updateError);
        return null;
      }

      return transition;
    } catch (error) {
      console.error('Error handling review answer:', error);
      return null;
    }
  }

  /**
   * Add word to active pool (started state)
   */
  async addToActivePool(userId: string, wordId: string): Promise<boolean> {
    try {
      // Check if word is already in progress
      const { data: existing } = await this.supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single();

      if (existing) {
        // Update existing progress to started state
        const { error } = await this.supabase
          .from('user_progress')
          .update({
            state: 'started',
            study_streak: 0,
            review_streak: 0,
            last_studied: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('word_id', wordId);

        return !error;
      } else {
        // Create new progress entry
        const { error } = await this.supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            word_id: wordId,
            state: 'started',
            study_streak: 0,
            review_streak: 0,
            last_studied: new Date().toISOString()
          });

        return !error;
      }
    } catch (error) {
      console.error('Error adding word to active pool:', error);
      return false;
    }
  }

  /**
   * Remove word from active pool
   */
  async removeFromActivePool(userId: string, wordId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .eq('state', 'started');

      return !error;
    } catch (error) {
      console.error('Error removing word from active pool:', error);
      return false;
    }
  }

  /**
   * Get words due for review
   */
  async getWordsDueForReview(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .select(`
          *,
          words (
            id,
            word,
            definition,
            part_of_speech,
            tier,
            difficulty,
            image_urls,
            synonyms,
            antonyms,
            example_sentence
          )
        `)
        .eq('user_id', userId)
        .eq('state', 'ready')
        .order('next_review_date', { ascending: true });

      if (error) {
        console.error('Error fetching words due for review:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting words due for review:', error);
      return [];
    }
  }

  /**
   * Get active pool words (started state)
   */
  async getActivePoolWords(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .select(`
          *,
          words (
            id,
            word,
            definition,
            part_of_speech,
            tier,
            difficulty,
            image_urls,
            synonyms,
            antonyms,
            example_sentence
          )
        `)
        .eq('user_id', userId)
        .eq('state', 'started')
        .order('last_studied', { ascending: true });

      if (error) {
        console.error('Error fetching active pool words:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active pool words:', error);
      return [];
    }
  }

  /**
   * Calculate next review date based on interval
   */
  private calculateNextReviewDate(interval: number): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Get next review interval based on spaced repetition
   */
  private getNextInterval(currentInterval: number): number {
    const intervals = [1, 3, 7, 14, 30];
    const currentIndex = intervals.indexOf(currentInterval);
    
    if (currentIndex === -1 || currentIndex === intervals.length - 1) {
      return intervals[intervals.length - 1]; // Max interval
    }
    
    return intervals[currentIndex + 1];
  }

  /**
   * Initialize user progress for all words in a tier
   */
  async initializeUserProgress(userId: string, tier: string): Promise<boolean> {
    try {
      // Get all words in the tier
      const { data: words, error: wordsError } = await this.supabase
        .from('words')
        .select('id')
        .eq('tier', tier);

      if (wordsError) {
        console.error('Error fetching words for tier:', wordsError);
        return false;
      }

      if (!words || words.length === 0) {
        return true; // No words to initialize
      }

      // Check existing progress
      const { data: existingProgress } = await this.supabase
        .from('user_progress')
        .select('word_id')
        .eq('user_id', userId)
        .in('word_id', words.map((w: any) => w.id));

      const existingWordIds = existingProgress?.map((p: any) => p.word_id) || [];
      const newWords = words.filter((w: any) => !existingWordIds.includes(w.id));

      if (newWords.length === 0) {
        return true; // All words already have progress
      }

      // Insert progress for new words
      const progressEntries = newWords.map((word: any) => ({
        user_id: userId,
        word_id: word.id,
        state: 'not_started',
        study_streak: 0,
        review_streak: 0
      }));

      const { error: insertError } = await this.supabase
        .from('user_progress')
        .insert(progressEntries);

      if (insertError) {
        console.error('Error inserting user progress:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error initializing user progress:', error);
      return false;
    }
  }
}
