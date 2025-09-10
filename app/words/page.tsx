'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { 
  ArrowLeft, 
  Minus, 
  Search, 
  Filter,
  BookOpen,
  Star,
  Target,
  CheckCircle,
  XCircle,
  Trash2,
  Plus
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

interface CurrentWord {
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
  progress_id: string;
  study_streak: number;
  review_streak: number;
  last_studied: string | null;
  state: 'started' | 'ready';
  next_review_date?: string | null;
  review_interval?: number;
}

export default function WordsPage() {
  const [currentWords, setCurrentWords] = useState<CurrentWord[]>([]);
  const [availableWords, setAvailableWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableWords, setShowAvailableWords] = useState(false);
  const [activeTiers, setActiveTiers] = useState<string[]>([]);
  const [highestActiveTier, setHighestActiveTier] = useState<string>('Top 25');
  const [isGuest, setIsGuest] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

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


  useEffect(() => {
    loadCurrentWords();
  }, []);

  const loadCurrentWords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Check for guest mode
        const guestData = localStorage.getItem('sat-words-guest');
        if (guestData) {
          setIsGuest(true);
          await loadGuestCurrentWords();
          return;
        } else {
          console.log('No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }
      }

      await loadCurrentWordsForUser(user.id);
      await loadAvailableWords(user.id);
      
      // Load active tiers information
      const { activeTiers, highestActiveTier } = await wordStateManager.getActiveTiers(user.id);
      setActiveTiers(activeTiers);
      setHighestActiveTier(highestActiveTier);
    } catch (error) {
      console.error('Error loading current words:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableWords = async (userId: string) => {
    try {
      const available = await wordStateManager.getAvailableWordsForPool(userId, 50);
      setAvailableWords(available);
    } catch (error) {
      console.error('Error loading available words:', error);
    }
  };

  const addToActivePool = async (wordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/auth/login');
        return;
      }
      
      const success = await wordStateManager.addToActivePool(user.id, wordId);
      if (success) {
        // Reload both current and available words
        await loadCurrentWordsForUser(user.id);
        await loadAvailableWords(user.id);
        console.log('Word added to active pool successfully');
      }
    } catch (error) {
      console.error('Error adding word to active pool:', error);
    }
  };

  const loadCurrentWordsForUser = async (userId: string) => {
    try {
      // Load words that are in 'started' or 'ready' state
      const { data: currentWordsData, error } = await supabase
        .from('user_progress')
        .select(`
          id,
          state,
          study_streak,
          review_streak,
          last_studied,
          next_review_date,
          review_interval,
          words:word_id (
            id,
            word,
            definition,
            part_of_speech,
            tier,
            difficulty,
            image_urls,
            synonyms,
            antonyms,
            example_sentence
          )
        `)
        .eq('user_id', userId)
        .in('state', ['started', 'ready'])
        .order('state', { ascending: true })
        .order('last_studied', { ascending: false });

      if (error) {
        console.error('Error loading current words:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedWords: CurrentWord[] = currentWordsData?.map((item: any) => ({
        id: item.words.id,
        word: item.words.word,
        definition: item.words.definition,
        part_of_speech: item.words.part_of_speech,
        tier: item.words.tier,
        difficulty: item.words.difficulty,
        image_url: item.words.image_urls?.[0],
        synonyms: item.words.synonyms || [],
        antonyms: item.words.antonyms || [],
        example_sentence: item.words.example_sentence,
        progress_id: item.id,
        study_streak: item.study_streak,
        review_streak: item.review_streak,
        last_studied: item.last_studied,
        state: item.state as 'started' | 'ready',
        next_review_date: item.next_review_date,
        review_interval: item.review_interval
      })) || [];

      setCurrentWords(transformedWords);
    } catch (error) {
      console.error('Error loading current words for user:', error);
    }
  };

  const loadGuestCurrentWords = async () => {
    try {
      // Import guest mode manager
      const { guestModeManager } = await import('@/lib/guest-mode-manager');
      
      // Get active pool words from guest data
      const activePoolWords = guestModeManager.getActivePoolWords();
      
      if (activePoolWords.length > 0) {
        // Get full word details from database
        const { data: wordsData, error } = await supabase
          .from('words')
          .select('*')
          .in('id', activePoolWords.map(w => w.id));

        if (error) {
          console.error('Error loading guest word details:', error);
          return;
        }

        if (wordsData) {
          const guestData = guestModeManager.getGuestData();
          const transformedWords: CurrentWord[] = wordsData.map(word => {
            const progress = guestData?.wordProgress[word.id] || {
              state: 'started',
              study_streak: 0,
              review_streak: 0
            };
            
            return {
              id: word.id,
              word: word.word,
              definition: word.definition,
              part_of_speech: word.part_of_speech,
              tier: word.tier,
              difficulty: word.difficulty,
              image_url: word.image_urls?.[0] || undefined,
              synonyms: word.synonyms || [],
              antonyms: word.antonyms || [],
              example_sentence: word.example_sentence,
              progress_id: word.id, // Use word id as progress id for guest mode
              study_streak: progress.study_streak,
              review_streak: progress.review_streak,
              last_studied: null,
              state: progress.state as 'started' | 'ready',
              next_review_date: null,
              review_interval: undefined
            };
          });
          
          setCurrentWords(transformedWords);
        }
      } else {
        setCurrentWords([]);
      }
      
      // Set guest mode active tiers
      setActiveTiers(['Top 25']);
      setHighestActiveTier('Top 25');
    } catch (error) {
      console.error('Error loading guest current words:', error);
      setCurrentWords([]);
    }
  };

  const removeFromCurrent = async (wordId: string) => {
    try {
      if (isGuest) {
        // Handle guest mode word removal
        const { guestModeManager } = await import('@/lib/guest-mode-manager');
        
        // Remove word from guest active pool
        guestModeManager.removeWordFromActivePool(wordId);
        
        // Reload guest current words
        await loadGuestCurrentWords();
        
        console.log(`Word removed from active pool in guest mode`);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }

        await removeWordFromCurrent(user.id, wordId);
      }
    } catch (error) {
      console.error('Error removing word from current:', error);
    }
  };

  const markAsMastered = async (wordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      const success = await wordStateManager.markWordAsMastered(user.id, wordId);
      if (success) {
        // Reload current words to reflect the change
        await loadCurrentWordsForUser(user.id);
        console.log('Word marked as mastered successfully');
      } else {
        console.error('Failed to mark word as mastered');
      }
    } catch (error) {
      console.error('Error marking word as mastered:', error);
    }
  };

  const removeWordFromCurrent = async (userId: string, wordId: string) => {
    try {
      // Remove the word from user_progress (delete the progress record)
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .in('state', ['started', 'ready']);

      if (error) {
        console.error('Error removing word from current:', error);
        return;
      }

      // Update local state
      setCurrentWords(prev => prev.filter(word => word.id !== wordId));
      console.log('Word removed from current words successfully');
    } catch (error) {
      console.error('Error removing word from current:', error);
    }
  };

  const filteredWords = currentWords.filter(word => {
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
          <p className="text-gray-600">Loading words...</p>
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
            <div className="flex items-center space-x-4">
              {isGuest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1 sm:px-3">
                  <span className="text-yellow-800 text-xs sm:text-sm font-medium">Guest</span>
                </div>
              )}
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/auth/login');
                }}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Words</h1>
              <p className="text-gray-600">
                View and manage your active study pool. See words you&apos;re studying and words ready for review, organized by tier.
              </p>
            </div>
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                Total: {currentWords.length}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWords?.map((word) => {
            const isReady = word.state === 'ready';
            const isDueForReview = isReady && word.next_review_date && 
              new Date(word.next_review_date) <= new Date();
            
            return (
              <div key={word.id} className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ${
                isReady ? 'ring-2 ring-green-200' : ''
              }`}>
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
                    {/* State Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isReady 
                        ? isDueForReview 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-green-600 bg-green-50'
                        : 'text-blue-800 bg-blue-100'
                    }`}>
                      {isReady ? (isDueForReview ? 'Ready for Review' : 'Ready') : 'Studying'}
                    </span>
                  </div>
                </div>

                {/* Definition */}
                <p className="text-gray-700 mb-4">{word.definition}</p>

                {/* Progress Section */}
                <div className={`mb-4 p-3 rounded-lg ${
                  isReady ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${
                      isReady ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      {isReady ? 'Review Progress' : 'Study Progress'}
                    </span>
                    <span className={`text-sm ${
                      isReady ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      Streak: {isReady ? word.review_streak : word.study_streak}
                    </span>
                  </div>
                  {word.last_studied && (
                    <p className={`text-xs ${
                      isReady ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      Last studied: {new Date(word.last_studied).toLocaleDateString()}
                    </p>
                  )}
                  {isReady && word.next_review_date && (
                    <p className={`text-xs ${
                      isDueForReview ? 'text-red-600 font-medium' : 'text-green-600'
                    }`}>
                      {isDueForReview ? 'Due for review!' : `Next review: ${new Date(word.next_review_date).toLocaleDateString()}`}
                    </p>
                  )}
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

                {/* Mark as Mastered Button */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => markAsMastered(word.id)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Mastered
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredWords && filteredWords.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No current words found</h3>
            <p className="text-gray-600 mb-4">
              {currentWords && currentWords.length === 0 
                ? "You don't have any words in your study pool yet. Start studying to add words here."
                : "No words match your current search or filter criteria."
              }
            </p>
            {currentWords && currentWords.length === 0 && (
              <button
                onClick={() => router.push('/study')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Studying
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

