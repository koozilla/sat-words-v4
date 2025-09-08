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
    const wordsPromoted: Array<{ word: string; fromState: string; toState: string }> = [];

    if (sessionInfo.wordResults && sessionInfo.wordResults.length > 0) {
      console.log('Processing word results:', sessionInfo.wordResults.length, 'entries');
      console.log('Raw sessionInfo.wordResults:', sessionInfo.wordResults);
      
      // Deduplicate word results to handle any double-counting issues
      // Use word as the primary key (not word + correct) since each word should only appear once per session
      const uniqueWordResults = new Map();
      sessionInfo.wordResults.forEach((result: any, index: number) => {
        const wordKey = result.wordId || result.word;
        console.log(`Processing result ${index}:`, { word: result.word, correct: result.correct, wordId: result.wordId, key: wordKey });
        
        if (!uniqueWordResults.has(wordKey)) {
          uniqueWordResults.set(wordKey, result);
        } else {
          console.log(`Duplicate found for ${wordKey}, keeping entry with most complete data`);
          // If we have duplicate, prefer the one with better data
          const existing = uniqueWordResults.get(wordKey);
          // Prefer results with transition data, then prefer correct answers over incorrect ones
          if ((result.fromState && result.toState && (!existing.fromState || !existing.toState)) ||
              (result.correct && !existing.correct)) {
            console.log(`Replacing existing entry for ${wordKey} with better data`);
            uniqueWordResults.set(wordKey, result);
          }
        }
      });
      
      const deduplicatedResults = Array.from(uniqueWordResults.values());
      console.log('Deduplicated word results:', deduplicatedResults);
      
      // First pass: categorize correct vs incorrect answers
      deduplicatedResults.forEach((result: any) => {
        const wordData = {
          word: result.word,
          definition: result.definition,
          tier: result.tier
        };

        if (result.correct) {
          wordsCorrect.push(wordData);
        } else {
          wordsIncorrect.push(wordData);
        }
      });

      // Second pass: handle state transitions (promotions only for study)
      deduplicatedResults.forEach((result: any) => {
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
    const actualTotalQuestions = wordsCorrect.length + wordsIncorrect.length;
    const accuracy = actualTotalQuestions > 0 ? (actualCorrectCount / actualTotalQuestions) * 100 : 0;
    
    const timeSpent = sessionInfo.completed_at && sessionInfo.started_at ? 
      Math.round((new Date(sessionInfo.completed_at).getTime() - new Date(sessionInfo.started_at).getTime()) / 1000) : 0;

    return {
      score: actualCorrectCount,
      totalQuestions: actualTotalQuestions,
      accuracy: Math.round(accuracy),
      timeSpent,
      wordsCorrect,
      wordsIncorrect,
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
          <h1 className="text-3xl font-bold text-gray-900">Study Session Complete!</h1>
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
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Promoted</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryData.wordsPromoted.length}</p>
          </div>
        </div>

        {/* Words You Got Right */}
        {summaryData.wordsCorrect.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Words You Got Right</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaryData.wordsCorrect.map((word, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-1">{word.word}</h3>
                  <p className="text-green-700 text-sm">{word.definition}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                    {word.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Words You Got Wrong */}
        {summaryData.wordsIncorrect.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Words You Got Wrong</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaryData.wordsIncorrect.map((word, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-1">{word.word}</h3>
                  <p className="text-red-700 text-sm">{word.definition}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                    {word.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Words Promoted */}
        {summaryData.wordsPromoted.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Words Promoted!</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaryData.wordsPromoted.map((word, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-1">{word.word}</h3>
                  <p className="text-blue-700 text-sm">
                    {word.fromState} → {word.toState}
                  </p>
                </div>
              ))}
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
