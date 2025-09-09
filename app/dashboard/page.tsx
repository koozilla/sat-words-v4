'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
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
  criteria: any;
}

interface DashboardStats {
  activePoolCount: number;
  reviewsDue: number;
  masteredWords: number;
  currentStreak: number;
  totalPoints: number;
  activeWordsBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
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
  const [wordStateManager] = useState(() => new WordStateManager());
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
            criteria
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(3);

      // Calculate stats using WordStateManager
      const currentActivePoolCount = await wordStateManager.getActivePoolCount(userId);
      const hasStartedWords = await wordStateManager.hasStartedWordsInCurrentTier(userId);
      const reviewsDue = hasStartedWords ? 0 : (progress?.filter(p => p.state === 'ready').length || 0);
      const mastered = progress?.filter(p => p.state === 'mastered').length || 0;
      
      
      // Calculate active words difficulty breakdown
      const activeWords = progress?.filter(p => p.state === 'started') || [];
      const activeWordsWithDetails = activeWords.map(progressItem => {
        const word = words?.find(w => w.id === progressItem.word_id);
        return word;
      }).filter(Boolean);
      
      const activeWordsBreakdown = {
        easy: activeWordsWithDetails.filter(w => w?.difficulty === 'Easy').length,
        medium: activeWordsWithDetails.filter(w => w?.difficulty === 'Medium').length,
        hard: activeWordsWithDetails.filter(w => w?.difficulty === 'Hard').length
      };
      
      // Get current tier and calculate progress for only that tier
      const currentTierDisplay = await wordStateManager.getCurrentTier(userId);
      
      // Map display name to database format - Updated for 20-tier system
      const tierMappings = [
        { display: 'Top 25', db: ['top_25'] },
        { display: 'Top 50', db: ['top_50'] },
        { display: 'Top 75', db: ['top_75'] },
        { display: 'Top 100', db: ['top_100'] },
        { display: 'Top 125', db: ['top_125'] },
        { display: 'Top 150', db: ['top_150'] },
        { display: 'Top 175', db: ['top_175'] },
        { display: 'Top 200', db: ['top_200'] },
        { display: 'Top 225', db: ['top_225'] },
        { display: 'Top 250', db: ['top_250'] },
        { display: 'Top 275', db: ['top_275'] },
        { display: 'Top 300', db: ['top_300'] },
        { display: 'Top 325', db: ['top_325'] },
        { display: 'Top 350', db: ['top_350'] },
        { display: 'Top 375', db: ['top_375'] },
        { display: 'Top 400', db: ['top_400'] },
        { display: 'Top 425', db: ['top_425'] },
        { display: 'Top 450', db: ['top_450'] },
        { display: 'Top 475', db: ['top_475'] },
        { display: 'Top 500', db: ['top_500'] }
      ];
      
      const currentTierMapping = tierMappings.find(t => t.display === currentTierDisplay);
      const tierWords = currentTierMapping ? words?.filter(w => currentTierMapping.db.includes(w.tier)) || [] : [];
      const tierMastered = progress?.filter(p => 
        p.state === 'mastered' && 
        tierWords.some(w => w.id === p.word_id)
      ).length || 0;
      
      const tierProgress = [{
        tier: currentTierDisplay,
        total: tierWords.length,
        mastered: tierMastered,
        percentage: tierWords.length > 0 ? Math.round((tierMastered / tierWords.length) * 100) : 0
      }];

      const finalStats = {
        activePoolCount: currentActivePoolCount,
        reviewsDue,
        masteredWords: mastered,
        currentStreak: 7, // TODO: Calculate from sessions
        totalPoints: mastered * 10 + currentActivePoolCount * 5, // TODO: Calculate from sessions
        activeWordsBreakdown,
        tierProgress,
        recentBadges: (userBadges?.map(ub => ub.badges).flat() || []) as Badge[]
      };
      
