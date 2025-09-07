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
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [showAvailableWords, setShowAvailableWords] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  const tiers = ['All', 'Top 25', 'Top 100', 'Top 200', 'Top 300', 'Top 400', 'Top 500'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  useEffect(() => {
    loadCurrentWords();
  }, []);

  const loadCurrentWords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      await loadCurrentWordsForUser(user.id);
      await loadAvailableWords(user.id);
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
      const transformedWords: CurrentWord[] = currentWordsData?.map(item => ({
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

  const removeFromCurrent = async (wordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      await removeWordFromCurrent(user.id, wordId);
    } catch (error) {
      console.error('Error removing word from current:', error);
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
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'All' || word.tier === selectedTier;
    const matchesDifficulty = selectedDifficulty === 'All' || word.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesTier && matchesDifficulty;
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
            <div className="flex items-center">
              <Target className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                Current Words: {currentWords.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Current Words</h1>
              <p className="text-gray-600">
                View and manage your current study pool. See words you're studying and words ready for review.
              </p>
            </div>
            <button
              onClick={() => setShowAvailableWords(!showAvailableWords)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showAvailableWords ? 'Hide Available Words' : 'Add More Words'}
            </button>
          </div>
          
          {/* Available Words Section */}
          {showAvailableWords && (
            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Available Words</h2>
              <p className="text-blue-700 mb-4">
                Add words from your current tier to your active study pool. You can have up to 15 words in your active pool.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableWords.slice(0, 6).map((word) => (
                  <div key={word.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{word.word}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(word.tier)}`}>
                        {word.tier}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{word.definition}</p>
                    <button
                      onClick={() => addToActivePool(word.id)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Add to Study Pool
                    </button>
                  </div>
                ))}
              </div>
              {availableWords.length > 6 && (
                <p className="text-blue-600 text-sm mt-4">
                  And {availableWords.length - 6} more words available...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search words or definitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {tiers.map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Words Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWords.map((word) => {
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(word.tier)}`}>
                        {word.tier}
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
                      "{word.example_sentence}"
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

                {/* Remove Button */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => removeFromCurrent(word.id)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove from Study
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredWords.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No current words found</h3>
            <p className="text-gray-600 mb-4">
              {currentWords.length === 0 
                ? "You don't have any words in your study pool yet. Start studying to add words here."
                : "No words match your current search or filter criteria."
              }
            </p>
            {currentWords.length === 0 && (
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

