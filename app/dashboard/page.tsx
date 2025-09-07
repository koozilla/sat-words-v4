'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Target, 
  TrendingUp, 
  Star,
  Plus,
  CheckCircle,
  Users,
  Award
} from 'lucide-react';

interface Word {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string;
  tier: string;
  difficulty: string;
  image_url?: string;
}

interface UserProgress {
  word_id: string;
  state: 'not_started' | 'started' | 'ready' | 'mastered';
  next_review_date?: string;
  correct_count: number;
  incorrect_count: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
}

interface DashboardStats {
  activePoolCount: number;
  reviewsDue: number;
  masteredWords: number;
  currentStreak: number;
  totalPoints: number;
  tierProgress: {
    tier: string;
    total: number;
    mastered: number;
    percentage: number;
  }[];
  recentBadges: Badge[];
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await loadDashboardData(session.user.id);
      } else {
        // Check for guest mode
        const guestData = localStorage.getItem('sat-words-guest');
        if (guestData) {
          setIsGuest(true);
          await loadGuestDashboardData();
        } else {
          router.push('/auth/login');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (userId: string) => {
    try {
      // Load user progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      // Load words
      const { data: words } = await supabase
        .from('words')
        .select('*')
        .order('tier', { ascending: true });

      // Load user badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
          badges (
            id,
            name,
            description,
            icon,
            requirement
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(3);

      // Calculate stats
      const activePool = progress?.filter(p => p.state === 'started').length || 0;
      const reviewsDue = progress?.filter(p => p.state === 'ready').length || 0;
      const mastered = progress?.filter(p => p.state === 'mastered').length || 0;
      
      // Calculate tier progress
      const tierProgress = ['Top 25', 'Top 100', 'Top 200', 'Top 300', 'Top 400', 'Top 500'].map(tier => {
        const tierWords = words?.filter(w => w.tier === tier) || [];
        const tierMastered = progress?.filter(p => 
          p.state === 'mastered' && 
          tierWords.some(w => w.id === p.word_id)
        ).length || 0;
        
        return {
          tier,
          total: tierWords.length,
          mastered: tierMastered,
          percentage: tierWords.length > 0 ? Math.round((tierMastered / tierWords.length) * 100) : 0
        };
      });

      setStats({
        activePoolCount: activePool,
        reviewsDue,
        masteredWords: mastered,
        currentStreak: 7, // TODO: Calculate from sessions
        totalPoints: mastered * 10 + activePool * 5, // TODO: Calculate from sessions
        tierProgress,
        recentBadges: userBadges?.map(ub => ub.badges) || []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadGuestDashboardData = async () => {
    // Mock data for guest mode
    setStats({
      activePoolCount: 0,
      reviewsDue: 0,
      masteredWords: 0,
      currentStreak: 0,
      totalPoints: 0,
      tierProgress: [
        { tier: 'Top 25', total: 25, mastered: 0, percentage: 0 },
        { tier: 'Top 100', total: 100, mastered: 0, percentage: 0 },
        { tier: 'Top 200', total: 200, mastered: 0, percentage: 0 },
        { tier: 'Top 300', total: 300, mastered: 0, percentage: 0 },
        { tier: 'Top 400', total: 400, mastered: 0, percentage: 0 },
        { tier: 'Top 500', total: 500, mastered: 0, percentage: 0 }
      ],
      recentBadges: []
    });
  };

  const startStudySession = () => {
    router.push('/study');
  };

  const startReviewSession = () => {
    router.push('/review');
  };

  const viewCurrentWords = () => {
    router.push('/words');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">SAT Word Mastery</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isGuest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                  <span className="text-yellow-800 text-sm font-medium">Guest Mode</span>
                </div>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back{user ? `, ${user.email?.split('@')[0]}` : ''}!
          </h2>
          <p className="text-gray-600">
            {isGuest 
              ? "You're in guest mode. Sign up to save your progress and unlock all features."
              : "Ready to master SAT vocabulary? Let's continue your learning journey."
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={startStudySession}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl shadow-lg transition-colors"
          >
            <BookOpen className="h-8 w-8 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Study Session</h3>
            <p className="text-blue-100">Learn new words with flashcards</p>
          </button>

          <button
            onClick={viewCurrentWords}
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-xl shadow-lg transition-colors"
          >
            <Target className="h-8 w-8 mb-3" />
            <h3 className="text-lg font-semibold mb-2">Current Words</h3>
            <p className="text-purple-100">View and manage your study pool</p>
          </button>
        </div>

        {/* Smart Review Card */}
        {stats && stats.reviewsDue > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold mb-1">Reviews Due</h3>
                  <p className="text-green-100">
                    {stats.reviewsDue} {stats.reviewsDue === 1 ? 'word' : 'words'} ready for review
                  </p>
                </div>
              </div>
              <button
                onClick={startReviewSession}
                className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"
              >
                <Clock className="h-5 w-5 mr-2" />
                Start Review
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Pool</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activePoolCount || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Mastered</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.masteredWords || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Streak</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.currentStreak || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Progress</h3>
          <div className="space-y-4">
            {stats?.tierProgress.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>{tier.tier}</span>
                    <span>{tier.mastered}/{tier.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${tier.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-sm font-medium text-gray-500">
                  {tier.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Achievements */}
        {stats?.recentBadges && stats.recentBadges.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.recentBadges.map((badge) => (
                <div key={badge.id} className="flex items-center p-4 bg-yellow-50 rounded-lg">
                  <Award className="h-6 w-6 text-yellow-600" />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{badge.name}</p>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest Mode CTA */}
        {isGuest && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Unlock Your Full Potential</h3>
                <p className="text-blue-100">
                  Sign up to save your progress, track achievements, and access all features.
                </p>
              </div>
              <button
                onClick={() => router.push('/auth/signup')}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign Up Now
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
