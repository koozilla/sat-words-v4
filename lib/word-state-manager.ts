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
   * New two-try system: requires 2 consecutive correct answers to master
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
        
        // Check if ready to transition to mastered (2 consecutive correct answers in ready state)
        if (currentState === 'ready' && newStreak >= 2) {
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
      const currentTier = await this.getCurrentTier(userId);
      
      // Map display tier to database tier
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];

      const { data, error } = await this.supabase
        .from('user_progress')
        .select(`
          *,
          words!inner (
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
        .in('words.tier', dbTiers)
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
   * Get active pool words (started state) - limited to target pool size and current tier
   */
  async getActivePoolWords(userId: string): Promise<any[]> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      // Map display tier to database tier
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];

      const { data, error } = await this.supabase
        .from('user_progress')
        .select(`
          *,
          words!inner (
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
        .in('words.tier', dbTiers)
        .order('last_studied', { ascending: true })
        .limit(15); // Limit to target pool size

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
   * Get review words (ready state) - limited to target pool size
   */
  async getReviewWords(userId: string): Promise<any[]> {
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
        .order('next_review_date', { ascending: true })
        .limit(15); // Limit to target pool size

      if (error) {
        console.error('Error fetching review words:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting review words:', error);
      return [];
    }
  }

  /**
   * Ensure total of active words (started) and review words (ready) equals 15
   * Returns object with balance result and current tier to avoid duplicate calls
   */
  async maintainPoolBalance(userId: string): Promise<{ success: boolean; currentTier?: string }> {
    try {
      // Get both counts in a single query to reduce database calls
      const { data: progressData, error } = await this.supabase
        .from('user_progress')
        .select('state')
        .eq('user_id', userId)
        .in('state', ['started', 'ready']);

      if (error) {
        console.error('Error getting progress data:', error);
        return { success: false };
      }

      const activeCount = progressData?.filter((p: any) => p.state === 'started').length || 0;
      const reviewCount = progressData?.filter((p: any) => p.state === 'ready').length || 0;
      const totalCount = activeCount + reviewCount;
      const targetTotal = 15;

      console.log(`Pool balance: ${activeCount} active + ${reviewCount} review = ${totalCount} total (target: ${targetTotal})`);

      if (totalCount === targetTotal) {
        // Get current tier to return with success
        const currentTier = await this.getCurrentTier(userId);
        return { success: true, currentTier }; // Already balanced
      }

      if (totalCount < targetTotal) {
        // Need to add more words to reach 15 total
        const neededCount = targetTotal - totalCount;
        console.log(`Need to add ${neededCount} words to reach target of ${targetTotal}`);
        
        const availableWords = await this.getAvailableWordsForPool(userId, neededCount);
        console.log(`Found ${availableWords.length} available words`);

        if (availableWords.length === 0) {
          console.log('No available words to maintain pool balance');
          const currentTier = await this.getCurrentTier(userId);
          return { success: true, currentTier }; // No words available, but not an error
        }

        // Add words to active pool (started state)
        const progressEntries = availableWords.map(word => ({
          user_id: userId,
          word_id: word.id,
          state: 'started',
          study_streak: 0,
          review_streak: 0,
          last_studied: new Date().toISOString()
        }));

        const { error: insertError } = await this.supabase
          .from('user_progress')
          .upsert(progressEntries, { 
            onConflict: 'user_id,word_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          console.error('Error maintaining pool balance:', insertError);
          return { success: false };
        }

        console.log(`Added ${progressEntries.length} words to maintain pool balance`);
        const currentTier = await this.getCurrentTier(userId);
        return { success: true, currentTier };
      }

      // If totalCount > targetTotal, we need to reduce
      // This shouldn't happen in normal flow, but we'll handle it
      console.log(`Pool has ${totalCount} words, exceeding target of ${targetTotal}`);
      const currentTier = await this.getCurrentTier(userId);
      return { success: true, currentTier }; // Let the system naturally balance through usage

    } catch (error) {
      console.error('Error maintaining pool balance:', error);
      return { success: false };
    }
  }

  /**
   * Get count of review words (ready state)
   */
  async getReviewWordsCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('state', 'ready');

      if (error) {
        console.error('Error getting review words count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting review words count:', error);
      return 0;
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
      // Map display tier to database tier formats - Updated for 20-tier system
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
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
   * Get user's current tier based on mastered words - optimized to reduce DB calls
   */
  async getCurrentTier(userId: string): Promise<string> {
    try {
      // Get all mastered words for user in one query
      const { data: masteredProgress, error } = await this.supabase
        .from('user_progress')
        .select(`
          word_id,
          words!inner(tier)
        `)
        .eq('user_id', userId)
        .eq('state', 'mastered');

      if (error) {
        console.error('Error getting mastered words:', error);
        return 'Top 25';
      }

      // Count mastered words per tier
      const tierCounts: { [key: string]: number } = {};
      masteredProgress?.forEach((item: any) => {
        const tier = item.words.tier;
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      });

      // Check tiers in order to find current tier
      const tierMappings = [
        { display: 'Top 25', db: 'top_25', expectedCount: 25 },
        { display: 'Top 50', db: 'top_50', expectedCount: 25 },
        { display: 'Top 75', db: 'top_75', expectedCount: 25 },
        { display: 'Top 100', db: 'top_100', expectedCount: 25 },
        { display: 'Top 125', db: 'top_125', expectedCount: 25 },
        { display: 'Top 150', db: 'top_150', expectedCount: 25 },
        { display: 'Top 175', db: 'top_175', expectedCount: 25 },
        { display: 'Top 200', db: 'top_200', expectedCount: 25 },
        { display: 'Top 225', db: 'top_225', expectedCount: 25 },
        { display: 'Top 250', db: 'top_250', expectedCount: 25 },
        { display: 'Top 275', db: 'top_275', expectedCount: 25 },
        { display: 'Top 300', db: 'top_300', expectedCount: 25 },
        { display: 'Top 325', db: 'top_325', expectedCount: 25 },
        { display: 'Top 350', db: 'top_350', expectedCount: 25 },
        { display: 'Top 375', db: 'top_375', expectedCount: 25 },
        { display: 'Top 400', db: 'top_400', expectedCount: 25 },
        { display: 'Top 425', db: 'top_425', expectedCount: 25 },
        { display: 'Top 450', db: 'top_450', expectedCount: 25 },
        { display: 'Top 475', db: 'top_475', expectedCount: 25 },
        { display: 'Top 500', db: 'top_500', expectedCount: 25 }
      ];
      
      for (const tierMapping of tierMappings) {
        const masteredCount = tierCounts[tierMapping.db] || 0;
        
        // If not all words in this tier are mastered, this is the current tier
        if (masteredCount < tierMapping.expectedCount) {
          return tierMapping.display;
        }
      }

      return 'Top 500'; // All 20 tiers completed
    } catch (error) {
      console.error('Error getting current tier:', error);
      return 'Top 25';
    }
  }

  /**
   * Check if there are any words in started state for the current tier
   */
  async hasStartedWordsInCurrentTier(userId: string): Promise<boolean> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      // Map display tier to database tier
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];

      // Get words in current tier
      const { data: tierWords, error: tierError } = await this.supabase
        .from('words')
        .select('id')
        .in('tier', dbTiers);

      if (tierError || !tierWords) {
        console.error('Error getting tier words:', tierError);
        return true; // Default to true to be safe
      }

      const tierWordIds = tierWords.map(w => w.id);

      // Check if any of these words are in started state
      const { data, error } = await this.supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('state', 'started')
        .in('word_id', tierWordIds)
        .limit(1);

      if (error) {
        console.error('Error checking started words in current tier:', error);
        return true; // Default to true to be safe
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking started words in current tier:', error);
      return true; // Default to true to be safe
    }
  }

  /**
   * Get available words for active pool with progressive tier unlocking
   * Users can access next tier when 3 or fewer words remain in current tier
   */
  async getAvailableWordsForPool(userId: string, limit: number = 15): Promise<any[]> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      // Map display tier to database tier formats - Updated for 20-tier system
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];
      
      // Get all words in the current tier
      const { data: currentTierWords, error: wordsError } = await this.supabase
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

      if (!currentTierWords || currentTierWords.length === 0) {
        return [];
      }

      // Get mastered words count in current tier
      const { data: masteredWords, error: masteredError } = await this.supabase
        .from('user_progress')
        .select('word_id')
        .eq('user_id', userId)
        .eq('state', 'mastered')
        .in('word_id', currentTierWords.map((w: any) => w.id));

      if (masteredError) {
        console.error('Error fetching mastered words:', masteredError);
        return [];
      }

      const masteredCount = masteredWords?.length || 0;
      const remainingInCurrentTier = currentTierWords.length - masteredCount;
      
      // Determine which tiers to include based on progressive unlocking
      let tiersToSearch = [...dbTiers];
      
      // If 3 or fewer words remain in current tier, include next tier
      if (remainingInCurrentTier <= 3 && currentTier !== 'Top 500') {
        const tierOrder = [
          'Top 25', 'Top 50', 'Top 75', 'Top 100', 'Top 125', 'Top 150', 'Top 175', 'Top 200',
          'Top 225', 'Top 250', 'Top 275', 'Top 300', 'Top 325', 'Top 350', 'Top 375', 'Top 400',
          'Top 425', 'Top 450', 'Top 475', 'Top 500'
        ];
        
        const currentIndex = tierOrder.indexOf(currentTier);
        if (currentIndex !== -1 && currentIndex < tierOrder.length - 1) {
          const nextTier = tierOrder[currentIndex + 1];
          const nextTierDb = tierMappings[nextTier];
          if (nextTierDb) {
            tiersToSearch.push(...nextTierDb);
            console.log(`Progressive unlock: ${remainingInCurrentTier} words remaining in ${currentTier}, unlocking ${nextTier}`);
          }
        }
      }

      // Get all words from available tiers
      const { data: allWords, error: allWordsError } = await this.supabase
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
        .in('tier', tiersToSearch);

      if (allWordsError) {
        console.error('Error fetching all words:', allWordsError);
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
      
      // Prioritize current tier words over next tier words
      const currentTierAvailable = availableWords.filter((word: any) => dbTiers.includes(word.tier));
      const nextTierAvailable = availableWords.filter((word: any) => !dbTiers.includes(word.tier));
      
      // Combine with current tier words first, then next tier words
      const prioritizedWords = [...currentTierAvailable, ...nextTierAvailable];
      
      // Return limited results
      return prioritizedWords.slice(0, limit);
    } catch (error) {
      console.error('Error getting available words for pool:', error);
      return [];
    }
  }

  /**
   * Check if next tier is unlocked (3 or fewer words remaining in current tier)
   */
  async isNextTierUnlocked(userId: string): Promise<{ unlocked: boolean; remainingWords: number; nextTier?: string }> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      if (currentTier === 'Top 500') {
        return { unlocked: false, remainingWords: 0 };
      }
      
      // Map display tier to database tier formats
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];
      
      // Get all words in the current tier
      const { data: currentTierWords, error: wordsError } = await this.supabase
        .from('words')
        .select('id')
        .in('tier', dbTiers);

      if (wordsError || !currentTierWords) {
        return { unlocked: false, remainingWords: 0 };
      }

      // Get mastered words count in current tier
      const { data: masteredWords, error: masteredError } = await this.supabase
        .from('user_progress')
        .select('word_id')
        .eq('user_id', userId)
        .eq('state', 'mastered')
        .in('word_id', currentTierWords.map((w: any) => w.id));

      if (masteredError) {
        return { unlocked: false, remainingWords: 0 };
      }

      const masteredCount = masteredWords?.length || 0;
      const remainingWords = currentTierWords.length - masteredCount;
      
      // Determine next tier
      const tierOrder = [
        'Top 25', 'Top 50', 'Top 75', 'Top 100', 'Top 125', 'Top 150', 'Top 175', 'Top 200',
        'Top 225', 'Top 250', 'Top 275', 'Top 300', 'Top 325', 'Top 350', 'Top 375', 'Top 400',
        'Top 425', 'Top 450', 'Top 475', 'Top 500'
      ];
      
      const currentIndex = tierOrder.indexOf(currentTier);
      const nextTier = currentIndex !== -1 && currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : undefined;
      
      return {
        unlocked: remainingWords <= 3,
        remainingWords,
        nextTier
      };
    } catch (error) {
      console.error('Error checking next tier unlock status:', error);
      return { unlocked: false, remainingWords: 0 };
    }
  }
  async refillActivePool(userId: string): Promise<boolean> {
    try {
      const currentCount = await this.getActivePoolCount(userId);
      const targetCount = 15;
      
      if (currentCount >= targetCount) {
        return true; // Pool is already full
      }

      const neededCount = targetCount - currentCount;
      console.log(`Need to add ${neededCount} words to reach target of ${targetCount}`);
      const availableWords = await this.getAvailableWordsForPool(userId, neededCount);
      console.log(`Found ${availableWords.length} available words`);

      if (availableWords.length === 0) {
        console.log('No available words to refill pool');
        return true; // No words available, but not an error
      }

      // Add words to active pool using upsert to handle existing records
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
        .upsert(progressEntries, { 
          onConflict: 'user_id,word_id',
          ignoreDuplicates: false 
        });

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
   * Add ALL words from a tier to active pool (set to 'started' state)
   */
  async addAllTierWordsToActivePool(userId: string, tier: string): Promise<boolean> {
    try {
      // Map display tier to database tier formats
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
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
        return true; // No words to add
      }

      // Update all words in this tier to 'started' state
      const { error: updateError } = await this.supabase
        .from('user_progress')
        .update({ 
          state: 'started',
          last_studied: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('word_id', words.map((w: any) => w.id))
        .in('state', ['not_started']); // Only update words that are not_started

      if (updateError) {
        console.error('Error updating words to started state:', updateError);
        return false;
      }

      console.log(`Added ${words.length} words from ${tier} to active pool`);
      return true;
    } catch (error) {
      console.error('Error adding all tier words to active pool:', error);
      return false;
    }
  }
  async initializeNewUser(userId: string): Promise<boolean> {
    try {
      // First, initialize progress for all words in Top 25 tier
      await this.initializeUserProgress(userId, 'Top 25');
      
      // Then add ALL words from Top 25 tier to active pool (set to 'started' state)
      return await this.addAllTierWordsToActivePool(userId, 'Top 25');
    } catch (error) {
      console.error('Error initializing new user:', error);
      return false;
    }
  }

  /**
   * Handle word mastery - check for tier progression and refill pool
   */
  async handleWordMastery(userId: string): Promise<void> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      // Check if user has completed current tier (all words mastered)
      const tierMappings: { [key: string]: string[] } = {
        'Top 25': ['top_25'],
        'Top 50': ['top_50'],
        'Top 75': ['top_75'],
        'Top 100': ['top_100'],
        'Top 125': ['top_125'],
        'Top 150': ['top_150'],
        'Top 175': ['top_175'],
        'Top 200': ['top_200'],
        'Top 225': ['top_225'],
        'Top 250': ['top_250'],
        'Top 275': ['top_275'],
        'Top 300': ['top_300'],
        'Top 325': ['top_325'],
        'Top 350': ['top_350'],
        'Top 375': ['top_375'],
        'Top 400': ['top_400'],
        'Top 425': ['top_425'],
        'Top 450': ['top_450'],
        'Top 475': ['top_475'],
        'Top 500': ['top_500']
      };
      
      const dbTiers = tierMappings[currentTier] || ['top_25'];
      
      // Get all words in current tier
      const { data: tierWords } = await this.supabase
        .from('words')
        .select('id')
        .in('tier', dbTiers);
      
      if (tierWords && tierWords.length > 0) {
        // Get mastered words count in current tier
        const { data: masteredWords } = await this.supabase
          .from('user_progress')
          .select('word_id')
          .eq('user_id', userId)
          .eq('state', 'mastered')
          .in('word_id', tierWords.map((w: any) => w.id));
        
        const masteredCount = masteredWords?.length || 0;
        const totalWords = tierWords.length;
        
        // If all words in current tier are mastered, progress to next tier
        if (masteredCount >= totalWords && currentTier !== 'Top 500') {
          await this.progressToNextTier(userId);
        } else {
          // Otherwise, just refill the pool with available words
          const currentCount = await this.getActivePoolCount(userId);
          if (currentCount < 15) {
            await this.refillActivePool(userId);
          }
        }
      }
    } catch (error) {
      console.error('Error handling word mastery:', error);
    }
  }

  /**
   * Mark a word as started (ensure it's in active pool for study)
   * Also resets streaks when putting mastered words back to study
   */
  async markWordAsStarted(userId: string, wordId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_progress')
        .update({ 
          state: 'started',
          study_streak: 0, // Reset study streak
          review_streak: 0, // Reset review streak
          last_studied: new Date().toISOString(),
          next_review_date: null // Clear review date since it's back to study
        })
        .eq('user_id', userId)
        .eq('word_id', wordId);

      if (error) {
        console.error('Error marking word as started:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking word as started:', error);
      return false;
    }
  }
  async progressToNextTier(userId: string): Promise<boolean> {
    try {
      const currentTier = await this.getCurrentTier(userId);
      
      const tierOrder = [
        'Top 25', 'Top 50', 'Top 75', 'Top 100', 'Top 125', 'Top 150', 'Top 175', 'Top 200',
        'Top 225', 'Top 250', 'Top 275', 'Top 300', 'Top 325', 'Top 350', 'Top 375', 'Top 400',
        'Top 425', 'Top 450', 'Top 475', 'Top 500'
      ];
      
      const currentIndex = tierOrder.indexOf(currentTier);
      if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
        console.log('User is already at the highest tier');
        return false;
      }
      
      const nextTier = tierOrder[currentIndex + 1];
      
      // Update user's current tier
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ current_tier: nextTier })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user tier:', updateError);
        return false;
      }
      
      // Initialize progress for next tier
      await this.initializeUserProgress(userId, nextTier);
      
      // Add all words from next tier to active pool
      const success = await this.addAllTierWordsToActivePool(userId, nextTier);
      
      if (success) {
        console.log(`User progressed from ${currentTier} to ${nextTier}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error progressing to next tier:', error);
      return false;
    }
  }
}
