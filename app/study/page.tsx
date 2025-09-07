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
  BookOpen,
  Image as ImageIcon
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

interface StudySession {
  words: Word[];
  currentIndex: number;
  score: number;
  totalQuestions: number;
  answers: { [key: string]: boolean };
  promotedWords: string[]; // Track word IDs that were promoted
  startTime: Date;
  wordResults: Array<{
    wordId: string;
    word: string;
    definition: string;
    tier: string;
    correct: boolean;
    selectedAnswer: string;
    correctAnswer: string;
  }>;
}

export default function StudySession() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    initializeStudySession();
  }, []);

  // Generate answers when current word changes
  useEffect(() => {
    if (session && session.words.length > 0) {
      const currentWord = session.words[session.currentIndex];
      const distractors = generateDistractors(currentWord, session.words);
      const shuffledAnswers = [currentWord.word, ...distractors].sort(() => Math.random() - 0.5);
      setCurrentAnswers(shuffledAnswers);
    }
  }, [session?.currentIndex, session?.words]);

  const initializeStudySession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get active pool words using word state manager
      const activePoolWords = await wordStateManager.getActivePoolWords(user.id);

      if (!activePoolWords || activePoolWords.length === 0) {
        // No words in active pool - for testing, use some words from database
        console.log('No words in active pool, loading test words...');
        
        const { data: testWords, error: testError } = await supabase
          .from('words')
          .select('*')
          .eq('tier', 'Top 25')
          .limit(5);

        if (testError || !testWords || testWords.length === 0) {
          router.push('/words');
          return;
        }

        const studyWords: Word[] = testWords.map(w => ({
          id: w.id,
          word: w.word,
          definition: w.definition,
          part_of_speech: w.part_of_speech,
          tier: w.tier,
          difficulty: w.difficulty,
          image_url: w.image_urls?.[0] || '/api/placeholder/400/300',
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          example_sentence: w.example_sentence
        }));

        setSession({
          words: studyWords,
          currentIndex: 0,
          score: 0,
          totalQuestions: studyWords.length,
          answers: {},
          promotedWords: [],
          startTime: new Date(),
          wordResults: []
        });
        return;
      }

      const studyWords: Word[] = activePoolWords.map(p => ({
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
        words: studyWords,
        currentIndex: 0,
        score: 0,
        totalQuestions: studyWords.length,
        answers: {},
        promotedWords: [],
        startTime: new Date(),
        wordResults: []
      });
    } catch (error) {
      console.error('Error initializing study session:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDistractors = (currentWord: Word, allWords: Word[]): string[] => {
    const distractors = allWords
      .filter(w => w.id !== currentWord.id && w.tier === currentWord.tier)
      .map(w => w.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    return distractors;
  };

  const handleAnswerSelect = async (answer: string) => {
    if (showAnswer || !session) return;
    
    setSelectedAnswer(answer);
    const currentWord = session.words[session.currentIndex];
    const correct = answer === currentWord.word;
    setIsCorrect(correct);
    setShowAnswer(true);

    // Create detailed word result
    const wordResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      definition: currentWord.definition,
      correct: correct,
      userInput: answer,
      correctAnswer: currentWord.word
    };

    // Update session state
    if (session) {
      setSession({
        ...session,
        answers: {
          ...session.answers,
          [currentWord.id]: correct
        },
        score: correct ? session.score + 1 : session.score,
        wordResults: [...session.wordResults, wordResult]
      });
    }

    // Handle word state transition
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const transition = await wordStateManager.handleStudyAnswer(
        user.id,
        currentWord.id,
        correct
      );

      if (transition) {
        console.log('Word state transition:', transition);
        
        // Track promoted words
        if (transition.toState === 'ready' && transition.fromState === 'started') {
          console.log(`🎉 "${currentWord.word}" is now ready for review!`);
          
          // Add to promoted words list
          setSession(prevSession => {
            if (!prevSession) return prevSession;
            return {
              ...prevSession,
              promotedWords: [...prevSession.promotedWords, currentWord.id]
            };
          });
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
        answers: {
          ...session.answers,
          [currentWord.id]: isCorrect
        },
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
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCurrentAnswers([]); // Reset answers to trigger regeneration
    } else {
      // Session complete - pass session data to summary
      const sessionData = {
        session_type: 'study',
        words_studied: session.totalQuestions,
        correct_answers: session.score,
        words_promoted: session.promotedWords.length,
        words_mastered: 0,
        started_at: session.startTime?.toISOString() || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        wordResults: session.wordResults.map(result => ({
          word: result.word,
          definition: result.definition,
          correct: result.correct,
          userInput: result.userInput,
          correctAnswer: result.correctAnswer,
          tier: session.words.find(w => w.word === result.word)?.tier || 'Unknown'
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
      setSelectedAnswer(null);
      setIsCorrect(null);
      setCurrentAnswers([]); // Reset answers to trigger regeneration
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading study session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No study session available</p>
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
            <div className="text-sm text-gray-500">
              Question {session.currentIndex + 1} of {session.totalQuestions}
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
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              What word matches this definition?
            </h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-lg text-gray-800 mb-2">{currentWord.definition}</p>
              <p className="text-sm text-gray-600 italic">{currentWord.part_of_speech}</p>
            </div>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentAnswers.map((answer, index) => {
              let buttonClass = "w-full p-4 text-left rounded-lg border-2 transition-colors ";
              
              if (showAnswer) {
                if (answer === currentWord.word) {
                  buttonClass += "border-green-500 bg-green-50 text-green-800";
                } else if (answer === selectedAnswer) {
                  buttonClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                }
              } else {
                buttonClass += "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(answer)}
                  className={buttonClass}
                  disabled={showAnswer}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{answer}</span>
                    {showAnswer && answer === currentWord.word && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showAnswer && answer === selectedAnswer && answer !== currentWord.word && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

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
                  The correct answer is <strong>{currentWord.word}</strong>
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
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {session.currentIndex === session.words.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>

        {/* Score Display */}
        <div className="text-center">
          <div className="inline-flex items-center bg-white rounded-lg px-6 py-3 shadow-sm">
            <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              Score: {session.score}/{session.currentIndex + 1}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
