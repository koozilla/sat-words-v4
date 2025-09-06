'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  wordsCorrect: string[];
  wordsIncorrect: string[];
  newBadges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
  pointsEarned: number;
  streakUpdated: boolean;
}

export default function SessionSummary() {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    generateSessionSummary();
  }, []);

  const generateSessionSummary = async () => {
    try {
      // Mock session summary data
      const mockSummary: SessionSummary = {
        score: 8,
        totalQuestions: 10,
        accuracy: 80,
        timeSpent: 420, // 7 minutes in seconds
        wordsCorrect: ['abundant', 'benevolent', 'cognizant', 'diligent', 'eloquent', 'frugal', 'gregarious', 'humble'],
        wordsIncorrect: ['indifferent', 'jeopardy'],
        newBadges: [
          {
            id: '1',
            name: 'First Steps',
            description: 'Complete your first study session',
            icon: '🎯'
          },
          {
            id: '2',
            name: 'Accuracy Master',
            description: 'Achieve 80% accuracy in a session',
            icon: '🎯'
          }
        ],
        pointsEarned: 85,
        streakUpdated: true
      };

      setSummary(mockSummary);
    } catch (error) {
      console.error('Error generating session summary:', error);
    } finally {
      setLoading(false);
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
                  <span className="font-medium text-gray-900">{word}</span>
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
                  <span className="font-medium text-gray-900">{word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
