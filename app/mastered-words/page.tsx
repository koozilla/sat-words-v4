'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { 
  BookOpen, 
  CheckCircle,
  ArrowLeft,
  Search,
  Filter,
  Trophy,
  Target,
  RotateCcw
} from 'lucide-react';

interface Word {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string;
  tier: string;
  difficulty: string;
  image_url?: string;
  synonyms?: string[];
  antonyms?: string[];
  example_sentence?: string;
}

interface UserProgress {
  word_id: string;
  state: 'not_started' | 'started' | 'ready' | 'mastered';
  mastered_at?: string;
}

export default function MasteredWords() {
  const [masteredWords, setMasteredWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadMasteredWords();
  }, []);

  const loadMasteredWords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadUserMasteredWords(session.user.id);
      } else {
        // Check for guest mode
        const guestData = localStorage.getItem('sat-words-guest');
        if (guestData) {
          setIsGuest(true);
          await loadGuestMasteredWords();
        } else {
          router.push('/auth/login');
        }
      }
    } catch (error) {
      console.error('Error loading mastered words:', error);
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMasteredWords = async (userId: string) => {
    try {
      // Get mastered words from user progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select(`
          word_id,
          state,
          updated_at
        `)
        .eq('user_id', userId)
        .eq('state', 'mastered');

      if (!progress || progress.length === 0) {
        setMasteredWords([]);
        return;
      }

      // Get word details
      const wordIds = progress.map(p => p.word_id);
      const { data: words } = await supabase
        .from('words')
        .select('*')
        .in('id', wordIds)
        .order('tier', { ascending: true });

      setMasteredWords(words || []);
    } catch (error) {
      console.error('Error loading user mastered words:', error);
    }
  };

  const loadGuestMasteredWords = async () => {
    // Mock data for guest mode
    setMasteredWords([]);
  };

  const putBackToStudy = async (wordId: string, word: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to modify word states.');
        return;
      }

      // Reset word from mastered back to started state
      await wordStateManager.markWordAsStarted(user.id, wordId);
      
      // Remove the word from the mastered words list
      setMasteredWords(prev => prev.filter(w => w.id !== wordId));
      
      console.log(`Word "${word}" has been reset to study state`);
    } catch (error) {
      console.error('Error resetting word to study state:', error);
      alert('Failed to reset word to study state. Please try again.');
    }
  };

  // Helper function to convert database tier to display tier
  const getDisplayTier = (dbTier: string): string => {
    const tierMapping: { [key: string]: string } = {
      'top_25': 'Top 25',
      'top_50': 'Top 50', 
      'top_75': 'Top 75',
      'top_100': 'Top 100',
      'top_125': 'Top 125',
      'top_150': 'Top 150',
      'top_175': 'Top 175',
      'top_200': 'Top 200',
      'top_225': 'Top 225',
      'top_250': 'Top 250',
      'top_275': 'Top 275',
      'top_300': 'Top 300',
      'top_325': 'Top 325',
      'top_350': 'Top 350',
      'top_375': 'Top 375',
      'top_400': 'Top 400',
      'top_425': 'Top 425',
      'top_450': 'Top 450',
      'top_475': 'Top 475',
      'top_500': 'Top 500'
    };
    return tierMapping[dbTier] || dbTier;
  };

  const filteredWords = masteredWords.filter(word => {
    const searchLower = searchTerm.toLowerCase();
    const wordDisplayTier = getDisplayTier(word.tier);
    
    const matchesSearch = word.word.toLowerCase().includes(searchLower) ||
                         word.definition.toLowerCase().includes(searchLower) ||
                         wordDisplayTier.toLowerCase().includes(searchLower) ||
                         word.difficulty.toLowerCase().includes(searchLower) ||
                         word.part_of_speech.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });


  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'Top 25': return 'text-purple-600 bg-purple-100';
      case 'Top 100': return 'text-blue-600 bg-blue-100';
      case 'Top 200': return 'text-indigo-600 bg-indigo-100';
      case 'Top 300': return 'text-cyan-600 bg-cyan-100';
      case 'Top 400': return 'text-teal-600 bg-teal-100';
      case 'Top 500': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mastered words...</p>
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
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              <div className="text-sm font-medium text-gray-700">
                <div>Mastered Words: {masteredWords.length}</div>
              </div>
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mastered Words</h1>
              <p className="text-gray-600">
                {isGuest 
                  ? "You're in guest mode. Sign up to save your progress and track mastered words."
                  : "Congratulations! These are the words you've successfully mastered."
                }
              </p>
            </div>
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                Total: {masteredWords.length}
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search words, definitions, tiers, difficulty, or part of speech..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Words Grid */}
        {filteredWords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No words found' : 'No mastered words yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'Start studying to master your first words!'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWords.map((word) => (
              <div key={word.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ring-2 ring-green-200">
                {/* Word Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{word.word}</h3>
                    <p className="text-sm text-gray-600 italic">{word.part_of_speech}</p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(getDisplayTier(word.tier))}`}>
                        {getDisplayTier(word.tier)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(word.difficulty)}`}>
                        {word.difficulty}
                      </span>
                    </div>
                    {/* Mastered Badge */}
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-green-800 bg-green-100">
                      Mastered
                    </span>
                  </div>
                </div>

                {/* Definition */}
                <p className="text-gray-700 mb-4">{word.definition}</p>

                {/* Mastered Progress Section */}
                <div className="mb-4 p-3 rounded-lg bg-green-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">
                      Mastered
                    </span>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                {/* Put back to Study Button */}
                <div className="mb-4">
                  <button
                    onClick={() => putBackToStudy(word.id, word.word)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Put back to Study
                  </button>
                </div>

                {/* Example Sentence */}
                {word.example_sentence && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 italic">
                      &ldquo;{word.example_sentence}&rdquo;
                    </p>
                  </div>
                )}

                {/* Synonyms/Antonyms */}
                <div className="mb-4">
                  {word.synonyms && word.synonyms.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">Synonyms:</p>
                      <p className="text-sm text-gray-600">{word.synonyms.join(', ')}</p>
                    </div>
                  )}
                  {word.antonyms && word.antonyms.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Antonyms:</p>
                      <p className="text-sm text-gray-600">{word.antonyms.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Guest Mode CTA */}
        {isGuest && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Unlock Your Full Potential</h3>
                <p className="text-blue-100">
                  Sign up to save your progress, track mastered words, and access all features.
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
