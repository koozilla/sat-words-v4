'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter,
  BookOpen,
  Star,
  Target,
  CheckCircle,
  XCircle
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
  state: 'not_started' | 'learning' | 'reviewing' | 'mastered';
}

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [activePoolCount, setActivePoolCount] = useState(0);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const tiers = ['All', 'Top 25', 'Top 100', 'Top 200', 'Top 300', 'Top 400', 'Top 500'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      // Mock data for now
      const mockWords: Word[] = [
        {
          id: '1',
          word: 'abundant',
          definition: 'existing in large quantities; plentiful',
          part_of_speech: 'adjective',
          tier: 'Top 25',
          difficulty: 'Easy',
          synonyms: ['plentiful', 'copious', 'profuse'],
          antonyms: ['scarce', 'rare', 'limited'],
          example_sentence: 'The garden was abundant with colorful flowers.'
        },
        {
          id: '2',
          word: 'benevolent',
          definition: 'well meaning and kindly',
          part_of_speech: 'adjective',
          tier: 'Top 25',
          difficulty: 'Medium',
          synonyms: ['kind', 'generous', 'charitable'],
          antonyms: ['malevolent', 'cruel', 'harsh'],
          example_sentence: 'The benevolent teacher helped students after school.'
        },
        {
          id: '3',
          word: 'cognizant',
          definition: 'having knowledge or awareness',
          part_of_speech: 'adjective',
          tier: 'Top 25',
          difficulty: 'Hard',
          synonyms: ['aware', 'conscious', 'informed'],
          antonyms: ['unaware', 'ignorant', 'oblivious'],
          example_sentence: 'She was cognizant of the risks involved.'
        },
        {
          id: '4',
          word: 'diligent',
          definition: 'having or showing care and conscientiousness in one\'s work or duties',
          part_of_speech: 'adjective',
          tier: 'Top 100',
          difficulty: 'Medium',
          synonyms: ['hardworking', 'industrious', 'meticulous'],
          antonyms: ['lazy', 'careless', 'negligent'],
          example_sentence: 'The diligent student studied every night.'
        },
        {
          id: '5',
          word: 'eloquent',
          definition: 'fluent or persuasive in speaking or writing',
          part_of_speech: 'adjective',
          tier: 'Top 100',
          difficulty: 'Medium',
          synonyms: ['articulate', 'fluent', 'persuasive'],
          antonyms: ['inarticulate', 'tongue-tied', 'mute'],
          example_sentence: 'The eloquent speaker captivated the audience.'
        }
      ];

      setWords(mockWords);
      setActivePoolCount(3); // Mock active pool count
    } catch (error) {
      console.error('Error loading words:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToActivePool = async (wordId: string) => {
    try {
      // Mock adding to active pool
      console.log('Adding word to active pool:', wordId);
      // In real implementation, this would update the database
      setActivePoolCount(prev => prev + 1);
    } catch (error) {
      console.error('Error adding word to active pool:', error);
    }
  };

  const removeFromActivePool = async (wordId: string) => {
    try {
      // Mock removing from active pool
      console.log('Removing word from active pool:', wordId);
      // In real implementation, this would update the database
      setActivePoolCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error removing word from active pool:', error);
    }
  };

  const filteredWords = words.filter(word => {
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
                Active Pool: {activePoolCount}/15
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SAT Vocabulary Words</h1>
          <p className="text-gray-600">
            Browse and add words to your active pool for focused study sessions.
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
            const isInActivePool = activePoolCount < 15; // Mock logic
            const canAdd = activePoolCount < 15;
            
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

                {/* Action Button */}
                <div className="pt-4 border-t border-gray-100">
                  {isInActivePool ? (
                    <button
                      onClick={() => removeFromActivePool(word.id)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Remove from Active Pool
                    </button>
                  ) : (
                    <button
                      onClick={() => addToActivePool(word.id)}
                      disabled={!canAdd}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Active Pool
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredWords.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No words found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Active Pool Limit Warning */}
        {activePoolCount >= 15 && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Star className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">
                Your active pool is full! Remove some words before adding new ones.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
