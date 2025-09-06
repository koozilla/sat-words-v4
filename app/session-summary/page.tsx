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

interface SessionSummary {
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
  pointsEarned: number;
  streakUpdated: boolean;
  sessionType: 'study' | 'review';
}

export default function SessionSummary() {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [wordStateManager] = useState(() => new WordStateManager());

  useEffect(() => {
    generateSessionSummary();
  }, []);

  const generateSessionSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get session data from URL parameters or localStorage
      const sessionData = searchParams.get('data');
      let sessionInfo: any = null;

      if (sessionData) {
        try {
          sessionInfo = JSON.parse(decodeURIComponent(sessionData));
        } catch (error) {
          console.error('Error parsing session data:', error);
        }
      }

      // If no session data, try to get recent session from database
      if (!sessionInfo) {
        const { data: recentSession, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        if (sessionError || !recentSession) {
          // Fallback to mock data for testing
          console.log('No recent session found, using mock data');
          sessionInfo = {
            session_type: 'study',
            words_studied: 5,
            correct_answers: 4,
            words_promoted: 1,
            words_mastered: 0,
            started_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            completed_at: new Date().toISOString()
          };
        } else {
          sessionInfo = recentSession;
        }
      }

      // Calculate session metrics
      const totalQuestions = sessionInfo.words_studied || 5;
      const correctAnswers = sessionInfo.correct_answers || 4;
      const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
      const timeSpent = sessionInfo.completed_at && sessionInfo.started_at 
        ? Math.floor((new Date(sessionInfo.completed_at).getTime() - new Date(sessionInfo.started_at).getTime()) / 1000)
        : 300; // 5 minutes default

      // Get word details for correct/incorrect words from actual session data
      const wordsCorrect: Array<{word: string, definition: string, tier: string}> = [];
      const wordsIncorrect: Array<{word: string, definition: string, tier: string}> = [];
      const wordsPromoted: Array<{word: string, fromState: string, toState: string}> = [];

      // Use actual word results if available
      if (sessionInfo.wordResults && sessionInfo.wordResults.length > 0) {
        sessionInfo.wordResults.forEach((result: any) => {
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

          // Add to promoted words if it was correct
          if (result.correct) {
            if (sessionInfo.session_type === 'study') {
              // Study session: started → ready for review
              wordsPromoted.push({
                word: result.word,
                fromState: 'started',
                toState: 'ready'
              });
            } else if (sessionInfo.session_type === 'review') {
              // Review session: ready → mastered
              wordsPromoted.push({
                word: result.word,
                fromState: 'ready',
                toState: 'mastered'
              });
            }
          }
        });
      } else {
        // Fallback to sample data if no word results available
        const sampleWords = [
          { word: 'Abate', definition: 'To become less intense or widespread', tier: 'Top 25' },
          { word: 'Adversity', definition: 'A difficult or unfortunate situation', tier: 'Top 25' },
          { word: 'Aesthetic', definition: 'Concerned with beauty or artistic taste', tier: 'Top 25' },
          { word: 'Amicable', definition: 'Characterized by friendliness', tier: 'Top 25' },
          { word: 'Anachronistic', definition: 'Belonging to a period other than that portrayed', tier: 'Top 25' }
        ];

        // Distribute words based on performance
        for (let i = 0; i < correctAnswers; i++) {
          if (sampleWords[i]) {
            wordsCorrect.push(sampleWords[i]);
          }
        }

        for (let i = correctAnswers; i < totalQuestions; i++) {
          if (sampleWords[i]) {
            wordsIncorrect.push(sampleWords[i]);
          }
        }

        // Add promoted words if any
        if (sessionInfo.words_promoted > 0) {
          wordsPromoted.push({
            word: 'Abate',
            fromState: 'started',
            toState: 'ready'
          });
        }
      }

      // Calculate points (basic scoring system)
      const pointsEarned = correctAnswers * 10 + (accuracy >= 80 ? 20 : 0);

      // Mock badges for now (would be calculated based on achievements)
      const newBadges = [];
      if (accuracy >= 80) {
        newBadges.push({
          id: 'accuracy-master',
          name: 'Accuracy Master',
          description: 'Achieve 80% accuracy in a session',
          icon: '🎯'
        });
      }

      if (sessionInfo.words_promoted > 0) {
        newBadges.push({
          id: 'word-promoter',
          name: 'Word Promoter',
          description: 'Promote words to the next learning stage',
          icon: '📈'
        });
      }

      const summaryData: SessionSummary = {
        score: correctAnswers,
        totalQuestions,
        accuracy,
        timeSpent,
        wordsCorrect,
        wordsIncorrect,
        wordsPromoted,
        newBadges,
        pointsEarned,
        streakUpdated: true,
        sessionType: sessionInfo.session_type || 'study'
      };

      setSummary(summaryData);

      // Save session to database
      await saveSessionToDatabase(user.id, summaryData, sessionInfo);

    } catch (error) {
      console.error('Error generating session summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSessionToDatabase = async (userId: string, summary: SessionSummary, sessionInfo: any) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          session_type: summary.sessionType,
          words_studied: summary.totalQuestions,
          correct_answers: summary.score,
          words_promoted: summary.wordsPromoted.length,
          words_mastered: summary.sessionType === 'review' ? summary.wordsPromoted.length : 0,
          started_at: sessionInfo.started_at || new Date(Date.now() - summary.timeSpent * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          is_guest: false
        });

      if (error) {
        console.error('Error saving session to database:', error);
      } else {
        console.log('Session saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPerformanceMessage = (accuracy: number): string => {
    if (accuracy >= 90) return "Outstanding! You're mastering these words!";
    if (accuracy >= 80) return "Great job! You're doing really well!";
    if (accuracy >= 70) return "Good work! Keep practicing to improve!";
    if (accuracy >= 60) return "Not bad! Review the missed words and try again!";
    return "Keep practicing! You'll get better with time!";
  };

  const getPerformanceColor = (accuracy: number): string => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 80) return "text-blue-600";
    if (accuracy >= 70) return "text-yellow-600";
    if (accuracy >= 60) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating session summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No session summary available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Session Complete!</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Performance Overview */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <Trophy className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
            <p className={`text-lg font-medium ${getPerformanceColor(summary.accuracy)}`}>
              {getPerformanceMessage(summary.accuracy)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{summary.score}</p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{summary.accuracy}%</p>
                <p className="text-sm text-gray-600">Accuracy</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatTime(summary.timeSpent)}</p>
                <p className="text-sm text-gray-600">Time Spent</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-yellow-50 rounded-lg p-4">
                <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{summary.pointsEarned}</p>
                <p className="text-sm text-gray-600">Points Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Words Review */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Correct Words */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Words You Got Right</h3>
            </div>
            <div className="space-y-2">
              {summary.wordsCorrect.map((word, index) => (
                <div key={index} className="flex items-center p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <div>
                    <span className="font-medium text-gray-900">{word.word}</span>
                    <p className="text-xs text-gray-600">{word.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incorrect Words */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <XCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Words to Review</h3>
            </div>
            <div className="space-y-2">
              {summary.wordsIncorrect.map((word, index) => (
                <div key={index} className="flex items-center p-2 bg-red-50 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                  <div>
                    <span className="font-medium text-gray-900">{word.word}</span>
                    <p className="text-xs text-gray-600">{word.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Words Promoted */}
        {summary.wordsPromoted.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Words Promoted!</h3>
            </div>
            <div className="space-y-2">
              {summary.wordsPromoted.map((word, index) => (
                <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{word.word}</span>
                    <p className="text-sm text-gray-600">
                      {word.fromState} → {word.toState === 'ready' ? 'ready for review' : word.toState}
                    </p>
                  </div>
                  <div className="text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Badges */}
        {summary.newBadges.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center mb-4">
              <Award className="h-6 w-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">New Achievements!</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.newBadges.map((badge) => (
                <div key={badge.id} className="flex items-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl mr-3">{badge.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900">{badge.name}</p>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/study')}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Study More Words
          </button>

          <button
            onClick={() => router.push('/review')}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Target className="h-5 w-5 mr-2" />
            Review Session
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