      console.log('Final stats being set:', finalStats);
      setStats(finalStats);
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
      activeWordsBreakdown: {
        easy: 0,
        medium: 0,
        hard: 0
      },
      tierProgress: [
        { tier: 'Top 25', total: 25, mastered: 0, percentage: 0 }
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
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="ml-2 text-lg sm:text-xl font-bold text-gray-900">SAT Word Mastery</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {isGuest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 sm:px-3">
                  <span className="text-yellow-800 text-xs sm:text-sm font-medium">Guest</span>
                </div>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-500 hover:text-gray-700 text-sm sm:text-base"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Welcome back{user ? `, ${user.email?.split('@')[0]}` : ''}!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {isGuest 
              ? "You're in guest mode. Sign up to save your progress and unlock all features."
              : "Ready to master SAT vocabulary? Let's continue your learning journey."
            }
          </p>
        </div>

        {/* Smart Review Card */}
        {stats && stats.reviewsDue > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 sm:p-6 text-white mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1">Challenges Due</h3>
                  <p className="text-orange-100 text-sm sm:text-base">
                    {stats.reviewsDue} {stats.reviewsDue === 1 ? 'word' : 'words'} ready for challenge
                  </p>
                </div>
              </div>
              <button
                onClick={startReviewSession}
                className="bg-white text-orange-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center w-full sm:w-auto"
              >
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Start Test
              </button>
            </div>
          </div>
        )}

        {/* Smart Study Card */}
        {stats && stats.activePoolCount > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1">Active Words</h3>
                  <p className="text-blue-100 text-sm sm:text-base mb-2">
                    {stats.activePoolCount} words in active study pool
                  </p>
                  {stats.tierProgress && stats.tierProgress.length > 0 && (
                    <p className="text-blue-100 text-xs sm:text-sm">
                      {stats.tierProgress[0].tier}: {stats.tierProgress[0].total - stats.tierProgress[0].mastered} words remaining
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={startStudySession}
                  className="bg-white text-blue-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Start Study
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mastered Words Card */}
        {stats && stats.masteredWords > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1">Mastered Words</h3>
                  <p className="text-green-100 text-sm sm:text-base mb-2">
                    {stats.masteredWords} words mastered
                  </p>
                  {stats.tierProgress && stats.tierProgress.length > 0 && (
                    <p className="text-green-100 text-xs sm:text-sm">
                      {stats.tierProgress[0].tier}: {stats.tierProgress[0].mastered}/{stats.tierProgress[0].total} completed
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => router.push('/mastered-words')}
                  className="bg-white text-green-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  View All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modify Active Words Card */}
        {stats && stats.activePoolCount > 0 && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <Plus className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold mb-1">View Active Words</h3>
                  <p className="text-purple-100 text-sm sm:text-base mb-2">
                    View your active study pool
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => router.push('/words')}
                  className="bg-white text-purple-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  View All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Streak Message */}
        {stats && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mb-4">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-500">Streak</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.currentStreak || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {stats && stats.tierProgress && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 mr-2" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-wide">Progress</h3>
            </div>
            <div className="space-y-4 sm:space-y-5">
              {stats.tierProgress.map((tier, index) => (
                <div key={tier.tier} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <span className="text-sm sm:text-base font-semibold text-gray-800 tracking-wide">{tier.tier}</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full">
                        {tier.mastered}/{tier.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${tier.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 tracking-wide">{tier.percentage}% complete</span>
                      {tier.mastered === tier.total && tier.total > 0 && (
                        <span className="text-xs sm:text-sm font-bold text-green-600 bg-green-100 px-1 py-1 sm:px-2 sm:py-1 rounded-full flex items-center">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {stats?.recentBadges && stats.recentBadges.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Achievements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stats.recentBadges.map((badge) => (
                <div key={badge.id} className="flex items-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 flex-shrink-0" />
                  <div className="ml-3 min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{badge.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest Mode CTA */}
        {isGuest && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Unlock Your Full Potential</h3>
                <p className="text-blue-100 text-sm sm:text-base">
                  Sign up to save your progress, track achievements, and access all features.
                </p>
              </div>
              <button
                onClick={() => router.push('/auth/signup')}
                className="bg-white text-blue-600 px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors w-full sm:w-auto"
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
