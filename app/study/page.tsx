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
  Image as ImageIcon,
  Target,
  Trophy
} from 'lucide-react';
import CelebrationAnimation from '@/components/ui/CelebrationAnimation';

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
    fromState?: string;
    toState?: string;
  }>;
}

export default function StudySession() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showImageContent, setShowImageContent] = useState(true); // true = show image, false = show definition
  const [tierUnlocked, setTierUnlocked] = useState<{ newTier: string; previousTier: string } | null>(null);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [wordStateManager] = useState(() => new WordStateManager());
  const router = useRouter();
  const supabase = createClientComponentClient();

  const getCelebrationMessage = (streak: number): string => {
    if (streak === 1) return 'Good!';
    if (streak === 2) return 'Great!';
    if (streak === 3) return 'Awesome!';
    if (streak === 4) return 'Excellent!';
    if (streak === 5) return 'Fantastic!';
    if (streak === 6) return 'Incredible!';
    if (streak === 7) return 'On Fire!';
    if (streak === 8) return 'Unstoppable!';
    if (streak >= 9) return 'CRAZY~';
    return 'Correct!';
  };

  const truncateDefinition = (definition: string, maxWords: number = 20): string => {
    const words = definition.split(' ');
    if (words.length <= maxWords) return definition;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const handleImageClick = () => {
    setShowImageContent(!showImageContent);
  };

  const closeWordModal = () => {
    setShowWordModal(false);
  };


  useEffect(() => {
    initializeStudySession();
  }, []);

  // Generate answers when current word changes
  useEffect(() => {
    const generateAnswers = async () => {
      if (session && session.words.length > 0) {
        console.log('useEffect triggered - current index:', session.currentIndex, 'word:', session.words[session.currentIndex]?.word);
        alert(`useEffect triggered - current index: ${session.currentIndex}, word: ${session.words[session.currentIndex]?.word}`);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentWord = session.words[session.currentIndex];
          const distractors = await generateDistractors(currentWord, user.id);
          const shuffledAnswers = [currentWord.word, ...distractors].sort(() => Math.random() - 0.5);
          console.log(`Final answers for "${currentWord.word}":`, shuffledAnswers);
          setCurrentAnswers(shuffledAnswers);
        }
      }
    };
    
    generateAnswers();
  }, [session?.currentIndex]);

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
          .eq('tier', 'top_25')
          .limit(25);

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
          image_url: w.image_urls?.[0] || null,
          synonyms: w.synonyms || [],
          antonyms: w.antonyms || [],
          example_sentence: w.example_sentence
        }));

        console.log(`Loaded ${studyWords.length} test words:`, studyWords.map(w => w.word));

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

      // Select up to 10 words from the active pool for the quiz
      console.log(`Found ${activePoolWords.length} words in active pool:`, activePoolWords.map(p => p.words.word));
      const selectedWords = activePoolWords.slice(0, 10); // Select up to 10 words for study session
      
      const studyWords: Word[] = selectedWords.map(p => ({
        id: p.words.id,
        word: p.words.word,
        definition: p.words.definition,
        part_of_speech: p.words.part_of_speech,
        tier: p.words.tier,
        difficulty: p.words.difficulty,
          image_url: p.words.image_urls?.[0] || null,
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
      console.log('Study session initialized with', studyWords.length, 'words');
      alert(`Study session initialized with ${studyWords.length} words`);
    } catch (error) {
      console.error('Error initializing study session:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDistractors = async (currentWord: Word, userId: string): Promise<string[]> => {
    console.log(`Generating distractors for "${currentWord.word}" (tier: ${currentWord.tier})`);
    
    // Get all words from the same tier from database
    const { data: tierWords, error } = await supabase
      .from('words')
      .select('word')
      .eq('tier', currentWord.tier)
      .limit(50); // Get up to 50 words from the same tier
    
    if (error || !tierWords) {
      console.error('Error fetching tier words:', error);
      return ['Option A', 'Option B', 'Option C']; // Fallback
    }
    
    // Filter out the current word and get word strings
    const availableWords = tierWords
      .map(w => w.word)
      .filter(word => word !== currentWord.word);
    
    console.log(`Found ${availableWords.length} words in tier ${currentWord.tier}:`, availableWords);
    
    // Randomly select 3 distractors
    const distractors = availableWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    console.log(`Selected ${distractors.length} distractors:`, distractors);
    return distractors;
  };

  const handleAnswerSelect = async (answer: string) => {
    if (showAnswer || !session || isProcessingAnswer) return;
    
    setIsProcessingAnswer(true);
    setSelectedAnswer(answer);
    const currentWord = session.words[session.currentIndex];
    const correct = answer === currentWord.word;
    setIsCorrect(correct);
    setShowAnswer(true);

    // Update streak and set auto-advance for wrong answers
    if (correct && !celebrationTriggered) {
      const newStreak = streak + 1;
      const message = getCelebrationMessage(newStreak);
      console.log(`Setting celebration: streak=${newStreak}, message="${message}"`);
      setStreak(newStreak);
      setCelebrationMessage(message);
      setShowCelebration(true);
      setCelebrationTriggered(true);
    } else if (!correct) {
      setStreak(0);
      setCelebrationTriggered(false);
      setShowWrongAnimation(true);
      // Auto-advance wrong answers after animation
    }

    // Create detailed word result
    const wordResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      definition: currentWord.definition,
      tier: currentWord.tier,
      correct: correct,
      selectedAnswer: answer,
      correctAnswer: currentWord.word
    };

    // Handle word state transition first
    const { data: { user } } = await supabase.auth.getUser();
    let transition = null;
    if (user) {
      transition = await wordStateManager.handleStudyAnswer(
        user.id,
        currentWord.id,
        correct
      );

      if (transition) {
        console.log('Word state transition:', transition);
        
        // Check for tier unlock
        if (transition.tierUnlocked) {
          console.log('Tier unlocked!', transition.tierUnlocked);
          setTierUnlocked(transition.tierUnlocked);
        }
      }
    }

    // Update word result with transition data if available
    const finalWordResult = {
      ...wordResult,
      fromState: transition?.fromState,
      toState: transition?.toState
    };

    // Single session update with all data - check for existing results to prevent duplicates
    if (session) {
      // Check if we already have a result for this word
      const existingResultIndex = session.wordResults.findIndex(result => result.wordId === currentWord.id);
      let updatedWordResults;
      let scoreAdjustment = 0;
      
      if (existingResultIndex >= 0) {
        // Replace existing result
        const existingResult = session.wordResults[existingResultIndex];
        updatedWordResults = [...session.wordResults];
        updatedWordResults[existingResultIndex] = finalWordResult;
        
        // Adjust score based on the change from existing to new result
        if (correct && !existingResult.correct) {
          scoreAdjustment = 1; // Was wrong, now correct
        } else if (!correct && existingResult.correct) {
          scoreAdjustment = -1; // Was correct, now wrong
        } // else no change needed
        
      } else {
        // Add new result
        updatedWordResults = [...session.wordResults, finalWordResult];
        scoreAdjustment = correct ? 1 : 0;
      }

      const newScore = session.score + scoreAdjustment;
      
      console.log('Study session - Answer submitted:', {
        word: currentWord.word,
        correct: correct,
        selectedAnswer: answer,
        scoreAdjustment: scoreAdjustment,
        newScore: newScore,
        wordResultsLength: updatedWordResults.length,
        finalWordResult: finalWordResult
      });
      
      setSession({
        ...session,
        answers: {
          ...session.answers,
          [currentWord.id]: correct
        },
        score: newScore,
        wordResults: updatedWordResults,
        promotedWords: (transition?.toState === 'ready' && transition?.fromState === 'started') 
          ? [...session.promotedWords, currentWord.id]
          : session.promotedWords
      });
    }

    // Reset processing flag
    setIsProcessingAnswer(false);
    // Celebration animation is already triggered in handleAnswerSelect above
  };

  const handleCelebrationComplete = () => {
    console.log('Celebration complete - current index:', session?.currentIndex, 'total questions:', session?.words.length);
    alert(`Celebration complete - current index: ${session?.currentIndex}, total questions: ${session?.words.length}`);
    setShowCelebration(false);
    setCelebrationTriggered(false);
    // Auto-advance to next question after celebration for correct answers
    if (session && session.currentIndex < session.words.length - 1) {
      console.log('Advancing to next question from index', session.currentIndex);
      alert(`Advancing to next question from index ${session.currentIndex}`);
      nextQuestion(false); // false = not skipped (this was a correct answer)
    } else {
      console.log('Finishing session - last question');
      alert('Finishing session - last question');
      // If it's the last question, finish the session
      finishSession();
    }
  };

  const handleWrongAnimationComplete = () => {
    setShowWrongAnimation(false);
    // Auto-advance to next question after wrong animation
    if (session && session.currentIndex < session.words.length - 1) {
      nextQuestion(false); // false = not skipped (this was a wrong answer)
    } else {
      // If it's the last question, finish the session
      finishSession();
    }
  };

  const finishSession = async () => {
    if (!session) return;
    
    // Update word states for all words in the session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      for (const result of session.wordResults) {
        if (!result.correct) {
          // For skipped/incorrect words, ensure they stay in 'started' state
          // so they can be studied again
          await wordStateManager.markWordAsStarted(user.id, result.wordId);
        }
      }
    }
    
    // Session complete - pass session data to summary
    console.log('Session being finished:', {
      totalQuestions: session.totalQuestions,
      score: session.score,
      wordResultsCount: session.wordResults.length,
      wordResults: session.wordResults.map(r => ({ word: r.word, correct: r.correct, wordId: r.wordId }))
    });

    // Deduplicate word results before sending to summary - keep the best entry for each word
    const uniqueResults = new Map();
    session.wordResults.forEach(result => {
      // Use word text as the primary key since wordId might be inconsistent
      const wordKey = result.word;
      if (!uniqueResults.has(wordKey)) {
        uniqueResults.set(wordKey, result);
      } else {
        const existing = uniqueResults.get(wordKey);
        // Priority: 1) Results with state transition data, 2) Correct answers over incorrect ones
        const hasTransition = result.fromState && result.toState;
        const existingHasTransition = existing.fromState && existing.toState;
        
        if (!existingHasTransition && hasTransition) {
          // Replace with entry that has transition data
          uniqueResults.set(wordKey, result);
        } else if (existingHasTransition === hasTransition && result.correct && !existing.correct) {
          // If both have same transition status, prefer correct answer
          uniqueResults.set(wordKey, result);
        }
        // Otherwise keep existing entry
      }
    });
    
    const deduplicatedResults = Array.from(uniqueResults.values());
    const actualScore = deduplicatedResults.filter(r => r.correct).length;
    const actualTotalQuestions = deduplicatedResults.length;
    
    console.log('After deduplication:', {
      originalCount: session.wordResults.length,
      deduplicatedCount: deduplicatedResults.length,
      originalScore: session.score,
      actualScore: actualScore,
      actualTotalQuestions: actualTotalQuestions,
      originalWords: session.wordResults.map(r => r.word),
      deduplicatedWords: deduplicatedResults.map(r => r.word)
    });
    

    const sessionData = {
      session_type: 'study',
      words_studied: actualTotalQuestions,
      correct_answers: actualScore,
      words_promoted: session.promotedWords.length,
      words_mastered: 0,
      started_at: session.startTime?.toISOString() || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      wordResults: deduplicatedResults.map(result => ({
        word: result.word,
        definition: result.definition,
        correct: result.correct,
        userInput: result.selectedAnswer,
        correctAnswer: result.correctAnswer,
        tier: result.tier,
        fromState: result.fromState,
        toState: result.toState,
        wordId: result.wordId
      }))
    };
    
    console.log('Study session - Session data being passed to summary:', sessionData);
    console.log('Study session - Word results breakdown:', {
      totalResults: sessionData.wordResults.length,
      correctResults: sessionData.wordResults.filter(r => r.correct).length,
      incorrectResults: sessionData.wordResults.filter(r => !r.correct && r.userInput !== 'SKIPPED').length,
      skippedResults: sessionData.wordResults.filter(r => r.userInput === 'SKIPPED').length,
      allResults: sessionData.wordResults.map(r => ({
        word: r.word,
        correct: r.correct,
        userInput: r.userInput,
        selectedAnswer: r.userInput
      }))
    });
    const encodedData = encodeURIComponent(JSON.stringify(sessionData));
    router.push(`/study-summary?data=${encodedData}`);
  };

  const nextQuestion = async (isSkipped = true) => {
    console.log('nextQuestion called - current index:', session?.currentIndex, 'isSkipped:', isSkipped);
    alert(`nextQuestion called - current index: ${session?.currentIndex}, isSkipped: ${isSkipped}`);
    if (session && session.currentIndex < session.words.length - 1) {
      const currentWord = session.words[session.currentIndex];
      
      // Only add word result if the question was actually skipped (no answer was already recorded)
      if (isSkipped && !showAnswer) {
        // Handle word state transition for skipped questions (treat as wrong answer)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const transition = await wordStateManager.handleStudyAnswer(
            user.id,
            currentWord.id,
            false // Skipped = wrong answer
          );
          
          if (transition) {
            console.log('Skip treated as wrong answer - Word state transition:', transition);
          }
        }
        
        // Update session with skipped answer
        const updatedSession = {
          ...session,
          answers: {
            ...session.answers,
            [currentWord.id]: false
          },
          score: session.score, // No points for skipped questions
          wordResults: [
            ...session.wordResults,
            {
              wordId: currentWord.id,
              word: currentWord.word,
              definition: currentWord.definition,
              tier: currentWord.tier,
              correct: false,
              selectedAnswer: 'SKIPPED',
              correctAnswer: currentWord.word
            }
          ]
        };
        
        setSession({
          ...updatedSession,
          currentIndex: session.currentIndex + 1
        });
        console.log('Session updated - new index:', session.currentIndex + 1);
        alert(`Session updated - new index: ${session.currentIndex + 1}`);
      } else {
        // Just advance to next question (answer was already processed by handleAnswerSelect)
        console.log('Advancing to next question - old index:', session.currentIndex, 'new index:', session.currentIndex + 1);
        alert(`Advancing to next question - old index: ${session.currentIndex}, new index: ${session.currentIndex + 1}`);
        setSession({
          ...session,
          currentIndex: session.currentIndex + 1
        });
      }
      
      setShowAnswer(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setIsProcessingAnswer(false);
      setShowImageContent(true); // Reset to show image for new question
      setCurrentAnswers([]); // Force regeneration of answers
      // Force a small delay to ensure DOM updates
      setTimeout(() => {
        setCurrentAnswers([]);
      }, 50);
    } else {
      finishSession();
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
      setIsProcessingAnswer(false);
      setShowImageContent(true); // Reset to show image for previous question
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back to Dashboard Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
            
            {/* Progress Counter */}
            <div className="text-sm font-medium text-gray-700">
              {session.currentIndex + 1}/{session.totalQuestions}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4 sm:mb-8">

          {/* Word Image/Definition Toggle */}
          {currentWord.image_url && (
            <div className="mb-4 sm:mb-6 text-center">
              <div className="relative overflow-hidden rounded-lg">
                {/* Clickable Container */}
                <div 
                  className="inline-block bg-gray-100 rounded-lg p-2 sm:p-4 cursor-pointer hover:bg-gray-200 transition-colors duration-200 select-none"
                  onClick={handleImageClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleImageClick();
                    }
                  }}
                  aria-label={`Click to ${showImageContent ? 'see definition for' : 'see image for'} ${currentWord.word}`}
                >
                  {showImageContent ? (
                    /* Image View */
                    <div className="relative">
                      <img 
                        src={currentWord.image_url} 
                        alt={`Visual representation of ${currentWord.word}. Click to see definition.`}
                        className="w-full aspect-[4/3] sm:h-96 sm:w-[40rem] sm:aspect-auto object-cover rounded-lg mx-auto hover:opacity-90 transition-opacity duration-200"
                        onError={(e) => {
                          console.error('Image failed to load:', currentWord.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', currentWord.image_url);
                        }}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                      {/* Hint Indicator */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Tap for hint
                      </div>
                    </div>
                  ) : (
                    /* Definition View */
                    <div className="w-full aspect-[4/3] sm:h-96 sm:w-[40rem] sm:aspect-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg mx-auto flex flex-col justify-center text-white p-4 sm:p-6 hover:opacity-90 transition-opacity duration-200">
                      <div className="text-center w-full">
                        <div className="text-base sm:text-lg leading-relaxed">
                          <p className="break-words">{currentWord.definition}</p>
                        </div>
                      </div>
                      <div className="mt-4 text-xs sm:text-sm opacity-75 text-center">
                        Tap to see image
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Answer Options */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4 sm:mb-8">
            {currentAnswers.map((answer, index) => {
              let buttonClass = "w-full p-3 sm:p-4 text-left rounded-lg border-2 transition-all duration-200 btn-mobile-reset ";
              
              if (showAnswer) {
                if (answer === currentWord.word) {
                  buttonClass += "border-green-500 bg-gradient-to-r from-green-50 to-green-100 text-green-800 shadow-lg";
                } else if (answer === selectedAnswer) {
                  buttonClass += "border-red-500 bg-gradient-to-r from-red-50 to-red-100 text-red-800 shadow-lg";
                } else {
                  buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                }
              } else {
                buttonClass += "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 active:scale-95";
              }

              return (
                <button
                  key={`${session.currentIndex}-${index}-${answer}`}
                  onClick={() => handleAnswerSelect(answer)}
                  className={buttonClass}
                  disabled={showAnswer || isProcessingAnswer}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm sm:text-base">{answer}</span>
                    {showAnswer && answer === currentWord.word && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 flex-shrink-0 animate-pulse" />
                      </div>
                    )}
                    {showAnswer && answer === selectedAnswer && answer !== currentWord.word && (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>


          {/* Navigation - No manual navigation needed, auto-advance handles both correct and wrong answers */}
        </div>

      </main>

      {/* Celebration Animation */}
      <CelebrationAnimation 
        isVisible={showCelebration}
        onComplete={handleCelebrationComplete}
        type="duolingo"
      />

      {/* Wrong Answer Animation */}
      <CelebrationAnimation 
        isVisible={showWrongAnimation}
        onComplete={handleWrongAnimationComplete}
        type="wrong"
      />

      {/* Tier Unlocked Modal */}
      {tierUnlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">New Tier Unlocked!</h2>
              <p className="text-gray-600">
                Congratulations! You've mastered all words in <span className="font-semibold">{tierUnlocked.previousTier}</span> and unlocked <span className="font-semibold text-blue-600">{tierUnlocked.newTier}</span>!
              </p>
            </div>
            <button
              onClick={() => setTierUnlocked(null)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue Studying
            </button>
          </div>
        </div>
      )}

      {/* Word Details Modal */}
      {showWordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{currentWord.word}</h3>
                <button
                  onClick={closeWordModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <XCircle className="h-8 w-8" />
                </button>
              </div>

              {/* Word Image */}
              {currentWord.image_url && (
                <div className="mb-6 text-center">
                  <img 
                    src={currentWord.image_url} 
                    alt={`Visual representation of ${currentWord.word}`}
                    className="h-48 w-[20rem] sm:h-56 sm:w-[24rem] object-cover rounded-lg mx-auto"
                  />
                </div>
              )}

              {/* Word Details */}
              <div className="space-y-4">
                {/* Part of Speech */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Part of Speech</h4>
                  <p className="text-lg text-gray-800">{currentWord.part_of_speech}</p>
                </div>

                {/* Definition */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Definition</h4>
                  <p className="text-lg text-gray-800">{currentWord.definition}</p>
                </div>

                {/* Example Sentence */}
                {currentWord.example_sentence && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Example</h4>
                    <p className="text-lg text-gray-800 italic">&ldquo;{currentWord.example_sentence}&rdquo;</p>
                  </div>
                )}

                {/* Synonyms */}
                {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Synonyms</h4>
                    <p className="text-lg text-gray-800">{currentWord.synonyms.join(', ')}</p>
                  </div>
                )}

                {/* Antonyms */}
                {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Antonyms</h4>
                    <p className="text-lg text-gray-800">{currentWord.antonyms.join(', ')}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={closeWordModal}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
