// Guest mode data management utilities
import { Word, UserProgress, Session } from '@/types';

export interface GuestData {
  activePool: Word[];
  wordProgress: Record<string, UserProgress>;
  sessionHistory: Session[];
  streak: number;
  points: number;
  lastStudyDate: string;
  currentTier: string;
}

const GUEST_STORAGE_KEY = 'sat-words-guest';
const GUEST_DATA_KEY = 'sat-words-guest-data';

export class GuestModeManager {
  private static instance: GuestModeManager;
  
  public static getInstance(): GuestModeManager {
    if (!GuestModeManager.instance) {
      GuestModeManager.instance = new GuestModeManager();
    }
    return GuestModeManager.instance;
  }

  // Initialize guest mode
  initializeGuestMode(): void {
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    this.initializeGuestData();
  }

  // Check if user is in guest mode
  isGuestMode(): boolean {
    return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
  }

  // Get guest data
  getGuestData(): GuestData | null {
    try {
      const data = localStorage.getItem(GUEST_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error parsing guest data:', error);
      return null;
    }
  }

  // Save guest data
  saveGuestData(data: GuestData): void {
    try {
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
  }

  // Initialize default guest data
  initializeGuestData(): void {
    const existingData = this.getGuestData();
    if (!existingData) {
      const defaultData: GuestData = {
        activePool: [],
        wordProgress: {},
        sessionHistory: [],
        streak: 0,
        points: 0,
        lastStudyDate: new Date().toISOString(),
        currentTier: 'Top 25'
      };
      this.saveGuestData(defaultData);
    }
  }

  // Add words to guest active pool
  async addWordsToActivePool(words: Word[]): Promise<void> {
    console.log('addWordsToActivePool called with words:', words.length);
    console.log('Word tiers:', words.map(w => w.tier));
    
    let guestData = this.getGuestData();
    if (!guestData) {
      console.log('No guest data found, initializing...');
      this.initializeGuestData();
      guestData = this.getGuestData();
      if (!guestData) {
        console.log('Failed to initialize guest data');
        return;
      }
    }

    // Limit to 10 words and Top 25 tier only
    // Check both possible tier formats
    const top25Words = words.filter(word => 
      word.tier === 'top_25' || word.tier === 'Top 25'
    );
    
    console.log('Filtered Top 25 words:', top25Words.length);
    
    const newWords = top25Words.slice(0, 10 - guestData.activePool.length);
    console.log('New words to add:', newWords.length);
    
    guestData.activePool = [...guestData.activePool, ...newWords];
    
    // Initialize progress for new words
    newWords.forEach(word => {
      if (!guestData.wordProgress[word.id]) {
        guestData.wordProgress[word.id] = {
          id: `guest-${word.id}`,
          user_id: 'guest',
          word_id: word.id,
          state: 'started',
          study_streak: 0,
          review_streak: 0,
          last_studied: new Date().toISOString(),
          next_review_date: null,
          review_interval: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    });

    console.log('Updated guest data:', {
      activePoolLength: guestData.activePool.length,
      wordProgressKeys: Object.keys(guestData.wordProgress).length
    });

    this.saveGuestData(guestData);
  }

  // Update word progress
  updateWordProgress(wordId: string, updates: Partial<UserProgress>): void {
    const guestData = this.getGuestData();
    if (!guestData || !guestData.wordProgress[wordId]) return;

    guestData.wordProgress[wordId] = {
      ...guestData.wordProgress[wordId],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveGuestData(guestData);
  }

  // Get words due for review
  getWordsDueForReview(): Word[] {
    const guestData = this.getGuestData();
    if (!guestData) return [];

    const today = new Date().toISOString().split('T')[0];
    
    return guestData.activePool.filter(word => {
      const progress = guestData.wordProgress[word.id];
      return progress && 
             progress.state === 'ready' && 
             (!progress.next_review_date || progress.next_review_date <= today);
    });
  }

  // Get active pool words
  getActivePoolWords(): Word[] {
    const guestData = this.getGuestData();
    if (!guestData) return [];

    return guestData.activePool.filter(word => {
      const progress = guestData.wordProgress[word.id];
      return progress && progress.state === 'started';
    });
  }

  // Add session to history
  addSession(session: Session): void {
    const guestData = this.getGuestData();
    if (!guestData) return;

    guestData.sessionHistory.push(session);
    guestData.lastStudyDate = new Date().toISOString();
    
    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = guestData.lastStudyDate.split('T')[0];
    
    if (lastStudyDate === today) {
      guestData.streak += 1;
    } else {
      guestData.streak = 1;
    }

    this.saveGuestData(guestData);
  }

  // Get mastered words
  getMasteredWords(): Word[] {
    const guestData = this.getGuestData();
    if (!guestData) return [];

    return guestData.activePool.filter(word => {
      const progress = guestData.wordProgress[word.id];
      return progress && progress.state === 'mastered';
    });
  }

  // Get guest statistics
  getGuestStats() {
    const guestData = this.getGuestData();
    if (!guestData) {
      return {
        activePoolCount: 0,
        reviewsDue: 0,
        masteredWords: 0,
        currentStreak: 0,
        totalPoints: 0,
        activeWordsBreakdown: { easy: 0, medium: 0, hard: 0 },
        tierProgress: [],
        activeTiers: [],
        highestActiveTier: 'Top 25',
        tierCountBreakdown: { started: {}, mastered: {}, ready: {}, total: {} },
        recentBadges: []
      };
    }

    const activePoolCount = this.getActivePoolWords().length;
    const reviewsDue = this.getWordsDueForReview().length;
    const masteredWords = this.getMasteredWords().length;

    // Calculate active words breakdown
    const activeWords = this.getActivePoolWords();
    const activeWordsBreakdown = {
      easy: activeWords.filter(w => w.difficulty === 'Easy').length,
      medium: activeWords.filter(w => w.difficulty === 'Medium').length,
      hard: activeWords.filter(w => w.difficulty === 'Hard').length
    };

    // Calculate tier progress (only Top 25 for guests)
    const tierProgress = [{
      tier: 'Top 25',
      total: guestData.activePool.length,
      mastered: masteredWords,
      percentage: guestData.activePool.length > 0 ? Math.round((masteredWords / guestData.activePool.length) * 100) : 0
    }];

    return {
      activePoolCount,
      reviewsDue,
      masteredWords,
      currentStreak: guestData.streak,
      totalPoints: guestData.points,
      activeWordsBreakdown,
      tierProgress,
      activeTiers: ['Top 25'],
      highestActiveTier: 'Top 25',
      tierCountBreakdown: {
        started: { 'Top 25': activePoolCount },
        mastered: { 'Top 25': masteredWords },
        ready: { 'Top 25': reviewsDue },
        total: { 'Top 25': guestData.activePool.length }
      },
      recentBadges: []
    };
  }

  // Clear guest data
  clearGuestData(): void {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(GUEST_DATA_KEY);
  }

  // Migrate guest data to user account
  async migrateToUserAccount(userId: string, supabase: any): Promise<boolean> {
    try {
      const guestData = this.getGuestData();
      if (!guestData) return false;

      // Create user progress entries
      const progressEntries = Object.values(guestData.wordProgress).map(progress => ({
        user_id: userId,
        word_id: progress.word_id,
        state: progress.state,
        study_streak: progress.study_streak,
        review_streak: progress.review_streak,
        last_studied: progress.last_studied,
        next_review_date: progress.next_review_date,
        review_interval: progress.review_interval
      }));

      // Insert user progress
      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert(progressEntries, { 
          onConflict: 'user_id,word_id',
          ignoreDuplicates: false 
        });

      if (progressError) {
        console.error('Error migrating progress:', progressError);
        return false;
      }

      // Update user stats
      const { error: userError } = await supabase
        .from('users')
        .update({
          study_streak: guestData.streak,
          total_points: guestData.points,
          last_study_date: guestData.lastStudyDate.split('T')[0]
        })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user stats:', userError);
        return false;
      }

      // Clear guest data
      this.clearGuestData();
      
      return true;
    } catch (error) {
      console.error('Error migrating guest data:', error);
      return false;
    }
  }

  removeWordFromActivePool(wordId: string): void {
    const guestData = this.getGuestData();
    if (!guestData) return;

    // Remove word from active pool
    guestData.activePool = guestData.activePool.filter(word => word.id !== wordId);
    
    // Remove word progress if it exists
    if (guestData.wordProgress[wordId]) {
      delete guestData.wordProgress[wordId];
    }

    // Save updated data
    this.saveGuestData(guestData);
  }
}

export const guestModeManager = GuestModeManager.getInstance();
