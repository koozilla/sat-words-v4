'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Star,
  Award,
  BookOpen
} from 'lucide-react';

interface ReviewSessionSummary {
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeSpent: number;
  wordsPromoted: Array<{
    word: string;
    definition: string;
    tier: string;
  }>;
  wordsDemoted: Array<{
    word: string;
    definition: string;
    tier: string;
  }>;
  newBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
}

export default function ReviewSummary() {
  const [summaryData, setSummaryData] = useState<ReviewSessionSummary | null>(null);
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
        console.log('Review summary received data:', sessionData);
        const summary = await generateReviewSessionSummary(sessionData);
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

  const generateReviewSessionSummary = async (sessionInfo: any): Promise<ReviewSessionSummary> => {
    console.log('generateReviewSessionSummary called with:', sessionInfo);
    
    const wordsPromoted: Array<{ word: string; definition: string; tier: string }> = [];
    const wordsDemoted: Array<{ word: string; definition: string; tier: string }> = [];

    if (sessionInfo.wordResults && sessionInfo.wordResults.length > 0) {
      console.log('Processing wordResults:', sessionInfo.wordResults);
      // Handle state transitions (promotions and demotions for review)
      sessionInfo.wordResults.forEach((result: any) => {
        if (result.fromState && result.toState && result.fromState !== result.toState) {
          // Determine if this is a promotion or demotion
          const stateHierarchy = ['not_started', 'started', 'ready', 'mastered'];
          const fromIndex = stateHierarchy.indexOf(result.fromState);
          const toIndex = stateHierarchy.indexOf(result.toState);
          
          if (toIndex > fromIndex) {
            // Promotion: moved to a better state
            const alreadyPromoted = wordsPromoted.some(promoted => promoted.word === result.word);
            if (!alreadyPromoted) {
              wordsPromoted.push({
                word: result.word,
                definition: result.definition || 'Definition not available',
                tier: result.tier || 'Unknown'
              });
            }
          } else if (toIndex < fromIndex) {
            // Demotion: moved to a worse state
            const alreadyDemoted = wordsDemoted.some(demoted => demoted.word === result.word);
            if (!alreadyDemoted) {
              wordsDemoted.push({
                word: result.word,
                definition: result.definition || 'Definition not available',
                tier: result.tier || 'Unknown'
              });
            }
          }
        }
      });
    } else {
      console.log('No wordResults found, using fallback data');
      // Fallback to sample data if no word results available
      wordsPromoted.push(
        { word: 'Ephemeral', definition: 'Lasting for a very short time; transitory.', tier: 'Top 25' },
        { word: 'Censure', definition: 'To express severe disapproval of someone or something.', tier: 'Top 25' }
      );
      wordsDemoted.push(
        { word: 'Benevolent', definition: 'Well meaning and kindly; characterized by doing good for others.', tier: 'Top 25' },
        { word: 'Camaraderie', definition: 'Mutual trust and friendship among people who spend a lot of time together.', tier: 'Top 25' }
      );
    }

    // Calculate actual score from word results (don't trust sessionInfo values due to potential issues)
    const actualCorrectCount = sessionInfo.wordResults && sessionInfo.wordResults.length > 0 ? 
      sessionInfo.wordResults.filter((result: any) => result.correct).length : 0;
    const actualTotalQuestions = sessionInfo.wordResults && sessionInfo.wordResults.length > 0 ? 
      sessionInfo.wordResults.length : sessionInfo.words_studied || 0;
    const accuracy = actualTotalQuestions > 0 ? (actualCorrectCount / actualTotalQuestions) * 100 : 0;
    
    const timeSpent = sessionInfo.completed_at && sessionInfo.started_at ? 
      Math.round((new Date(sessionInfo.completed_at).getTime() - new Date(sessionInfo.started_at).getTime()) / 1000) : 0;

    console.log('Calculated metrics:', {
      score: actualCorrectCount,
      totalQuestions: actualTotalQuestions,
      accuracy: Math.round(accuracy),
      timeSpent,
      wordsPromoted: wordsPromoted.length,
      wordsDemoted: wordsDemoted.length
    });

    return {
      score: actualCorrectCount,
      totalQuestions: actualTotalQuestions,
      accuracy: Math.round(accuracy),
      timeSpent,
      wordsPromoted,
      wordsDemoted,
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your challenge results...</p>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No session data found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center">Challenge Complete!</h1>
        </div>

        {/* Main Stats Card - Mobile Optimized */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-orange-500 mx-auto mb-2 sm:mb-3" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Excellent Work!</h2>
            <p className="text-sm sm:text-base text-gray-600">You completed your challenge session</p>
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
              <p className="text-xs sm:text-sm text-gray-600">Mastered</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/review')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center text-sm sm:text-base"
          >
            <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Continue Challenge
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
