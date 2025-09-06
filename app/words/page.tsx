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
  Trash2
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

interface StartedWord {
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
}

export default function WordsPage() {
  const [startedWords, setStartedWords] = useState<StartedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  const tiers = ['All', 'Top 25', 'Top 100', 'Top 200', 'Top 300', 'Top 400', 'Top 500'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  useEffect(() => {
    loadStartedWords();
  }, []);

  const loadStartedWords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, using test user for demo');
        const testUserId = '11111111-1111-1111-1111-111111111111';
        await loadStartedWordsForUser(testUserId);
        return;
      }

      await loadStartedWordsForUser(user.id);
    } catch (error) {
      console.error('Error loading started words:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStartedWordsForUser = async (userId: string) => {
    try {
      // Load only words that are in 'started' state
      const { data: startedWordsData, error } = await supabase
        .from('user_progress')
        .select(`
          id,
          study_streak,
          review_streak,
          last_studied,
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
        .eq('state', 'started')
        .order('last_studied', { ascending: false });

      if (error) {
        console.error('Error loading started words:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedWords: StartedWord[] = startedWordsData?.map(item => ({
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
        last_studied: item.last_studied
      })) || [];

      setStartedWords(transformedWords);
    } catch (error) {
      console.error('Error loading started words for user:', error);
    }
  };

  const removeFromStarted = async (wordId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, using test user for demo');
        const testUserId = '11111111-1111-1111-1111-111111111111';
        await removeWordFromStarted(testUserId, wordId);
        return;
      }

      await removeWordFromStarted(user.id, wordId);
    } catch (error) {
      console.error('Error removing word from started:', error);
    }
  };

  const removeWordFromStarted = async (userId: string, wordId: string) => {
    try {
      // Remove the word from user_progress (delete the progress record)
      const { error } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .eq('state', 'started');

      if (error) {
        console.error('Error removing word from started:', error);
        return;
      }

      // Update local state
      setStartedWords(prev => prev.filter(word => word.id !== wordId));
      console.log('Word removed from started state successfully');
    } catch (error) {
      console.error('Error removing word from started:', error);
    }
  };

  const filteredWords = startedWords.filter(word => {
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
                Started Words: {startedWords.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Remove Words from Study</h1>
          <p className="text-gray-600">
            Remove words from your active study pool. These words will no longer appear in your study sessions.
          </p>
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
            return (
              <div key={word.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                {/* Word Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{word.word}</h3>
                    <p className="text-sm text-gray-600 italic">{word.part_of_speech}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(word.tier)}`}>
                      {word.tier}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(word.difficulty)}`}>
                      {word.difficulty}
                    </span>
                  </div>
                </div>

                {/* Definition */}
                <p className="text-gray-700 mb-4">{word.definition}</p>

                {/* Study Progress */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-blue-800">Study Progress</span>
                    <span className="text-sm text-blue-600">Streak: {word.study_streak}</span>
                  </div>
                  {word.last_studied && (
                    <p className="text-xs text-blue-600">
                      Last studied: {new Date(word.last_studied).toLocaleDateString()}
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
                    onClick={() => removeFromStarted(word.id)}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No started words found</h3>
            <p className="text-gray-600 mb-4">
              {startedWords.length === 0 
                ? "You don't have any words in your study pool yet. Start studying to add words here."
                : "No words match your current search or filter criteria."
              }
            </p>
            {startedWords.length === 0 && (
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

