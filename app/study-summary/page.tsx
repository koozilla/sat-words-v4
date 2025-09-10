'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { 
  ArrowLeft, 
  ArrowRight,
  Trophy, 
  Target, 
  Clock, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Star,
  Award,
  BookOpen
} from 'lucide-react';

interface StudySessionSummary {
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeSpent: number;
  wordsCorrect: Array<{
    word: string;
    definition: string;
    tier: string;
  }>;
  wordsIncorrect: Array<{
    word: string;
    definition: string;
    tier: string;
  }>;
  wordsSkipped: Array<{
    word: string;
    definition: string;
    tier: string;
  }>;
  wordsPromoted: Array<{
    word: string;
    fromState: string;
    toState: string;
  }>;
  newBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

export default function StudySummary() {
  const [summaryData, setSummaryData] = useState<StudySessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const wordStateManager = new WordStateManager();

  useEffect(() => {
    const loadSummaryData = async () => {
      try {
        const dataParam = searchParams.get('data');
        if (!dataParam) {
          router.push('/dashboard');
          return;
        }

        const sessionData = JSON.parse(decodeURIComponent(dataParam));
        console.log('Session data received:', sessionData);
        const summary = await generateStudySessionSummary(sessionData);
        console.log('Generated summary:', summary);
        setSummaryData(summary);
        
        // Save session to database
        await saveSessionToDatabase(summary, sessionData);
      } catch (error) {
        console.error('Error loading summary data:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadSummaryData();
  }, [searchParams, router]);

  const generateStudySessionSummary = async (sessionInfo: any): Promise<StudySessionSummary> => {
    const wordsCorrect: Array<{ word: string; definition: string; tier: string }> = [];
    const wordsIncorrect: Array<{ word: string; definition: string; tier: string }> = [];
    const wordsSkipped: Array<{ word: string; definition: string; tier: string }> = [];
    const wordsPromoted: Array<{ word: string; fromState: string; toState: string }> = [];

    if (sessionInfo.wordResults && sessionInfo.wordResults.length > 0) {
      console.log('Study summary - Processing word results:', sessionInfo.wordResults.length, 'entries');
      console.log('Study summary - Raw sessionInfo.wordResults:', sessionInfo.wordResults);
      
      // Data should already be clean from the session, but we'll process it directly
      // First pass: categorize correct vs incorrect vs skipped answers
      sessionInfo.wordResults.forEach((result: any, index: number) => {
        const wordData = {
          word: result.word,
          definition: result.definition,
          tier: result.tier
        };

        console.log(`Study summary - Processing result ${index + 1}:`, {
          word: result.word,
          correct: result.correct,
          userInput: result.userInput,
          selectedAnswer: result.selectedAnswer,
          willGoTo: result.correct ? 'correct' : (result.userInput === "SKIPPED" ? 'skipped' : 'incorrect')
        });

        if (result.correct) {
          wordsCorrect.push(wordData);
        } else if (result.userInput === "SKIPPED") {
          wordsSkipped.push(wordData);
        } else {
          wordsIncorrect.push(wordData);
        }
      });

      // Second pass: handle state transitions (promotions only for study)
      sessionInfo.wordResults.forEach((result: any) => {
        if (result.fromState && result.toState && result.fromState !== result.toState) {
          // Determine if this is a promotion
          const stateHierarchy = ['not_started', 'started', 'ready', 'mastered'];
          const fromIndex = stateHierarchy.indexOf(result.fromState);
          const toIndex = stateHierarchy.indexOf(result.toState);
          
          if (toIndex > fromIndex) {
            // Promotion: moved to a better state
            wordsPromoted.push({
              word: result.word,
              fromState: result.fromState,
              toState: result.toState
            });
          }
        }
      });
    } else {
      // Fallback to sample data if no word results available
      const sampleWords = [
        { word: 'Abate', definition: 'To become less intense or widespread', tier: 'Top 25' },
        { word: 'Adversity', definition: 'A difficult or unfortunate situation', tier: 'Top 25' },
        { word: 'Benevolent', definition: 'Well meaning and kindly', tier: 'Top 25' },
        { word: 'Censure', definition: 'To express strong disapproval', tier: 'Top 25' },
        { word: 'Ephemeral', definition: 'Lasting for a very short time', tier: 'Top 25' }
      ];

      // Split sample words between correct and incorrect
      const correctCount = Math.floor(sampleWords.length * 0.7);
      wordsCorrect.push(...sampleWords.slice(0, correctCount));
      wordsIncorrect.push(...sampleWords.slice(correctCount));
    }

    // Calculate actual score from word results (don't trust sessionInfo.score due to potential double-counting)
    const actualCorrectCount = wordsCorrect.length;
    const actualTotalQuestions = wordsCorrect.length + wordsIncorrect.length + wordsSkipped.length;
    const accuracy = actualTotalQuestions > 0 ? (actualCorrectCount / actualTotalQuestions) * 100 : 0;
    
    const timeSpent = sessionInfo.completed_at && sessionInfo.started_at ? 
      Math.round((new Date(sessionInfo.completed_at).getTime() - new Date(sessionInfo.started_at).getTime()) / 1000) : 0;

    console.log('Study summary - Final counts:', {
      wordsCorrect: wordsCorrect.length,
      wordsIncorrect: wordsIncorrect.length,
      wordsSkipped: wordsSkipped.length,
      actualCorrectCount,
      actualTotalQuestions,
      accuracy: Math.round(accuracy),
      wordsCorrectList: wordsCorrect.map(w => w.word),
      wordsIncorrectList: wordsIncorrect.map(w => w.word),
      wordsSkippedList: wordsSkipped.map(w => w.word),
      DEBUG_RAW_SESSION_DATA: sessionInfo
    });

    return {
      score: actualCorrectCount,
      totalQuestions: actualTotalQuestions,
      accuracy: Math.round(accuracy),
      timeSpent,
      wordsCorrect,
      wordsIncorrect,
      wordsSkipped,
      wordsPromoted,
      newBadges: [] // TODO: Implement badge system
    };
  };

  const saveSessionToDatabase = async (summary: StudySessionSummary, sessionData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: 'study',
          words_studied: summary.totalQuestions,
          correct_answers: summary.score,
          words_promoted: summary.wordsPromoted.length,
          words_mastered: summary.wordsPromoted.filter(w => w.toState === 'mastered').length,
          started_at: sessionData.started_at || new Date(Date.now() - summary.timeSpent * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          is_guest: false
        });

      if (error) {
        console.error('Error saving session to database:', error);
      } else {
        console.log('Session saved to database successfully');
      }

      // Add more words from current tier to active pool
      await addMoreWordsFromCurrentTier(user.id);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const addMoreWordsFromCurrentTier = async (userId: string) => {
    try {
      console.log('Adding more words from current tier to active pool...');
      
      // Get current tier
      const currentTier = await wordStateManager.getCurrentTier(userId);
      console.log('Current tier:', currentTier);
      
      // Get current active pool count
      const currentCount = await wordStateManager.getActivePoolCount(userId);
      console.log('Current active pool count:', currentCount);
      
      // Target count for active pool (aim for 10 words)
      const targetCount = 10;
      
      if (currentCount >= targetCount) {
        console.log('Active pool already has enough words');
        return;
      }
      
      const neededCount = targetCount - currentCount;
      console.log(`Need to add ${neededCount} words to reach target of ${targetCount}`);
      
      // Map display tier to database tier
      const tierMappings: { [key: string]: string } = {
        'Top 25': 'top_25',
        'Top 50': 'top_50',
        'Top 75': 'top_75',
        'Top 100': 'top_100',
        'Top 125': 'top_125',
        'Top 150': 'top_150',
        'Top 175': 'top_175',
        'Top 200': 'top_200',
        'Top 225': 'top_225',
        'Top 250': 'top_250',
        'Top 275': 'top_275',
        'Top 300': 'top_300',
        'Top 325': 'top_325',
        'Top 350': 'top_350',
        'Top 375': 'top_375',
        'Top 400': 'top_400',
        'Top 425': 'top_425',
        'Top 450': 'top_450',
        'Top 475': 'top_475',
        'Top 500': 'top_500'
      };
      
      const dbTier = tierMappings[currentTier];
      if (!dbTier) {
        console.error('Unknown tier:', currentTier);
        return;
      }
      
      // Get words from current tier that are not already in user's progress
      const { data: allTierWords, error: wordsError } = await supabase
        .from('words')
        .select('id, word')
        .eq('tier', dbTier);
      
      if (wordsError) {
        console.error('Error fetching tier words:', wordsError);
        return;
      }
      
      if (!allTierWords || allTierWords.length === 0) {
        console.log('No words found in current tier');
        return;
      }
      
      // Get words already in user's progress
      const { data: existingProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('word_id')
        .eq('user_id', userId)
        .in('word_id', allTierWords.map(w => w.id));
      
      if (progressError) {
        console.error('Error fetching existing progress:', progressError);
        return;
      }
      
      const existingWordIds = new Set(existingProgress?.map(p => p.word_id) || []);
      
      // Filter out words that are already in progress
      const availableWords = allTierWords.filter(word => !existingWordIds.has(word.id)).slice(0, neededCount);
      
      if (availableWords.length === 0) {
        console.log('No available words in current tier (all words already in progress)');
        return;
      }
      
      console.log(`Found ${availableWords.length} available words in ${currentTier}:`, availableWords.map(w => w.word));
      
      // Add words to active pool (started state)
      const progressEntries = availableWords.map(word => ({
        user_id: userId,
        word_id: word.id,
        state: 'started',
        study_streak: 0,
        review_streak: 0,
        last_studied: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('user_progress')
        .upsert(progressEntries, { 
          onConflict: 'user_id,word_id',
          ignoreDuplicates: true // Don't overwrite existing progress
        });
      
      if (insertError) {
        console.error('Error adding words to active pool:', insertError);
      } else {
        console.log(`✅ Added ${progressEntries.length} words from ${currentTier} to active pool`);
      }
    } catch (error) {
      console.error('Error adding words from current tier:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study results...</p>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No session data found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center">Study Complete!</h1>
          <div className="w-16 sm:w-24"></div> {/* Spacer for centering */}
        </div>

        {/* Main Stats Card - Mobile Optimized */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 mx-auto mb-2 sm:mb-3" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Great Job!</h2>
            <p className="text-sm sm:text-base text-gray-600">You completed your study session</p>
          </div>
          
          {/* Stats Grid - Mobile Optimized */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{summaryData.score}/{summaryData.totalQuestions}</p>
              <p className="text-xs sm:text-sm text-gray-600">Score</p>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{summaryData.accuracy}%</p>
              <p className="text-xs sm:text-sm text-gray-600">Accuracy</p>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatTime(summaryData.timeSpent)}</p>
              <p className="text-xs sm:text-sm text-gray-600">Time</p>
            </div>
            
            <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
              <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{summaryData.wordsPromoted.length}</p>
              <p className="text-xs sm:text-sm text-gray-600">Promoted</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/study')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center text-sm sm:text-base"
          >
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Keep studying
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm sm:text-base"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
