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
        
        // If review fails, go back to started state
        if (currentState === 'ready') {
          newState = 'started'; // Go back to started state for more study
        } else if (currentState === 'mastered') {
          newState = 'started'; // Go back to started state from mastered
        } else {
          newState = currentState; // Stay in same state for other states
        }
        
        transition = {
          wordId,
          fromState: currentState,
          toState: newState,
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
   * Get active pool words (started state) - limited to target pool size
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
        .order('last_studied', { ascending: true })
        .limit(10); // Limit to target pool size

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
      // Map display tier to database tier formats
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['Top 25', 'Top25'],
        'Top 100': ['Top 100', 'Top100'],
        'Top 200': ['Top 200', 'Top200'],
        'Top 300': ['Top 300', 'Top300'],
        'Top 400': ['Top 400', 'Top400'],
        'Top 500': ['Top 500', 'Top500']
      };
      
      const dbTiers = tierMappings[tier] || [tier];
      
      // Get all words in the tier
      const { data: words, error: wordsError } = await this.supabase
        .from('words')
        .select('id')
        .in('tier', dbTiers);

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

  /**
   * Get current active pool count
   */
  async getActivePoolCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('state', 'started');

      if (error) {
        console.error('Error getting active pool count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting active pool count:', error);
      return 0;
    }
  }

  /**
   * Get user's current tier based on mastered words
   */
  async getCurrentTier(userId: string): Promise<string> {
    try {
      // Handle both formats: "Top 25" and "Top25"
      const tierMappings = [
        { display: 'Top 25', db: ['Top 25', 'Top25'] },
        { display: 'Top 100', db: ['Top 100', 'Top100'] },
        { display: 'Top 200', db: ['Top 200', 'Top200'] },
        { display: 'Top 300', db: ['Top 300', 'Top300'] },
        { display: 'Top 400', db: ['Top 400', 'Top400'] },
        { display: 'Top 500', db: ['Top 500', 'Top500'] }
      ];
      
      for (const tierMapping of tierMappings) {
        // Check if all words in this tier are mastered
        const { data: tierWords } = await this.supabase
          .from('words')
          .select('id')
          .in('tier', tierMapping.db);

        if (!tierWords || tierWords.length === 0) continue;

        const { data: masteredWords } = await this.supabase
          .from('user_progress')
          .select('word_id')
          .eq('user_id', userId)
          .eq('state', 'mastered')
          .in('word_id', tierWords.map((w: any) => w.id));

        const masteredCount = masteredWords?.length || 0;
        const totalCount = tierWords.length;

        // If not all words in this tier are mastered, this is the current tier
        if (masteredCount < totalCount) {
          return tierMapping.display;
        }
      }

      return 'Top 500'; // All tiers completed
    } catch (error) {
      console.error('Error getting current tier:', error);
      return 'Top 25';
    }
  }

  /**
   * Get available words for active pool (not started words in current tier)
   */
  async getAvailableWordsForPool(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      // Map display tier to database tier formats
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['Top 25', 'Top25'],
        'Top 100': ['Top 100', 'Top100'],
        'Top 200': ['Top 200', 'Top200'],
        'Top 300': ['Top 300', 'Top300'],
        'Top 400': ['Top 400', 'Top400'],
        'Top 500': ['Top 500', 'Top500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['Top25'];
      
      // First, get all words in the current tier
      const { data: allWords, error: wordsError } = await this.supabase
        .from('words')
        .select(`
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
        `)
        .in('tier', dbTiers);

      if (wordsError) {
        console.error('Error fetching words:', wordsError);
        return [];
      }

      if (!allWords || allWords.length === 0) {
        return [];
      }

      // Get words that are already in progress (started, ready, mastered)
      const { data: progressWords, error: progressError } = await this.supabase
        .from('user_progress')
        .select('word_id')
        .eq('user_id', userId)
        .in('state', ['started', 'ready', 'mastered']);

      if (progressError) {
        console.error('Error fetching progress words:', progressError);
        return [];
      }

      const progressWordIds = progressWords?.map((p: any) => p.word_id) || [];
      
      // Filter out words that are already in progress
      const availableWords = allWords.filter((word: any) => !progressWordIds.includes(word.id));
      
      // Return limited results
      return availableWords.slice(0, limit);
    } catch (error) {
      console.error('Error getting available words for pool:', error);
      return [];
    }
  }

  /**
   * Refill active pool to maintain 10 words
   */
  async refillActivePool(userId: string): Promise<boolean> {
    try {
      const currentCount = await this.getActivePoolCount(userId);
      const targetCount = 10;
      
      if (currentCount >= targetCount) {
        return true; // Pool is already full
      }

      const neededCount = targetCount - currentCount;
      const availableWords = await this.getAvailableWordsForPool(userId, neededCount);

      if (availableWords.length === 0) {
        console.log('No available words to refill pool');
        return true; // No words available, but not an error
      }

      // Add words to active pool
      const progressEntries = availableWords.map(word => ({
        user_id: userId,
        word_id: word.id,
        state: 'started',
        study_streak: 0,
        review_streak: 0,
        last_studied: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('user_progress')
        .insert(progressEntries);

      if (error) {
        console.error('Error refilling active pool:', error);
        return false;
      }

      console.log(`Added ${progressEntries.length} words to active pool`);
      return true;
    } catch (error) {
      console.error('Error refilling active pool:', error);
      return false;
    }
  }

  /**
   * Initialize new user with 10 words from Top 25 tier
   */
  async initializeNewUser(userId: string): Promise<boolean> {
    try {
      // First, initialize progress for all words in Top 25 tier
      await this.initializeUserProgress(userId, 'Top 25');
      
      // Then refill the active pool
      return await this.refillActivePool(userId);
    } catch (error) {
      console.error('Error initializing new user:', error);
      return false;
    }
  }

  /**
   * Handle word mastery - refill pool if needed
   */
  async handleWordMastery(userId: string): Promise<void> {
    try {
      // Check if we need to refill the pool
      const currentCount = await this.getActivePoolCount(userId);
      if (currentCount < 15) {
        await this.refillActivePool(userId);
      }
    } catch (error) {
      console.error('Error handling word mastery:', error);
    }
  }
}
