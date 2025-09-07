'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
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
  wordResults: Array<{
    wordId: string;
    word: string;
    definition: string;
    tier: string;
    correct: boolean;
    userInput: string;
    correctAnswer: string;
    fromState?: string;
    toState?: string;
  }>;
}

export default function ReviewSession() {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    initializeReviewSession();
  }, []);

  const initializeReviewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // For testing purposes, use the test user ID
        const testUserId = '11111111-1111-1111-1111-111111111111';
        
        const reviewWords = await wordStateManager.getWordsDueForReview(testUserId);

        if (!reviewWords || reviewWords.length === 0) {
          setSession(null);
          return;
        }

        const reviewWordsData: Word[] = reviewWords.map(p => ({
          id: p.words.id,
          word: p.words.word,
          definition: p.words.definition,
          part_of_speech: p.words.part_of_speech,
          tier: p.words.tier,
          difficulty: p.words.difficulty,
          image_url: p.words.image_urls?.[0] || '/api/placeholder/400/300',
          synonyms: p.words.synonyms || [],
          antonyms: p.words.antonyms || [],
          example_sentence: p.words.example_sentence
        }));

        setSession({
          words: reviewWordsData,
          currentIndex: 0,
          score: 0,
          totalQuestions: reviewWordsData.length,
          answers: {},
          startTime: new Date(),
          wordResults: []
        });
        return;
      }

      // Get words due for review using word state manager
      const reviewWords = await wordStateManager.getWordsDueForReview(user.id);

      if (!reviewWords || reviewWords.length === 0) {
        // No words due for review, show message instead of redirecting
        setSession(null);
        return;
      }

      const reviewWordsData: Word[] = reviewWords.map(p => ({
        id: p.words.id,
        word: p.words.word,
        definition: p.words.definition,
        part_of_speech: p.words.part_of_speech,
        tier: p.words.tier,
        difficulty: p.words.difficulty,
        image_url: p.words.image_urls?.[0] || '/api/placeholder/400/300',
        synonyms: p.words.synonyms || [],
        antonyms: p.words.antonyms || [],
        example_sentence: p.words.example_sentence
      }));

      setSession({
        words: reviewWordsData,
        currentIndex: 0,
        score: 0,
        totalQuestions: reviewWordsData.length,
        answers: {},
        startTime: new Date(),
        wordResults: []
      });
    } catch (error) {
      console.error('Error initializing review session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session || !userInput.trim()) return;

    const currentWord = session.words[session.currentIndex];
    const correct = userInput.toLowerCase().trim() === currentWord.word.toLowerCase();
    
    setIsCorrect(correct);
    setShowAnswer(true);

    // Create detailed word result
    const wordResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      definition: currentWord.definition,
      tier: currentWord.tier,
      correct: correct,
      userInput: userInput.trim(),
      correctAnswer: currentWord.word
    };

    // Update session with answer
    setSession({
      ...session,
      answers: {
        ...session.answers,
        [currentWord.id]: correct
      },
      score: correct ? session.score + 1 : session.score,
      wordResults: [...session.wordResults, wordResult]
    });

    // Handle word state transition
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const transition = await wordStateManager.handleReviewAnswer(
        user.id,
        currentWord.id,
        correct
      );

      if (transition) {
        console.log('Word state transition:', transition);
        
        // Update the word result with transition information
        const updatedWordResult = {
          ...wordResult,
          fromState: transition.fromState,
          toState: transition.toState,
          tier: currentWord.tier
        };
        
        // Update session with transition information
        setSession(prevSession => ({
          ...prevSession,
          wordResults: [...prevSession.wordResults.slice(0, -1), updatedWordResult]
        }));
        
        // Show transition feedback and handle pool refilling
        if (transition.toState === 'mastered') {
          console.log(`🎉 "${currentWord.word}" is now mastered!`);
          // Refill active pool if needed
          await wordStateManager.handleWordMastery(user.id);
        }
      }
    } else {
      // For demo purposes, use test user ID
      const testUserId = '11111111-1111-1111-1111-111111111111';
      const transition = await wordStateManager.handleReviewAnswer(
        testUserId,
        currentWord.id,
        correct
      );

      if (transition) {
        console.log('Word state transition:', transition);
        
        // Update the word result with transition information
        const updatedWordResult = {
          ...wordResult,
          fromState: transition.fromState,
          toState: transition.toState,
          tier: currentWord.tier
        };
        
        // Update session with transition information
        setSession(prevSession => ({
          ...prevSession,
          wordResults: [...prevSession.wordResults.slice(0, -1), updatedWordResult]
        }));
        
        // Show transition feedback and handle pool refilling
        if (transition.toState === 'mastered') {
          console.log(`🎉 "${currentWord.word}" is now mastered!`);
          // Refill active pool if needed
          await wordStateManager.handleWordMastery(testUserId);
        }
      }
    }
  };

  const nextQuestion = () => {
    if (session && session.currentIndex < session.words.length - 1) {
      // Mark current question as incorrect (skipped)
      const currentWord = session.words[session.currentIndex];
      const isCorrect = false;
      
      // Update session with incorrect answer
      const updatedSession = {
        ...session,
        score: session.score + (isCorrect ? 1 : 0),
        wordResults: [
          ...session.wordResults,
          {
            wordId: currentWord.id,
            word: currentWord.word,
            definition: currentWord.definition,
            correct: isCorrect,
            userInput: '', // No answer provided
            correctAnswer: currentWord.word
          }
        ]
      };
      
      setSession({
        ...updatedSession,
        currentIndex: session.currentIndex + 1
      });
      setShowAnswer(false);
      setUserInput('');
      setIsCorrect(null);
      setShowHint(false);
    } else {
      // Session complete - pass session data to summary
      const sessionData = {
        session_type: 'review',
        words_studied: session.totalQuestions,
        correct_answers: session.score,
        words_promoted: 0, // Words don't promote in review, they master
        words_mastered: session.score, // All correct answers become mastered
        started_at: session.startTime.toISOString(),
        completed_at: new Date().toISOString(),
        wordResults: session.wordResults.map(result => ({
          word: result.word,
          definition: result.definition,
          correct: result.correct,
          userInput: result.userInput,
          correctAnswer: result.correctAnswer,
          tier: result.tier || session.words.find(w => w.word === result.word)?.tier || 'Unknown',
          fromState: result.fromState,
          toState: result.toState
        }))
      };
      
      const encodedData = encodeURIComponent(JSON.stringify(sessionData));
      router.push(`/session-summary?data=${encodedData}`);
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
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Words Due for Review</h2>
            <p className="text-gray-600 mb-6">
              You don't have any words ready for review right now. Complete some study sessions to add words to your review queue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/study')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Study Session
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
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
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-700">Length:</span>
                    <span className="font-bold text-yellow-800">{currentWord.word.length} letters</span>
                  </div>
                  <div className="w-px h-4 bg-yellow-300"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-700">Starts with:</span>
                    <span className="font-bold text-yellow-800">{currentWord.word[0].toUpperCase()}</span>
                  </div>
                </div>
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
