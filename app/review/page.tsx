'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { WordStateManager } from '@/lib/word-state-manager';
import { guestModeManager } from '@/lib/guest-mode-manager';
import GuestModeBanner from '@/components/ui/GuestModeBanner';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle,
  Clock,
  Image as ImageIcon
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
  wordStreaks: { [key: string]: number }; // Track review streaks for each word
}

export default function ReviewSession() {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [letterInputs, setLetterInputs] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWrongAnimation, setShowWrongAnimation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
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

  const handleLetterInput = (index: number, letter: string) => {
    if (showAnswer) return;
    
    const currentWord = session?.words[session.currentIndex];
    const wordLength = currentWord?.word.length || 0;
    const currentStreak = currentWord?.id ? (session?.wordStreaks[currentWord.id] || 0) : 0;
    
    // Don't allow editing first and last letters only when streak = 0 (hints shown)
    if (currentStreak === 0 && (index === 0 || index === wordLength - 1)) {
      return;
    }
    
    const newLetterInputs = [...letterInputs];
    newLetterInputs[index] = letter.toUpperCase();
    setLetterInputs(newLetterInputs);
    
    // Update userInput for submission
    const currentInput = newLetterInputs.join('');
    setUserInput(currentInput);
    
    // Auto-focus next input (skip if it's the last letter)
    if (letter && index < wordLength - 2) {
      const nextInput = document.getElementById(`letter-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (showAnswer) return;
    
    const currentWord = session?.words[session.currentIndex];
    const wordLength = currentWord?.word.length || 0;
    const currentStreak = currentWord?.id ? (session?.wordStreaks[currentWord.id] || 0) : 0;
    
    // Don't allow editing first and last letters only when streak = 0 (hints shown)
    if (currentStreak === 0 && (index === 0 || index === wordLength - 1)) {
      return;
    }
    
    if (e.key === 'Backspace' && !letterInputs[index] && index > (currentStreak === 0 ? 1 : 0)) {
      // Move to previous input if current is empty
      const prevInput = document.getElementById(`letter-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    } else if (e.key === 'Enter') {
      // Submit if all letters are filled
      if (letterInputs.every(letter => letter !== '')) {
        handleSubmit();
      }
    }
  };

  useEffect(() => {
    initializeReviewSession();
  }, []);

  // Initialize letter inputs when current word changes - Updated for streak-based hints
  useEffect(() => {
    if (session && session.words.length > 0) {
      const currentWord = session.words[session.currentIndex];
      const wordLength = currentWord.word.length;
      const letters = new Array(wordLength).fill('');
      
      // Get current streak for this word
      const currentStreak = session.wordStreaks[currentWord.id] || 0;
      
      // Show first and last letters only when streak = 0 (first attempt)
      if (wordLength > 0 && currentStreak === 0) {
        letters[0] = currentWord.word[0].toUpperCase();
        letters[wordLength - 1] = currentWord.word[wordLength - 1].toUpperCase();
      }
      
      setLetterInputs(letters);
      setUserInput(letters.join(''));
    }
  }, [session?.currentIndex, session?.words, session?.wordStreaks]);

  const initializeReviewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Check for guest mode
        if (guestModeManager.isGuestMode()) {
          setIsGuest(true);
          await initializeGuestReviewSession();
          return;
        } else {
          router.push('/auth/login');
          return;
        }
      }

      // Get words due for review using word state manager
      const reviewWords = await wordStateManager.getWordsDueForReview(user.id);

      if (!reviewWords || reviewWords.length === 0) {
        // No words due for review, show message instead of redirecting
        setSession(null);
        return;
      }

      // Select 10 words from the review words for the quiz
      const selectedReviewWords = reviewWords.slice(0, 10);
      
      const reviewWordsData: Word[] = selectedReviewWords.map(p => ({
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

      // Create word streaks mapping
      const wordStreaks: { [key: string]: number } = {};
      selectedReviewWords.forEach(p => {
        wordStreaks[p.words.id] = p.review_streak || 0;
      });

      setSession({
        words: reviewWordsData,
        currentIndex: 0,
        score: 0,
        totalQuestions: reviewWordsData.length,
        answers: {},
        startTime: new Date(),
        wordResults: [],
        wordStreaks
      });
    } catch (error) {
      console.error('Error initializing review session:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeGuestReviewSession = async () => {
    try {
      // Get words due for review in guest mode
      const reviewWords = guestModeManager.getWordsDueForReview();
      
      if (!reviewWords || reviewWords.length === 0) {
        setSession(null);
        return;
      }

      // Select up to 10 words from the review words for the quiz
      const selectedReviewWords = reviewWords.slice(0, 10);

      const reviewWordsData: Word[] = selectedReviewWords.map(w => ({
        id: w.id,
        word: w.word,
        definition: w.definition,
        part_of_speech: w.part_of_speech,
        tier: w.tier,
        difficulty: w.difficulty,
        image_url: w.image_urls?.[0] || undefined,
        synonyms: w.synonyms || [],
        antonyms: w.antonyms || [],
        example_sentence: w.example_sentence
      }));

      // Create word streaks mapping from guest data
      const wordStreaks: { [key: string]: number } = {};
      const guestData = guestModeManager.getGuestData();
      selectedReviewWords.forEach(word => {
        const progress = guestData?.wordProgress[word.id];
        wordStreaks[word.id] = progress?.review_streak || 0;
      });

      setSession({
        words: reviewWordsData,
        currentIndex: 0,
        score: 0,
        totalQuestions: reviewWordsData.length,
        answers: {},
        startTime: new Date(),
        wordResults: [],
        wordStreaks
      });
      
      console.log('Guest review session initialized with', reviewWordsData.length, 'words');
    } catch (error) {
      console.error('Error initializing guest review session:', error);
      router.push('/dashboard');
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

    // Update streak
    if (correct) {
      setStreak(prev => prev + 1);
      setShowCelebration(true);
    } else {
      setStreak(0);
      setShowWrongAnimation(true);
    }

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
    const updatedSession = {
      ...session,
      answers: {
        ...session.answers,
        [currentWord.id]: correct
      },
      score: correct ? session.score + 1 : session.score,
      wordResults: [...session.wordResults, wordResult]
    };
    
    console.log('Submitted answer - updating session:', {
      word: currentWord.word,
      correct: correct,
      score: updatedSession.score,
      totalQuestions: updatedSession.totalQuestions,
      wordResultsLength: updatedSession.wordResults.length
    });
    
    setSession(updatedSession);

    // Handle word state transition
    if (isGuest) {
      // Handle guest mode word progress
      const guestData = guestModeManager.getGuestData();
      if (guestData && guestData.wordProgress[currentWord.id]) {
        const progress = guestData.wordProgress[currentWord.id];
        
        if (correct) {
          progress.review_streak += 1;
          if (progress.review_streak >= 3) {
            progress.state = 'mastered';
            progress.review_streak = 0;
            
            // Update session with transition information
            const updatedWordResult = {
              ...wordResult,
              fromState: 'ready',
              toState: 'mastered',
              tier: currentWord.tier
            };
            
            setSession(prevSession => {
              if (!prevSession) return prevSession;
              return {
                ...prevSession,
                wordResults: [...prevSession.wordResults.slice(0, -1), updatedWordResult],
                wordStreaks: {
                  ...prevSession.wordStreaks,
                  [currentWord.id]: 0
                }
              };
            });
            
            console.log(`🎉 "${currentWord.word}" is now mastered!`);
          } else {
            // Update streak in session
            setSession(prevSession => {
              if (!prevSession) return prevSession;
              return {
                ...prevSession,
                wordStreaks: {
                  ...prevSession.wordStreaks,
                  [currentWord.id]: progress.review_streak
                }
              };
            });
          }
        } else {
          progress.review_streak = 0;
          setSession(prevSession => {
            if (!prevSession) return prevSession;
            return {
              ...prevSession,
              wordStreaks: {
                ...prevSession.wordStreaks,
                [currentWord.id]: 0
              }
            };
          });
        }
        
        guestModeManager.updateWordProgress(currentWord.id, progress);
      }
    } else {
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
          
          // Update session with transition information and word streaks
          setSession(prevSession => {
            if (!prevSession) return prevSession;
            return {
              ...prevSession,
              wordResults: [...prevSession.wordResults.slice(0, -1), updatedWordResult],
              wordStreaks: {
                ...prevSession.wordStreaks,
                [currentWord.id]: transition.streak
              }
            };
          });
          
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
          
          // Update session with transition information and word streaks
          setSession(prevSession => {
            if (!prevSession) return prevSession;
            return {
              ...prevSession,
              wordResults: [...prevSession.wordResults.slice(0, -1), updatedWordResult],
              wordStreaks: {
                ...prevSession.wordStreaks,
                [currentWord.id]: transition.streak
              }
            };
          });
          
          // Show transition feedback and handle pool refilling
          if (transition.toState === 'mastered') {
            console.log(`🎉 "${currentWord.word}" is now mastered!`);
            // Refill active pool if needed
            await wordStateManager.handleWordMastery(testUserId);
          }
        }
      }
    }

  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    // Auto-advance to next question after celebration for correct answers
    if (session && session.currentIndex < session.words.length - 1) {
      nextQuestion(false); // false = not skipped, answer was correct
    } else {
      // If it's the last question, finish the session
      finishSession();
    }
  };

  const handleWrongAnimationComplete = () => {
    setShowWrongAnimation(false);
    // Auto-advance to next question after wrong animation
    if (session && session.currentIndex < session.words.length - 1) {
      nextQuestion(false); // false = not skipped, answer was submitted
    } else {
      // If it's the last question, finish the session
      finishSession();
    }
  };

  const finishSession = async () => {
    if (!session) return;
    
    if (isGuest) {
      // Handle guest mode session completion
      const actualTotalQuestions = session.wordResults.length;
      const actualCorrectAnswers = session.wordResults.filter(r => r.correct).length;
      
      const sessionData = {
        session_type: 'review',
        words_studied: actualTotalQuestions,
        correct_answers: actualCorrectAnswers,
        words_promoted: 0,
        words_mastered: actualCorrectAnswers,
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
      
      // Add session to guest history
      guestModeManager.addSession(sessionData as any);
      
      console.log('Guest review session completed:', sessionData);
      const encodedData = encodeURIComponent(JSON.stringify(sessionData));
      router.push(`/review-summary?data=${encodedData}`);
      return;
    }
    
    // Ensure skipped/incorrect words are properly handled
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '11111111-1111-1111-1111-111111111111'; // fallback to test user
    
    if (userId) {
      for (const result of session.wordResults) {
        if (!result.correct) {
          // For skipped/incorrect words in review, they should be reset to 'started' state
          // The handleReviewAnswer already handles this, but we double-check here
          console.log(`Ensuring word "${result.word}" is properly reset after incorrect/skip in review`);
          await wordStateManager.markWordAsStarted(userId, result.wordId);
        }
      }
    }
    
    // Calculate actual counts from wordResults to ensure accuracy
    const actualTotalQuestions = session.wordResults.length;
    const actualCorrectAnswers = session.wordResults.filter(r => r.correct).length;
    
    // Session complete - pass session data to summary
    const sessionData = {
      session_type: 'review',
      words_studied: actualTotalQuestions, // Use actual count from wordResults
      correct_answers: actualCorrectAnswers, // Use actual count from wordResults
      words_promoted: 0, // Words don't promote in review, they master
      words_mastered: actualCorrectAnswers, // All correct answers become mastered
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
    
    console.log('Review session data being passed:', sessionData);
    console.log('Session debug info:', {
      sessionScore: session.score,
      sessionTotalQuestions: session.totalQuestions,
      actualTotalQuestions: actualTotalQuestions,
      actualCorrectAnswers: actualCorrectAnswers,
      wordResultsLength: session.wordResults.length,
      wordsArrayLength: session.words.length,
      wordResults: session.wordResults.map(r => ({
        word: r.word,
        correct: r.correct,
        userInput: r.userInput
      }))
    });
    
    const encodedData = encodeURIComponent(JSON.stringify(sessionData));
    router.push(`/review-summary?data=${encodedData}`);
  };

  const nextQuestion = async (isSkipped = true) => {
    if (session) {
      // Handle skipped questions (both last and non-last questions)
      if (isSkipped && !showAnswer) {
        const currentWord = session.words[session.currentIndex];
        
        // Handle word state transition for skipped questions (treat as wrong answer)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '11111111-1111-1111-1111-111111111111'; // fallback to test user
        
        const transition = await wordStateManager.handleReviewAnswer(
          userId,
          currentWord.id,
          false // Skipped = wrong answer
        );
        
        if (transition) {
          console.log('Skip treated as wrong answer in review - Word state transition:', transition);
        }
        
        // Update session with skipped answer - skipped questions count as wrong answers
        const wordResult = {
          wordId: currentWord.id,
          word: currentWord.word,
          definition: currentWord.definition,
          tier: currentWord.tier,
          correct: false, // Skipped questions are marked as incorrect
          userInput: 'SKIPPED', // Mark as skipped
          correctAnswer: currentWord.word,
          fromState: transition?.fromState,
          toState: transition?.toState
        };
        
        const updatedSession = {
          ...session,
          score: session.score, // No points for skipped questions (they count as wrong)
          wordResults: [...session.wordResults, wordResult]
        };
        
        console.log('Skipped question - updating session:', {
          word: currentWord.word,
          score: updatedSession.score,
          totalQuestions: updatedSession.totalQuestions,
          wordResultsLength: updatedSession.wordResults.length,
          isLastQuestion: session.currentIndex === session.words.length - 1
        });
        
        // Update session with skipped result
        setSession(updatedSession);
        
        // Check if this was the last question
        if (session.currentIndex === session.words.length - 1) {
          // Last question was skipped, finish the session
          finishSession();
          return;
        } else {
          // Not the last question, advance to next
          setSession({
            ...updatedSession,
            currentIndex: session.currentIndex + 1
          });
        }
      } else if (session.currentIndex < session.words.length - 1) {
        // Just advance to next question without updating session (already handled by handleSubmit)
        setSession({
          ...session,
          currentIndex: session.currentIndex + 1
        });
      } else {
        // If it's the last question and answer was submitted, finish the session
        finishSession();
        return;
      }
      
      setShowAnswer(false);
      setUserInput('');
      setLetterInputs(new Array(letterInputs.length).fill(''));
      setIsCorrect(null);
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
      setLetterInputs(new Array(letterInputs.length).fill(''));
      setIsCorrect(null);
    }
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
              You don&apos;t have any words ready for review right now. Complete some study sessions to add words to your review queue.
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
      {/* Guest Mode Banner */}
      {isGuest && (
        <GuestModeBanner 
          showConversionCTA={true}
          masteredWords={session?.wordResults.filter(r => r.correct).length || 0}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-12 sm:h-16">
            <div className="text-xs sm:text-sm text-gray-500">
              {session.currentIndex + 1}/{session.totalQuestions}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-4 sm:mb-8">
          {/* Word Image */}
          {currentWord.image_url && (
            <div className="mb-4 sm:mb-6 text-center">
              <div className="inline-block bg-gray-100 rounded-lg p-2 sm:p-4">
                <img 
                  src={currentWord.image_url} 
                  alt={`Visual representation of ${currentWord.word}`}
                  className="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-lg mx-auto"
                />
              </div>
            </div>
          )}

          {/* Definition */}
          <div className="text-center mb-4 sm:mb-8">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
              Type the word:
            </h2>
            
            {/* Streak Indicator */}
            <div className="mb-3 sm:mb-4">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1">
                <span className="text-xs sm:text-sm font-medium text-blue-700">
                  Attempt {session.wordStreaks[currentWord.id] + 1} of 2
                </span>
                {session.wordStreaks[currentWord.id] === 0 && (
                  <span className="text-xs text-blue-600">(with hints)</span>
                )}
                {session.wordStreaks[currentWord.id] === 1 && (
                  <span className="text-xs text-blue-600">(no hints)</span>
                )}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3 sm:p-6">
              <p className="text-sm sm:text-base text-gray-600 font-medium mb-2">
                {currentWord.part_of_speech}:
              </p>
              <p className="text-base sm:text-lg text-gray-800">
                {truncateDefinition(currentWord.definition)}
              </p>
            </div>
          </div>

          {/* Letter Input Boxes */}
          <div className="mb-4 sm:mb-8">
            <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
              {letterInputs.map((letter, index) => {
                const currentWord = session?.words[session.currentIndex];
                const correctLetter = currentWord?.word[index]?.toUpperCase() || '';
                const isCorrectLetter = letter === correctLetter;
                const wordLength = currentWord?.word.length || 0;
                const currentStreak = session?.wordStreaks[currentWord?.id] || 0;
                
                let boxClass = "w-8 h-8 sm:w-10 sm:h-10 text-center text-base sm:text-lg font-bold rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ";
                
                if (showAnswer) {
                  if (isCorrectLetter) {
                    boxClass += "border-green-500 bg-green-50 text-green-800";
                  } else if (letter) {
                    boxClass += "border-red-500 bg-red-50 text-red-800";
                  } else {
                    boxClass += "border-gray-300 bg-gray-100 text-gray-500";
                  }
                } else {
                  boxClass += "border-gray-200 bg-white hover:border-blue-300 focus:border-blue-500";
                }
                
                // Determine if this input should be disabled
                const isHintLetter = currentStreak === 0 && (index === 0 || index === wordLength - 1);
                
                return (
                  <input
                    key={index}
                    id={`letter-${index}`}
                    type="text"
                    value={letter}
                    onChange={(e) => handleLetterInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={1}
                    className={boxClass}
                    disabled={showAnswer || isHintLetter}
                    autoFocus={index === (currentStreak === 0 ? 1 : 0)}
                  />
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-4 sm:mb-8">
            {!showAnswer && (
              <button
                onClick={handleSubmit}
                disabled={!letterInputs.every(letter => letter !== '')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base"
              >
                Submit Answer
              </button>
            )}
          </div>



          {/* Navigation - Simplified for mobile */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            {showAnswer && !isCorrect && (
              <button
                onClick={() => nextQuestion(false)} // Continue after wrong answer
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm sm:text-base flex items-center justify-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
            
            {!showAnswer && (
              <button
                onClick={() => nextQuestion(true)} // Skip question
                className="w-full sm:w-auto px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-sm sm:text-base flex items-center justify-center"
                title="Skip this question (counts as wrong answer and resets word to started state)"
              >
                {session.currentIndex === session.words.length - 1 ? 'Finish' : 'Skip'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-center mt-6 sm:mt-8">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to leave the review session? Your progress will be saved.')) {
                router.push('/dashboard');
              }
            }}
            className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            Back to Dashboard
          </button>
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
    </div>
  );
}
