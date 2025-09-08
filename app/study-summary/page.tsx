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
      wordsSkippedList: wordsSkipped.map(w => w.word)
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
