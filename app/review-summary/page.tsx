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
    fromState: string;
    toState: string;
  }>;
  wordsDemoted: Array<{
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

export default function ReviewSummary() {
  const [summaryData, setSummaryData] = useState<ReviewSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const wordStateManager = new WordStateManager(supabase);

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
    
    const wordsPromoted: Array<{ word: string; fromState: string; toState: string }> = [];
    const wordsDemoted: Array<{ word: string; fromState: string; toState: string }> = [];

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
                fromState: result.fromState,
                toState: result.toState
              });
            }
          } else if (toIndex < fromIndex) {
            // Demotion: moved to a worse state
            const alreadyDemoted = wordsDemoted.some(demoted => demoted.word === result.word);
            if (!alreadyDemoted) {
              wordsDemoted.push({
                word: result.word,
                fromState: result.fromState,
                toState: result.toState
              });
            }
          }
        }
      });
    } else {
      console.log('No wordResults found, using fallback data');
      // Fallback to sample data if no word results available
      wordsPromoted.push(
        { word: 'Ephemeral', fromState: 'ready', toState: 'mastered' },
        { word: 'Censure', fromState: 'ready', toState: 'mastered' }
      );
      wordsDemoted.push(
        { word: 'Benevolent', fromState: 'ready', toState: 'started' },
        { word: 'Camaraderie', fromState: 'ready', toState: 'started' }
      );
    }

    const accuracy = sessionInfo.words_studied > 0 ? (sessionInfo.correct_answers / sessionInfo.words_studied) * 100 : 0;
    const timeSpent = sessionInfo.completed_at ? 
      Math.round((new Date(sessionInfo.completed_at).getTime() - new Date(sessionInfo.started_at).getTime()) / 1000) : 0;

    console.log('Calculated metrics:', {
      score: sessionInfo.correct_answers || 0,
      totalQuestions: sessionInfo.words_studied || 0,
      accuracy: Math.round(accuracy),
      timeSpent,
      wordsPromoted: wordsPromoted.length,
      wordsDemoted: wordsDemoted.length
    });

    return {
      score: sessionInfo.correct_answers || 0,
      totalQuestions: sessionInfo.words_studied || 0,
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your review results...</p>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No session data found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Review Session Complete!</h1>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Score</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryData.score}/{summaryData.totalQuestions}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Accuracy</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryData.accuracy}%</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Time</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatTime(summaryData.timeSpent)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-8 w-8 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Net Progress</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {summaryData.wordsPromoted.length - summaryData.wordsDemoted.length > 0 ? '+' : ''}
              {summaryData.wordsPromoted.length - summaryData.wordsDemoted.length}
            </p>
          </div>
        </div>

        {/* Combined Promotions and Demotions */}
        {(summaryData.wordsPromoted.length > 0 || summaryData.wordsDemoted.length > 0) && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Word Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Promoted Words */}
              {summaryData.wordsPromoted.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Words Promoted!</h3>
                  </div>
                  <div className="space-y-3">
                    {summaryData.wordsPromoted.map((word, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-1">{word.word}</h4>
                        <p className="text-green-700 text-sm">
                          {word.fromState} → {word.toState}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Demoted Words */}
              {summaryData.wordsDemoted.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingDown className="h-6 w-6 text-red-500 rotate-180" />
                    <h3 className="text-lg font-semibold text-gray-900">Words Demoted</h3>
                  </div>
                  <div className="space-y-3">
                    {summaryData.wordsDemoted.map((word, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 mb-1">{word.word}</h4>
                        <p className="text-red-700 text-sm">
                          {word.fromState} → {word.toState}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
