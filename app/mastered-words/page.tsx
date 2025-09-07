'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  BookOpen, 
  CheckCircle,
  ArrowLeft,
  Search,
  Filter,
  Trophy,
  Target
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
  const [selectedTier, setSelectedTier] = useState('all');
  const [isGuest, setIsGuest] = useState(false);
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

  const filteredWords = masteredWords.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'all' || word.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const tiers = ['all', 'Top 25', 'Top 100', 'Top 200', 'Top 300', 'Top 400', 'Top 500'];

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
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">Mastered Words</h1>
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
        {/* Stats */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Trophy className="h-8 w-8 text-yellow-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              {masteredWords.length} Mastered Words
            </h2>
          </div>
          <p className="text-gray-600">
            {isGuest 
              ? "You're in guest mode. Sign up to save your progress and track mastered words."
              : "Congratulations! These are the words you've successfully mastered."
            }
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
            </div>
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {tiers.map(tier => (
                  <option key={tier} value={tier}>
                    {tier === 'all' ? 'All Tiers' : tier}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Words Grid */}
        {filteredWords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || selectedTier !== 'all' ? 'No words found' : 'No mastered words yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedTier !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Start studying to master your first words!'
              }
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
              <div key={word.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{word.word}</h3>
                    <p className="text-sm text-gray-500 mb-2">{word.part_of_speech}</p>
                    <div className="flex items-center">
                      <Target className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="text-sm font-medium text-blue-600">{word.tier}</span>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                </div>
                
                <p className="text-gray-700 mb-4">{word.definition}</p>
                
                {word.example_sentence && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Example:</p>
                    <p className="text-sm italic text-gray-600">"{word.example_sentence}"</p>
                  </div>
                )}
                
                {word.synonyms && word.synonyms.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-1">Synonyms:</p>
                    <p className="text-sm text-gray-600">{word.synonyms.join(', ')}</p>
                  </div>
                )}
                
                {word.antonyms && word.antonyms.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Antonyms:</p>
                    <p className="text-sm text-gray-600">{word.antonyms.join(', ')}</p>
                  </div>
                )}
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
