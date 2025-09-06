'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  Clock,
  Image as ImageIcon,
  Eye,
  EyeOff
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

interface ReviewSession {
  words: Word[];
  currentIndex: number;
  score: number;
  totalQuestions: number;
  answers: { [key: string]: boolean };
  startTime: Date;
}

export default function ReviewSession() {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    initializeReviewSession();
  }, []);

  const initializeReviewSession = async () => {
    try {
      // For now, we'll use mock data since we don't have words in the database yet
      const mockWords: Word[] = [
        {
          id: '1',
          word: 'abundant',
          definition: 'existing in large quantities; plentiful',
          part_of_speech: 'adjective',
          tier: 'Top 25',
          difficulty: 'Easy',
          image_url: '/api/placeholder/400/300',
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
          image_url: '/api/placeholder/400/300',
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
          image_url: '/api/placeholder/400/300',
          synonyms: ['aware', 'conscious', 'informed'],
          antonyms: ['unaware', 'ignorant', 'oblivious'],
          example_sentence: 'She was cognizant of the risks involved.'
        }
      ];

      setSession({
        words: mockWords,
        currentIndex: 0,
        score: 0,
        totalQuestions: mockWords.length,
        answers: {},
        startTime: new Date()
      });
    } catch (error) {
      console.error('Error initializing review session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!session || !userInput.trim()) return;

    const currentWord = session.words[session.currentIndex];
    const correct = userInput.toLowerCase().trim() === currentWord.word.toLowerCase();
    
    setIsCorrect(correct);
    setShowAnswer(true);

    // Update session with answer
    setSession({
      ...session,
      answers: {
        ...session.answers,
        [currentWord.id]: correct
      },
      score: correct ? session.score + 1 : session.score
    });
  };

  const nextQuestion = () => {
    if (session && session.currentIndex < session.words.length - 1) {
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1
      });
      setShowAnswer(false);
      setUserInput('');
      setIsCorrect(null);
      setShowHint(false);
    } else {
      // Session complete
      router.push('/session-summary');
    }
  };

  const previousQuestion = () => {
    if (session && session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1
      });
      setShowAnswer(false);
      setUserInput('');
      setIsCorrect(null);
      setShowHint(false);
    }
  };

  const resetCurrentQuestion = () => {
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setShowHint(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No review session available</p>
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

  const currentWord = session.words[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.totalQuestions) * 100;
  const timeElapsed = Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000);

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
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          {/* Word Image */}
          {currentWord.image_url && (
            <div className="mb-6 text-center">
              <div className="inline-block bg-gray-100 rounded-lg p-4">
                <ImageIcon className="h-16 w-16 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Image placeholder</p>
              </div>
            </div>
          )}

          {/* Definition */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Type the word that matches this definition:
            </h2>
            <div className="bg-green-50 rounded-lg p-6">
              <p className="text-lg text-gray-800 mb-2">{currentWord.definition}</p>
              <p className="text-sm text-gray-600 italic">{currentWord.part_of_speech}</p>
            </div>
          </div>

          {/* Input Field */}
          <div className="mb-8">
            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !showAnswer && handleSubmit()}
                placeholder="Type your answer here..."
                className={`w-full p-4 text-lg text-center rounded-lg border-2 transition-colors ${
                  showAnswer
                    ? isCorrect
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-red-500 bg-red-50 text-red-800'
                    : 'border-gray-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                }`}
                disabled={showAnswer}
                autoFocus
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mb-8">
            {!showAnswer && (
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            )}
            
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {showHint ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>

            <button
              onClick={resetCurrentQuestion}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          </div>

          {/* Hint */}
          {showHint && (
            <div className="mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Hint:</h4>
                <p className="text-yellow-700">
                  {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                    <span>Synonyms: {currentWord.synonyms.join(', ')}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Answer Feedback */}
          {showAnswer && (
            <div className="mb-8">
              <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect 
                    ? 'Great job! You got it right.' 
                    : `The correct answer is "${currentWord.word}"`
                  }
                </p>
                {currentWord.example_sentence && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    Example: {currentWord.example_sentence}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={previousQuestion}
              disabled={session.currentIndex === 0}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <button
              onClick={nextQuestion}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {session.currentIndex === session.words.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>

        {/* Score Display */}
        <div className="text-center">
          <div className="inline-flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Score: {session.score}/{session.currentIndex + 1}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
